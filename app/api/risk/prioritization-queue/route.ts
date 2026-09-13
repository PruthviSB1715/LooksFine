import { NextResponse } from 'next/server'
import { getPrioritizedInspectionQueue } from '@/lib/services/priorityService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const queue = await getPrioritizedInspectionQueue(limit)

    return NextResponse.json({
      success: true,
      data: queue,
      meta: { count: queue.length },
    })
  } catch (error) {
    console.error('API /api/risk/prioritization-queue error:', error)
    return NextResponse.json({ error: 'Failed to fetch priority inspection queue' }, { status: 500 })
  }
}
