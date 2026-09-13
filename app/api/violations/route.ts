import { NextResponse } from 'next/server'
import { getViolations } from '@/lib/services/inspectionService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const establishmentId = searchParams.get('establishmentId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const items = await getViolations({ establishmentId, limit })

    return NextResponse.json({
      success: true,
      data: items,
      meta: { count: items.length },
    })
  } catch (error) {
    console.error('API /api/violations error:', error)
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 })
  }
}
