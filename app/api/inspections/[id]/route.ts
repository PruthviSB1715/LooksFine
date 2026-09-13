import { NextResponse } from 'next/server'
import { getInspectionById } from '@/lib/services/inspectionService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const inspection = await getInspectionById(id)

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: inspection })
  } catch (error) {
    console.error('API /api/inspections/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch inspection' }, { status: 500 })
  }
}
