import { prisma } from '@/lib/prisma'
import { RiskLevel, CorrectiveActionStatus } from '@/lib/constants'
import { calculateEstablishmentRisk, RiskEvaluationResult } from '@/lib/services/riskService'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

export interface MLPredictionResult {
  seriousViolationProbability: number
  riskScore: number
  riskLevel: RiskLevel
  modelVersion: string
  topFactors: string[]
  isMLPrediction: boolean
}

/**
 * Constructs historical feature payload from database records.
 * STRICTLY PREVENTS TARGET LEAKAGE: Computes features using historical data prior to current moment.
 */
export async function buildEstablishmentFeaturePayload(establishmentId: string) {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    include: {
      violations: { orderBy: { createdAt: 'desc' } },
      correctiveActions: { orderBy: { createdAt: 'desc' } },
      inspections: { orderBy: { scheduledDate: 'desc' } },
    },
  })

  if (!establishment) return null

  const now = new Date()
  const daysSinceLast = establishment.lastInspectionDate
    ? Math.floor((now.getTime() - new Date(establishment.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 90

  const prevVios = establishment.violations
  const prevCritical = prevVios.filter((v) => v.severity === 'CRITICAL').length
  const prevMajor = prevVios.filter((v) => v.severity === 'MAJOR').length
  const prevMinor = prevVios.filter((v) => v.severity === 'MINOR').length
  const unresolved = prevVios.filter((v) => v.resolutionStatus !== 'RESOLVED').length
  const recurring = prevVios.filter((v) => v.isRecurring).length

  const tempVios = prevVios.filter((v) => v.category === 'TEMPERATURE_CONTROL').length
  const sanitationVios = prevVios.filter((v) => v.category === 'SANITATION').length
  const pestVios = prevVios.filter((v) => v.category === 'PESTS').length

  const failedActions = establishment.correctiveActions.filter((a) => a.status === CorrectiveActionStatus.REJECTED).length
  const totalActions = establishment.correctiveActions.length
  const caSuccessRate = totalActions > 0
    ? establishment.correctiveActions.filter((a) => a.status === CorrectiveActionStatus.CLOSED).length / totalActions
    : 1.0

  return {
    establishment_id: establishment.id,
    establishment_type: establishment.type || 'Restaurant',
    region: establishment.assignedRegion || 'Solapur',
    days_since_last_inspection: daysSinceLast,
    prev_inspection_count: establishment.inspections.length,
    prev_violation_count: prevVios.length,
    prev_critical_violation_count: prevCritical,
    prev_major_violation_count: prevMajor,
    prev_minor_violation_count: prevMinor,
    unresolved_violation_count: unresolved,
    recurring_violation_count: recurring,
    temp_control_violation_count: tempVios,
    sanitation_violation_count: sanitationVios,
    pest_violation_count: pestVios,
    failed_corrective_action_count: failedActions,
    corrective_action_success_rate: caSuccessRate,
  }
}

/**
 * Executes ML Risk Inference via Python FastAPI microservice,
 * with graceful fallback to deterministic risk baseline if service is offline.
 */
export async function getMLRiskIntelligence(establishmentId: string): Promise<MLPredictionResult> {
  try {
    const payload = await buildEstablishmentFeaturePayload(establishmentId)

    if (payload) {
      const response = await fetch(`${ML_SERVICE_URL}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2500), // 2.5 second timeout
      })

      if (response.ok) {
        const json = await response.json()
        return {
          seriousViolationProbability: json.serious_violation_probability,
          riskScore: json.risk_score,
          riskLevel: json.risk_level as RiskLevel,
          modelVersion: json.model_version || 'risk-model-v1',
          topFactors: json.top_factors || [],
          isMLPrediction: true,
        }
      }
    }
  } catch (err) {
    console.warn(`[ML-SERVICE-FALLBACK] FastAPI ML service unavailable at ${ML_SERVICE_URL}. Using deterministic engine baseline:`, err)
  }

  // FALLBACK: Deterministic Baseline Engine
  const baseline: RiskEvaluationResult = await calculateEstablishmentRisk(establishmentId)
  const prob = Math.min(0.95, Math.max(0.10, baseline.riskScore / 100))

  return {
    seriousViolationProbability: prob,
    riskScore: baseline.riskScore,
    riskLevel: baseline.riskLevel,
    modelVersion: 'deterministic-baseline-v1',
    topFactors: baseline.factors,
    isMLPrediction: false,
  }
}

/**
 * Calculates ML risk prediction and persists Assessment + History logs in database.
 */
export async function evaluateAndPersistMLRisk(establishmentId: string) {
  const result = await getMLRiskIntelligence(establishmentId)

  await prisma.$transaction([
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
        assessmentType: result.isMLPrediction ? 'ML_PREDICTION' : 'DETERMINISTIC_BASELINE',
        explanation: JSON.stringify({
          probability: result.seriousViolationProbability,
          modelVersion: result.modelVersion,
          factors: result.topFactors,
        }),
      },
    }),
    prisma.riskHistory.create({
      data: {
        establishmentId,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        reason: `Evaluated via ${result.modelVersion} (P=${(result.seriousViolationProbability * 100).toFixed(0)}%): ${result.topFactors.join(', ')}`,
      },
    }),
  ])

  return result
}
