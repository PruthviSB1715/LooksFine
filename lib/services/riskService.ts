import { prisma } from '@/lib/prisma'
import { RiskLevel, Severity, CorrectiveActionStatus } from '@/lib/constants'

export interface RiskEvaluationResult {
  riskScore: number
  riskLevel: RiskLevel
  factors: string[]
}

/**
 * Calculates deterministic risk score & risk level for an establishment
 * based on active violations, recurrence, corrective action history, and inspection age.
 */
export async function calculateEstablishmentRisk(establishmentId: string): Promise<RiskEvaluationResult> {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    include: {
      violations: {
        include: { correctiveActions: true },
        orderBy: { createdAt: 'desc' },
      },
      correctiveActions: {
        orderBy: { createdAt: 'desc' },
      },
      inspections: {
        orderBy: { scheduledDate: 'desc' },
        take: 5,
      },
    },
  })

  if (!establishment) {
    return { riskScore: 50, riskLevel: RiskLevel.MEDIUM, factors: ['Establishment record not found'] }
  }

  let calculatedScore = 20 // Base baseline score
  const factors: string[] = []

  // 1. Analyze Recent & Active Violations
  const activeViolations = establishment.violations.filter((v) => v.resolutionStatus !== 'RESOLVED')
  let criticalCount = 0
  let majorCount = 0
  let recurringCount = 0

  for (const vio of activeViolations) {
    if (vio.severity === Severity.CRITICAL) {
      calculatedScore += 25
      criticalCount++
    } else if (vio.severity === Severity.MAJOR) {
      calculatedScore += 15
      majorCount++
    } else {
      calculatedScore += 5
    }

    if (vio.isRecurring) {
      calculatedScore += 15
      recurringCount++
    }
  }

  if (criticalCount > 0) {
    factors.push(`Cold chain / Critical violations (${criticalCount} open)`)
  }
  if (majorCount > 0 && criticalCount === 0) {
    factors.push(`Major sanitation/facility defects (${majorCount} active)`)
  }
  if (recurringCount > 0) {
    factors.push(`Repeat violations (${recurringCount} recurring)`)
  }

  // 2. Analyze Corrective Action Failure History
  const failedActions = establishment.correctiveActions.filter((a) => a.status === CorrectiveActionStatus.REJECTED)
  if (failedActions.length > 0) {
    calculatedScore += 20
    factors.push('Previous corrective action failed')
  }

  const openActions = establishment.correctiveActions.filter(
    (a) => a.status === CorrectiveActionStatus.REQUIRED || a.status === CorrectiveActionStatus.REINSPECTION_REQUIRED
  )
  if (openActions.length > 0 && failedActions.length === 0) {
    calculatedScore += 10
    factors.push('Corrective action pending verification')
  }

  // 3. Analyze Time Elapsed & Overdue Status
  if (establishment.lastInspectionDate) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(establishment.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLast > 90) {
      calculatedScore += 15
      factors.push(`Inspection gap (${daysSinceLast} days since last inspection)`)
    }
  } else {
    calculatedScore += 10
    factors.push('No prior inspection history recorded')
  }

  if (establishment.nextInspectionDate && new Date(establishment.nextInspectionDate) < new Date()) {
    calculatedScore += 10
    if (!factors.includes('Inspection overdue')) {
      factors.push('Inspection overdue')
    }
  }

  // Baseline fallback factors if clean
  if (factors.length === 0) {
    factors.push('Routine sanitation compliance maintained')
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, calculatedScore))

  // Determine Risk Level
  let level: RiskLevel = RiskLevel.LOW
  if (finalScore >= 80) {
    level = RiskLevel.CRITICAL
  } else if (finalScore >= 61) {
    level = RiskLevel.HIGH
  } else if (finalScore >= 36) {
    level = RiskLevel.MEDIUM
  }

  return {
    riskScore: finalScore,
    riskLevel: level,
    factors: factors.slice(0, 3), // Return top 3 factors
  }
}

/**
 * Calculates dynamic risk score and persists RiskAssessment + RiskHistory records.
 */
export async function calculateAndPersistEstablishmentRisk(
  establishmentId: string,
  assessmentType = 'POST_INSPECTION'
) {
  const result = await calculateEstablishmentRisk(establishmentId)

  // Fetch current score for delta calculation
  const current = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { currentRiskScore: true },
  })

  const prevScore = current?.currentRiskScore ?? result.riskScore
  const deltaVal = result.riskScore - prevScore
  const scoreDelta = deltaVal > 0 ? `+${deltaVal}` : `${deltaVal}`

  // Transactionally update establishment and append history
  const [updatedEstablishment] = await prisma.$transaction([
    prisma.establishment.update({
      where: { id: establishmentId },
      data: {
        currentRiskScore: result.riskScore,
        riskLevel: result.riskLevel,
      },
    }),
    prisma.riskAssessment.create({
      data: {
        establishmentId,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        assessmentType,
        explanation: JSON.stringify(result.factors),
      },
    }),
    prisma.riskHistory.create({
      data: {
        establishmentId,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        reason: `Risk score recalculated via ${assessmentType}: ${result.factors.join(', ')}`,
      },
    }),
  ])

  return {
    establishment: updatedEstablishment,
    assessment: result,
    scoreDelta,
  }
}
