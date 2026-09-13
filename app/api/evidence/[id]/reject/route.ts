import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { rejectCandidateFinding } from '@/lib/services/evidence/evidenceService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params
    const userSession = await getSessionUser()

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Empty body allowed
    }

    const { reviewNotes } = body

    const result = await rejectCandidateFinding(
      {
        evidenceId,
        inspectorUserId: userSession?.id || 'demo-inspector-id',
        reviewNotes,
      },
      userSession
    )

    return NextResponse.json({
      success: true,
      data: result.evidence,
    })
  } catch (error: any) {
    console.error('API /api/evidence/[id]/reject POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to reject candidate finding' },
      { status: error?.status || 500 }
    )
  }
}
