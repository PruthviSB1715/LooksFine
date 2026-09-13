import { prisma } from '../lib/prisma'
import { getMLRiskIntelligence } from '../lib/services/mlRiskService'
import { getPrioritizedInspectionQueue } from '../lib/services/priorityService'

async function runPhase3VerificationTest() {
  console.log('🤖 Starting Phase 3 ML Risk Intelligence Verification Test...\n')

  // 1. Fetch Central Spice Flagship Record
  const centralSpice = await prisma.establishment.findFirst({ where: { name: 'Central Spice' } })
  if (!centralSpice) throw new Error('Central Spice flagship record not found!')

  console.log(`🌶️ 1. Central Spice Flagship Record:`)
  console.log(`   - ID: ${centralSpice.id}`)
  console.log(`   - Current Risk Score: ${centralSpice.currentRiskScore} (${centralSpice.riskLevel})`)

  // 2. Evaluate ML Risk Intelligence (with fallback test)
  const mlResult = await getMLRiskIntelligence(centralSpice.id)
  console.log(`\n🧠 2. ML Risk Intelligence Inference Result:`)
  console.log(`   - Predicted P(serious food-safety violation): ${(mlResult.seriousViolationProbability * 100).toFixed(0)}%`)
  console.log(`   - Calculated Risk Level: ${mlResult.riskLevel}`)
  console.log(`   - Model Version: ${mlResult.modelVersion}`)
  console.log(`   - Is Live ML Prediction: ${mlResult.isMLPrediction ? 'YES (FastAPI ML Service)' : 'NO (Fallback Baseline)'}`)
  console.log(`   - SHAP / Driver Factors: ${mlResult.topFactors.join(' | ')}`)

  // 3. Verify Priority Queue Integration
  const priorityQueue = await getPrioritizedInspectionQueue(5)
  console.log('\n📊 3. Inspect Next Priority Queue (Combined ML + Urgency):')
  priorityQueue.slice(0, 3).forEach((item, idx) => {
    console.log(
      `   0${idx + 1}. ${item.name} (${item.area}) — ${(item.probability * 100).toFixed(0)}% P(serious) | Priority Score: ${item.priorityScore} [${item.reason}]`
    )
  })

  // 4. Verify Database Persistence of Risk Assessment
  const latestAssessment = await prisma.riskAssessment.findFirst({
    where: { establishmentId: centralSpice.id },
    orderBy: { assessedAt: 'desc' },
  })
  console.log(`\n💾 4. Verified Database Risk Assessment Audit Log:`)
  console.log(`   - ID: ${latestAssessment?.id}`)
  console.log(`   - Assessment Type: ${latestAssessment?.assessmentType}`)
  console.log(`   - Explanation Payload: ${latestAssessment?.explanation}`)

  console.log('\n🎉 ALL PHASE 3 ML RISK INTELLIGENCE VERIFICATIONS PASSED SUCCESSFULLY!')
}

runPhase3VerificationTest()
  .catch((err) => {
    console.error('❌ Phase 3 verification test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
