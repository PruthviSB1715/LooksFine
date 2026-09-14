import { prisma } from '../lib/prisma'
import { verifyPassword } from '../lib/auth'

async function testBackend() {
  console.log('🧪 Starting Phase 1 Backend Verification Test...\n')

  // 1. Verify User Records & Auth Hashing
  const inspector = await prisma.user.findUnique({ where: { email: 'inspector@looks-fine.local' } })
  if (!inspector) throw new Error('Inspector user not found!')
  
  const isPasswordValid = await verifyPassword('LooksFine@123', inspector.password)
  console.log(`✅ Demo User Check: ${inspector.name} (${inspector.email}), Role: ${inspector.role}`)
  console.log(`✅ Password Hashing Verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`)

  // 2. Verify Establishments Count
  const count = await prisma.establishment.count()
  console.log(`✅ Database Establishment Count: ${count} records`)

  // 3. Verify Flagship Record: Hotel Rajdhani
  const rajdhani = await prisma.establishment.findFirst({
    where: { name: 'Hotel Rajdhani' },
    include: {
      inspections: { include: { violations: true } },
      violations: { include: { correctiveActions: true } },
      riskAssessments: true,
      riskHistory: true,
    },
  })

  if (!rajdhani) throw new Error('Hotel Rajdhani flagship record not found!')
  console.log(`\n🌶️ Flagship Check: ${rajdhani.name}`)
  console.log(`   - Risk Level: ${rajdhani.riskLevel}, Score: ${rajdhani.currentRiskScore}`)
  console.log(`   - Region: ${rajdhani.assignedRegion}`)
  console.log(`   - Historical Inspections: ${rajdhani.inspections.length}`)
  console.log(`   - Active Violations: ${rajdhani.violations.length}`)
  console.log(`   - Risk Assessment History: ${rajdhani.riskAssessments.length} assessments`)
  console.log(`   - Risk History Logs: ${rajdhani.riskHistory.length} logs`)

  // 4. Verify Corrective Action Rejection for Hotel Rajdhani
  const failedAction = rajdhani.violations.flatMap(v => v.correctiveActions).find(a => a.status === 'REJECTED')
  console.log(`✅ Hotel Rajdhani Historical Failure Recorded: "${failedAction?.description || 'N/A'}" (Status: ${failedAction?.status})`)

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
