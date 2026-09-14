import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Role, RiskLevel, InspectionStatus, ViolationCategory, Severity, CorrectiveActionStatus } from '../lib/constants'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed (Maharashtra Dataset)...')

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
  const hashedPassword = await bcrypt.hash('LooksFine@123', 10)

  // 1. Create Demo Users with Maharashtra Regions
  const adminUser = await prisma.user.create({
    data: {
      name: 'Dr. Neha Joshi',
      email: 'admin@looks-fine.local',
      password: hashedPassword,
      role: Role.FOOD_SAFETY_ADMIN,
      region: 'Maharashtra',
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      name: 'Sneha Deshmukh',
      email: 'manager@looks-fine.local',
      password: hashedPassword,
      role: Role.INSPECTION_MANAGER,
      region: 'Solapur',
    },
  })

  const inspectorUser = await prisma.user.create({
    data: {
      name: 'Rahul Patil',
      email: 'inspector@looks-fine.local',
      password: hashedPassword,
      role: Role.FOOD_SAFETY_INSPECTOR,
      region: 'Solapur',
    },
  })

  const establishmentUser = await prisma.user.create({
    data: {
      name: 'Amit Kulkarni',
      email: 'establishment@looks-fine.local',
      password: hashedPassword,
      role: Role.ESTABLISHMENT_MANAGER,
      region: 'Solapur',
    },
  })

  console.log('👤 Created PS3 demo accounts (Dr. Neha Joshi, Sneha Deshmukh, Rahul Patil, Amit Kulkarni).')

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  // 2. Create Flagship Establishment: Hotel Rajdhani (Solapur, Maharashtra)
  const hotelRajdhani = await prisma.establishment.create({
    data: {
      name: 'Hotel Rajdhani',
      type: 'Hotel',
      address: 'Station Road',
      city: 'Solapur',
      state: 'Maharashtra',
      latitude: 17.6599,
      longitude: 75.9064,
      operatingStatus: 'ACTIVE',
      assignedRegion: 'Solapur',
      riskLevel: RiskLevel.CRITICAL,
      currentRiskScore: 82,
      lastInspectionDate: daysAgo(18),
      nextInspectionDate: daysAgo(-3), // Overdue / urgent
    },
  })

  // Hotel Rajdhani Historical Risk Assessments & History
  await prisma.riskAssessment.createMany({
    data: [
      {
        establishmentId: hotelRajdhani.id,
        riskScore: 54,
        riskLevel: RiskLevel.MEDIUM,
        assessmentType: 'INITIAL_BASELINE',
        explanation: 'Initial baseline score calculated during annual inspection onboarding.',
        assessedAt: daysAgo(180),
      },
      {
        establishmentId: hotelRajdhani.id,
        riskScore: 68,
        riskLevel: RiskLevel.HIGH,
        assessmentType: 'POST_INSPECTION',
        explanation: 'Risk score elevated due to repeat cold chain gaps and temperature logging failures.',
        assessedAt: daysAgo(90),
      },
      {
        establishmentId: hotelRajdhani.id,
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
      { establishmentId: hotelRajdhani.id, riskScore: 54, riskLevel: RiskLevel.MEDIUM, reason: 'Annual Baseline', createdAt: daysAgo(180) },
      { establishmentId: hotelRajdhani.id, riskScore: 68, riskLevel: RiskLevel.HIGH, reason: 'Inspection finding: Temperature control', createdAt: daysAgo(90) },
      { establishmentId: hotelRajdhani.id, riskScore: 82, riskLevel: RiskLevel.CRITICAL, reason: 'Automated ML signal: Recurrent cold chain gaps', createdAt: daysAgo(18) },
    ],
  })

  // Hotel Rajdhani Past Inspections & Violations
  const hrInsp1 = await prisma.inspection.create({
    data: {
      establishmentId: hotelRajdhani.id,
      inspectorId: inspectorUser.id,
      scheduledDate: daysAgo(180),
      startedAt: daysAgo(180),
      submittedAt: daysAgo(180),
      status: InspectionStatus.REVIEWED,
      notes: 'Routine 6-month inspection. Noted minor storage issues and walk-in cooler calibration off by 4°F.',
      overallResult: 'CORRECTIVE_ACTION_REQUIRED',
    },
  })

  const hrVio1 = await prisma.violation.create({
    data: {
      inspectionId: hrInsp1.id,
      establishmentId: hotelRajdhani.id,
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
      violationId: hrVio1.id,
      establishmentId: hotelRajdhani.id,
      inspectionId: hrInsp1.id,
      description: 'Calibrate walk-in compressor, submit temperature logs twice daily for 14 days.',
      status: CorrectiveActionStatus.REJECTED,
      submittedEvidence: 'Submitted manual log sheet, but temperature readings remained uncalibrated at 46°F.',
      submittedAt: daysAgo(165),
      reviewedAt: daysAgo(160),
      reviewerId: inspectorUser.id,
      reviewNotes: 'Rejected due to insufficient cooling performance.',
    },
  })

  const hrInsp2 = await prisma.inspection.create({
    data: {
      establishmentId: hotelRajdhani.id,
      inspectorId: inspectorUser.id,
      scheduledDate: daysAgo(90),
      startedAt: daysAgo(90),
      submittedAt: daysAgo(90),
      status: InspectionStatus.CORRECTIVE_ACTION_REQUIRED,
      notes: 'Follow-up inspection. Cooling units still showing deviations. Evidence of pest entry near rear loading bay.',
      overallResult: 'UNSATISFACTORY',
    },
  })

  await prisma.violation.createMany({
    data: [
      {
        inspectionId: hrInsp2.id,
        establishmentId: hotelRajdhani.id,
        category: ViolationCategory.TEMPERATURE_CONTROL,
        severity: Severity.CRITICAL,
        description: 'Recurrent walk-in cooler temperature deviation (49°F). Food safety hazard.',
        correctiveActionRequired: true,
        resolutionStatus: 'OPEN',
        isRecurring: true,
        detectedAt: daysAgo(90),
      },
      {
        inspectionId: hrInsp2.id,
        establishmentId: hotelRajdhani.id,
        category: ViolationCategory.PESTS,
        severity: Severity.MAJOR,
        description: 'Pest activity observed near food storage shelving in rear stockroom.',
        correctiveActionRequired: true,
        resolutionStatus: 'OPEN',
        isRecurring: false,
        detectedAt: daysAgo(90),
      },
    ],
  })

  // Seed Evidence for Hotel Rajdhani Inspection
  await prisma.evidence.create({
    data: {
      inspectionId: hrInsp2.id,
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
      boundingBox: JSON.stringify({ x: 0.3, y: 0.25, width: 0.45, height: 0.4 }),
      reviewStatus: 'PENDING',
      uploadedAt: daysAgo(90),
    },
  })

  console.log('🌶️ Seeded Flagship Record: Hotel Rajdhani (Solapur) with complete violation, risk & evidence history.')

  // 3. Create 24 Additional Seed Establishments across Maharashtra
  const maharashtraEstablishmentsData = [
    { name: 'Siddheshwar Bhojanalaya', type: 'Restaurant', address: 'Old Pune Naka', region: 'Solapur', score: 74, level: RiskLevel.HIGH, lastDays: 9, lat: 17.6590, lng: 75.9060 },
    { name: 'Solapur Food Plaza', type: 'Grocery', address: 'Murarji Peth', region: 'Solapur', score: 45, level: RiskLevel.MEDIUM, lastDays: 14, lat: 17.6620, lng: 75.9080 },
    { name: 'Bhima Family Restaurant', type: 'Restaurant', address: 'Hotgi Road', region: 'Solapur', score: 52, level: RiskLevel.MEDIUM, lastDays: 21, lat: 17.6510, lng: 75.9120 },
    { name: 'Solapur Fresh Bakes', type: 'Bakery', address: 'Navi Peth', region: 'Solapur', score: 28, level: RiskLevel.LOW, lastDays: 2, lat: 17.6650, lng: 75.9040 },
    { name: 'Deccan Spice Kitchen', type: 'Restaurant', address: 'FC Road, Deccan Gymkhana', region: 'Pune', score: 85, level: RiskLevel.CRITICAL, lastDays: 5, lat: 18.5186, lng: 73.8417 },
    { name: 'Pune Family Restaurant', type: 'Restaurant', address: 'JM Road, Shivaji Nagar', region: 'Pune', score: 68, level: RiskLevel.HIGH, lastDays: 11, lat: 18.5284, lng: 73.8472 },
    { name: 'Shivneri Food House', type: 'Restaurant', address: 'Kothrud Depot', region: 'Pune', score: 72, level: RiskLevel.HIGH, lastDays: 8, lat: 18.5074, lng: 73.8077 },
    { name: 'Mula-Mutha Dining', type: 'Cafe', address: 'Kalyani Nagar', region: 'Pune', score: 38, level: RiskLevel.LOW, lastDays: 15, lat: 18.5482, lng: 73.9015 },
    { name: 'Sahyadri Grand Hotel', type: 'Hotel', address: 'Viman Nagar', region: 'Pune', score: 48, level: RiskLevel.MEDIUM, lastDays: 30, lat: 18.5679, lng: 73.9143 },
    { name: 'Pune Fresh Bakery', type: 'Bakery', address: 'Camp Area', region: 'Pune', score: 22, level: RiskLevel.LOW, lastDays: 3, lat: 18.5142, lng: 73.8778 },
    { name: 'Godavari Pure Veg', type: 'Restaurant', address: 'College Road', region: 'Nashik', score: 65, level: RiskLevel.HIGH, lastDays: 10, lat: 20.0063, lng: 73.7634 },
    { name: 'Panchavati Food Court', type: 'Food Truck', address: 'Panchavati Circle', region: 'Nashik', score: 42, level: RiskLevel.MEDIUM, lastDays: 25, lat: 20.0110, lng: 73.7930 },
    { name: 'Nashik Family Restaurant', type: 'Restaurant', address: 'Gangapur Road', region: 'Nashik', score: 55, level: RiskLevel.MEDIUM, lastDays: 18, lat: 20.0150, lng: 73.7580 },
    { name: 'Trimbak Road Kitchen', type: 'Cafe', address: 'Trimbak Road', region: 'Nashik', score: 30, level: RiskLevel.LOW, lastDays: 40, lat: 19.9950, lng: 73.7400 },
    { name: 'Mahalaxmi Dining', type: 'Restaurant', address: 'Tarabai Park', region: 'Kolhapur', score: 78, level: RiskLevel.HIGH, lastDays: 7, lat: 16.7050, lng: 74.2433 },
    { name: 'Kolhapur Spice House', type: 'Restaurant', address: 'Rajarampuri', region: 'Kolhapur', score: 63, level: RiskLevel.MEDIUM, lastDays: 16, lat: 16.6980, lng: 74.2390 },
    { name: 'Panhala Family Restaurant', type: 'Hotel', address: 'Rankala Lake Front', region: 'Kolhapur', score: 35, level: RiskLevel.LOW, lastDays: 22, lat: 16.6870, lng: 74.2180 },
    { name: 'Krishna Valley Restaurant', type: 'Restaurant', address: 'Vishrambag', region: 'Sangli', score: 58, level: RiskLevel.MEDIUM, lastDays: 20, lat: 16.8524, lng: 74.5815 },
    { name: 'Sangli Fresh Foods', type: 'Grocery', address: 'Market Yard', region: 'Sangli', score: 25, level: RiskLevel.LOW, lastDays: 35, lat: 16.8570, lng: 74.5900 },
    { name: 'Ajinkyatara Family Restaurant', type: 'Restaurant', address: 'Powai Naka', region: 'Satara', score: 50, level: RiskLevel.MEDIUM, lastDays: 28, lat: 17.6805, lng: 74.0183 },
    { name: 'Satara Food Corner', type: 'Cafe', address: 'Radhika Road', region: 'Satara', score: 20, level: RiskLevel.LOW, lastDays: 50, lat: 17.6850, lng: 74.0120 },
    { name: 'Nagar Spice Kitchen', type: 'Restaurant', address: 'Savedi Road', region: 'Ahmednagar', score: 66, level: RiskLevel.HIGH, lastDays: 12, lat: 19.1125, lng: 74.7245 },
    { name: 'Vidarbha Food House', type: 'Restaurant', address: 'Sitabuldi', region: 'Nagpur', score: 89, level: RiskLevel.CRITICAL, lastDays: 4, lat: 21.1458, lng: 79.0882 },
    { name: 'Sambhaji Family Restaurant', type: 'Restaurant', address: 'Cidco Sector 3', region: 'Chhatrapati Sambhajinagar', score: 60, level: RiskLevel.MEDIUM, lastDays: 17, lat: 19.8762, lng: 75.3433 },
  ]

  for (const item of maharashtraEstablishmentsData) {
    const est = await prisma.establishment.create({
      data: {
        name: item.name,
        type: item.type,
        address: item.address,
        city: item.region,
        state: 'Maharashtra',
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

  console.log(`🏨 Seeded total 25 establishments across Maharashtra cities (Solapur, Pune, Nashik, Kolhapur, Sangli, Satara, Ahmednagar, Nagpur, Chhatrapati Sambhajinagar) with realistic historical records.`)

  // 4. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: inspectorUser.id,
        title: 'Priority Inspection Overdue',
        message: 'Hotel Rajdhani in Solapur requires urgent follow-up inspection.',
        type: 'ALERT',
        read: false,
        createdAt: daysAgo(1),
      },
      {
        userId: managerUser.id,
        title: 'New Cluster Detected',
        message: 'Cooling failures cluster detected around weekend delivery schedules in Solapur.',
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
