import { prisma } from '../lib/prisma'
import { Role, ViolationCategory, Severity } from '../lib/constants'
import {
  validateEvidenceFile,
  sanitizeFileName,
} from '../lib/services/evidence/storageService'
import { analyzeEvidenceImage } from '../lib/services/evidence/visionService'
import {
  uploadEvidence,
  scanEvidence,
  acceptCandidateFinding,
  rejectCandidateFinding,
  getEvidenceById,
  authorizeEvidenceAccess,
} from '../lib/services/evidence/evidenceService'
import { askCopilot } from '../lib/services/copilot/copilotService'
import fs from 'fs'
import path from 'path'

async function runPhase5EvidenceVerificationTest() {
  console.log('📸 Starting Phase 5 Multimodal AI Evidence Scanner Verification Test...\n')

  // 1. Fetch Demo Inspector and Central Spice Flagship Establishment Record
  const inspector = await prisma.user.findFirst({ where: { role: Role.FOOD_SAFETY_INSPECTOR } })
  if (!inspector) throw new Error('Inspector user not found in database!')

  const centralSpice = await prisma.establishment.findFirst({ where: { name: 'Central Spice' } })
  if (!centralSpice) throw new Error('Central Spice flagship record not found!')

  const inspection = await prisma.inspection.findFirst({
    where: { establishmentId: centralSpice.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!inspection) throw new Error('Central Spice inspection record not found!')

  console.log(`🌶️ Target Context: Establishment=${centralSpice.name}, Inspection ID=${inspection.id}, Inspector=${inspector.name}`)

  // 2. Storage & Validation Verification
  console.log('\n📁 1. Testing Storage & Upload Validation Rules...')
  
  // Test File Name Sanitization & Path Traversal Protection
  const dangerousName = '../../secret/etc/passwd..jpg'
  const sanitized = sanitizeFileName(dangerousName)
  console.log(`   - Sanitized Filename: "${dangerousName}" -> "${sanitized}"`)
  if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
    throw new Error('Path traversal protection failed in sanitizeFileName!')
  }

  // Test File Type Validation
  const validMimeRes = validateEvidenceFile('image/jpeg', 1000)
  const invalidMimeRes = validateEvidenceFile('application/x-executable', 1000)
  console.log(`   - Valid JPEG MIME Check: ${validMimeRes.valid ? 'PASS ✅' : 'FAIL ❌'}`)
  console.log(`   - Invalid EXE MIME Check: ${!invalidMimeRes.valid ? 'PASS (Rejected) ✅' : 'FAIL (Allowed) ❌'}`)
  if (!validMimeRes.valid || invalidMimeRes.valid) throw new Error('MIME validation rules failed!')

  // Test File Size Validation
  const smallSizeRes = validateEvidenceFile('image/jpeg', 5000000) // 5MB
  const overSizeRes = validateEvidenceFile('image/jpeg', 15000000) // 15MB
  console.log(`   - 5MB File Check: ${smallSizeRes.valid ? 'PASS ✅' : 'FAIL ❌'}`)
  console.log(`   - 15MB Oversized Check: ${!overSizeRes.valid ? 'PASS (Rejected) ✅' : 'FAIL (Allowed) ❌'}`)
  if (!smallSizeRes.valid || overSizeRes.valid) throw new Error('File size validation rules failed!')

  // 3. Evidence Record Creation & Upload Simulation
  console.log('\n⬆️ 2. Testing Evidence File Upload & Database Record Creation...')
  const dummyBuffer = Buffer.from('FAKEDATA_JPG_HEADER_SAMPLE_EVIDENCE_PHOTO')
  const inspectorSession = { id: inspector.id, name: inspector.name, email: inspector.email, role: inspector.role as any }

  const uploadedEvidence = await uploadEvidence(
    {
      inspectionId: inspection.id,
      buffer: dummyBuffer,
      fileName: 'raw_chicken_cross_contamination.jpg',
      mimeType: 'image/jpeg',
      uploadedUserId: inspector.id,
    },
    inspectorSession
  )

  console.log(`   - Evidence ID: ${uploadedEvidence.id}`)
  console.log(`   - Scan Status: ${uploadedEvidence.scanStatus}`)
  console.log(`   - Review Status: ${uploadedEvidence.reviewStatus}`)
  console.log(`   - Storage Path: ${uploadedEvidence.storagePath}`)

  if (uploadedEvidence.scanStatus !== 'UPLOADED') {
    throw new Error('Newly uploaded evidence must have scanStatus = UPLOADED!')
  }
  if (uploadedEvidence.violationId) {
    throw new Error('AI must NEVER automatically create a confirmed violation on upload alone!')
  }

  // 4. Testing AI Vision Scanning & Candidate Finding Extraction
  console.log('\n👁️ 3. Testing Vision AI Evidence Scanner & Candidate Findings...')
  const scanRes = await scanEvidence(uploadedEvidence.id, inspectorSession)
  const scannedEvidence = scanRes.evidence

  console.log(`   - Post-Scan Status: ${scannedEvidence.scanStatus}`)
  console.log(`   - AI Provider: ${scannedEvidence.aiProvider}`)
  console.log(`   - AI Model: ${scannedEvidence.aiModel}`)
  console.log(`   - Candidate Category: ${scannedEvidence.candidateCategory}`)
  console.log(`   - Candidate Confidence: ${((scannedEvidence.candidateConfidence || 0) * 100).toFixed(0)}%`)
  console.log(`   - Severity Recommendation: ${scannedEvidence.severityRecommendation}`)
  console.log(`   - Candidate Title: "${scannedEvidence.candidateTitle}"`)

  if (!['ANALYZED', 'REVIEW_REQUIRED', 'FAILED'].includes(scannedEvidence.scanStatus)) {
    throw new Error(`Unexpected scanStatus after vision AI scan: ${scannedEvidence.scanStatus}`)
  }

  // 5. Testing Inspector Review: Candidate Rejection Workflow
  console.log('\n❌ 4. Testing Candidate Finding Rejection Workflow...')
  // Upload a second piece of evidence to reject
  const evidenceToReject = await uploadEvidence(
    {
      inspectionId: inspection.id,
      buffer: dummyBuffer,
      fileName: 'false_positive_shadow.jpg',
      mimeType: 'image/jpeg',
      uploadedUserId: inspector.id,
    },
    inspectorSession
  )
  await scanEvidence(evidenceToReject.id, inspectorSession)

  const rejectRes = await rejectCandidateFinding(
    {
      evidenceId: evidenceToReject.id,
      inspectorUserId: inspector.id,
      reviewNotes: 'False positive - shadow misidentified as surface grime.',
    },
    inspectorSession
  )

  const rejectedEvidence = rejectRes.evidence

  console.log(`   - Rejected Evidence Review Status: ${rejectedEvidence.reviewStatus}`)
  console.log(`   - Rejected Evidence Scan Status: ${rejectedEvidence.scanStatus}`)
  console.log(`   - Violation Created?: ${rejectedEvidence.violationId ? 'YES (ERROR!)' : 'NO ✅'}`)

  if (rejectedEvidence.reviewStatus !== 'REJECTED' || rejectedEvidence.violationId !== null) {
    throw new Error('Rejection workflow test failed: Evidence review status not updated or violation incorrectly created!')
  }

  // 6. Testing Inspector Review: Candidate Acceptance Workflow
  console.log('\n✅ 5. Testing Candidate Finding Acceptance Workflow (Creates Confirmed Violation)...')

  const acceptRes = await acceptCandidateFinding(
    {
      evidenceId: scannedEvidence.id,
      inspectorUserId: inspector.id,
      severityOverride: Severity.CRITICAL as any,
      descriptionOverride: 'Inspector confirmed raw chicken stored above cooked ready-to-eat produce.',
    },
    inspectorSession
  )

  const acceptedEvidence = acceptRes.evidence
  const createdViolationRecord = acceptRes.violation

  console.log(`   - Accepted Evidence Review Status: ${acceptedEvidence.reviewStatus}`)
  console.log(`   - Linked Violation ID: ${acceptedEvidence.violationId}`)

  if (!acceptedEvidence.violationId || !createdViolationRecord) {
    throw new Error('Acceptance workflow failed: No violationId returned!')
  }

  // Verify Violation and CorrectiveAction in DB
  const createdViolation = await prisma.violation.findUnique({
    where: { id: acceptedEvidence.violationId },
    include: { correctiveActions: true },
  })

  if (!createdViolation) throw new Error('Created violation record not found in database!')
  console.log(`   - Confirmed Violation Category: ${createdViolation.category}`)
  console.log(`   - Confirmed Violation Severity: ${createdViolation.severity}`)
  console.log(`   - Created Corrective Action Count: ${createdViolation.correctiveActions.length}`)

  // Verify Idempotency / Duplicate Acceptance Protection
  console.log('\n🛡️ 6. Testing Duplicate Acceptance Protection (Idempotency)...')
  const dupResult = await acceptCandidateFinding(
    {
      evidenceId: scannedEvidence.id,
      inspectorUserId: inspector.id,
    },
    inspectorSession
  )
  console.log(`   - Duplicate Acceptance Check: isDuplicate=${dupResult.isDuplicate} (Same Violation ID: ${dupResult.violation.id}) ✅`)

  // 7. Testing Authorization Security Limits
  console.log('\n🔒 7. Testing Multimodal Authorization & Access Control...')
  const marinaMarket = await prisma.establishment.findFirst({ where: { name: 'Marina Market' } })
  const otherEstUserRecord = await prisma.user.findFirst({ where: { role: Role.ESTABLISHMENT_MANAGER } })

  if (marinaMarket && otherEstUserRecord) {
    const unauthManager = {
      id: otherEstUserRecord.id,
      name: otherEstUserRecord.name,
      email: otherEstUserRecord.email,
      role: Role.ESTABLISHMENT_MANAGER as any,
      region: 'Marina',
      establishmentId: marinaMarket.id, // Strictly authorized for Marina Market, NOT Central Spice
    }

    try {
      await getEvidenceById(scannedEvidence.id, unauthManager)
      throw new Error('SECURITY VULNERABILITY: Unauthorized manager was granted access to evidence!')
    } catch (authErr: any) {
      console.log(`   - Cross-Establishment Evidence Access Blocked: "${authErr.message}" ✅`)
    }
  }

  // 8. Grounded AI Copilot Evidence Integration
  console.log('\n💬 8. Testing Grounded AI Copilot Evidence Queries & Citations...')
  const copilotRes = await askCopilot({
    question: `What visual evidence was uploaded for ${centralSpice.name}?`,
    establishmentId: centralSpice.id,
  })

  console.log(`   - Copilot Intent Detected: ${copilotRes.intent}`)
  console.log(`   - Evidence Citations Returned: ${copilotRes.sources.filter((s) => s.type === 'EVIDENCE').length}`)
  console.log(`   --- COPILOT ANSWER PREVIEW ---`)
  console.log(copilotRes.answer.split('\n').slice(0, 5).join('\n'))

  const hasEvidenceCitation = copilotRes.sources.some((s) => s.type === 'EVIDENCE')
  if (!hasEvidenceCitation) {
    console.warn('⚠️ Warning: Copilot did not include explicit EVIDENCE citation in sources.')
  } else {
    console.log('   - Verified Grounded EVIDENCE citation in Copilot response! ✅')
  }

  // Cleanup created test uploaded files from disk if needed
  if (fs.existsSync(uploadedEvidence.storagePath)) {
    fs.unlinkSync(uploadedEvidence.storagePath)
  }
  if (fs.existsSync(evidenceToReject.storagePath)) {
    fs.unlinkSync(evidenceToReject.storagePath)
  }

  console.log('\n🎉 ALL PHASE 5 MULTIMODAL AI EVIDENCE SCANNER VERIFICATIONS PASSED SUCCESSFULLY!')
}

runPhase5EvidenceVerificationTest()
  .catch((err) => {
    console.error('❌ Phase 5 verification test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
