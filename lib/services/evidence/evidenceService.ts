import { prisma } from '@/lib/prisma'
import { UserSessionPayload } from '@/lib/auth'
import { saveEvidenceFile, validateEvidenceFile } from './storageService'
import { analyzeEvidenceImage } from './visionService'
import { evaluateAndPersistMLRisk } from '@/lib/services/mlRiskService'

export interface UploadEvidenceInput {
  inspectionId: string
  fileName: string
  mimeType: string
  buffer: Buffer
  uploadedUserId?: string
}

export interface ReviewCandidateInput {
  evidenceId: string
  inspectorUserId: string
  severityOverride?: 'MINOR' | 'MAJOR' | 'CRITICAL'
  descriptionOverride?: string
  reviewNotes?: string
}

/**
 * Validates user authorization for inspection evidence operations.
 * Inspectors, Inspection Managers, and Admins can manage evidence.
 * Establishment Managers are strictly restricted to their own authorized establishment.
 */
export async function authorizeEvidenceAccess(
  inspectionId: string,
  userSession?: UserSessionPayload | null
): Promise<{ authorized: boolean; inspection?: any; error?: string; status?: number }> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { establishment: { select: { id: true, name: true, assignedRegion: true } } },
  })

  if (!inspection) {
    return { authorized: false, error: 'Inspection record not found', status: 404 }
  }

  if (!userSession) {
    // Demo fallback for unauthenticated local testing
    return { authorized: true, inspection }
  }

  const role = userSession.role

  if (role === 'ESTABLISHMENT_MANAGER') {
    const userEstId = userSession.establishmentId
    if (userEstId && inspection.establishmentId !== userEstId) {
      console.warn(`[EVIDENCE-AUTH-DENIED] Establishment Manager ${userSession.id} denied access to inspection ${inspectionId}`)
      return { authorized: false, error: 'Forbidden: You are only authorized for your own establishment', status: 403 }
    }
  }

  return { authorized: true, inspection }
}

/**
 * Uploads evidence file, saves to storage, and creates database Evidence record.
 */
export async function uploadEvidence(
  input: UploadEvidenceInput,
  userSession?: UserSessionPayload | null
) {
  const { inspectionId, fileName, mimeType, buffer, uploadedUserId } = input

  // Authorize
  const auth = await authorizeEvidenceAccess(inspectionId, userSession)
  if (!auth.authorized) {
    throw new Error(auth.error || 'Unauthorized evidence upload')
  }

  // Validate File
  const val = validateEvidenceFile(mimeType, buffer.length)
  if (!val.valid) {
    throw new Error(val.error || 'Invalid file format or size')
  }

  // Pre-generate UUID for safe directory structure
  const evidenceId = crypto.randomUUID()

  // Save File to Storage
  const saved = await saveEvidenceFile({
    inspectionId,
    evidenceId,
    fileName,
    mimeType,
    buffer,
  })

  // Create Prisma Record
  const evidence = await prisma.evidence.create({
    data: {
      id: evidenceId,
      inspectionId,
      uploadedById: uploadedUserId || userSession?.id || null,
      fileName: saved.fileName,
      fileType: saved.mimeType,
      fileSize: saved.fileSize,
      storagePath: saved.publicUrl,
      scanStatus: 'UPLOADED',
      reviewStatus: 'PENDING',
    },
  })

  return evidence
}

/**
 * Triggers AI Vision Scan on uploaded evidence record.
 */
export async function scanEvidence(evidenceId: string, userSession?: UserSessionPayload | null) {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { inspection: { select: { id: true, establishmentId: true } } },
  })

  if (!evidence) throw new Error('Evidence record not found')

  const auth = await authorizeEvidenceAccess(evidence.inspectionId, userSession)
  if (!auth.authorized) throw new Error(auth.error || 'Unauthorized scan request')

  // Update status to ANALYZING
  await prisma.evidence.update({
    where: { id: evidenceId },
    data: { scanStatus: 'ANALYZING' },
  })

  // Run Vision AI
  const visionResult = await analyzeEvidenceImage(evidence.storagePath, evidence.fileType)

  if (visionResult.isUnavailable || !visionResult.canDetermine || visionResult.findings.length === 0) {
    const updated = await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        scanStatus: visionResult.isUnavailable ? 'FAILED' : 'ANALYZED',
        candidateDescription: visionResult.reason || 'No candidate findings detected in image.',
      },
    })
    return { evidence: updated, visionResult }
  }

  // Take top candidate finding
  const topFinding = visionResult.findings[0]

  const updated = await prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      scanStatus: 'REVIEW_REQUIRED',
      aiProvider: 'gemini-vision',
      aiModel: 'gemini-2.5-flash',
      candidateCategory: topFinding.category,
      candidateConfidence: topFinding.confidence,
      candidateTitle: topFinding.title,
      candidateDescription: topFinding.description,
      candidateReasoning: topFinding.reasoning,
      severityRecommendation: topFinding.severityRecommendation,
      boundingBox: topFinding.boundingBox ? JSON.stringify(topFinding.boundingBox) : null,
      reviewStatus: 'PENDING',
    },
  })

  return { evidence: updated, visionResult }
}

