import { NextResponse } from 'next/server'
import { getPrioritizedInspectionQueue } from '@/lib/services/priorityService'
import { getSessionUser } from '@/lib/auth'
import { RiskLevel, Role } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const userSession = await getSessionUser()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const regionParam = searchParams.get('region') || undefined
    const typeParam = searchParams.get('type') || undefined
    const riskLevelParam = searchParams.get('riskLevel') || undefined
    const overdueOnlyParam = searchParams.get('overdueOnly') === 'true'

    let riskLevel: RiskLevel | undefined = undefined
    if (riskLevelParam && Object.values(RiskLevel).includes(riskLevelParam as RiskLevel)) {
      riskLevel = riskLevelParam as RiskLevel
    }

    let establishmentIdFilter: string | undefined = undefined
    let effectiveRegion: string | undefined = regionParam

    // Server-Side Role-Based Authorization & Workload Scope
    if (userSession) {
      if (userSession.role === Role.ESTABLISHMENT_MANAGER) {
        // Establishment Manager is strictly restricted to their assigned establishment
        establishmentIdFilter = userSession.establishmentId || undefined
        if (!establishmentIdFilter) {
          return NextResponse.json({
            success: true,
            data: [],
            meta: { count: 0, reason: 'No assigned establishment found for Establishment Manager.' },
          })
        }
      } else if (userSession.role === Role.FOOD_SAFETY_INSPECTOR && !regionParam && userSession.region) {
        // Inspector defaults to their assigned region workload if not explicitly overridden
        effectiveRegion = userSession.region
      }
    }

    const queue = await getPrioritizedInspectionQueue({
      limit,
      region: effectiveRegion,
      riskLevel,
      type: typeParam,
      overdueOnly: overdueOnlyParam,
      establishmentId: establishmentIdFilter,
    })

    return NextResponse.json({
      success: true,
      data: queue,
      meta: {
        count: queue.length,
        userRole: userSession?.role || 'ANONYMOUS',
        filters: {
          region: effectiveRegion || null,
          riskLevel: riskLevel || null,
          type: typeParam || null,
          overdueOnly: overdueOnlyParam,
        },
      },
    })
  } catch (error) {
    console.error('API /api/risk/prioritization-queue error:', error)
    return NextResponse.json({ error: 'Failed to fetch priority inspection queue' }, { status: 500 })
  }
}
