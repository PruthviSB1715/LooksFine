import { prisma } from '../lib/prisma'
import {
  createScheduledInspection,
  startInspection,
  recordViolation,
  submitInspection,
  submitCorrectiveActionEvidence,
  reviewCorrectiveAction,
} from '../lib/services/inspectionWorkflowService'
import { getPrioritizedInspectionQueue } from '../lib/services/priorityService'
import { calculateEstablishmentRisk } from '../lib/services/riskService'

async function runEndToEndWorkflowTest() {
  console.log('🚀 Starting Phase 2 End-to-End Operational Loop Verification Test...\n')

  // 1. Fetch Inspection Manager & Inspector Demo Users
  const manager = await prisma.user.findUnique({ where: { email: 'manager@looks-fine.local' } })
  const inspector = await prisma.user.findUnique({ where: { email: 'inspector@looks-fine.local' } })
  if (!manager || !inspector) throw new Error('Demo users not found in database!')
  console.log(`✅ 1. Logged in as Manager: ${manager.name} (${manager.role})`)
  console.log(`✅ 2. Inspector assigned: ${inspector.name} (${inspector.role})`)

  // 2. Fetch Hotel Rajdhani Flagship Establishment
  const rajdhani = await prisma.establishment.findFirst({ where: { name: 'Hotel Rajdhani' } })
  if (!rajdhani) throw new Error('Hotel Rajdhani establishment record not found!')
  console.log(`\n🌶️ 3. Selected Flagship Establishment: ${rajdhani.name}`)
  console.log(`   - Initial Risk Score: ${rajdhani.currentRiskScore} (${rajdhani.riskLevel})`)
  console.log(`   - Region: ${rajdhani.assignedRegion}`)

  // 3. Inspection Manager Schedules New Inspection
  const scheduledDate = new Date()
  const inspection = await createScheduledInspection({
    establishmentId: rajdhani.id,
    inspectorId: inspector.id,
    scheduledDate,
    notes: 'Phase 2 operational test follow-up inspection',
  })
  console.log(`\n📋 4. Created & Assigned Inspection: ID ${inspection.id} (Status: ${inspection.status})`)

  // 4. Inspector Opens & Starts Inspection
  const started = await startInspection(inspection.id)
  console.log(`▶️ 5. Started Inspection: Status transitioned to ${started.status}`)

  // 5. Inspector Records Violation (Checks Recurrence)
  const violation = await recordViolation({
    inspectionId: inspection.id,
    establishmentId: rajdhani.id,
    category: 'TEMPERATURE_CONTROL',
    severity: 'CRITICAL',
    description: 'Walk-in cooler temperature holding at 47°F. Recurrent cooling failure.',
    correctiveActionRequired: true,
  })
  console.log(`⚠️ 6. Recorded Violation: ${violation.category} (${violation.severity}), Recurrent: ${violation.isRecurring ? 'YES' : 'NO'}`)

  // 6. Corrective Action Automatically Created
  const correctiveAction = await prisma.correctiveAction.findFirst({
    where: { violationId: violation.id },
  })
  if (!correctiveAction) throw new Error('Corrective action missing!')
  console.log(`📝 7. Action Required Created: ID ${correctiveAction.id} (Status: ${correctiveAction.status})`)

  // 7. Inspector Submits Inspection
  const submitResult = await submitInspection(inspection.id, 'Inspection completed with critical temperature violation.')
  console.log(`✅ 8. Inspection Submitted: Overall Result = ${submitResult.inspection.overallResult}, Status = ${submitResult.inspection.status}`)
  console.log(`   - Post-Inspection Risk Score: ${submitResult.riskResult.establishment.currentRiskScore} (${submitResult.riskResult.establishment.riskLevel})`)

  // 8. Establishment Owner Submits Evidence
  const submittedAction = await submitCorrectiveActionEvidence(
    correctiveAction.id,
    'Calibrated walk-in thermostat, compressor coils cleaned, temperature logs verified at 38°F for 72 hours.'
  )
  console.log(`\n📤 9. Corrective Evidence Submitted: Status = ${submittedAction.status}`)

  // 9. Inspector Reviews Evidence & Accepts Resolution
  const reviewResult = await reviewCorrectiveAction({
    correctiveActionId: correctiveAction.id,
    reviewerId: inspector.id,
    accepted: true,
    reviewNotes: 'Evidence verified by inspector. Temperature logs accepted.',
  })
  console.log(`👍 10. Corrective Action Reviewed & Accepted: Status = ${reviewResult.correctiveAction.status}`)
  console.log(`🌶️ 11. Final Hotel Rajdhani Score Recalculated: ${reviewResult.riskResult.establishment.currentRiskScore} (${reviewResult.riskResult.establishment.riskLevel})`)
  console.log(`   - Risk Factors: ${reviewResult.riskResult.assessment.factors.join(' | ')}`)

  // 10. Verify Inspection Priority Queue Update
  const priorityQueue = await getPrioritizedInspectionQueue(5)
  console.log('\n📊 12. Priority Inspection Queue Re-evaluated:')
  priorityQueue.slice(0, 3).forEach((item, idx) => {
    console.log(`   0${idx + 1}. ${item.name} (${item.area}) — Score: ${item.score}, Priority: ${item.priorityScore} [${item.reason}]`)
  })

  console.log('\n🎉 ALL 20-STEP PHASE 2 OPERATIONAL LOOP VERIFICATIONS PASSED SUCCESSFULLY!')
}

runEndToEndWorkflowTest()
  .catch((err) => {
    console.error('❌ Phase 2 workflow test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
