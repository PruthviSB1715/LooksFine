import { prisma } from '@/lib/prisma'
import { UserSessionPayload } from '@/lib/auth'
import { getMLRiskIntelligence, MLPredictionResult } from '@/lib/services/mlRiskService'
import { CopilotSource } from '@/lib/services/copilot/types'
import { createSourceReference, deduplicateSources } from '@/lib/services/copilot/citationService'
import { generateOllamaAnswer } from '@/lib/services/copilot/ollamaProvider'

export interface PriorityFactor {
  factor: string
  explanation: string
  sourceIds: string[]
}

export interface InspectionFocusItem {
  area: string
  reason: string
  sourceIds: string[]
}

export interface FailedCorrectiveAction {
  id: string
  description: string
  status: string
  reviewNotes?: string | null
}

export interface UnresolvedIssue {
  id: string
  category: string
  severity: string
  description: string
  detectedAt: string
  isRecurring: boolean
}

export interface InspectorBriefingResponse {
  establishment: {
    id: string
    name: string
    type: string
    assignedRegion: string
    operatingStatus: string
    riskLevel: string
    currentRiskScore: number
    lastInspectionDate?: string | null
    daysSinceLastInspection?: number | null
  }
  riskSummary: {
    riskScore: number
    riskLevel: string
    seriousViolationProbability: number
    predictionSource: 'ml' | 'deterministic-fallback'
    modelVersion: string
    treeShapDrivers: string[]
  }
  priorityFactors: PriorityFactor[]
  recentHistory: {
    totalInspections: number
    lastInspectionDate?: string | null
    daysSinceLastInspection?: number | null
    criticalViolationsCount: number
    unresolvedViolationsCount: number
  }
  unresolvedIssues: UnresolvedIssue[]
  correctiveActionStatus: {
    totalActions: number
    pendingCount: number
    rejectedCount: number
    failedActions: FailedCorrectiveAction[]
  }
  inspectionFocus: InspectionFocusItem[]
  briefingText: string
  sources: CopilotSource[]
  provider: string
  providerModel: string
  predictionSource: 'ml' | 'deterministic-fallback'
  isFallback: boolean
}

/**
 * Server-side RBAC Authorization check for establishment briefing
 */
export function checkEstablishmentBriefingAuth(
  userSession: UserSessionPayload | null | undefined,
  establishment: { id: string; assignedRegion: string }
): { isAuthorized: boolean; reason?: string } {
  if (!userSession) {
    return { isAuthorized: false, reason: 'Authentication required' }
  }

  const role = userSession.role

  // FOOD_SAFETY_ADMIN has full scope access
  if (role === 'FOOD_SAFETY_ADMIN') {
    return { isAuthorized: true }
  }

  // ESTABLISHMENT_MANAGER can only access assigned establishment
  if (role === 'ESTABLISHMENT_MANAGER') {
    const userEstId = userSession.establishmentId || (userSession as any).authorizedEstablishmentId
    if (userEstId && userEstId === establishment.id) {
      return { isAuthorized: true }
    }
    return { isAuthorized: false, reason: 'Establishment Managers can only access their assigned establishment' }
  }

  // INSPECTION_MANAGER can access within authorized region scope
  if (role === 'INSPECTION_MANAGER') {
    if (!userSession.region || userSession.region === establishment.assignedRegion) {
      return { isAuthorized: true }
    }
    return { isAuthorized: false, reason: `Inspection Manager region scope (${userSession.region}) does not match establishment region (${establishment.assignedRegion})` }
  }

  // FOOD_SAFETY_INSPECTOR can access assigned establishments or within authorized region scope
  if (role === 'FOOD_SAFETY_INSPECTOR') {
    if (!userSession.region || userSession.region === establishment.assignedRegion) {
      return { isAuthorized: true }
    }
    return { isAuthorized: false, reason: `Inspector region scope (${userSession.region}) does not match establishment region (${establishment.assignedRegion})` }
  }

  return { isAuthorized: false, reason: 'Unauthorized role' }
}

