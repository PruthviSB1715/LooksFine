import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Role, RiskLevel, InspectionStatus, ViolationCategory, Severity, CorrectiveActionStatus } from '../lib/constants'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed (Solapur & Maharashtra Dataset)...')

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
      name: 'Tukaram Munde',
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

  console.log('👤 Created demo accounts (Dr. Neha Joshi, Sneha Deshmukh, Tukaram Munde, Amit Kulkarni).')

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  // 2. Create Flagship Establishment: Hotel Rajdhani (Solapur, Maharashtra)
  const hotelRajdhani = await prisma.establishment.create({
    data: {
      name: 'Hotel Rajdhani',
      type: 'Hotel',
      address: 'Station Road, Sidheshwar Peth',
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

  // Link Establishment Manager user to Hotel Rajdhani
  await prisma.user.update({
    where: { id: establishmentUser.id },
    data: { region: 'Solapur' },
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

  // 3. Create Expanded Solapur Portfolio (29 Additional Establishments)
  const solapurPortfolioData = [
    // Priority Establishments in Solapur
    { name: 'Hotel Nisarg', type: 'Hotel', address: 'Sidheshwar Peth', city: 'Solapur', region: 'Solapur', score: 79, level: RiskLevel.CRITICAL, lastDays: 12, lat: 17.6605, lng: 75.9070, category: ViolationCategory.SANITATION, vSeverity: Severity.CRITICAL, vDesc: 'Unsanitary raw meat preparation table setup and cross-contamination risk.' },
    { name: 'Hotel Angraj', type: 'Hotel', address: 'Railway Lines', city: 'Solapur', region: 'Solapur', score: 74, level: RiskLevel.HIGH, lastDays: 22, lat: 17.6630, lng: 75.9090, category: ViolationCategory.PESTS, vSeverity: Severity.MAJOR, vDesc: 'Structural gaps around rear kitchen loading doors allowing pest entry.' },
    { name: 'Smokin\' Joe\'s Fresh Pizza', type: 'Restaurant', address: 'Saat Rasta', city: 'Solapur', region: 'Solapur', score: 58, level: RiskLevel.MEDIUM, lastDays: 14, lat: 17.6580, lng: 75.9040, category: ViolationCategory.IMPROPER_STORAGE, vSeverity: Severity.MAJOR, vDesc: 'Prepped pizza cheese and sauce missing discard date labels.' },
    { name: 'Hotel Kamat', type: 'Hotel', address: 'Samrat Chowk', city: 'Solapur', region: 'Solapur', score: 48, level: RiskLevel.MEDIUM, lastDays: 28, lat: 17.6560, lng: 75.9110, category: ViolationCategory.FACILITY_HYGIENE, vSeverity: Severity.MINOR, vDesc: 'Peeling ceiling paint near non-food prep dishwashing section.' },
    { name: 'Hotel Mantralaya', type: 'Hotel', address: 'Murarji Peth', city: 'Solapur', region: 'Solapur', score: 68, level: RiskLevel.HIGH, lastDays: 45, lat: 17.6640, lng: 75.9050, category: ViolationCategory.TEMPERATURE_CONTROL, vSeverity: Severity.CRITICAL, vDesc: 'Chiller unit holding dairy products at 47°F; inspection overdue.' },
    { name: 'Swad Hotel', type: 'Restaurant', address: 'Balives', city: 'Solapur', region: 'Solapur', score: 38, level: RiskLevel.LOW, lastDays: 8, lat: 17.6570, lng: 75.9020, category: null, vSeverity: null, vDesc: null },

    // Additional Solapur Demo Establishments
    { name: 'Shree Ganesh Family Restaurant', type: 'Restaurant', address: 'Jule Solapur', city: 'Solapur', region: 'Solapur', score: 64, level: RiskLevel.HIGH, lastDays: 16, lat: 17.6490, lng: 75.9180, category: ViolationCategory.IMPROPER_STORAGE, vSeverity: Severity.MAJOR, vDesc: 'Bulk grain sacks stored directly on floor without 6-inch elevation.' },
    { name: 'Solapur Spice Kitchen', type: 'Restaurant', address: 'Old Pune Naka', city: 'Solapur', region: 'Solapur', score: 81, level: RiskLevel.CRITICAL, lastDays: 6, lat: 17.6680, lng: 75.8990, category: ViolationCategory.TEMPERATURE_CONTROL, vSeverity: Severity.CRITICAL, vDesc: 'Hot holding unit holding cooked curries below 135°F safety threshold.' },
    { name: 'Siddheshwar Pure Veg', type: 'Restaurant', address: 'Sidheshwar Peth', city: 'Solapur', region: 'Solapur', score: 32, level: RiskLevel.LOW, lastDays: 5, lat: 17.6610, lng: 75.9065, category: null, vSeverity: null, vDesc: null },
    { name: 'Deccan Food House', type: 'Restaurant', address: 'Hotgi Road', city: 'Solapur', region: 'Solapur', score: 52, level: RiskLevel.MEDIUM, lastDays: 35, lat: 17.6515, lng: 75.9125, category: ViolationCategory.SANITATION, vSeverity: Severity.MINOR, vDesc: 'Handwashing sink blocked by stacked dishware.' },
    { name: 'Tuljai Restaurant', type: 'Restaurant', address: 'Akkalkot Road', city: 'Solapur', region: 'Solapur', score: 42, level: RiskLevel.MEDIUM, lastDays: 24, lat: 17.6470, lng: 75.9220, category: ViolationCategory.FACILITY_HYGIENE, vSeverity: Severity.MINOR, vDesc: 'Floor drain clogged in vegetable preparation area.' },
    { name: 'Maharashtra Bhojanalay', type: 'Restaurant', address: 'Rangraj Nagar', city: 'Solapur', region: 'Solapur', score: 71, level: RiskLevel.HIGH, lastDays: 10, lat: 17.6660, lng: 75.9140, category: ViolationCategory.CROSS_CONTAMINATION, vSeverity: Severity.CRITICAL, vDesc: 'Raw poultry stored above ready-to-eat cooked rice inside walk-in.' },
    { name: 'Pandharpur Road Food Court', type: 'Food Truck', address: 'Solapur-Pune Road', city: 'Solapur', region: 'Solapur', score: 66, level: RiskLevel.HIGH, lastDays: 19, lat: 17.6710, lng: 75.8920, category: ViolationCategory.UNSAFE_HANDLING, vSeverity: Severity.MAJOR, vDesc: 'Lack of dedicated mobile handwashing soap dispenser.' },
    { name: 'City Bites Cafe', type: 'Cafe', address: 'Saat Rasta', city: 'Solapur', region: 'Solapur', score: 29, level: RiskLevel.LOW, lastDays: 4, lat: 17.6585, lng: 75.9045, category: null, vSeverity: null, vDesc: null },
    { name: 'Saffron Family Restaurant', type: 'Restaurant', address: 'Vijapur Road', city: 'Solapur', region: 'Solapur', score: 55, level: RiskLevel.MEDIUM, lastDays: 21, lat: 17.6440, lng: 75.9080, category: ViolationCategory.IMPROPER_STORAGE, vSeverity: Severity.MINOR, vDesc: 'Chemical degreaser bottles stored near food packaging boxes.' },
    { name: 'Fresh Oven Bakery', type: 'Bakery', address: 'Navi Peth', city: 'Solapur', region: 'Solapur', score: 24, level: RiskLevel.LOW, lastDays: 3, lat: 17.6645, lng: 75.9035, category: null, vSeverity: null, vDesc: null },
    { name: 'Green Leaf Pure Veg', type: 'Restaurant', address: 'North Kasaba', city: 'Solapur', region: 'Solapur', score: 35, level: RiskLevel.LOW, lastDays: 11, lat: 17.6635, lng: 75.9015, category: null, vSeverity: null, vDesc: null },
    { name: 'The Local Kitchen', type: 'Restaurant', address: 'Samrat Chowk', city: 'Solapur', region: 'Solapur', score: 45, level: RiskLevel.MEDIUM, lastDays: 30, lat: 17.6565, lng: 75.9115, category: ViolationCategory.SANITATION, vSeverity: Severity.MINOR, vDesc: 'Prep table food contact surface requires sanitization logs.' },
    { name: 'Central Food Point', type: 'Cafe', address: 'Railway Lines', city: 'Solapur', region: 'Solapur', score: 62, level: RiskLevel.HIGH, lastDays: 15, lat: 17.6625, lng: 75.9095, category: ViolationCategory.PESTS, vSeverity: Severity.MAJOR, vDesc: 'Fly screen mesh torn at main kitchen ventilation window.' },
    { name: 'Krishna Dining Hall', type: 'Restaurant', address: 'Sidheshwar Peth', city: 'Solapur', region: 'Solapur', score: 30, level: RiskLevel.LOW, lastDays: 7, lat: 17.6600, lng: 75.9060, category: null, vSeverity: null, vDesc: null },
    { name: 'Swami Samarth Restaurant', type: 'Restaurant', address: 'Hyderabad Road', city: 'Solapur', region: 'Solapur', score: 40, level: RiskLevel.LOW, lastDays: 18, lat: 17.6530, lng: 75.9250, category: null, vSeverity: null, vDesc: null },
    { name: 'Jule Food Corner', type: 'Food Truck', address: 'Jule Solapur', city: 'Solapur', region: 'Solapur', score: 59, level: RiskLevel.MEDIUM, lastDays: 40, lat: 17.6485, lng: 75.9185, category: ViolationCategory.SANITATION, vSeverity: Severity.MAJOR, vDesc: 'Waste receptacle unlidded during active food preparation.' },
    { name: 'Vijapur Road Kitchen', type: 'Restaurant', address: 'Vijapur Road', city: 'Solapur', region: 'Solapur', score: 50, level: RiskLevel.MEDIUM, lastDays: 26, lat: 17.6435, lng: 75.9075, category: null, vSeverity: null, vDesc: null },
    { name: 'Solapur Tiffin House', type: 'School/College Cafeteria', address: 'Murarji Peth', city: 'Solapur', region: 'Solapur', score: 36, level: RiskLevel.LOW, lastDays: 9, lat: 17.6642, lng: 75.9055, category: null, vSeverity: null, vDesc: null },
    { name: 'Heritage Family Restaurant', type: 'Restaurant', address: 'Balives', city: 'Solapur', region: 'Solapur', score: 47, level: RiskLevel.MEDIUM, lastDays: 32, lat: 17.6575, lng: 75.9025, category: null, vSeverity: null, vDesc: null },
    { name: 'Urban Plate Cafe', type: 'Cafe', address: 'Railway Lines', city: 'Solapur', region: 'Solapur', score: 26, level: RiskLevel.LOW, lastDays: 2, lat: 17.6628, lng: 75.9088, category: null, vSeverity: null, vDesc: null },
    { name: 'Siddheshwar Bhojanalaya', type: 'Restaurant', address: 'Old Pune Naka', city: 'Solapur', region: 'Solapur', score: 73, level: RiskLevel.HIGH, lastDays: 13, lat: 17.6675, lng: 75.8995, category: ViolationCategory.TEMPERATURE_CONTROL, vSeverity: Severity.CRITICAL, vDesc: 'Refrigerated milk & dessert holding unit temperature at 48°F.' },
    { name: 'Solapur Food Plaza', type: 'Grocery', address: 'Murarji Peth', city: 'Solapur', region: 'Solapur', score: 44, level: RiskLevel.MEDIUM, lastDays: 22, lat: 17.6648, lng: 75.9062, category: ViolationCategory.EXPIRED_FOOD, vSeverity: Severity.MINOR, vDesc: 'Expired packaged bakery products found on front display shelf.' },
    { name: 'Solapur Fresh Bakes', type: 'Bakery', address: 'Navi Peth', city: 'Solapur', region: 'Solapur', score: 22, level: RiskLevel.LOW, lastDays: 5, lat: 17.6652, lng: 75.9032, category: null, vSeverity: null, vDesc: null },

    // Additional Regional Sites in Maharashtra for Regional Filter Compatibility
    { name: 'Deccan Spice Kitchen', type: 'Restaurant', address: 'FC Road, Deccan Gymkhana', city: 'Pune', region: 'Pune', score: 85, level: RiskLevel.CRITICAL, lastDays: 5, lat: 18.5186, lng: 73.8417, category: ViolationCategory.TEMPERATURE_CONTROL, vSeverity: Severity.CRITICAL, vDesc: 'Walk-in freezer defrost cycle failure causing temp rise.' },
    { name: 'Godavari Pure Veg', type: 'Restaurant', address: 'College Road', city: 'Nashik', region: 'Nashik', score: 65, level: RiskLevel.HIGH, lastDays: 10, lat: 20.0063, lng: 73.7634, category: ViolationCategory.SANITATION, vSeverity: Severity.MAJOR, vDesc: 'Sanitizer solution concentration below required PPM.' },
  ]

  for (const item of solapurPortfolioData) {
    const est = await prisma.establishment.create({
      data: {
        name: item.name,
        type: item.type,
        address: item.address,
        city: item.city,
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

    // Seed historical risk assessment & risk history
    await prisma.riskAssessment.create({
      data: {
        establishmentId: est.id,
        riskScore: item.score,
        riskLevel: item.level,
        assessmentType: 'INITIAL_BASELINE',
        explanation: `Baseline inspection risk score for ${item.name} in ${item.address}, ${item.city}.`,
        assessedAt: daysAgo(item.lastDays),
      },
    })

    await prisma.riskHistory.create({
      data: {
        establishmentId: est.id,
        riskScore: item.score,
        riskLevel: item.level,
        reason: item.level === RiskLevel.CRITICAL ? 'High risk score trajectory & open violation' : item.level === RiskLevel.HIGH ? 'Unresolved compliance violation' : 'Routine compliance calculation',
        createdAt: daysAgo(item.lastDays),
      },
    })

    // Create inspection record if establishment has an active finding or risk > 40
    if (item.category && item.vSeverity && item.vDesc) {
      const inspStatus = item.level === RiskLevel.CRITICAL ? InspectionStatus.CORRECTIVE_ACTION_REQUIRED : InspectionStatus.REVIEWED
      const inspResult = item.level === RiskLevel.CRITICAL ? 'UNSATISFACTORY' : 'CORRECTIVE_ACTION_REQUIRED'

      const insp = await prisma.inspection.create({
        data: {
          establishmentId: est.id,
          inspectorId: inspectorUser.id,
          scheduledDate: daysAgo(item.lastDays),
          startedAt: daysAgo(item.lastDays),
          submittedAt: daysAgo(item.lastDays),
          status: inspStatus,
          notes: `Routine inspection at ${item.name} (${item.address}). Compliance finding recorded.`,
          overallResult: inspResult,
        },
      })

      const vio = await prisma.violation.create({
        data: {
          inspectionId: insp.id,
          establishmentId: est.id,
          category: item.category,
          severity: item.vSeverity,
          description: item.vDesc,
          correctiveActionRequired: true,
          resolutionStatus: item.score > 70 ? 'OPEN' : 'RESOLVED',
          isRecurring: item.score > 75,
          detectedAt: daysAgo(item.lastDays),
          resolvedAt: item.score <= 70 ? daysAgo(item.lastDays - 2) : null,
        },
      })

      const actionStatus = item.score > 78
        ? CorrectiveActionStatus.REQUIRED
        : item.score > 65
        ? CorrectiveActionStatus.SUBMITTED
        : CorrectiveActionStatus.ACCEPTED

      await prisma.correctiveAction.create({
        data: {
          violationId: vio.id,
          establishmentId: est.id,
          inspectionId: insp.id,
          description: `Submit corrective action & temperature/sanitation verification for ${item.name}.`,
          status: actionStatus,
          submittedEvidence: actionStatus !== CorrectiveActionStatus.REQUIRED ? 'Submitted photo & digital temperature log sheet.' : null,
          submittedAt: actionStatus !== CorrectiveActionStatus.REQUIRED ? daysAgo(item.lastDays - 1) : null,
          reviewedAt: actionStatus === CorrectiveActionStatus.ACCEPTED ? daysAgo(item.lastDays - 2) : null,
          reviewerId: actionStatus === CorrectiveActionStatus.ACCEPTED ? inspectorUser.id : null,
          reviewNotes: actionStatus === CorrectiveActionStatus.ACCEPTED ? 'Verified & accepted by food safety inspector.' : null,
          createdAt: daysAgo(item.lastDays),
        },
      })
    } else {
      // Clean inspection record
      await prisma.inspection.create({
        data: {
          establishmentId: est.id,
          inspectorId: inspectorUser.id,
          scheduledDate: daysAgo(item.lastDays),
          startedAt: daysAgo(item.lastDays),
          submittedAt: daysAgo(item.lastDays),
          status: InspectionStatus.RESOLVED,
          notes: `Routine food safety inspection at ${item.name}. Satisfactory compliance maintained.`,
          overallResult: 'SATISFACTORY',
        },
      })
    }
  }

  console.log(`🏨 Seeded total 30 establishments in Solapur portfolio with realistic historical records.`)

  // 4. Seed Notifications
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
      {
        userId: inspectorUser.id,
        title: 'High Risk Establishment Alert',
        message: 'Hotel Nisarg elevated to Critical risk tier following raw food handling finding.',
        type: 'ALERT',
        read: false,
        createdAt: daysAgo(3),
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
