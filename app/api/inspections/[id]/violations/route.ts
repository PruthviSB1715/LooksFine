import { NextResponse } from 'next/server'
import { recordViolation } from '@/lib/services/inspectionWorkflowService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params
    const body = await request.json()
    const { establishmentId, category, severity, description, evidenceUrl, correctiveActionRequired } = body

    if (!establishmentId || !category || !severity || !description) {
      return NextResponse.json(
        { error: 'establishmentId, category, severity, and description are required' },
        { status: 400 }
      )
    }

    const violation = await recordViolation({
      inspectionId,
      establishmentId,
      category,
      severity,
      description,
      evidenceUrl,
      correctiveActionRequired,
    })

    return NextResponse.json({ success: true, data: violation }, { status: 201 })
  } catch (error) {
    console.error('API POST /api/inspections/[id]/violations error:', error)
    return NextResponse.json({ error: 'Failed to record violation' }, { status: 500 })
  }
}
