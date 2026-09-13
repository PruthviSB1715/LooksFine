import { NextResponse } from 'next/server'
import { getEstablishments } from '@/lib/services/establishmentService'
import { RiskLevel } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const region = searchParams.get('region') || undefined
    const status = searchParams.get('status') || undefined
    const riskLevelParam = searchParams.get('riskLevel') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let riskLevel: RiskLevel | undefined = undefined
    if (riskLevelParam && Object.values(RiskLevel).includes(riskLevelParam as RiskLevel)) {
      riskLevel = riskLevelParam as RiskLevel
    }

    const { items, total } = await getEstablishments({
      search,
      region,
      status,
      riskLevel,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('API /api/establishments error:', error)
    return NextResponse.json({ error: 'Failed to fetch establishments' }, { status: 500 })
  }
}