/**
 * Inspector accepts AI candidate finding:
 * - IDEMPOTENCY PROTECTION: If already accepted, returns existing linked violation.
 * - Creates inspector-confirmed Violation in database.
 * - Sets evidence reviewStatus = ACCEPTED, scanStatus = ACCEPTED, links violationId.
 * - Recalculates establishment ML risk intelligence.
 */
export async function acceptCandidateFinding(
  input: ReviewCandidateInput,
  userSession?: UserSessionPayload | null
) {
  const { evidenceId, inspectorUserId, severityOverride, descriptionOverride } = input

  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      inspection: { select: { id: true, establishmentId: true } },
      violation: true,
    },
  })

  if (!evidence) throw new Error('Evidence record not found')

  const auth = await authorizeEvidenceAccess(evidence.inspectionId, userSession)
  if (!auth.authorized) throw new Error(auth.error || 'Unauthorized evidence review')

  // IDEMPOTENCY CHECK: If already accepted and linked to a violation, return existing
  if (evidence.reviewStatus === 'ACCEPTED' && evidence.violation) {
    console.log(`[EVIDENCE-IDEMPOTENT] Evidence ${evidenceId} already accepted. Returning existing violation ${evidence.violation.id}`)
    return {
      evidence,
      violation: evidence.violation,
      isDuplicate: true,
    }
  }

  const category = evidence.candidateCategory || 'IMPROPER_STORAGE'
  const finalSeverity = severityOverride || evidence.severityRecommendation || 'MAJOR'
  const description = descriptionOverride || evidence.candidateDescription || `${evidence.candidateTitle || 'AI-assisted finding'}: Inspector confirmed visual violation.`

  // Transaction: Create Violation, Update Evidence, Relink
  const [violation, updatedEvidence] = await prisma.$transaction(async (tx) => {
    const vio = await tx.violation.create({
      data: {
        inspectionId: evidence.inspectionId,
        establishmentId: evidence.inspection.establishmentId,
        category,
        severity: finalSeverity,
        description,
        evidenceUrl: evidence.storagePath,
        correctiveActionRequired: true,
        resolutionStatus: 'OPEN',
        isRecurring: false,
      },
    })

    const ev = await tx.evidence.update({
      where: { id: evidenceId },
      data: {
        scanStatus: 'ACCEPTED',
        reviewStatus: 'ACCEPTED',
        reviewedById: inspectorUserId || userSession?.id || null,
        reviewedAt: new Date(),
        violationId: vio.id,
      },
    })

    // Create default Corrective Action item for the new violation
    await tx.correctiveAction.create({
      data: {
        violationId: vio.id,
        establishmentId: evidence.inspection.establishmentId,
        inspectionId: evidence.inspectionId,
        description: `Submit corrective evidence resolving ${category.toLowerCase().replace('_', ' ')} deficiency detected during visual inspection scan.`,
        status: 'REQUIRED',
      },
    })

    return [vio, ev]
  })

  // Trigger ML risk re-evaluation post violation creation
  try {
    await evaluateAndPersistMLRisk(evidence.inspection.establishmentId)
  } catch (err) {
    console.warn('[ML-RERUN-WARN] Risk re-evaluation failed post evidence acceptance:', err)
  }

  return {
    evidence: updatedEvidence,
    violation,
    isDuplicate: false,
  }
}

/**
 * Inspector rejects AI candidate finding:
 * - Sets evidence reviewStatus = REJECTED, scanStatus = REJECTED.
 * - Preserves AI candidate finding data and audit trail.
 */
export async function rejectCandidateFinding(
  input: ReviewCandidateInput,
  userSession?: UserSessionPayload | null
) {
  const { evidenceId, inspectorUserId, reviewNotes } = input

  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
  })

  if (!evidence) throw new Error('Evidence record not found')

  const auth = await authorizeEvidenceAccess(evidence.inspectionId, userSession)
  if (!auth.authorized) throw new Error(auth.error || 'Unauthorized evidence review')

  const updatedEvidence = await prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      scanStatus: 'REJECTED',
      reviewStatus: 'REJECTED',
      reviewedById: inspectorUserId || userSession?.id || null,
      reviewedAt: new Date(),
      candidateReasoning: reviewNotes ? `Inspector Rejection Note: ${reviewNotes}\nOriginal Reasoning: ${evidence.candidateReasoning || ''}` : evidence.candidateReasoning,
    },
  })

  return { evidence: updatedEvidence }
}

/**
 * Retrieves all evidence items for a given inspection ID.
 */
export async function getEvidenceByInspectionId(
  inspectionId: string,
  userSession?: UserSessionPayload | null
) {
  const auth = await authorizeEvidenceAccess(inspectionId, userSession)
  if (!auth.authorized) throw new Error(auth.error || 'Unauthorized evidence retrieval')

  return prisma.evidence.findMany({
    where: { inspectionId },
    include: {
      violation: { select: { id: true, category: true, severity: true, resolutionStatus: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Retrieves a single evidence item by ID.
 */
export async function getEvidenceById(evidenceId: string, userSession?: UserSessionPayload | null) {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      inspection: { select: { id: true, establishmentId: true, status: true, establishment: { select: { name: true } } } },
      violation: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  if (!evidence) return null

  const auth = await authorizeEvidenceAccess(evidence.inspectionId, userSession)
  if (!auth.authorized) throw new Error(auth.error || 'Unauthorized evidence access')

  return evidence
}
