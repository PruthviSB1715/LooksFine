import { NextResponse } from 'next/server'
import { getCityRiskSummary, getEstablishments } from '@/lib/services/establishmentService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const summary = await getCityRiskSummary()
    const priorityQueue = await getEstablishments({ limit })

    return NextResponse.json({
      success: true,
      summary,
      priorityQueue: priorityQueue.items,
    })
  } catch (error) {
    console.error('API /api/risk/establishments error:', error)
    return NextResponse.json({ error: 'Failed to fetch risk assessment data' }, { status: 500 })
  }
}
