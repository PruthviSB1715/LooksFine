// LooksFine Copilot Type Definitions

export type CopilotIntent =
  | 'ESTABLISHMENT_RISK'
  | 'ESTABLISHMENT_HISTORY'
  | 'RECURRING_VIOLATIONS'
  | 'UNRESOLVED_CRITICAL'
  | 'INSPECTION_PRIORITY'
  | 'OVERDUE_INSPECTIONS'
  | 'CORRECTIVE_ACTIONS'
  | 'COMPLIANCE'
  | 'REGIONAL_TRENDS'
  | 'VIOLATION_TRENDS'
  | 'INSPECTION_BRIEFING'
  | 'GENERAL_SYSTEM_QUERY'

export type CopilotSourceType =
  | 'ESTABLISHMENT'
  | 'INSPECTION'
  | 'VIOLATION'
  | 'CORRECTIVE_ACTION'
  | 'RISK_ASSESSMENT'
  | 'RISK_HISTORY'

export interface CopilotSource {
  type: CopilotSourceType
  id: string
  label: string
  establishmentId?: string
  date?: string
  relevance: string
}

export interface CopilotContext {
  intent: CopilotIntent
  userQuery: string
  userRole: string
  userRegion?: string | null
  userEstablishmentId?: string | null
  establishment?: {
    id: string
    name: string
    type: string
    address: string
    city: string
    state: string
    operatingStatus: string
    assignedRegion: string
    riskLevel: string
    currentRiskScore: number
    lastInspectionDate?: string | null
    nextInspectionDate?: string | null
  }
  mlAssessment?: {
    seriousViolationProbability: number
    riskScore: number
    riskLevel: string
    modelVersion: string
    topFactors: string[]
    isMLPrediction: boolean
  }
  riskHistory?: Array<{
    id: string
    riskScore: number
    riskLevel: string
    reason: string
    createdAt: string
  }>
  inspections?: Array<{
    id: string
    scheduledDate: string
    status: string
    notes?: string | null
    overallResult?: string | null
    inspectorName?: string
  }>
  violations?: Array<{
    id: string
    category: string
    severity: string
    description: string
    resolutionStatus: string
    isRecurring: boolean
    correctiveActionRequired: boolean
    detectedAt: string
    inspectionId?: string
  }>
  correctiveActions?: Array<{
    id: string
    description: string
    status: string
    submittedEvidence?: string | null
    reviewNotes?: string | null
    createdAt: string
    violationId?: string
  }>
  priorityQueue?: Array<{
    id: string
    name: string
    type: string
    area: string
    priorityScore: number
    probability: number
    riskLevel: string
    drivers: string[]
    reason: string
    lastInspectionDate: string
  }>
  regionalStats?: Array<{
    region: string
    total: number
    criticalCount: number
    highCount: number
    avgScore: number
  }>
  violationCategoryStats?: Array<{
    category: string
    count: number
    criticalCount: number
  }>
  briefingData?: {
    overdueCount: number
    criticalCount: number
    todayScheduledCount: number
    topPriorityEsts: Array<{ id: string; name: string; region: string; riskLevel: string; score: number }>
  }
  summaryStats?: {
    totalEstablishments: number
    avgRiskScore: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    openViolationsCount: number
    pendingActionsCount: number
  }
  sources: CopilotSource[]
}

export interface CopilotRequest {
  question: string
  establishmentId?: string
  conversationId?: string
}

export interface CopilotResponse {
  answer: string
  sources: CopilotSource[]
  intent: CopilotIntent
  establishment?: {
    id: string
    name: string
    riskLevel: string
    currentRiskScore: number
  }
  modelInfo?: {
    seriousViolationProbability: number
    riskScore: number
    riskLevel: string
    modelVersion: string
  }
  isFallback?: boolean
  conversationId?: string
}
