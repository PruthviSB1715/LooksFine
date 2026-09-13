import { NextResponse } from 'next/server'
import { getInspections } from '@/lib/services/inspectionService'
import { InspectionStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const establishmentId = searchParams.get('establishmentId') || undefined
    const inspectorId = searchParams.get('inspectorId') || undefined
    const statusParam = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let status: InspectionStatus | undefined = undefined
    if (statusParam && Object.values(InspectionStatus).includes(statusParam as InspectionStatus)) {
      status = statusParam as InspectionStatus
    }

    const { items, total } = await getInspections({
      establishmentId,
      inspectorId,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data: items,
      meta: { total, limit, offset },
    })
  } catch (error) {
    console.error('API /api/inspections error:', error)
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
  }
}
