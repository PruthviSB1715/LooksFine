import { prisma } from '@/lib/prisma'

export interface ResolvedEstablishment {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  operatingStatus: string
  assignedRegion: string
  riskLevel: string
  currentRiskScore: number
  lastInspectionDate: Date | null
  nextInspectionDate: Date | null
}

/**
 * Recognizes and resolves establishment entities from query text or explicit establishment ID.
 * Handles variations such as "Hotel Rajdhani", "hotel rajdhani", "Hotel Rajdhani Solapur".
 */
export async function resolveEstablishment(
  query: string,
  providedId?: string
): Promise<ResolvedEstablishment | null> {
  // 1. Direct lookup if explicit establishment ID provided
  if (providedId) {
    const est = await prisma.establishment.findUnique({ where: { id: providedId } })
    if (est) return est
  }

  const q = query.toLowerCase().trim()
  if (!q) return null

  // Fetch candidate list from database
  const ests = await prisma.establishment.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      city: true,
      state: true,
      operatingStatus: true,
      assignedRegion: true,
      riskLevel: true,
      currentRiskScore: true,
      lastInspectionDate: true,
      nextInspectionDate: true,
    },
  })

  // 2. Exact match check
  const exact = ests.find((e) => e.name.toLowerCase() === q)
  if (exact) return exact

  // 3. Substring match check (e.g. "hotel rajdhani" in "why is hotel rajdhani high risk?")
  for (const est of ests) {
    const estNameLower = est.name.toLowerCase()
    if (q.includes(estNameLower)) {
      return est
    }
  }

  // 4. Token overlap match (e.g., "hotel rajdhani restaurant")
  for (const est of ests) {
    const tokens = est.name.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
    if (tokens.length >= 2 && tokens.every((t) => q.includes(t))) {
      return est
    }
  }

  // 5. Distinctive word check (e.g., "rajdhani" -> Hotel Rajdhani)
  for (const est of ests) {
    const distinctive = est.name
      .toLowerCase()
      .replace(/restaurant|cafe|bakery|market|kitchen|house|hotel|tacos|bar|bistro|cafeteria|dining|shack|deli|delicatessen|seafood|sushi/gi, '')
      .trim()
    if (distinctive.length >= 4 && q.includes(distinctive)) {
      return est
    }
  }

  return null
}
