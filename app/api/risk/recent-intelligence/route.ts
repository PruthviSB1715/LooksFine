import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getRecentIntelligenceEvents } from '@/lib/services/intelligenceService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = (searchParams.get('category') as any) || 'All'
    const region = searchParams.get('region') || 'All'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const sessionUser = await getSessionUser()

    const events = await getRecentIntelligenceEvents(sessionUser, { category, region, limit })

    return NextResponse.json({
      success: true,
      data: events,
      total: events.length,
    })
  } catch (error: any) {
    console.error('API /api/risk/recent-intelligence error:', error)
    return NextResponse.json({ error: 'Failed to retrieve recent intelligence events' }, { status: 500 })
  }
}
