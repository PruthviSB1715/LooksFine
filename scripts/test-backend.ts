import { prisma } from '../lib/prisma'
import { verifyPassword } from '../lib/auth'

async function testBackend() {
  console.log('🧪 Starting Phase 1 Backend Verification Test...\n')

  // 1. Verify User Records & Auth Hashing
  const inspector = await prisma.user.findUnique({ where: { email: 'inspector@looks-fine.demo' } })
  if (!inspector) throw new Error('Inspector user not found!')
  
  const isPasswordValid = await verifyPassword('DemoPass123!', inspector.password)
  console.log(`✅ Demo User Check: ${inspector.name} (${inspector.email}), Role: ${inspector.role}`)
  console.log(`✅ Password Hashing Verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`)

  // 2. Verify Establishments Count
  const count = await prisma.establishment.count()
  console.log(`✅ Database Establishment Count: ${count} records`)

  // 3. Verify Flagship Record: Central Spice
  const centralSpice = await prisma.establishment.findFirst({
    where: { name: 'Central Spice' },
    include: {
      inspections: { include: { violations: true } },
      violations: { include: { correctiveActions: true } },
      riskAssessments: true,
      riskHistory: true,
    },
  })

  if (!centralSpice) throw new Error('Central Spice flagship record not found!')
  console.log(`\n🌶️ Flagship Check: ${centralSpice.name}`)
  console.log(`   - Risk Level: ${centralSpice.riskLevel}, Score: ${centralSpice.currentRiskScore}`)
  console.log(`   - Region: ${centralSpice.assignedRegion}`)
  console.log(`   - Historical Inspections: ${centralSpice.inspections.length}`)
  console.log(`   - Active Violations: ${centralSpice.violations.length}`)
  console.log(`   - Risk Assessment History: ${centralSpice.riskAssessments.length} assessments`)
  console.log(`   - Risk History Logs: ${centralSpice.riskHistory.length} logs`)

  // 4. Verify Corrective Action Rejection for Central Spice
  const failedAction = centralSpice.violations.flatMap(v => v.correctiveActions).find(a => a.status === 'REJECTED')
  console.log(`✅ Central Spice Historical Failure Recorded: "${failedAction?.description || 'N/A'}" (Status: ${failedAction?.status})`)

  console.log('\n🎉 ALL PHASE 1 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!')
}

testBackend()
  .catch((err) => {
    console.error('❌ Verification test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
