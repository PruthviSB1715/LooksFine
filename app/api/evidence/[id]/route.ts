import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getEvidenceById } from '@/lib/services/evidence/evidenceService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params
    const userSession = await getSessionUser()

    const evidence = await getEvidenceById(evidenceId, userSession)

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence record not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: evidence,
    })
  } catch (error: any) {
    console.error('API /api/evidence/[id] GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch evidence details' },
      { status: error?.status || 500 }
    )
  }
}
