import { NextResponse } from 'next/server'
import { startInspection, submitInspection } from '@/lib/services/inspectionWorkflowService'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, notes } = body // action: 'START' | 'SUBMIT'

    if (action === 'START') {
      const inspection = await startInspection(id)
      return NextResponse.json({ success: true, data: inspection })
    }

    if (action === 'SUBMIT') {
      const result = await submitInspection(id, notes)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ error: 'Invalid action. Supported actions: START, SUBMIT' }, { status: 400 })
  } catch (error) {
    console.error('API PATCH /api/inspections/[id]/status error:', error)
    return NextResponse.json({ error: 'Failed to update inspection status' }, { status: 500 })
  }
}
