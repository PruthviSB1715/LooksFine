import { prisma } from '@/lib/prisma'
import { RiskLevel, Severity, CorrectiveActionStatus } from '@/lib/constants'
import { getMLRiskIntelligence } from '@/lib/services/mlRiskService'

export interface PriorityQueueFilters {
  limit?: number
  region?: string
  riskLevel?: RiskLevel
  type?: string
  overdueOnly?: boolean
  establishmentId?: string
}

export interface PrioritizedEstablishmentItem {
  rank: number
  id: string
  name: string
  type: string
  area: string
  score: number
  riskLevel: RiskLevel
  probability: number
  predictionSource: 'ml' | 'deterministic-fallback'
  modelVersion: string
  priorityScore: number
  recommendedUrgency: 'URGENT' | 'HIGH' | 'ROUTINE'
  isOverdue: boolean
  daysSinceInspection: number
  lastInspectionDate: string
  unresolvedViolations: number
  recurringViolations: number
  failedCorrectiveActions: number
  reason: string
  reasons: string[]
  drivers: string[]
}

/**
 * Calculates combined inspection priority score and returns ranked Smart Inspect Queue:
 * Combined Priority = (ML Serious Violation Probability * 40) + (Operational Urgency / Overdue * 25) + (Critical Violation Severity * 20) + (Failed Action History * 15)
 */
export async function getPrioritizedInspectionQueue(
  limitOrFilters: number | PriorityQueueFilters = 10
): Promise<PrioritizedEstablishmentItem[]> {
  const filters: PriorityQueueFilters =
    typeof limitOrFilters === 'number' ? { limit: limitOrFilters } : limitOrFilters

  const limit = filters.limit || 50

  const whereClause: any = {}
  if (filters.establishmentId) {
    whereClause.id = filters.establishmentId
  }
  if (filters.region) {
    whereClause.assignedRegion = filters.region
  }
  if (filters.type) {
    whereClause.type = filters.type
  }

  const establishments = await prisma.establishment.findMany({
    where: whereClause,
    take: 100,
    orderBy: [{ currentRiskScore: 'desc' }, { lastInspectionDate: 'asc' }],
    include: {
      violations: {
        orderBy: { createdAt: 'desc' },
      },
      correctiveActions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const now = new Date()

  const prioritized = await Promise.all(
    establishments.map(async (est) => {
      // Fetch ML Risk Intelligence Prediction for establishment
      const mlIntel = await getMLRiskIntelligence(est.id)
      const prob = mlIntel.seriousViolationProbability

      // 1. ML Serious Violation Probability Component (Weight: 40%)
      const mlScoreComp = prob * 40

      // 2. Operational Urgency / Overdue Component (Weight: 25%)
      const isOverdue = Boolean(est.nextInspectionDate && new Date(est.nextInspectionDate) < now)
      const daysSinceLast = est.lastInspectionDate
        ? Math.floor((now.getTime() - new Date(est.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
        : 90
      const overdueComp = isOverdue ? 25 : daysSinceLast > 60 ? 15 : 5

      // 3. Critical Violation Severity Component (Weight: 20%)
      const openViolations = est.violations.filter((v) => v.resolutionStatus !== 'RESOLVED')
      const criticalVio = openViolations.find((v) => v.severity === Severity.CRITICAL)
      const severityComp = criticalVio ? 20 : openViolations.length > 0 ? 10 : 0

      // 4. Failed Corrective Action Component (Weight: 15%)
      const failedActions = est.correctiveActions.filter((a) => a.status === CorrectiveActionStatus.REJECTED)
      const actionComp = failedActions.length > 0 ? 15 : est.correctiveActions.length > 0 ? 8 : 0

      // Total Combined Priority Score (0 - 100)
      const priorityScore = Math.min(100, Math.round(mlScoreComp + overdueComp + severityComp + actionComp))

      // Categorize Urgency
      const recommendedUrgency: 'URGENT' | 'HIGH' | 'ROUTINE' =
        priorityScore >= 80 ? 'URGENT' : priorityScore >= 50 ? 'HIGH' : 'ROUTINE'

      // Detailed Rationale Bullets ("Why inspect now?")
      const reasonBullets: string[] = []
      if (daysSinceLast > 60) {
        reasonBullets.push(`${daysSinceLast} days since last inspection (${isOverdue ? 'OVERDUE' : 'inspection cycle due'})`)
      } else {
        reasonBullets.push(`${daysSinceLast} days since last inspection`)
      }

      const tempVios = est.violations.filter((v) => v.category === 'TEMPERATURE_CONTROL').length
      if (tempVios > 0) {
        reasonBullets.push(`Recurring temperature-control violations (${tempVios} prior events)`)
      }

      if (openViolations.length > 0) {
        reasonBullets.push(`${openViolations.length} unresolved open violation(s)`)
      }

      if (failedActions.length > 0) {
        reasonBullets.push(`${failedActions.length} previous corrective action failed/rejected`)
      }

      if (criticalVio) {
        reasonBullets.push(`Unresolved critical violation logged`)
      }

      const pestVios = est.violations.filter((v) => v.category === 'PESTS').length
      if (pestVios > 0) {
        reasonBullets.push(`Pest activity history recorded (${pestVios} events)`)
      }

      if (reasonBullets.length === 0) {
        reasonBullets.push('Routine compliance inspection cycle')
      }

      // Concisely summarized reason line for legacy consumers
      const legacyReasons: string[] = []
      if (prob >= 0.75) legacyReasons.push(`High ML serious violation probability (${(prob * 100).toFixed(0)}%)`)
      if (isOverdue) legacyReasons.push('Inspection overdue')
      if (failedActions.length > 0) legacyReasons.push('Failed corrective action')
      if (criticalVio) legacyReasons.push('Unresolved critical violation')

      const reasonText = legacyReasons.length > 0 ? legacyReasons.join(' + ') : 'Routine inspection priority'
      const daysAgoStr = est.lastInspectionDate ? `${daysSinceLast} days ago` : 'Never inspected'

      const item: Omit<PrioritizedEstablishmentItem, 'rank'> = {
        id: est.id,
        name: est.name,
        type: est.type,
        area: est.assignedRegion,
        score: mlIntel.riskScore,
        riskLevel: mlIntel.riskLevel,
        probability: prob,
        predictionSource: mlIntel.isMLPrediction ? 'ml' : 'deterministic-fallback',
        modelVersion: mlIntel.modelVersion,
        priorityScore,
        recommendedUrgency,
        isOverdue,
        daysSinceInspection: daysSinceLast,
        lastInspectionDate: daysAgoStr,
        unresolvedViolations: openViolations.length,
        recurringViolations: est.violations.filter((v) => v.isRecurring).length,
        failedCorrectiveActions: failedActions.length,
        reason: reasonText,
        reasons: reasonBullets,
        drivers: mlIntel.topFactors,
      }

      return item
    })
  )

  let filtered = prioritized
  if (filters.riskLevel) {
    filtered = filtered.filter((item) => item.riskLevel === filters.riskLevel)
  }

  // Filter overdueOnly if requested
  if (filters.overdueOnly) {
    filtered = filtered.filter((item) => item.isOverdue || item.daysSinceInspection > 60)
  }

  // Order by combined priority score descending
  filtered.sort((a, b) => b.priorityScore - a.priorityScore)

  // Assign 1-indexed rank after sorting
  const ranked: PrioritizedEstablishmentItem[] = filtered.slice(0, limit).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }))

  return ranked
}
