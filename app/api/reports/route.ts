import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateOperationalReport } from '@/lib/services/reportService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') as '30d' | '90d' | 'all') || '30d'
    const region = searchParams.get('region') || 'All'

    const sessionUser = await getSessionUser()

    const reportData = await generateOperationalReport(sessionUser, { period, region })

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error: any) {
    console.error('API /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to generate operational report' }, { status: 500 })
  }
}
