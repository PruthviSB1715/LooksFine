import { NextResponse } from 'next/server'
import { getCorrectiveActions } from '@/lib/services/inspectionService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const establishmentId = searchParams.get('establishmentId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const items = await getCorrectiveActions({ establishmentId, limit })

    return NextResponse.json({
      success: true,
      data: items,
      meta: { count: items.length },
    })
  } catch (error) {
    console.error('API /api/corrective-actions error:', error)
    return NextResponse.json({ error: 'Failed to fetch corrective actions' }, { status: 500 })
  }
}
