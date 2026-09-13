import { prisma } from '@/lib/prisma'
import { RiskLevel, Severity, CorrectiveActionStatus } from '@/lib/constants'

export interface PrioritizedEstablishmentItem {
  id: string
  name: string
  type: string
  area: string
  score: number
  riskLevel: RiskLevel
  priorityScore: number
  isOverdue: boolean
  lastInspectionDate: string
  reason: string
  drivers: string[]
}

export async function getPrioritizedInspectionQueue(limit = 10): Promise<PrioritizedEstablishmentItem[]> {
  const establishments = await prisma.establishment.findMany({
    take: 50, // Retrieve top candidates for prioritization calculation
    orderBy: [{ currentRiskScore: 'desc' }, { lastInspectionDate: 'asc' }],
    include: {
      violations: {
        where: { resolutionStatus: { not: 'RESOLVED' } },
        orderBy: { createdAt: 'desc' },
      },
      correctiveActions: {
        where: { status: { in: [CorrectiveActionStatus.REQUIRED, CorrectiveActionStatus.REJECTED, CorrectiveActionStatus.REINSPECTION_REQUIRED] } },
      },
      riskAssessments: {
        orderBy: { assessedAt: 'desc' },
        take: 1,
      },
    },
  })

  const now = new Date()

  const prioritized = establishments.map((est) => {
    let priority = Math.round(est.currentRiskScore * 0.6) // Base weight from risk score
    const reasons: string[] = []
    const drivers: string[] = []

    // 1. Overdue Check
    const isOverdue = Boolean(est.nextInspectionDate && new Date(est.nextInspectionDate) < now)
    if (isOverdue) {
      priority += 20
      reasons.push('Inspection overdue')
    }

    // 2. Failed Corrective Action Check
    const failedAction = est.correctiveActions.find((a) => a.status === CorrectiveActionStatus.REJECTED)
    if (failedAction) {
      priority += 15
      reasons.push('Failed corrective action')
      drivers.push('Corrective action rejected')
    }

    // 3. Critical & Recurring Violations
    const criticalVio = est.violations.find((v) => v.severity === Severity.CRITICAL)
    if (criticalVio) {
      priority += 15
      reasons.push('Unresolved critical violation')
      drivers.push(`${criticalVio.category.toLowerCase().replace('_', ' ')} critical defect`)
    }

    const recurringVio = est.violations.find((v) => v.isRecurring)
    if (recurringVio) {
      priority += 10
      reasons.push('Recurring violation pattern')
      drivers.push('Repeat violation history')
    }

    // Parse SHAP / Risk factors if available in latest assessment
    if (est.riskAssessments.length > 0 && est.riskAssessments[0].explanation) {
      try {
        const parsed = JSON.parse(est.riskAssessments[0].explanation)
        if (Array.isArray(parsed)) {
          drivers.push(...parsed)
        }
      } catch {
        // Fallback string explanation
        drivers.push(est.riskAssessments[0].explanation)
      }
    }

    if (drivers.length === 0) {
      drivers.push('Temperature logs', 'Sanitation compliance')
    }

    const finalPriority = Math.min(100, Math.max(0, priority))
    const reasonText = reasons.length > 0 ? reasons.join(' + ') : 'Routine inspection priority'

    const daysAgoStr = est.lastInspectionDate
      ? `${Math.round((now.getTime() - new Date(est.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))} days ago`
      : 'Never inspected'

    return {
      id: est.id,
      name: est.name,
      type: est.type,
      area: est.assignedRegion,
      score: est.currentRiskScore,
      riskLevel: est.riskLevel as RiskLevel,
      priorityScore: finalPriority,
      isOverdue,
      lastInspectionDate: daysAgoStr,
      reason: reasonText,
      drivers: Array.from(new Set(drivers)).slice(0, 3),
    }
  })

  // Order by priority score descending
  prioritized.sort((a, b) => b.priorityScore - a.priorityScore)

  return prioritized.slice(0, limit)
}
