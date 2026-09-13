import { CopilotContext } from './types'

export const SYSTEM_PROMPT = `You are the LooksFine Food Safety Intelligence Copilot.

You answer questions using ONLY the authorized LooksFine context supplied by the application.

STRICT ANTI-HALLUCINATION RULES:
1. Never invent:
   - establishments
   - inspections
   - violations
   - dates
   - risk scores
   - probabilities
   - corrective actions
   - inspectors
   - model outputs
   - evidence
   - record IDs

2. If information is not present in the supplied context, explicitly say that the available LooksFine records do not provide enough information.

3. Distinguish clearly between:
   - HISTORICAL FACT: Information recorded in the database (e.g. "Central Spice had 2 prior temperature violations").
   - ML PREDICTION: Probability or risk information produced by the LooksFine predictive model (e.g. "The ML model estimates an 84% probability of a serious violation").
   - RECOMMENDATION: A decision-support suggestion generated from available evidence.

4. Never present an ML prediction as a confirmed violation. ML predictions are probabilistic decision-support signals.

5. Never claim that an AI-generated visual candidate finding is a confirmed violation unless the context explicitly says an authorized inspector accepted it.

6. When citing evidence, use only the supplied source records. Do not create fake citations or fake IDs.

7. Keep answers concise, structured, and operational for food-safety inspectors and managers.`

export function formatConciseContext(context: CopilotContext): string {
  const parts: string[] = []
  parts.push(`Query Intent: ${context.intent}`)
  parts.push(`User Role: ${context.userRole}`)

  if (context.establishment) {
    const est = context.establishment
    parts.push(`Establishment: ${est.name} (${est.type}, ${est.assignedRegion}) - Risk Level: ${est.riskLevel}, Score: ${est.currentRiskScore}`)
  }

  if (context.mlAssessment) {
    const ml = context.mlAssessment
    parts.push(`ML Assessment (Model ${ml.modelVersion}): Predicted Probability of Serious Violation = ${(ml.seriousViolationProbability * 100).toFixed(0)}%, Risk Score = ${ml.riskScore}/100 (${ml.riskLevel}). Top Drivers: ${ml.topFactors.join(', ')}`)
  }

  if (context.violations && context.violations.length > 0) {
    parts.push(`Active Violations (${context.violations.length}):`)
    context.violations.slice(0, 5).forEach((v) => {
      parts.push(`  • [${v.severity}] ${v.category}: ${v.description} (Status: ${v.resolutionStatus}, Recurring: ${v.isRecurring})`)
    })
  }

  if (context.inspections && context.inspections.length > 0) {
    parts.push(`Inspection History (${context.inspections.length}):`)
    context.inspections.slice(0, 3).forEach((i) => {
      parts.push(`  • Date: ${i.scheduledDate.split('T')[0]}, Result: ${i.overallResult || i.status}, Notes: ${i.notes || 'None'}`)
    })
  }

  if (context.correctiveActions && context.correctiveActions.length > 0) {
    parts.push(`Corrective Actions (${context.correctiveActions.length}):`)
    context.correctiveActions.slice(0, 3).forEach((a) => {
      parts.push(`  • [${a.status}] ${a.description}`)
    })
  }

  if (context.evidences && context.evidences.length > 0) {
    parts.push(`Visual Evidence Records (${context.evidences.length}):`)
    context.evidences.slice(0, 3).forEach((e) => {
      parts.push(`  • File: ${e.fileName}, Finding: ${e.candidateCategory || 'Unclassified'} (${e.candidateTitle || 'Candidate finding'}), Status: ${e.reviewStatus}`)
    })
  }

  if (context.priorityQueue && context.priorityQueue.length > 0) {
    parts.push(`Inspection Priority Top Candidates:`)
    context.priorityQueue.slice(0, 3).forEach((p, idx) => {
      parts.push(`  ${idx + 1}. ${p.name} (${p.area}) - Score: ${p.priorityScore}, Probability: ${(p.probability * 100).toFixed(0)}%, Reason: ${p.reason}`)
    })
  }

  if (context.sources && context.sources.length > 0) {
    parts.push(`Source References:`)
    context.sources.slice(0, 6).forEach((s) => {
      parts.push(`  • [${s.type}] ${s.label} (${s.id})`)
    })
  }

  return parts.join('\n')
}

export function buildUserPrompt(context: CopilotContext): string {
  return `USER QUESTION:
"${context.userQuery}"

AUTHORIZED LOOKSFINE DATABASE & ML CONTEXT:
${formatConciseContext(context)}

INSTRUCTIONS:
Provide a concise, grounded operational answer adhering strictly to the system rules above. Format your response cleanly into clear operational headings (e.g., Summary, Historical Facts, ML Risk Assessment, Decision Support Analysis, Evidence / Source Records).`
}
