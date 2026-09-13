import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { acceptCandidateFinding } from '@/lib/services/evidence/evidenceService'

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

    const { severityOverride, descriptionOverride } = body

    const result = await acceptCandidateFinding(
      {
        evidenceId,
        inspectorUserId: userSession?.id || 'demo-inspector-id',
        severityOverride,
        descriptionOverride,
      },
      userSession
    )

    return NextResponse.json({
      success: true,
      data: result.evidence,
      violation: result.violation,
      isDuplicate: result.isDuplicate,
    })
  } catch (error: any) {
    console.error('API /api/evidence/[id]/accept POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to accept candidate finding' },
      { status: error?.status || 500 }
    )
  }
}
