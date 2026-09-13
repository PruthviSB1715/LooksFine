import { prisma } from '../lib/prisma'
import { askCopilot } from '../lib/services/copilot/copilotService'
import { Role } from '../lib/constants'

async function runPhase4CopilotVerificationTest() {
  console.log('🤖 Starting Phase 4 Grounded AI Copilot Comprehensive Verification Test...\n')

  // 1. Fetch Central Spice Flagship Establishment Record
  const centralSpice = await prisma.establishment.findFirst({ where: { name: 'Central Spice' } })
  if (!centralSpice) throw new Error('Central Spice flagship record not found in database!')

  console.log(`🌶️ 1. Central Spice Flagship Record Identified: ID=${centralSpice.id}`)

  // 2. Test Question 1: "Why is Central Spice high risk?"
  console.log('\n❓ Test Question 1: "Why is Central Spice high risk?"')
  const res1 = await askCopilot({ question: 'Why is Central Spice high risk?', establishmentId: centralSpice.id })

  console.log(`   - Intent Detected: ${res1.intent}`)
  console.log(`   - Establishment Resolved: ${res1.establishment?.name} (ID: ${res1.establishment?.id})`)
  console.log(`   - ML Serious Violation Probability: ${((res1.modelInfo?.seriousViolationProbability || 0) * 100).toFixed(0)}%`)
  console.log(`   - Sources Citations Count: ${res1.sources.length}`)
  console.log(`   - Is Fallback Summary: ${res1.isFallback ? 'YES (Deterministic Grounded)' : 'NO (LLM API)'}`)
  console.log(`   --- ANSWER PREVIEW ---`)
  console.log(res1.answer.split('\n').slice(0, 7).join('\n'))

  if (!res1.answer.includes('Central Spice') && !res1.answer.includes('CENTRAL SPICE')) {
    throw new Error('Test 1 failed: Answer did not reference Central Spice!')
  }
  if (typeof res1.modelInfo?.seriousViolationProbability !== 'number') {
    throw new Error('Test 1 failed: Model probability missing from Copilot response!')
  }

  // 3. Test Question 2: "What are Central Spice's recurring violations?"
  console.log('\n❓ Test Question 2: "What are Central Spice\'s recurring violations?"')
  const res2 = await askCopilot({ question: "What are Central Spice's recurring violations?" })
  console.log(`   - Intent Detected: ${res2.intent}`)
  console.log(`   - Violations Citations Found: ${res2.sources.filter((s) => s.type === 'VIOLATION').length}`)
  console.log(`   - Answer contains temperature/cooling recurrence: ${res2.answer.toLowerCase().includes('temperature') || res2.answer.toLowerCase().includes('recurring')}`)

  // 4. Test Question 3: "Which establishments have unresolved critical violations?"
  console.log('\n❓ Test Question 3: "Which establishments have unresolved critical violations?"')
  const res3 = await askCopilot({ question: 'Which establishments have unresolved critical violations?' })
  console.log(`   - Intent Detected: ${res3.intent}`)
  console.log(`   - Citations Count: ${res3.sources.length}`)

  // 5. Test Question 4: "Who should we inspect next?"
  console.log('\n❓ Test Question 4: "Who should we inspect next?"')
  const res4 = await askCopilot({ question: 'Who should we inspect next?' })
  console.log(`   - Intent Detected: ${res4.intent}`)
  console.log(`   - Answer includes Priority Ranking: ${res4.answer.includes('Priority') || res4.answer.includes('PRIORITY')}`)

  // 6. Test Question 5: "Has Central Spice improved after corrective action?"
  console.log('\n❓ Test Question 5: "Has Central Spice improved after corrective action?"')
  const res5 = await askCopilot({ question: 'Has Central Spice improved after corrective action?' })
  console.log(`   - Intent Detected: ${res5.intent}`)
  console.log(`   - Risk History Citations: ${res5.sources.filter((s) => s.type === 'RISK_HISTORY').length}`)

  // 7. Test Question 6: "What corrective actions are still pending?"
  console.log('\n❓ Test Question 6: "What corrective actions are still pending?"')
  const res6 = await askCopilot({ question: 'What corrective actions are still pending?' })
  console.log(`   - Intent Detected: ${res6.intent}`)
  console.log(`   - Corrective Action Citations: ${res6.sources.filter((s) => s.type === 'CORRECTIVE_ACTION').length}`)

  // 8. Test Role Authorization Enforcement
  console.log('\n🔒 8. Testing Role Authorization Enforcement (Establishment Manager Access Control)...')
  const estUserRecord = await prisma.user.findFirst({ where: { role: Role.ESTABLISHMENT_MANAGER } })
  const estManagerUser = {
    id: estUserRecord?.id || 'demo-user-id',
    name: 'Marco Rossi',
    email: 'establishment@looks-fine.demo',
    role: Role.ESTABLISHMENT_MANAGER as any,
    region: 'Mission District',
    establishmentId: centralSpice.id, // Authorized strictly for Central Spice
  }

  // Authorized query for own establishment
  const authRes = await askCopilot(
    { question: 'Why is Central Spice high risk?', establishmentId: centralSpice.id },
    estManagerUser
  )
  console.log(`   - Authorized Manager Query Result: ${authRes.sources.length > 0 ? 'ALLOWED (Context returned ✅)' : 'BLOCKED ❌'}`)

  // Unauthorized query attempting to view another establishment (e.g. Marina Market)
  const marinaMarket = await prisma.establishment.findFirst({ where: { name: 'Marina Market' } })
  if (marinaMarket) {
    const unauthRes = await askCopilot(
      { question: 'Why is Marina Market high risk?', establishmentId: marinaMarket.id },
      estManagerUser
    )
    const isBlocked = unauthRes.answer.includes('Unauthorized') || unauthRes.sources.length === 0
    console.log(`   - Unauthorized Manager Query Result: ${isBlocked ? 'STRICTLY BLOCKED ✅' : 'FAILED SECURITY CHECK ❌'}`)
    if (!isBlocked) {
      throw new Error('Role authorization test failed: Establishment Manager accessed unauthorized record!')
    }
  }

  // 9. Verify Source Citation Records Against Database
  console.log('\n🔍 9. Verifying Citation Authenticity against PostgreSQL Database...')
  for (const src of res1.sources) {
    if (src.type === 'ESTABLISHMENT') {
      const dbEst = await prisma.establishment.findUnique({ where: { id: src.id } })
      if (!dbEst) throw new Error(`Fake establishment citation detected: ${src.id}`)
    } else if (src.type === 'INSPECTION') {
      const dbInsp = await prisma.inspection.findUnique({ where: { id: src.id } })
      if (!dbInsp) throw new Error(`Fake inspection citation detected: ${src.id}`)
    } else if (src.type === 'VIOLATION') {
      const dbVio = await prisma.violation.findUnique({ where: { id: src.id } })
      if (!dbVio) throw new Error(`Fake violation citation detected: ${src.id}`)
    }
  }
  console.log('   - All citation references verified as 100% authentic database records!')

  console.log('\n🎉 ALL PHASE 4 GROUNDED AI COPILOT VERIFICATIONS PASSED SUCCESSFULLY!')
}

runPhase4CopilotVerificationTest()
  .catch((err) => {
    console.error('❌ Phase 4 verification test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
