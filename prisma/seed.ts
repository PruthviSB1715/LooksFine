import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Role, RiskLevel, InspectionStatus, ViolationCategory, Severity, CorrectiveActionStatus } from '../lib/constants'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data in reverse order of dependencies
  await prisma.notification.deleteMany()
  await prisma.riskHistory.deleteMany()
  await prisma.riskAssessment.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.correctiveAction.deleteMany()
  await prisma.violation.deleteMany()
  await prisma.inspection.deleteMany()
  await prisma.establishment.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleaned existing database tables.')

  // Hash demo password
  const hashedPassword = await bcrypt.hash('DemoPass123!', 10)

  // 1. Create Demo Users
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@looks-fine.demo',
      password: hashedPassword,
      role: Role.FOOD_SAFETY_ADMIN,
      region: 'San Francisco',
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      name: 'Sarah Chen',
      email: 'manager@looks-fine.demo',
      password: hashedPassword,
      role: Role.INSPECTION_MANAGER,
      region: 'San Francisco',
    },
  })

  const inspectorUser = await prisma.user.create({
    data: {
      name: 'Alex Morgan',
      email: 'inspector@looks-fine.demo',
      password: hashedPassword,
      role: Role.FOOD_SAFETY_INSPECTOR,
      region: 'Mission District',
    },
  })

  const establishmentUser = await prisma.user.create({
    data: {
      name: 'Marco Rossi',
      email: 'establishment@looks-fine.demo',
      password: hashedPassword,
      role: Role.ESTABLISHMENT_MANAGER,
      region: 'Mission District',
    },
  })

  console.log('👤 Created demo accounts (admin, manager, inspector, establishment).')

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  // 2. Create Flagship Establishment: Central Spice
  const centralSpice = await prisma.establishment.create({
    data: {
      name: 'Central Spice',
      type: 'Restaurant',
      address: '1248 Valencia St',
      city: 'San Francisco',
      state: 'CA',
      latitude: 37.7523,
      longitude: -122.4208,
      operatingStatus: 'ACTIVE',
      assignedRegion: 'Mission District',
      riskLevel: RiskLevel.CRITICAL,
      currentRiskScore: 82,
      lastInspectionDate: daysAgo(18),
      nextInspectionDate: daysAgo(-3), // Overdue / urgent
    },
  })

  // Central Spice Historical Risk Assessments & History
  await prisma.riskAssessment.createMany({
    data: [
      {
        establishmentId: centralSpice.id,
        riskScore: 54,
        riskLevel: RiskLevel.MEDIUM,
        assessmentType: 'INITIAL_BASELINE',
        explanation: 'Initial baseline score calculated during annual inspection onboarding.',
        assessedAt: daysAgo(180),
      },
      {
        establishmentId: centralSpice.id,
        riskScore: 68,
        riskLevel: RiskLevel.HIGH,
        assessmentType: 'POST_INSPECTION',
        explanation: 'Risk score elevated due to repeat cold chain gaps and temperature logging failures.',
        assessedAt: daysAgo(90),
      },
      {
        establishmentId: centralSpice.id,
        riskScore: 82,
        riskLevel: RiskLevel.CRITICAL,
        assessmentType: 'ML_PREDICTION',
        explanation: JSON.stringify(['Cold chain gaps', 'Pest activity', 'Repeat violations']),
        assessedAt: daysAgo(18),
      },
    ],
  })

  await prisma.riskHistory.createMany({
    data: [
      { establishmentId: centralSpice.id, riskScore: 54, riskLevel: RiskLevel.MEDIUM, reason: 'Annual Baseline', createdAt: daysAgo(180) },
      { establishmentId: centralSpice.id, riskScore: 68, riskLevel: RiskLevel.HIGH, reason: 'Inspection finding: Temperature control', createdAt: daysAgo(90) },
      { establishmentId: centralSpice.id, riskScore: 82, riskLevel: RiskLevel.CRITICAL, reason: 'Automated ML signal: Recurrent cold chain gaps', createdAt: daysAgo(18) },
    ],
  })

  // Central Spice Past Inspections & Violations
  const csInsp1 = await prisma.inspection.create({
    data: {
      establishmentId: centralSpice.id,
      inspectorId: inspectorUser.id,
      scheduledDate: daysAgo(180),
      startedAt: daysAgo(180),
      submittedAt: daysAgo(180),
      status: InspectionStatus.REVIEWED,
      notes: 'Routine 6-month inspection. Noted minor storage issues and walk-in cooler calibration off by 4°F.',
      overallResult: 'CORRECTIVE_ACTION_REQUIRED',
    },
  })

  const csVio1 = await prisma.violation.create({
    data: {
      inspectionId: csInsp1.id,
      establishmentId: centralSpice.id,
      category: ViolationCategory.TEMPERATURE_CONTROL,
      severity: Severity.CRITICAL,
      description: 'Walk-in refrigeration unit holding ambient raw poultry at 48°F (Required: <= 41°F).',
      correctiveActionRequired: true,
      resolutionStatus: 'OPEN',
      isRecurring: false,
      detectedAt: daysAgo(180),
    },
  })

  await prisma.correctiveAction.create({
    data: {
      violationId: csVio1.id,
      establishmentId: centralSpice.id,
      inspectionId: csInsp1.id,
      description: 'Calibrate walk-in compressor, submit temperature logs twice daily for 14 days.',
      status: CorrectiveActionStatus.REJECTED,
      submittedEvidence: 'Submitted manual log sheet, but temperature readings remained uncalibrated at 46°F.',
      submittedAt: daysAgo(165),
      reviewedAt: daysAgo(160),
      reviewerId: inspectorUser.id,
      reviewNotes: 'Rejected due to insufficient cooling performance.',
    },
  })

  const csInsp2 = await prisma.inspection.create({
    data: {
      establishmentId: centralSpice.id,
      inspectorId: inspectorUser.id,
      scheduledDate: daysAgo(90),
      startedAt: daysAgo(90),
      submittedAt: daysAgo(90),
      status: InspectionStatus.CORRECTIVE_ACTION_REQUIRED,
      notes: 'Follow-up inspection. Cooling units still showing deviations. Evidence of pest entry near rear alley loading door.',
      overallResult: 'UNSATISFACTORY',
    },
  })

  await prisma.violation.createMany({
    data: [
      {
        inspectionId: csInsp2.id,
        establishmentId: centralSpice.id,
        category: ViolationCategory.TEMPERATURE_CONTROL,
        severity: Severity.CRITICAL,
        description: 'Recurrent walk-in cooler temperature deviation (49°F). Food safety hazard.',
        correctiveActionRequired: true,
        resolutionStatus: 'OPEN',
        isRecurring: true,
        detectedAt: daysAgo(90),
      },
      {
        inspectionId: csInsp2.id,
        establishmentId: centralSpice.id,
        category: ViolationCategory.PESTS,
        severity: Severity.MAJOR,
        description: 'Rodent droppings observed near food storage shelving in rear stockroom.',
        correctiveActionRequired: true,
        resolutionStatus: 'OPEN',
        isRecurring: false,
        detectedAt: daysAgo(90),
      },
    ],
  })

  // Seed Evidence for Central Spice Inspection
  await prisma.evidence.create({
    data: {
      inspectionId: csInsp2.id,
      uploadedById: inspectorUser.id,
      fileName: 'cooler_temp_gauge.jpg',
      fileType: 'image/jpeg',
      fileSize: 245000,
      storagePath: 'public/uploads/inspections/demo_cooler_temp.jpg',
      scanStatus: 'ANALYZED',
      aiProvider: 'gemini-vision',
      aiModel: 'gemini-2.5-flash',
      candidateCategory: ViolationCategory.TEMPERATURE_CONTROL,
      candidateConfidence: 0.92,
      candidateTitle: 'Digital display reading 49°F on walk-in cooler ambient sensor',
      candidateDescription: 'Digital temperature gauge reading 49°F on walk-in cooler primary unit (threshold: <= 41°F).',
      candidateReasoning: 'Visual inspection shows digital reading exceeding safe holding temperature of 41°F.',
      severityRecommendation: Severity.CRITICAL,
      boundingBox: JSON.stringify({ ymin: 0.25, xmin: 0.3, ymax: 0.65, xmax: 0.75 }),
      reviewStatus: 'PENDING',
      uploadedAt: daysAgo(90),
    },
  })

  console.log('🌶️ Seeded Flagship Record: Central Spice with complete violation, risk & evidence history.')

  // 3. Create 24 Additional Seed Establishments
  const otherEstablishmentsData = [
    { name: 'Marina Market', type: 'Grocery', address: '2095 Chestnut St', region: 'Marina', score: 67, level: RiskLevel.MEDIUM, lastDays: 9, lat: 37.8005, lng: -122.4371 },
    { name: 'Golden Crust Bakery', type: 'Bakery', address: '540 Howard St', region: 'SoMa', score: 41, level: RiskLevel.LOW, lastDays: 2, lat: 37.7882, lng: -122.3985 },
    { name: 'Harbor House', type: 'Restaurant', address: '601 Union St', region: 'North Beach', score: 58, level: RiskLevel.MEDIUM, lastDays: 24, lat: 37.8009, lng: -122.4091 },
    { name: 'St. Jude Hospital Kitchen', type: 'Hospital Kitchen', address: '900 Hyde St', region: 'Nob Hill', score: 22, level: RiskLevel.LOW, lastDays: 45, lat: 37.7901, lng: -122.4172 },
    { name: 'Bay Area High Cafeteria', type: 'School/College Cafeteria', address: '400 1st Ave', region: 'Sunset', score: 28, level: RiskLevel.LOW, lastDays: 60, lat: 37.7551, lng: -122.4820 },
    { name: 'Tacos El Sol', type: 'Food Truck', address: '18th & Mission St', region: 'Mission District', score: 74, level: RiskLevel.HIGH, lastDays: 5, lat: 37.7618, lng: -122.4194 },
    { name: 'Grand Palace Hotel Kitchen', type: 'Hotel', address: '333 O\'Farrell St', region: 'Downtown', score: 48, level: RiskLevel.MEDIUM, lastDays: 30, lat: 37.7865, lng: -122.4092 },
    { name: 'Pacific Roast Cafe', type: 'Cafe', address: '2201 Fillmore St', region: 'Pacific Heights', score: 19, level: RiskLevel.LOW, lastDays: 14, lat: 37.7908, lng: -122.4341 },
    { name: 'Mission Bistro', type: 'Restaurant', address: '2400 Mission St', region: 'Mission District', score: 85, level: RiskLevel.CRITICAL, lastDays: 12, lat: 37.7588, lng: -122.4191 },
    { name: 'Ocean Beach Seafood', type: 'Restaurant', address: '1500 Judah St', region: 'Sunset', score: 63, level: RiskLevel.MEDIUM, lastDays: 40, lat: 37.7611, lng: -122.4891 },
    { name: 'Chinatown Noodle Express', type: 'Restaurant', address: '850 Grant Ave', region: 'Chinatown', score: 79, level: RiskLevel.HIGH, lastDays: 8, lat: 37.7932, lng: -122.4061 },
    { name: 'SoMa Tech Cafe', type: 'Cafe', address: '300 Brannan St', region: 'SoMa', score: 31, level: RiskLevel.LOW, lastDays: 10, lat: 37.7812, lng: -122.3921 },
    { name: 'Fisherman Wharf Crab Shack', type: 'Restaurant', address: '2800 Taylor St', region: 'North Beach', score: 55, level: RiskLevel.MEDIUM, lastDays: 22, lat: 37.8081, lng: -122.4152 },
    { name: 'Tenderloin Community Kitchen', type: 'Institutional Kitchen', address: '450 Eddy St', region: 'Tenderloin', score: 89, level: RiskLevel.CRITICAL, lastDays: 4, lat: 37.7838, lng: -122.4151 },
    { name: 'Gourmet Pastry House', type: 'Bakery', address: '1201 Polk St', region: 'Nob Hill', score: 35, level: RiskLevel.LOW, lastDays: 19, lat: 37.7888, lng: -122.4201 },
    { name: 'Financial District Sushi', type: 'Restaurant', address: '50 California St', region: 'Financial District', score: 72, level: RiskLevel.HIGH, lastDays: 7, lat: 37.7938, lng: -122.3981 },
    { name: 'Dolores Park Ice Cream Truck', type: 'Food Truck', address: '19th & Dolores St', region: 'Mission District', score: 25, level: RiskLevel.LOW, lastDays: 50, lat: 37.7591, lng: -122.4262 },
    { name: 'University Commons Dining', type: 'School/College Cafeteria', address: '2130 Fulton St', region: 'Richmond', score: 38, level: RiskLevel.LOW, lastDays: 35, lat: 37.7761, lng: -122.4512 },
    { name: 'St. Francis Hotel Dining Room', type: 'Hotel', address: '335 Powell St', region: 'Downtown', score: 42, level: RiskLevel.MEDIUM, lastDays: 28, lat: 37.7878, lng: -122.4081 },
    { name: 'Richmond Dim Sum', type: 'Restaurant', address: '5423 Geary Blvd', region: 'Richmond', score: 66, level: RiskLevel.MEDIUM, lastDays: 16, lat: 37.7808, lng: -122.4761 },
    { name: 'Castro Organic Market', type: 'Grocery', address: '400 Castro St', region: 'Castro', score: 30, level: RiskLevel.LOW, lastDays: 11, lat: 37.7628, lng: -122.4351 },
    { name: 'Mission Cantina', type: 'Restaurant', address: '1600 Valencia St', region: 'Mission District', score: 77, level: RiskLevel.HIGH, lastDays: 15, lat: 37.7488, lng: -122.4211 },
    { name: 'Presidio Terrace Cafe', type: 'Cafe', address: '1 Presidio Ave', region: 'Presidio', score: 18, level: RiskLevel.LOW, lastDays: 75, lat: 37.7891, lng: -122.4461 },
    { name: 'Haight Ashbury Delicatessen', type: 'Grocery', address: '1450 Haight St', region: 'Haight', score: 53, level: RiskLevel.MEDIUM, lastDays: 21, lat: 37.7701, lng: -122.4441 },
  ]

  for (const item of otherEstablishmentsData) {
    const est = await prisma.establishment.create({
      data: {
        name: item.name,
        type: item.type,
        address: item.address,
        city: 'San Francisco',
        state: 'CA',
        latitude: item.lat,
        longitude: item.lng,
        operatingStatus: 'ACTIVE',
        assignedRegion: item.region,
        riskLevel: item.level,
        currentRiskScore: item.score,
        lastInspectionDate: daysAgo(item.lastDays),
        nextInspectionDate: daysAgo(-30 + item.lastDays),
      },
    })

    // Seed baseline risk assessment & history
    await prisma.riskAssessment.create({
      data: {
        establishmentId: est.id,
        riskScore: item.score,
        riskLevel: item.level,
        assessmentType: 'INITIAL_BASELINE',
        explanation: `Baseline inspection assessment score for ${item.name}.`,
        assessedAt: daysAgo(item.lastDays),
      },
    })

    await prisma.riskHistory.create({
      data: {
        establishmentId: est.id,
        riskScore: item.score,
        riskLevel: item.level,
        reason: 'Routine inspection calculation',
        createdAt: daysAgo(item.lastDays),
      },
    })

    // Create an inspection for higher risk items
    if (item.score > 60) {
      const insp = await prisma.inspection.create({
        data: {
          establishmentId: est.id,
          inspectorId: inspectorUser.id,
          scheduledDate: daysAgo(item.lastDays),
          startedAt: daysAgo(item.lastDays),
          submittedAt: daysAgo(item.lastDays),
          status: InspectionStatus.REVIEWED,
          notes: `Routine inspection for ${item.name}. Identified food storage & sanitation compliance gaps.`,
          overallResult: 'ACTION_REQUIRED',
        },
      })

      const category = item.score > 80 ? ViolationCategory.TEMPERATURE_CONTROL : ViolationCategory.SANITATION
      const severity = item.score > 80 ? Severity.CRITICAL : Severity.MAJOR

      const vio = await prisma.violation.create({
        data: {
          inspectionId: insp.id,
          establishmentId: est.id,
          category: category,
          severity: severity,
          description: `Compliance violation detected at ${item.name}: ${category.toLowerCase().replace('_', ' ')} deficiency.`,
          correctiveActionRequired: true,
          resolutionStatus: 'OPEN',
          isRecurring: item.score > 75,
          detectedAt: daysAgo(item.lastDays),
        },
      })

      await prisma.correctiveAction.create({
        data: {
          violationId: vio.id,
          establishmentId: est.id,
          inspectionId: insp.id,
          description: `Submit corrective evidence resolving ${category.toLowerCase().replace('_', ' ')} defect.`,
          status: CorrectiveActionStatus.REQUIRED,
          createdAt: daysAgo(item.lastDays),
        },
      })
    }
  }

  console.log(`🏨 Seeded total 25 establishments across San Francisco regions with realistic historical records.`)

  // 4. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: inspectorUser.id,
        title: 'Priority Inspection Overdue',
        message: 'Central Spice in Mission District requires urgent follow-up inspection.',
        type: 'ALERT',
        read: false,
        createdAt: daysAgo(1),
      },
      {
        userId: managerUser.id,
        title: 'New Cluster Detected',
        message: 'Cooling failures cluster detected around weekend delivery schedules in Mission District.',
        type: 'PATTERN_ALERT',
        read: false,
        createdAt: daysAgo(2),
      },
    ],
  })

  console.log('🔔 Created initial demo notifications.')
  console.log('✅ Seed process completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
