import { prisma } from '@/lib/prisma'
import { getMLRiskIntelligence } from '@/lib/services/mlRiskService'
import { getPrioritizedInspectionQueue } from '@/lib/services/priorityService'
import { ResolvedEstablishment } from './entityResolver'
import { CopilotContext, CopilotIntent, CopilotSource } from './types'
import { createSourceReference, deduplicateSources } from './citationService'
import { UserSessionPayload } from '@/lib/auth'

export async function buildCopilotContext(
  intent: CopilotIntent,
  query: string,
  establishment: ResolvedEstablishment | null,
  userSession?: UserSessionPayload | null
): Promise<CopilotContext> {
  const sources: CopilotSource[] = []
  const userRole = userSession?.role || 'FOOD_SAFETY_INSPECTOR'
  const userRegion = userSession?.region || null
  const userEstablishmentId = userSession?.establishmentId || (userSession?.role === 'ESTABLISHMENT_MANAGER' ? (userSession as any).authorizedEstablishmentId : null)

  // Security Role Check: Establishment Managers can ONLY query their own establishment
  if (userRole === 'ESTABLISHMENT_MANAGER' && userEstablishmentId && establishment && establishment.id !== userEstablishmentId) {
    console.warn(`[COPILOT-AUTH-DENIED] Establishment Manager ${userSession?.id} attempted access to ${establishment.name}`)
    return {
      intent,
      userQuery: query,
      userRole,
      userRegion,
      userEstablishmentId,
      establishment: {
        id: establishment.id,
        name: establishment.name,
        type: establishment.type,
        address: establishment.address,
        city: establishment.city,
        state: establishment.state,
        operatingStatus: establishment.operatingStatus,
        assignedRegion: establishment.assignedRegion,
        riskLevel: establishment.riskLevel,
        currentRiskScore: establishment.currentRiskScore,
      },
      sources: [],
    }
  }

  const context: CopilotContext = {
    intent,
    userQuery: query,
    userRole,
    userRegion,
    userEstablishmentId,
    sources: [],
  }

  // 1. If an Establishment is resolved, load detailed Establishment Context & ML Prediction
  if (establishment) {
    context.establishment = {
      id: establishment.id,
      name: establishment.name,
      type: establishment.type,
      address: establishment.address,
      city: establishment.city,
      state: establishment.state,
      operatingStatus: establishment.operatingStatus,
      assignedRegion: establishment.assignedRegion,
      riskLevel: establishment.riskLevel,
      currentRiskScore: establishment.currentRiskScore,
      lastInspectionDate: establishment.lastInspectionDate ? establishment.lastInspectionDate.toISOString() : null,
      nextInspectionDate: establishment.nextInspectionDate ? establishment.nextInspectionDate.toISOString() : null,
    }

    sources.push(
      createSourceReference(
        'ESTABLISHMENT',
        establishment.id,
        `Establishment: ${establishment.name}`,
        `Core establishment record (${establishment.type}, ${establishment.assignedRegion})`,
        establishment.id
      )
    )

    // Retrieve live ML Risk Assessment & SHAP drivers
    const mlInfo = await getMLRiskIntelligence(establishment.id)
    context.mlAssessment = {
      seriousViolationProbability: mlInfo.seriousViolationProbability,
      riskScore: mlInfo.riskScore,
      riskLevel: mlInfo.riskLevel,
      modelVersion: mlInfo.modelVersion,
      topFactors: mlInfo.topFactors,
      isMLPrediction: mlInfo.isMLPrediction,
    }

    sources.push(
      createSourceReference(
        'RISK_ASSESSMENT',
        `ml-${establishment.id}`,
        `ML Risk Assessment (${mlInfo.modelVersion})`,
        `ML serious violation probability: ${(mlInfo.seriousViolationProbability * 100).toFixed(0)}%, SHAP drivers: ${mlInfo.topFactors.slice(0, 2).join(', ')}`,
        establishment.id
      )
    )

    // Fetch Historical Risk Trajectory
    const riskHist = await prisma.riskHistory.findMany({
      where: { establishmentId: establishment.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    context.riskHistory = riskHist.map((rh) => ({
      id: rh.id,
      riskScore: rh.riskScore,
      riskLevel: rh.riskLevel,
      reason: rh.reason,
      createdAt: rh.createdAt.toISOString(),
    }))

    riskHist.forEach((rh) => {
      sources.push(
        createSourceReference(
          'RISK_HISTORY',
          rh.id,
          `Risk Log (${rh.createdAt.toISOString().split('T')[0]})`,
          `Historical score: ${rh.riskScore} (${rh.riskLevel}) - ${rh.reason}`,
          establishment.id,
          rh.createdAt
        )
      )
    })

    // Fetch Inspections History
    const inspections = await prisma.inspection.findMany({
      where: { establishmentId: establishment.id },
      include: { inspector: { select: { name: true } } },
      orderBy: { scheduledDate: 'desc' },
      take: 6,
    })
    context.inspections = inspections.map((i) => ({
      id: i.id,
      scheduledDate: i.scheduledDate.toISOString(),
      status: i.status,
      notes: i.notes,
      overallResult: i.overallResult,
      inspectorName: i.inspector?.name,
    }))

    inspections.forEach((i) => {
      sources.push(
        createSourceReference(
          'INSPECTION',
          i.id,
          `Inspection #${i.id.substring(0, 8)}`,
          `Status: ${i.status}, Result: ${i.overallResult || 'N/A'}, Inspector: ${i.inspector?.name || 'Assigned'}`,
          establishment.id,
          i.scheduledDate
        )
      )
    })

    // Fetch Violations History
    const violations = await prisma.violation.findMany({
      where: { establishmentId: establishment.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    context.violations = violations.map((v) => ({
      id: v.id,
      category: v.category,
      severity: v.severity,
      description: v.description,
      resolutionStatus: v.resolutionStatus,
      isRecurring: v.isRecurring,
      correctiveActionRequired: v.correctiveActionRequired,
      detectedAt: v.detectedAt.toISOString(),
      inspectionId: v.inspectionId,
    }))

    violations.forEach((v) => {
      sources.push(
        createSourceReference(
          'VIOLATION',
          v.id,
          `Violation #${v.id.substring(0, 8)} (${v.category})`,
          `Severity: ${v.severity}, Recurring: ${v.isRecurring ? 'YES' : 'NO'}, Status: ${v.resolutionStatus} - ${v.description}`,
          establishment.id,
          v.detectedAt
        )
      )
    })

    // Fetch Corrective Actions History
    const actions = await prisma.correctiveAction.findMany({
      where: { establishmentId: establishment.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    context.correctiveActions = actions.map((a) => ({
      id: a.id,
      description: a.description,
      status: a.status,
      submittedEvidence: a.submittedEvidence,
      reviewNotes: a.reviewNotes,
      createdAt: a.createdAt.toISOString(),
      violationId: a.violationId,
    }))

    actions.forEach((a) => {
      sources.push(
        createSourceReference(
          'CORRECTIVE_ACTION',
          a.id,
          `Corrective Action #${a.id.substring(0, 8)}`,
          `Status: ${a.status} - ${a.description}`,
          establishment.id,
          a.createdAt
        )
      )
    })

    // Fetch Evidence History for Establishment
    const evidenceItems = await prisma.evidence.findMany({
      where: { inspection: { establishmentId: establishment.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    context.evidences = evidenceItems.map((e) => ({
      id: e.id,
      fileName: e.fileName,
      scanStatus: e.scanStatus,
      reviewStatus: e.reviewStatus,
      candidateCategory: e.candidateCategory,
      candidateConfidence: e.candidateConfidence,
      candidateTitle: e.candidateTitle,
      candidateDescription: e.candidateDescription,
      storagePath: e.storagePath,
      violationId: e.violationId,
      createdAt: e.createdAt.toISOString(),
      establishmentName: establishment.name,
    }))

    evidenceItems.forEach((e) => {
      sources.push(
        createSourceReference(
          'EVIDENCE',
          e.id,
          `Evidence #${e.id.substring(0, 8)} (${e.fileName})`,
          `Status: ${e.reviewStatus}, Category: ${e.candidateCategory || 'Unclassified'}, Confidence: ${e.candidateConfidence ? Math.round(e.candidateConfidence * 100) + '%' : 'N/A'}`,
          establishment.id,
          e.createdAt
        )
      )
    })
  }

  // 2. Query-Specific Intent Retrievals
  if (intent === 'EVIDENCE_SUMMARY' || intent === 'EVIDENCE_REVIEW_QUEUE' || intent === 'INSPECTION_EVIDENCE') {
    const whereCondition: any = {}
    if (intent === 'EVIDENCE_REVIEW_QUEUE') {
      whereCondition.reviewStatus = 'PENDING'
    }

    const queriedEvidence = await prisma.evidence.findMany({
      where: whereCondition,
      include: {
        inspection: { select: { id: true, establishment: { select: { id: true, name: true, assignedRegion: true } } } },
        violation: { select: { id: true, category: true, severity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (!context.evidences) {
      context.evidences = queriedEvidence.map((e) => ({
        id: e.id,
        fileName: e.fileName,
        scanStatus: e.scanStatus,
        reviewStatus: e.reviewStatus,
        candidateCategory: e.candidateCategory,
        candidateConfidence: e.candidateConfidence,
        candidateTitle: e.candidateTitle,
        candidateDescription: e.candidateDescription,
        storagePath: e.storagePath,
        violationId: e.violationId,
        createdAt: e.createdAt.toISOString(),
        establishmentName: e.inspection?.establishment?.name,
      }))
    }

    queriedEvidence.forEach((e) => {
      sources.push(
        createSourceReference(
          'EVIDENCE',
          e.id,
          `Evidence: ${e.inspection?.establishment?.name || 'Inspection'} (${e.fileName})`,
          `Scan Status: ${e.scanStatus}, Review Status: ${e.reviewStatus}, Candidate Category: ${e.candidateCategory || 'Pending'}`,
          e.inspection?.establishment?.id,
          e.createdAt
        )
      )
    })
  }

  // 2. Query-Specific Intent Retrievals
  if (intent === 'INSPECTION_PRIORITY' || intent === 'OVERDUE_INSPECTIONS' || !establishment) {
    const queue = await getPrioritizedInspectionQueue(10)
    context.priorityQueue = queue.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      area: item.area,
      priorityScore: item.priorityScore,
      probability: item.probability,
      riskLevel: item.riskLevel,
      drivers: item.drivers,
      reason: item.reason,
      lastInspectionDate: item.lastInspectionDate,
    }))

    queue.slice(0, 5).forEach((item) => {
      sources.push(
        createSourceReference(
          'ESTABLISHMENT',
          item.id,
          `Priority Queue Candidate: ${item.name}`,
          `Priority score: ${item.priorityScore}, P(serious): ${(item.probability * 100).toFixed(0)}% [${item.reason}]`,
          item.id
        )
      )
    })
  }

  if (intent === 'UNRESOLVED_CRITICAL') {
    const openCriticals = await prisma.violation.findMany({
      where: {
        severity: 'CRITICAL',
        resolutionStatus: { not: 'RESOLVED' },
      },
      include: { establishment: { select: { id: true, name: true, assignedRegion: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (!context.violations) {
      context.violations = openCriticals.map((v) => ({
        id: v.id,
        category: v.category,
        severity: v.severity,
        description: `${v.establishment.name} (${v.establishment.assignedRegion}): ${v.description}`,
        resolutionStatus: v.resolutionStatus,
        isRecurring: v.isRecurring,
        correctiveActionRequired: v.correctiveActionRequired,
        detectedAt: v.detectedAt.toISOString(),
        inspectionId: v.inspectionId,
      }))
    }

    openCriticals.forEach((v) => {
      sources.push(
        createSourceReference(
          'VIOLATION',
          v.id,
          `Critical Violation: ${v.establishment.name}`,
          `Category: ${v.category}, Detected: ${v.detectedAt.toISOString().split('T')[0]}, Description: ${v.description}`,
          v.establishment.id,
          v.detectedAt
        )
      )
    })
  }

  if (intent === 'CORRECTIVE_ACTIONS') {
    const pendingActions = await prisma.correctiveAction.findMany({
      where: {
        status: { in: ['REQUIRED', 'SUBMITTED', 'REJECTED', 'REINSPECTION_REQUIRED'] },
      },
      include: { establishment: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (!context.correctiveActions) {
      context.correctiveActions = pendingActions.map((a) => ({
        id: a.id,
        description: `${a.establishment.name}: ${a.description}`,
        status: a.status,
        submittedEvidence: a.submittedEvidence,
        reviewNotes: a.reviewNotes,
        createdAt: a.createdAt.toISOString(),
        violationId: a.violationId,
      }))
    }

    pendingActions.forEach((a) => {
      sources.push(
        createSourceReference(
          'CORRECTIVE_ACTION',
          a.id,
          `Action #${a.id.substring(0, 8)} (${a.establishment.name})`,
          `Status: ${a.status} - ${a.description}`,
          a.establishment.id,
          a.createdAt
        )
      )
    })
  }

  if (intent === 'REGIONAL_TRENDS') {
    const estsByRegion = await prisma.establishment.groupBy({
      by: ['assignedRegion'],
      _count: { _all: true },
      _avg: { currentRiskScore: true },
    })

    const criticalByRegion = await prisma.establishment.groupBy({
      by: ['assignedRegion'],
      where: { riskLevel: 'CRITICAL' },
      _count: { _all: true },
    })

    const highByRegion = await prisma.establishment.groupBy({
      by: ['assignedRegion'],
      where: { riskLevel: 'HIGH' },
      _count: { _all: true },
    })

    context.regionalStats = estsByRegion.map((r) => {
      const crit = criticalByRegion.find((c) => c.assignedRegion === r.assignedRegion)?._count._all || 0
      const high = highByRegion.find((h) => h.assignedRegion === r.assignedRegion)?._count._all || 0
      return {
        region: r.assignedRegion,
        total: r._count._all,
        criticalCount: crit,
        highCount: high,
        avgScore: Math.round(r._avg.currentRiskScore || 0),
      }
    })
  }

  if (intent === 'VIOLATION_TRENDS') {
    const vioGroup = await prisma.violation.groupBy({
      by: ['category'],
      _count: { _all: true },
    })
    const critVioGroup = await prisma.violation.groupBy({
      by: ['category'],
      where: { severity: 'CRITICAL' },
      _count: { _all: true },
    })

    context.violationCategoryStats = vioGroup.map((vg) => ({
      category: vg.category,
      count: vg._count._all,
      criticalCount: critVioGroup.find((cvg) => cvg.category === vg.category)?._count._all || 0,
    }))
  }

  if (intent === 'INSPECTION_BRIEFING') {
    const overdueEsts = await prisma.establishment.findMany({
      where: { riskLevel: { in: ['CRITICAL', 'HIGH'] } },
      orderBy: { currentRiskScore: 'desc' },
      take: 5,
    })

    const todayInsps = await prisma.inspection.count({
      where: { status: 'SCHEDULED' },
    })

    context.briefingData = {
      overdueCount: overdueEsts.length,
      criticalCount: overdueEsts.filter((e) => e.riskLevel === 'CRITICAL').length,
      todayScheduledCount: todayInsps,
      topPriorityEsts: overdueEsts.map((e) => ({
        id: e.id,
        name: e.name,
        region: e.assignedRegion,
        riskLevel: e.riskLevel,
        score: e.currentRiskScore,
      })),
    }
  }

  // Aggregate General Summary Stats
  const totalCount = await prisma.establishment.count()
  const critCount = await prisma.establishment.count({ where: { riskLevel: 'CRITICAL' } })
  const highCount = await prisma.establishment.count({ where: { riskLevel: 'HIGH' } })
  const medCount = await prisma.establishment.count({ where: { riskLevel: 'MEDIUM' } })
  const lowCount = await prisma.establishment.count({ where: { riskLevel: 'LOW' } })
  const openVioCount = await prisma.violation.count({ where: { resolutionStatus: { not: 'RESOLVED' } } })
  const pendingCaCount = await prisma.correctiveAction.count({ where: { status: { in: ['REQUIRED', 'SUBMITTED', 'REJECTED'] } } })
  const avgRisk = await prisma.establishment.aggregate({ _avg: { currentRiskScore: true } })

  context.summaryStats = {
    totalEstablishments: totalCount,
    avgRiskScore: Math.round(avgRisk._avg.currentRiskScore || 0),
    criticalCount: critCount,
    highCount: highCount,
    mediumCount: medCount,
    lowCount: lowCount,
    openViolationsCount: openVioCount,
    pendingActionsCount: pendingCaCount,
  }

  context.sources = deduplicateSources(sources)

  return context
}
