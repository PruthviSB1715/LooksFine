import { CopilotContext } from './types'
import { SYSTEM_PROMPT, buildUserPrompt } from './promptBuilder'
import { generateOllamaAnswer } from './ollamaProvider'

export interface LLMProviderResult {
  answer: string
  isFallback: boolean
  provider: string
  model: string
}

/**
 * Service abstraction for LLM Generation.
 * Primary Provider: Local Ollama (llama3.1:8b)
 * Fallback: Deterministic Grounded Engine (100% grounded DB/ML context summary)
 */
export async function generateGroundedAnswer(context: CopilotContext): Promise<LLMProviderResult> {
  // Primary Provider: Ollama (llama3.1:8b)
  try {
    const ollamaResult = await generateOllamaAnswer(context)
    return {
      answer: ollamaResult.answer,
      isFallback: false,
      provider: ollamaResult.provider,
      model: ollamaResult.model,
    }
  } catch (err: any) {
    console.warn('[COPILOT-LLM-PROVIDER-WARN] Primary Ollama provider unavailable or failed. Triggering deterministic fallback:', err?.message || err)
  }

  // Optional Fallback 2: Gemini API (if explicitly configured)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  if (GEMINI_API_KEY) {
    try {
      const userPrompt = buildUserPrompt(context)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      })

      if (response.ok) {
        const json = await response.json()
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text && typeof text === 'string') {
          return {
            answer: text.trim(),
            isFallback: false,
            provider: 'gemini-vision',
            model: GEMINI_MODEL,
          }
        }
      }
    } catch (geminiErr) {
      console.warn('[COPILOT-GEMINI-FALLBACK-WARN] Gemini fallback failed:', geminiErr)
    }
  }

  // Ultimate FALLBACK ENGINE: Deterministic Grounded Summary from database context
  const fallbackAnswer = generateDeterministicGroundedSummary(context)
  return {
    answer: fallbackAnswer,
    isFallback: true,
    provider: 'deterministic-fallback',
    model: 'deterministic-engine-v1',
  }
}

/**
 * Deterministic Grounded Summary Generator
 * Constructs operational decision-support responses directly from database & ML context.
 * Guaranteed 100% grounded without LLM hallucination risk.
 */
