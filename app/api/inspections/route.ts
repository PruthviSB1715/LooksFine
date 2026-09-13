import { NextResponse } from 'next/server'
import { getInspections } from '@/lib/services/inspectionService'
import { createScheduledInspection } from '@/lib/services/inspectionWorkflowService'
import { requireAuthUser } from '@/lib/auth'
import { Role } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const establishmentId = searchParams.get('establishmentId') || undefined
    const inspectorId = searchParams.get('inspectorId') || undefined
    const statusParam = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { items, total } = await getInspections({
      establishmentId,
      inspectorId,
      status: statusParam as any,
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

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuthUser([Role.INSPECTION_MANAGER, Role.FOOD_SAFETY_ADMIN, Role.FOOD_SAFETY_INSPECTOR])
    if (!authCheck.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const { establishmentId, inspectorId, scheduledDate, notes } = body

    if (!establishmentId || !inspectorId) {
      return NextResponse.json({ error: 'Establishment ID and Inspector ID are required' }, { status: 400 })
    }

    const inspection = await createScheduledInspection({
      establishmentId,
      inspectorId,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      notes,
    })

    return NextResponse.json({ success: true, data: inspection }, { status: 201 })
  } catch (error) {
    console.error('API POST /api/inspections error:', error)
    return NextResponse.json({ error: 'Failed to schedule inspection' }, { status: 500 })
  }
}
