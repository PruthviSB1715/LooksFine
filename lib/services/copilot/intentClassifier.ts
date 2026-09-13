import { CopilotIntent } from './types'

/**
 * Lightweight deterministic intent classification combining keyword/phrase mapping.
 * Uses deterministic rules prior to database retrieval.
 */
export function classifyIntent(query: string, hasEstablishmentContext: boolean = false): CopilotIntent {
  const q = query.toLowerCase().trim()

  // 1. Briefing
  if (
    q.includes('briefing') ||
    q.includes('today\'s inspection') ||
    q.includes('today inspection') ||
    q.includes('daily briefing') ||
    q.includes('morning briefing')
  ) {
    return 'INSPECTION_BRIEFING'
  }

  // 2. Recurring violations
  if (
    q.includes('recurring') ||
    q.includes('repeat violation') ||
    q.includes('repeated violation') ||
    q.includes('recurrence') ||
    q.includes('frequent violation')
  ) {
    return 'RECURRING_VIOLATIONS'
  }

  // 3. Unresolved critical violations
  if (
    q.includes('unresolved critical') ||
    q.includes('open critical') ||
    q.includes('unresolved violation') ||
    q.includes('open violation') ||
    (q.includes('critical') && (q.includes('unresolved') || q.includes('open') || q.includes('active')))
  ) {
    return 'UNRESOLVED_CRITICAL'
  }

  // 4. Overdue inspections
  if (q.includes('overdue') || q.includes('past due') || q.includes('late inspection')) {
    return 'OVERDUE_INSPECTIONS'
  }

  // 5. Inspection priority / Inspect next / Ranked highly
  if (
    q.includes('inspect next') ||
    q.includes('priority') ||
    q.includes('who should we inspect') ||
    q.includes('which establishment should we inspect') ||
    q.includes('ranked highly') ||
    q.includes('why is this establishment ranked') ||
    q.includes('highest risk')
  ) {
    return 'INSPECTION_PRIORITY'
  }

  // 6. Corrective actions / pending / failed
  if (
    q.includes('corrective action') ||
    q.includes('pending action') ||
    q.includes('failed corrective') ||
    q.includes('action pending')
  ) {
    return 'CORRECTIVE_ACTIONS'
  }

  // 7. Compliance improvement after corrective action
  if (
    q.includes('improved') ||
    q.includes('improvement') ||
    q.includes('after corrective') ||
    q.includes('progress') ||
    q.includes('re-inspection result')
  ) {
    return 'COMPLIANCE'
  }

  // 8. Regional trends / hotspots
  if (
    q.includes('region') ||
    q.includes('neighborhood') ||
    q.includes('district') ||
    q.includes('concentration') ||
    q.includes('area')
  ) {
    return 'REGIONAL_TRENDS'
  }

  // 9. Violation categories / trends
  if (
    q.includes('violation categories') ||
    q.includes('common violation') ||
    q.includes('violation pattern') ||
    q.includes('most common') ||
    q.includes('frequent categories')
  ) {
    return 'VIOLATION_TRENDS'
  }

  // 10. Inspection history
  if (
    q.includes('history') ||
    q.includes('summarize inspection') ||
    q.includes('past inspection') ||
    q.includes('previous inspection') ||
    q.includes('inspection record')
  ) {
    return 'ESTABLISHMENT_HISTORY'
  }

  // 11. Establishment Risk (e.g., "Why is Central Spice high risk?")
  if (
    q.includes('why is') ||
    q.includes('high risk') ||
    q.includes('risk score') ||
    q.includes('risk level') ||
    q.includes('risky') ||
    q.includes('probability') ||
    hasEstablishmentContext
  ) {
    return 'ESTABLISHMENT_RISK'
  }

  // 12. General system fallback
  return 'GENERAL_SYSTEM_QUERY'
}
