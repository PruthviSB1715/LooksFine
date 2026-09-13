import { CopilotSource, CopilotSourceType } from './types'

export function createSourceReference(
  type: CopilotSourceType,
  id: string,
  label: string,
  relevance: string,
  establishmentId?: string,
  date?: string | Date | null
): CopilotSource {
  return {
    type,
    id,
    label: label.length > 50 ? `${label.substring(0, 47)}...` : label,
    establishmentId,
    date: date ? new Date(date).toISOString().split('T')[0] : undefined,
    relevance,
  }
}

export function deduplicateSources(sources: CopilotSource[]): CopilotSource[] {
  const map = new Map<string, CopilotSource>()
  for (const src of sources) {
    const key = `${src.type}_${src.id}`
    if (!map.has(key)) {
      map.set(key, src)
    }
  }
  return Array.from(map.values())
}