export const BRIEFING_SYSTEM_PROMPT = `You are the LooksFine Pre-Inspection Briefing Assistant.
Your task is to generate a concise, grounded, and actionable briefing for a food safety inspector BEFORE visiting an establishment.

STRICT GROUNDING & ANTI-HALLUCINATION INSTRUCTIONS:
1. Use ONLY the authorized PostgreSQL database context and ML risk parameters supplied below.
2. NEVER invent:
   - inspection dates
   - violations or severity levels
   - corrective action records
   - risk scores or ML probabilities
   - evidence findings
   - inspector recommendations based on unsupported facts
3. Distinguish historical facts (e.g. database records of prior violations) from ML model predictions (e.g. TreeSHAP driver factors and predicted serious violation probability).
4. Distinguish ML predictions from deterministic baseline fallbacks. Never describe deterministic fallback as an ML prediction.
5. If specific data is missing or unavailable, explicitly state that it is unavailable. Never invent placeholder facts.
6. Never claim to have visually inspected an image. Evidence Scanner candidates are pending AI suggestions, NOT confirmed violations unless accepted by an authorized human.
7. Do not make legal decisions or prescribe regulatory penalties. The briefing is decision support only; the human inspector remains responsible for final findings.
8. Keep the briefing structured, professional, and operational for the inspector.`

/**
 * Main service entry point for generating an Inspector Briefing
 */
