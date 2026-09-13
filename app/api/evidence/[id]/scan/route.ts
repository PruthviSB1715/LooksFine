import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { scanEvidence } from '@/lib/services/evidence/evidenceService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params
    const userSession = await getSessionUser()

    const result = await scanEvidence(evidenceId, userSession)

    return NextResponse.json({
      success: true,
      data: result.evidence,
      visionResult: result.visionResult,
    })
  } catch (error: any) {
    console.error('API /api/evidence/[id]/scan POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to scan evidence image' },
      { status: error?.status || 500 }
    )
  }
}
