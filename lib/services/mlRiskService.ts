import { prisma } from '@/lib/prisma'
import { RiskLevel, CorrectiveActionStatus } from '@/lib/constants'
import { calculateEstablishmentRisk, calculateEstablishmentRiskFromEst, RiskEvaluationResult } from '@/lib/services/riskService'

export interface MLPredictionResult {
  seriousViolationProbability: number
  riskScore: number
  riskLevel: RiskLevel
  modelVersion: string
  topFactors: string[]
  isMLPrediction: boolean
}

/**
 * Constructs historical feature payload from a pre-fetched establishment object in memory.
 */
export function buildEstablishmentFeaturePayloadFromEst(establishment: any) {
  if (!establishment) return null

  const now = new Date()
  const daysSinceLast = establishment.lastInspectionDate
    ? Math.floor((now.getTime() - new Date(establishment.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 90

  const prevVios = establishment.violations || []
  const prevCritical = prevVios.filter((v: any) => v.severity === 'CRITICAL').length
  const prevMajor = prevVios.filter((v: any) => v.severity === 'MAJOR').length
  const prevMinor = prevVios.filter((v: any) => v.severity === 'MINOR').length
  const unresolved = prevVios.filter((v: any) => v.resolutionStatus !== 'RESOLVED').length
  const recurring = prevVios.filter((v: any) => v.isRecurring).length

  const tempVios = prevVios.filter((v: any) => v.category === 'TEMPERATURE_CONTROL').length
  const sanitationVios = prevVios.filter((v: any) => v.category === 'SANITATION').length
  const pestVios = prevVios.filter((v: any) => v.category === 'PESTS').length

  const correctiveActions = establishment.correctiveActions || []
  const failedActions = correctiveActions.filter((a: any) => a.status === CorrectiveActionStatus.REJECTED).length
  const totalActions = correctiveActions.length
  const caSuccessRate = totalActions > 0
    ? correctiveActions.filter((a: any) => a.status === CorrectiveActionStatus.CLOSED).length / totalActions
    : 1.0

  return {
    establishment_id: establishment.id,
    establishment_type: establishment.type || 'Restaurant',
    region: establishment.assignedRegion || 'Solapur',
    days_since_last_inspection: daysSinceLast,
    prev_inspection_count: establishment.inspections ? establishment.inspections.length : 0,
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

  return buildEstablishmentFeaturePayloadFromEst(establishment)
}

/**
 * Executes ML Risk Inference via Python FastAPI microservice,
 * with graceful fallback to deterministic risk baseline if service is offline.
 */
export async function getMLRiskIntelligence(establishmentIdOrEst: string | any): Promise<MLPredictionResult> {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'
  let payload: any = null
  let establishmentObj: any = null

  try {
    if (typeof establishmentIdOrEst === 'string') {
      payload = await buildEstablishmentFeaturePayload(establishmentIdOrEst)
    } else if (establishmentIdOrEst && typeof establishmentIdOrEst === 'object') {
      establishmentObj = establishmentIdOrEst
      payload = buildEstablishmentFeaturePayloadFromEst(establishmentIdOrEst)
    }

    if (payload) {
      const response = await fetch(`${mlServiceUrl}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000), // 4 second timeout
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
    console.warn(`[ML-SERVICE-FALLBACK] FastAPI ML service unavailable at ${mlServiceUrl}. Using deterministic engine baseline.`)
  }

  // FALLBACK: Deterministic Baseline Engine
  const estId = typeof establishmentIdOrEst === 'string' ? establishmentIdOrEst : establishmentIdOrEst?.id
  const baseline: RiskEvaluationResult = establishmentObj
    ? calculateEstablishmentRiskFromEst(establishmentObj)
    : await calculateEstablishmentRisk(estId)
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
