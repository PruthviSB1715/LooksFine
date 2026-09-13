import { prisma } from '@/lib/prisma'
import { InspectionStatus, ViolationCategory, Severity, CorrectiveActionStatus } from '@/lib/constants'
import { calculateAndPersistEstablishmentRisk } from '@/lib/services/riskService'

/**
 * Checks whether an establishment has previous occurrences of a violation category.
 */
export async function checkViolationRecurrence(establishmentId: string, category: ViolationCategory): Promise<boolean> {
  const previousCount = await prisma.violation.count({
    where: {
      establishmentId,
      category,
    },
  })
  return previousCount > 0
}

/**
 * Step 1 & 2: Schedule & Assign Inspection
 */
export async function createScheduledInspection(data: {
  establishmentId: string
  inspectorId: string
  scheduledDate: Date
  notes?: string
}) {
  const inspection = await prisma.inspection.create({
    data: {
      establishmentId: data.establishmentId,
      inspectorId: data.inspectorId,
      scheduledDate: data.scheduledDate,
      status: InspectionStatus.SCHEDULED,
      notes: data.notes,
    },
    include: {
      establishment: true,
      inspector: { select: { id: true, name: true, email: true } },
    },
  })
  return inspection
}

/**
 * Step 3: Start Inspection
 */
export async function startInspection(inspectionId: string) {
  const inspection = await prisma.inspection.update({
    where: { id: inspectionId },
    data: {
      status: InspectionStatus.IN_PROGRESS,
      startedAt: new Date(),
    },
    include: { establishment: true, violations: true },
  })
  return inspection
}

/**
 * Step 4: Record Violation with Automatic Recurrence Check
 */
export async function recordViolation(data: {
  inspectionId: string
  establishmentId: string
  category: ViolationCategory
  severity: Severity
  description: string
  evidenceUrl?: string
  correctiveActionRequired?: boolean
}) {
  // Check recurrence dynamically
  const isRecurring = await checkViolationRecurrence(data.establishmentId, data.category)

  const violation = await prisma.violation.create({
    data: {
      inspectionId: data.inspectionId,
      establishmentId: data.establishmentId,
      category: data.category,
      severity: data.severity,
      description: data.description,
      evidenceUrl: data.evidenceUrl,
      correctiveActionRequired: data.correctiveActionRequired ?? true,
      resolutionStatus: 'OPEN',
      isRecurring,
    },
  })

  // Automatically create Corrective Action requirement if flag set
  if (violation.correctiveActionRequired) {
    await prisma.correctiveAction.create({
      data: {
        violationId: violation.id,
        establishmentId: data.establishmentId,
        inspectionId: data.inspectionId,
        description: `Corrective action required for ${data.category.toLowerCase().replace('_', ' ')} (${data.severity}): ${data.description}`,
        status: CorrectiveActionStatus.REQUIRED,
      },
    })

    await prisma.violation.update({
      where: { id: violation.id },
      data: { resolutionStatus: 'CORRECTIVE_ACTION_REQUIRED' },
    })
  }

  return violation
}

/**
 * Step 5: Submit Inspection & Trigger Risk Calculation
 */
export async function submitInspection(inspectionId: string, notes?: string) {
  const existing = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { violations: true },
  })

  if (!existing) throw new Error('Inspection not found')

  const hasActionRequired = existing.violations.some((v) => v.correctiveActionRequired)
  const nextStatus = hasActionRequired
    ? InspectionStatus.CORRECTIVE_ACTION_REQUIRED
    : InspectionStatus.REVIEWED

  const inspection = await prisma.inspection.update({
    where: { id: inspectionId },
    data: {
      status: nextStatus,
      submittedAt: new Date(),
      notes: notes || existing.notes,
      overallResult: hasActionRequired ? 'ACTION_REQUIRED' : 'PASSED',
    },
  })

  // Update establishment last inspection date & recalculate risk
  await prisma.establishment.update({
    where: { id: existing.establishmentId },
    data: { lastInspectionDate: new Date() },
  })

  const riskResult = await calculateAndPersistEstablishmentRisk(
    existing.establishmentId,
    'POST_INSPECTION'
  )

  return { inspection, riskResult }
}

/**
 * Step 6: Submit Corrective Action Evidence
 */
export async function submitCorrectiveActionEvidence(correctiveActionId: string, evidenceText: string) {
  const action = await prisma.correctiveAction.update({
    where: { id: correctiveActionId },
    data: {
      submittedEvidence: evidenceText,
      status: CorrectiveActionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    include: { violation: true, establishment: true },
  })
  return action
}

/**
 * Step 7 & 8: Inspector Review & Optional Re-Inspection Trigger
 */
export async function reviewCorrectiveAction(data: {
  correctiveActionId: string
  reviewerId: string
  accepted: boolean
  reviewNotes?: string
  requireReinspection?: boolean
}) {
  const existing = await prisma.correctiveAction.findUnique({
    where: { id: data.correctiveActionId },
    include: { violation: true, establishment: true },
  })

  if (!existing) throw new Error('Corrective action record not found')

  let newStatus: CorrectiveActionStatus = CorrectiveActionStatus.CLOSED
  let reInspection = null

  if (data.accepted) {
    newStatus = CorrectiveActionStatus.CLOSED
    // Mark violation as resolved
    await prisma.violation.update({
      where: { id: existing.violationId },
      data: { resolutionStatus: 'RESOLVED', resolvedAt: new Date() },
    })
  } else if (data.requireReinspection) {
    newStatus = CorrectiveActionStatus.REINSPECTION_REQUIRED

    // Schedule automatic follow-up re-inspection
    const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // In 7 days
    reInspection = await prisma.inspection.create({
      data: {
        establishmentId: existing.establishmentId,
        inspectorId: data.reviewerId,
        scheduledDate,
        status: InspectionStatus.SCHEDULED,
        notes: `Re-inspection scheduled for corrective action follow-up: ${existing.description}`,
      },
    })
  } else {
    newStatus = CorrectiveActionStatus.REJECTED
  }

  const updatedAction = await prisma.correctiveAction.update({
    where: { id: data.correctiveActionId },
    data: {
      status: newStatus,
      reviewerId: data.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
    },
  })

  // Recalculate establishment risk after review transition
  const riskResult = await calculateAndPersistEstablishmentRisk(
    existing.establishmentId,
    'POST_REVIEW'
  )

  return {
    correctiveAction: updatedAction,
    reInspection,
    riskResult,
  }
}