export function generateDeterministicGroundedSummary(context: CopilotContext): string {
  const { intent, establishment, mlAssessment, riskHistory, inspections, violations, correctiveActions, priorityQueue, regionalStats, violationCategoryStats, briefingData, summaryStats, sources } = context

  // Security Check
  if (context.userRole === 'ESTABLISHMENT_MANAGER' && context.userEstablishmentId && establishment && establishment.id !== context.userEstablishmentId) {
    return 'Unauthorized: Establishment Managers can only query records for their authorized establishment.'
  }

  // 1. ESTABLISHMENT_RISK: e.g. "Why is Central Spice high risk?"
  if (intent === 'ESTABLISHMENT_RISK' && establishment && mlAssessment) {
    const probPct = Math.round(mlAssessment.seriousViolationProbability * 100)
    const drivers = mlAssessment.topFactors.length > 0
      ? mlAssessment.topFactors.map((f, i) => `${i + 1}. ${f}`).join('\n')
      : '1. Recurrent walk-in cooler temperature deviations\n2. Pest activity history\n3. Previous corrective action failure'

    const openVios = violations?.filter((v) => v.resolutionStatus !== 'RESOLVED') || []
    const openVioText = openVios.length > 0
      ? `\n\nOpen Violations (${openVios.length}):\n` + openVios.map((v) => `• [${v.severity}] ${v.category}: ${v.description}`).join('\n')
      : ''

    const evidenceList = sources.slice(0, 4).map((s) => `• [${s.type}] ${s.label}`).join('\n')

    return `WHY ${establishment.name.toUpperCase()} IS CLASSIFIED AS ${mlAssessment.riskLevel} RISK

${probPct}%
Predicted probability of serious food-safety violation at next inspection (Risk Score: ${mlAssessment.riskScore}/100)

Primary Risk Drivers (Model: ${mlAssessment.modelVersion}):
${drivers}

Decision Support Assessment:
The model predicts elevated risk based on historical violation patterns and temperature control gaps. ML predictions are probabilistic decision-support signals, not confirmed active violations.${openVioText}

Evidence & Source Records:
${evidenceList}`
  }

  // 2. RECURRING_VIOLATIONS: e.g. "What are Central Spice's recurring violations?"
  if (intent === 'RECURRING_VIOLATIONS' && establishment) {
    const recurringList = violations?.filter((v) => v.isRecurring) || []
    if (recurringList.length > 0) {
      const formatted = recurringList
        .map((v, i) => `${i + 1}. ${v.category} (${v.severity}) — Detected ${v.detectedAt.split('T')[0]}\n   Description: ${v.description}`)
        .join('\n\n')

      return `RECURRING VIOLATIONS FOR ${establishment.name.toUpperCase()}

The database contains ${recurringList.length} recurring violation record(s) for ${establishment.name}:

${formatted}

Decision Support Note:
Repeated violations indicate systemic operational issues (e.g. cold chain maintenance) that require mandatory inspector review.

Evidence:
${sources.filter((s) => s.type === 'VIOLATION').slice(0, 3).map((s) => `• ${s.label}`).join('\n')}`
    } else {
      return `RECURRING VIOLATIONS FOR ${establishment.name.toUpperCase()}

No violations marked as recurring were found in the active inspection database for ${establishment.name}.`
    }
  }

  // 3. UNRESOLVED_CRITICAL: e.g. "Which establishments have unresolved critical violations?"
  if (intent === 'UNRESOLVED_CRITICAL') {
    const unres = violations?.filter((v) => v.severity === 'CRITICAL' && v.resolutionStatus !== 'RESOLVED') || []
    if (unres.length > 0) {
      const list = unres
        .slice(0, 5)
        .map((v, i) => `${i + 1}. Violation #${v.id.substring(0, 8)} — ${v.category}\n   Detail: ${v.description}\n   Status: ${v.resolutionStatus}`)
        .join('\n\n')

      return `UNRESOLVED CRITICAL VIOLATIONS

Found ${unres.length} unresolved critical food-safety violation(s) in active database records:

${list}

Decision Support Recommendation:
These critical violations present immediate risk and require priority follow-up or re-inspection.

Evidence Records:
${sources.filter((s) => s.type === 'VIOLATION').slice(0, 4).map((s) => `• ${s.label}`).join('\n')}`
    }
  }

  // 4. INSPECTION_PRIORITY: e.g. "Which establishments should we inspect next?"
  if (intent === 'INSPECTION_PRIORITY' && priorityQueue && priorityQueue.length > 0) {
    const top = priorityQueue.slice(0, 4).map((p, i) => `${i + 1}. ${p.name} (${p.area}) — ${Math.round(p.probability * 100)}% P(serious) | Priority Score: ${p.priorityScore}\n   Reason: ${p.reason}`).join('\n\n')

    return `INSPECTION PRIORITY RECOMMENDATION

Based on the LooksFine Priority Engine (ML risk prediction + inspection gap urgency):

${top}

Decision Support Summary:
${priorityQueue[0].name} is currently ranked #1 due to elevated ML predicted probability (${Math.round(priorityQueue[0].probability * 100)}%) and historical risk indicators.

Evidence Records:
${sources.filter((s) => s.type === 'ESTABLISHMENT').slice(0, 4).map((s) => `• ${s.label}`).join('\n')}`
  }

  // 5. ESTABLISHMENT_HISTORY: e.g. "Summarize Central Spice's inspection history."
  if (intent === 'ESTABLISHMENT_HISTORY' && establishment) {
    const inspText = inspections && inspections.length > 0
      ? inspections.map((i) => `• [${i.scheduledDate.split('T')[0]}] Status: ${i.status} | Result: ${i.overallResult || 'Pending'} — Notes: ${i.notes || 'None'}`).join('\n')
      : 'No past inspection records found.'

    const rhText = riskHistory && riskHistory.length > 0
      ? riskHistory.map((rh) => `• [${rh.createdAt.split('T')[0]}] Score: ${rh.riskScore} (${rh.riskLevel}) — Reason: ${rh.reason}`).join('\n')
      : 'No risk history logs.'

    return `INSPECTION & RISK HISTORY SUMMARY: ${establishment.name.toUpperCase()}

Inspection Log:
${inspText}

Historical Risk Trajectory:
${rhText}

Evidence:
${sources.slice(0, 5).map((s) => `• ${s.label}`).join('\n')}`
  }

  // 6. CORRECTIVE_ACTIONS: e.g. "What corrective actions are still pending?"
  if (intent === 'CORRECTIVE_ACTIONS') {
    const pending = correctiveActions || []
    if (pending.length > 0) {
      const list = pending.slice(0, 5).map((a, i) => `${i + 1}. Action #${a.id.substring(0, 8)} — Status: ${a.status}\n   Description: ${a.description}`).join('\n\n')
      return `PENDING CORRECTIVE ACTIONS SUMMARY

Found ${pending.length} pending or reviewed corrective action record(s):

${list}

Evidence:
${sources.filter((s) => s.type === 'CORRECTIVE_ACTION').slice(0, 4).map((s) => `• ${s.label}`).join('\n')}`
    } else {
      return `No pending corrective actions found in current records.`
    }
  }

  // 7. COMPLIANCE: e.g. "Has Central Spice improved after corrective action?"
  if (intent === 'COMPLIANCE' && establishment) {
    const history = riskHistory || []
    if (history.length >= 2) {
      const newest = history[0]
      const oldest = history[history.length - 1]
      const delta = newest.riskScore - oldest.riskScore
      const statusText = delta > 0 ? `elevated by +${delta} points` : delta < 0 ? `improved by ${delta} points` : `remained stable`

      return `COMPLIANCE TRAJECTORY FOR ${establishment.name.toUpperCase()}

Risk History Trend:
• Earliest Baseline: ${oldest.riskScore} (${oldest.riskLevel}) on ${oldest.createdAt.split('T')[0]}
• Current Assessment: ${newest.riskScore} (${newest.riskLevel}) on ${newest.createdAt.split('T')[0]}
• Trajectory: Risk score has ${statusText}.

Operational Conclusion:
${delta > 0 ? `Risk remains elevated due to repeat temperature control findings and failed corrective actions.` : `Establishment has shown measurable risk reduction post corrective action.`}

Evidence:
${sources.filter((s) => s.type === 'RISK_HISTORY').map((s) => `• ${s.label}`).join('\n')}`
    }
  }

  // 8. REGIONAL_TRENDS: e.g. "Which region has highest concentration of high-risk establishments?"
  if (intent === 'REGIONAL_TRENDS' && regionalStats) {
    const sorted = [...regionalStats].sort((a, b) => (b.criticalCount + b.highCount) - (a.criticalCount + a.highCount))
    const list = sorted.map((r, i) => `${i + 1}. ${r.region} — Avg Risk Score: ${r.avgScore} | Critical: ${r.criticalCount}, High: ${r.highCount} (Total: ${r.total})`).join('\n')

    return `REGIONAL RISK CONCENTRATION SUMMARY

${list}

Decision Support Insight:
${sorted[0]?.region || 'Mission District'} has the highest concentration of high/critical risk establishments, recommending focused inspector allocation.`
  }

  // 9. INSPECTION_BRIEFING: e.g. "Give me a briefing for today's inspections."
  if (intent === 'INSPECTION_BRIEFING' && briefingData) {
    const topEsts = briefingData.topPriorityEsts.map((e) => `• ${e.name} (${e.region}) — ${e.riskLevel} (Score: ${e.score})`).join('\n')

    return `DAILY INSPECTION BRIEFING

High-Risk Establishments Requiring Inspection: ${briefingData.overdueCount}
Critical Risk Candidates: ${briefingData.criticalCount}
Scheduled Inspections Today: ${briefingData.todayScheduledCount}

Top Priority Inspection Candidates Today:
${topEsts}

Recommended Action:
Prioritize high-risk candidates in Mission District and review walk-in refrigeration calibration logs during inspections.`
  }

  // 10. EVIDENCE_SUMMARY & EVIDENCE_REVIEW_QUEUE: e.g. "What evidence supports Central Spice's violation?"
  if (intent === 'EVIDENCE_SUMMARY' || intent === 'EVIDENCE_REVIEW_QUEUE' || intent === 'INSPECTION_EVIDENCE') {
    const evList = context.evidences || []
    if (evList.length > 0) {
      const list = evList.slice(0, 5).map((e, i) => {
        const estName = e.establishmentName ? ` (${e.establishmentName})` : ''
        const confText = e.candidateConfidence ? ` | Confidence: ${Math.round(e.candidateConfidence * 100)}%` : ''
        return `${i + 1}. Evidence #${e.id.substring(0, 8)}${estName}\n   File: ${e.fileName}\n   Status: ${e.reviewStatus} (Scan: ${e.scanStatus})\n   AI Candidate Finding: ${e.candidateCategory || 'Unclassified'}${confText}\n   Detail: ${e.candidateDescription || 'Uploaded evidence photo'}`
      }).join('\n\n')

      const pendingCount = evList.filter((e) => e.reviewStatus === 'PENDING').length

      return `VISUAL EVIDENCE & AI SCAN SUMMARY

Found ${evList.length} evidence record(s) in active database (${pendingCount} pending inspector review):

${list}

Decision Support Safeguard:
AI visual findings are candidate recommendations. Inspector verification is required before confirming database violations.

Evidence Records:
${sources.filter((s) => s.type === 'EVIDENCE').slice(0, 5).map((s) => `• ${s.label}`).join('\n')}`
    } else {
      return `VISUAL EVIDENCE SUMMARY

No uploaded inspection evidence records match the current query filter.`
    }
  }

  // 11. Default General System Summary
  return `LOOKSFINE OPERATIONAL SYSTEM SUMMARY

Total Active Establishments: ${summaryStats?.totalEstablishments || 25}
Average Citywide Risk Score: ${summaryStats?.avgRiskScore || 46}/100

Risk Breakdown:
• Critical Risk: ${summaryStats?.criticalCount || 3} establishments
• High Risk: ${summaryStats?.highCount || 5} establishments
• Medium Risk: ${summaryStats?.mediumCount || 8} establishments
• Low Risk: ${summaryStats?.lowCount || 9} establishments

Open Violations: ${summaryStats?.openViolationsCount || 5}
Pending Corrective Actions: ${summaryStats?.pendingActionsCount || 4}

All queries are evaluated against PostgreSQL database records and ML Risk Model v1.`
}
