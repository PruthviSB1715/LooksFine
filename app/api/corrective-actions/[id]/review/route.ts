import { NextResponse } from 'next/server'
import { reviewCorrectiveAction } from '@/lib/services/inspectionWorkflowService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reviewerId, accepted, reviewNotes, requireReinspection } = body

    if (!reviewerId || accepted === undefined) {
      return NextResponse.json({ error: 'reviewerId and accepted boolean flag are required' }, { status: 400 })
    }

    const result = await reviewCorrectiveAction({
      correctiveActionId: id,
      reviewerId,
      accepted: Boolean(accepted),
      reviewNotes,
      requireReinspection: Boolean(requireReinspection),
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API POST /api/corrective-actions/[id]/review error:', error)
    return NextResponse.json({ error: 'Failed to review corrective action' }, { status: 500 })
  }
}