export async function generateInspectorBriefing(
  establishmentId: string,
  userSession?: UserSessionPayload | null
): Promise<InspectorBriefingResponse> {
  // 1. Resolve Establishment from PostgreSQL
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
  })

  if (!establishment) {
    throw new Error(`Establishment with ID '${establishmentId}' not found.`)
  }

  // 2. Server-side RBAC Authorization Check
  const authCheck = checkEstablishmentBriefingAuth(userSession, establishment)
  if (!authCheck.isAuthorized) {
    const error: any = new Error(authCheck.reason || 'Forbidden: Access to establishment briefing denied.')
    error.statusCode = 403
    throw error
  }

  // 3. Retrieve Live Risk & TreeSHAP Drivers via ML Risk Service
  const mlInfo: MLPredictionResult = await getMLRiskIntelligence(establishment.id)
  const predictionSource: 'ml' | 'deterministic-fallback' = mlInfo.isMLPrediction ? 'ml' : 'deterministic-fallback'

  // 4. Retrieve Historical Records from PostgreSQL
  const [inspections, violations, correctiveActions, evidenceItems] = await Promise.all([
    prisma.inspection.findMany({
      where: { establishmentId: establishment.id },
      include: { inspector: { select: { name: true } } },
      orderBy: { scheduledDate: 'desc' },
      take: 6,
    }),
    prisma.violation.findMany({
      where: { establishmentId: establishment.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.correctiveAction.findMany({
      where: { establishmentId: establishment.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.evidence.findMany({
      where: { inspection: { establishmentId: establishment.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  // 5. Build Authentic Database Source Citations
  const sources: CopilotSource[] = []

  sources.push(
    createSourceReference(
      'ESTABLISHMENT',
      establishment.id,
      `Establishment: ${establishment.name}`,
      `Profile record (${establishment.type}, ${establishment.assignedRegion})`,
      establishment.id
    )
  )

  sources.push(
    createSourceReference(
      'RISK_ASSESSMENT',
      `ml-${establishment.id}`,
      `ML Risk Intelligence (${mlInfo.modelVersion})`,
      `P(serious violation): ${(mlInfo.seriousViolationProbability * 100).toFixed(0)}%, Drivers: ${mlInfo.topFactors.join(', ')}`,
      establishment.id
    )
  )

  inspections.forEach((i) => {
    sources.push(
      createSourceReference(
        'INSPECTION',
        i.id,
        `Inspection #${i.id.substring(0, 8)}`,
        `Date: ${i.scheduledDate.toISOString().split('T')[0]}, Status: ${i.status}, Result: ${i.overallResult || 'N/A'}`,
        establishment.id,
        i.scheduledDate
      )
    )
  })

  violations.forEach((v) => {
    sources.push(
      createSourceReference(
        'VIOLATION',
        v.id,
        `Violation #${v.id.substring(0, 8)} (${v.category})`,
        `Severity: ${v.severity}, Status: ${v.resolutionStatus}, Recurring: ${v.isRecurring ? 'YES' : 'NO'}`,
        establishment.id,
        v.detectedAt
      )
    )
  })

  correctiveActions.forEach((a) => {
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

  evidenceItems.forEach((e) => {
    sources.push(
      createSourceReference(
        'EVIDENCE',
        e.id,
        `Evidence #${e.id.substring(0, 8)} (${e.fileName})`,
        `Review Status: ${e.reviewStatus}, Candidate Category: ${e.candidateCategory || 'Pending'}`,
        establishment.id,
        e.createdAt
      )
    )
  })

  const deduplicatedSources = deduplicateSources(sources)

  // 6. Compute Derived Focus & Summary Structure
  const daysSinceLast = establishment.lastInspectionDate
    ? Math.floor((Date.now() - new Date(establishment.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const openViolations = violations.filter((v) => v.resolutionStatus !== 'RESOLVED')
  const criticalViolations = violations.filter((v) => v.severity === 'CRITICAL')
  const failedActions = correctiveActions.filter((a) => a.status === 'REJECTED' || a.status === 'REINSPECTION_REQUIRED')
  const pendingActions = correctiveActions.filter((a) => a.status === 'REQUIRED' || a.status === 'SUBMITTED')

  // Derive Priority Factors
  const priorityFactors: PriorityFactor[] = []

  if (mlInfo.topFactors.length > 0) {
    mlInfo.topFactors.forEach((factor) => {
      priorityFactors.push({
        factor,
        explanation: `Identified by TreeSHAP risk model (${mlInfo.modelVersion}) as a primary driver of predicted serious violation probability (${(mlInfo.seriousViolationProbability * 100).toFixed(0)}%).`,
        sourceIds: [`ml-${establishment.id}`],
      })
    })
  } else {
    priorityFactors.push({
      factor: 'Baseline Risk Score Trajectory',
      explanation: `Current risk score is ${establishment.currentRiskScore}/100 (${establishment.riskLevel} risk tier). TreeSHAP driver breakdown unavailable for baseline model.`,
      sourceIds: [establishment.id],
    })
  }

  if (openViolations.length > 0) {
    priorityFactors.push({
      factor: `${openViolations.length} Unresolved Database Violation(s)`,
      explanation: `Establishment currently has ${openViolations.length} unresolved violation record(s) requiring inspector verification.`,
      sourceIds: openViolations.map((v) => v.id),
    })
  }

  if (failedActions.length > 0) {
    priorityFactors.push({
      factor: `${failedActions.length} Previously Failed/Rejected Corrective Action(s)`,
      explanation: `Past corrective evidence submitted was rejected or marked for reinspection by authorized reviewers.`,
      sourceIds: failedActions.map((a) => a.id),
    })
  }

  // Derive Inspection Focus Areas based on actual records
  const inspectionFocus: InspectionFocusItem[] = []

  const hasTempVios = violations.some((v) => v.category === 'TEMPERATURE_CONTROL' || v.category === 'IMPROPER_STORAGE')
  const hasSanitation = violations.some((v) => v.category === 'SANITATION' || v.category === 'FACILITY_HYGIENE')
  const hasPests = violations.some((v) => v.category === 'PESTS')
  const hasCrossContam = violations.some((v) => v.category === 'CROSS_CONTAMINATION')
  const hasHandling = violations.some((v) => v.category === 'UNSAFE_HANDLING')

  if (hasTempVios || mlInfo.topFactors.some((f) => f.toLowerCase().includes('cool') || f.toLowerCase().includes('temp') || f.toLowerCase().includes('cold'))) {
    inspectionFocus.push({
      area: 'Temperature Control & Refrigeration Calibration',
      reason: 'Historical records or TreeSHAP drivers indicate recurring cold chain deviations or improper holding temperatures.',
      sourceIds: violations.filter((v) => v.category === 'TEMPERATURE_CONTROL' || v.category === 'IMPROPER_STORAGE').map((v) => v.id),
    })
  }

  if (hasSanitation) {
    inspectionFocus.push({
      area: 'Sanitation & Facility Hygiene',
      reason: 'Recorded historical sanitation violations require verification of cleaning protocols and surface sanitization.',
      sourceIds: violations.filter((v) => v.category === 'SANITATION' || v.category === 'FACILITY_HYGIENE').map((v) => v.id),
    })
  }

  if (hasPests || mlInfo.topFactors.some((f) => f.toLowerCase().includes('pest'))) {
    inspectionFocus.push({
      area: 'Pest Activity & Vermin Exclusion',
      reason: 'Prior pest activity findings require inspection of food storage perimeter and pest control service logs.',
      sourceIds: violations.filter((v) => v.category === 'PESTS').map((v) => v.id),
    })
  }

  if (hasCrossContam) {
    inspectionFocus.push({
      area: 'Food Storage & Cross-Contamination Prevention',
      reason: 'Raw protein placement and food separation protocols must be physically verified during walk-through.',
      sourceIds: violations.filter((v) => v.category === 'CROSS_CONTAMINATION').map((v) => v.id),
    })
  }

  if (hasHandling) {
    inspectionFocus.push({
      area: 'Safe Food Handling & Employee Hygiene',
      reason: 'Employee handwashing and food preparation procedures require observation during active operations.',
      sourceIds: violations.filter((v) => v.category === 'UNSAFE_HANDLING').map((v) => v.id),
    })
  }

  if (failedActions.length > 0) {
    inspectionFocus.push({
      area: 'Verification of Previously Rejected Corrective Actions',
      reason: 'Prior corrective actions were rejected or required reinspection. Inspector must physically verify remediation.',
      sourceIds: failedActions.map((a) => a.id),
    })
  }

  if (inspectionFocus.length === 0) {
    inspectionFocus.push({
      area: 'General Operational Hygiene & Standard Compliance',
      reason: 'No specific high-severity violation patterns recorded. Perform standard routine inspection sweep.',
      sourceIds: [establishment.id],
    })
  }

  // Build Unresolved Issues & Failed Actions Arrays
  const unresolvedIssues: UnresolvedIssue[] = openViolations.map((v) => ({
    id: v.id,
    category: v.category,
    severity: v.severity,
    description: v.description,
    detectedAt: v.detectedAt.toISOString(),
    isRecurring: v.isRecurring,
  }))

  const failedActionsList: FailedCorrectiveAction[] = failedActions.map((a) => ({
    id: a.id,
    description: a.description,
    status: a.status,
    reviewNotes: a.reviewNotes,
  }))

  // 7. Format Grounded Context for Ollama Prompt
  const contextFormattedText = `ESTABLISHMENT PROFILE:
- Name: ${establishment.name}
- Type: ${establishment.type}
- Region: ${establishment.assignedRegion}
- Operating Status: ${establishment.operatingStatus}
- Risk Level: ${establishment.riskLevel}
- Risk Score: ${establishment.currentRiskScore}/100
- Last Inspection: ${establishment.lastInspectionDate ? establishment.lastInspectionDate.toISOString().split('T')[0] : 'None recorded'} (${daysSinceLast !== null ? `${daysSinceLast} days ago` : 'N/A'})

CURRENT RISK INTELLIGENCE:
- Prediction Source: ${predictionSource === 'ml' ? `ML Risk Model (${mlInfo.modelVersion})` : `Deterministic Baseline Fallback (${mlInfo.modelVersion})`}
- Predicted Serious Violation Probability: ${(mlInfo.seriousViolationProbability * 100).toFixed(1)}%
- TreeSHAP Top Drivers: ${mlInfo.topFactors.length > 0 ? mlInfo.topFactors.join(', ') : 'TreeSHAP drivers unavailable for baseline model'}

INSPECTION HISTORY (${inspections.length} recorded):
${inspections.map((i) => `  • [${i.scheduledDate.toISOString().split('T')[0]}] Status: ${i.status}, Result: ${i.overallResult || 'N/A'}, Inspector: ${i.inspector?.name || 'Assigned'}, Notes: ${i.notes || 'None'}`).join('\n')}

VIOLATION HISTORY (${violations.length} recorded, ${openViolations.length} unresolved):
${violations.map((v) => `  • [${v.severity}] ${v.category}: ${v.description} (Status: ${v.resolutionStatus}, Recurring: ${v.isRecurring ? 'YES' : 'NO'}, Date: ${v.detectedAt.toISOString().split('T')[0]})`).join('\n')}

CORRECTIVE ACTIONS (${correctiveActions.length} recorded, ${failedActions.length} failed/rejected):
${correctiveActions.map((a) => `  • [Status: ${a.status}] ${a.description} (Review Notes: ${a.reviewNotes || 'None'})`).join('\n')}

VISUAL EVIDENCE SCANNER RECORDS (${evidenceItems.length} items):
${evidenceItems.map((e) => `  • File: ${e.fileName}, Candidate Category: ${e.candidateCategory || 'Unclassified'}, Review Status: ${e.reviewStatus} (${e.reviewStatus === 'PENDING' ? 'AI Candidate Candidate Finding - Awaiting Human Review' : 'Inspector Reviewed'})`).join('\n')}

PRIORITIZED CHECKLIST FOCUS:
${inspectionFocus.map((f, idx) => `  ${idx + 1}. ${f.area}: ${f.reason}`).join('\n')}
`

  // 8. Attempt Grounded Reasoning via Ollama Llama 3.1 8B Provider
  let briefingText = ''
  let isFallback = false
  let provider = 'ollama'
  let providerModel = 'llama3.1:8b'

  try {
    const copilotContextMock: any = {
      intent: 'INSPECTION_BRIEFING',
      userQuery: `Generate an inspector briefing for ${establishment.name}`,
      userRole: userSession?.role || 'FOOD_SAFETY_INSPECTOR',
      userRegion: userSession?.region,
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
        lastInspectionDate: establishment.lastInspectionDate?.toISOString(),
      },
      mlAssessment: {
        seriousViolationProbability: mlInfo.seriousViolationProbability,
        riskScore: mlInfo.riskScore,
        riskLevel: mlInfo.riskLevel,
        modelVersion: mlInfo.modelVersion,
        topFactors: mlInfo.topFactors,
        isMLPrediction: mlInfo.isMLPrediction,
      },
      sources: deduplicatedSources,
    }

    const ollamaResult = await generateOllamaAnswer(copilotContextMock)
    briefingText = ollamaResult.answer
    provider = ollamaResult.provider
    providerModel = ollamaResult.model
    isFallback = ollamaResult.isFallback
  } catch (err: any) {
    console.warn('[INSPECTOR-BRIEFING-OLLAMA-WARN] Ollama Llama 3.1 8B provider unavailable or failed. Generating grounded deterministic fallback briefing:', err?.message || err)
    
    // Deterministic Fallback Briefing Generation (100% grounded from PostgreSQL + ML context)
    briefingText = generateDeterministicInspectorBriefingText(establishment, mlInfo, predictionSource, inspections, violations, openViolations, failedActions, inspectionFocus, deduplicatedSources)
    provider = 'deterministic-fallback'
    providerModel = 'deterministic-engine-v1'
    isFallback = true
  }

  // 9. Return Structured Inspector Briefing Payload
  return {
    establishment: {
      id: establishment.id,
      name: establishment.name,
      type: establishment.type,
      assignedRegion: establishment.assignedRegion,
      operatingStatus: establishment.operatingStatus,
      riskLevel: establishment.riskLevel,
      currentRiskScore: establishment.currentRiskScore,
      lastInspectionDate: establishment.lastInspectionDate ? establishment.lastInspectionDate.toISOString() : null,
      daysSinceLastInspection: daysSinceLast,
    },
    riskSummary: {
      riskScore: mlInfo.riskScore,
      riskLevel: mlInfo.riskLevel,
      seriousViolationProbability: mlInfo.seriousViolationProbability,
      predictionSource,
      modelVersion: mlInfo.modelVersion,
      treeShapDrivers: mlInfo.topFactors,
    },
    priorityFactors,
    recentHistory: {
      totalInspections: inspections.length,
      lastInspectionDate: establishment.lastInspectionDate ? establishment.lastInspectionDate.toISOString() : null,
      daysSinceLastInspection: daysSinceLast,
      criticalViolationsCount: criticalViolations.length,
      unresolvedViolationsCount: openViolations.length,
    },
    unresolvedIssues,
    correctiveActionStatus: {
      totalActions: correctiveActions.length,
      pendingCount: pendingActions.length,
      rejectedCount: failedActions.length,
      failedActions: failedActionsList,
    },
    inspectionFocus,
    briefingText,
    sources: deduplicatedSources,
    provider,
    providerModel,
    predictionSource,
    isFallback,
  }
}

/**
 * Generates a 100% Grounded Deterministic Inspector Briefing Text when local AI (Ollama) is unavailable.
 * Explicitly labeled as "Grounded fallback — local AI unavailable".
 */
export function generateDeterministicInspectorBriefingText(
  establishment: any,
  mlInfo: MLPredictionResult,
  predictionSource: 'ml' | 'deterministic-fallback',
  inspections: any[],
  violations: any[],
  openViolations: any[],
  failedActions: any[],
  inspectionFocus: InspectionFocusItem[],
  sources: CopilotSource[]
): string {
  const probPct = Math.round(mlInfo.seriousViolationProbability * 100)
  const sourceLabel = predictionSource === 'ml' ? `ML Risk Model (${mlInfo.modelVersion})` : `Deterministic Baseline (${mlInfo.modelVersion})`

  const driversList = mlInfo.topFactors.length > 0
    ? mlInfo.topFactors.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
    : '  1. TreeSHAP driver breakdown unavailable for baseline evaluation.'

  const focusList = inspectionFocus.map((f, i) => `  ${i + 1}. ${f.area}\n     Rationale: ${f.reason}`).join('\n\n')

  const openVioText = openViolations.length > 0
    ? openViolations.map((v) => `  • [${v.severity}] ${v.category}: ${v.description} (Detected: ${v.detectedAt.toISOString().split('T')[0]})`).join('\n')
    : '  • No unresolved violations recorded in database.'

  const failedActionText = failedActions.length > 0
    ? failedActions.map((a) => `  • Action #${a.id.substring(0, 8)} [${a.status}]: ${a.description}`).join('\n')
    : '  • No failed or rejected corrective actions recorded.'

  const citationsText = sources.slice(0, 6).map((s) => `  • [${s.type}] ${s.label}`).join('\n')

  return `Grounded fallback — local AI unavailable

PRE-INSPECTION BRIEFING: ${establishment.name.toUpperCase()} (${establishment.type}, ${establishment.assignedRegion})

1. RISK ASSESSMENT SUMMARY
• Current Risk Level: ${establishment.riskLevel} (Score: ${establishment.currentRiskScore}/100)
• Serious Violation Probability: ${probPct}% predicted by ${sourceLabel}
• Operating Status: ${establishment.operatingStatus}

2. WHY THIS ESTABLISHMENT NEEDS ATTENTION
${driversList}

3. PRIORITIZE DURING THIS INSPECTION
${focusList}

4. UNRESOLVED ISSUES & HISTORICAL FACTS
Unresolved Violations (${openViolations.length}):
${openVioText}

Corrective Action Status (${failedActions.length} rejected/failed):
${failedActionText}

5. DECISION SUPPORT SAFEGUARDS
This briefing is compiled from verified PostgreSQL database records and predictive risk intelligence to support pre-inspection preparation. The food safety inspector remains fully responsible for on-site inspection findings and regulatory decisions. AI Evidence Scanner candidates are unconfirmed suggestions until accepted by an authorized inspector.

VERIFIED SOURCES:
${citationsText}`
}
