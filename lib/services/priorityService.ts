import { prisma } from '@/lib/prisma'
import { RiskLevel, Severity, CorrectiveActionStatus } from '@/lib/constants'
import { getMLRiskIntelligence } from '@/lib/services/mlRiskService'

export interface PrioritizedEstablishmentItem {
  id: string
  name: string
  type: string
  area: string
  score: number
  riskLevel: RiskLevel
  probability: number
  priorityScore: number
  isOverdue: boolean
  lastInspectionDate: string
  reason: string
  drivers: string[]
  modelVersion: string
}

/**
 * Calculates combined inspection priority score:
 * Combined Priority = (ML Serious Violation Probability * 40) + (Operational Urgency / Overdue * 25) + (Critical Violation Severity * 20) + (Failed Action History * 15)
 */
export async function getPrioritizedInspectionQueue(limit = 10): Promise<PrioritizedEstablishmentItem[]> {
  const establishments = await prisma.establishment.findMany({
    take: 50,
    orderBy: [{ currentRiskScore: 'desc' }, { lastInspectionDate: 'asc' }],
    include: {
      violations: {
        where: { resolutionStatus: { not: 'RESOLVED' } },
        orderBy: { createdAt: 'desc' },
      },
      correctiveActions: {
        where: { status: { in: [CorrectiveActionStatus.REQUIRED, CorrectiveActionStatus.REJECTED, CorrectiveActionStatus.REINSPECTION_REQUIRED] } },
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
      const criticalVio = est.violations.find((v) => v.severity === Severity.CRITICAL)
      const severityComp = criticalVio ? 20 : est.violations.length > 0 ? 10 : 0

      // 4. Failed Corrective Action Component (Weight: 15%)
      const failedAction = est.correctiveActions.find((a) => a.status === CorrectiveActionStatus.REJECTED)
      const actionComp = failedAction ? 15 : est.correctiveActions.length > 0 ? 8 : 0

      // Total Combined Priority Score (0 - 100)
      const priorityScore = Math.min(100, Math.round(mlScoreComp + overdueComp + severityComp + actionComp))

      // Build Rationale & Driver Callouts
      const reasons: string[] = []
      if (prob >= 0.75) reasons.push(`High ML serious violation probability (${(prob * 100).toFixed(0)}%)`)
      if (isOverdue) reasons.push('Inspection overdue')
      if (failedAction) reasons.push('Failed corrective action')
      if (criticalVio) reasons.push('Unresolved critical violation')

      const reasonText = reasons.length > 0 ? reasons.join(' + ') : 'Routine inspection priority'
      const daysAgoStr = est.lastInspectionDate
        ? `${daysSinceLast} days ago`
        : 'Never inspected'

      return {
        id: est.id,
        name: est.name,
        type: est.type,
        area: est.assignedRegion,
        score: mlIntel.riskScore,
        riskLevel: mlIntel.riskLevel,
        probability: prob,
        priorityScore,
        isOverdue,
        lastInspectionDate: daysAgoStr,
        reason: reasonText,
        drivers: mlIntel.topFactors,
        modelVersion: mlIntel.modelVersion,
      }
    })
  )

  // Order by combined priority score descending
  prioritized.sort((a, b) => b.priorityScore - a.priorityScore)

  return prioritized.slice(0, limit)
}
