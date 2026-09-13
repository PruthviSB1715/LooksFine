import { NextResponse } from 'next/server'
import { submitCorrectiveActionEvidence } from '@/lib/services/inspectionWorkflowService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { submittedEvidence } = body

    if (!submittedEvidence) {
      return NextResponse.json({ error: 'Submitted evidence text or link is required' }, { status: 400 })
    }

    const action = await submitCorrectiveActionEvidence(id, submittedEvidence)
    return NextResponse.json({ success: true, data: action })
  } catch (error) {
    console.error('API POST /api/corrective-actions/[id]/submit error:', error)
    return NextResponse.json({ error: 'Failed to submit corrective action evidence' }, { status: 500 })
  }
}
