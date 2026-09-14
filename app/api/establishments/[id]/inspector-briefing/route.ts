import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateInspectorBriefing } from '@/lib/services/briefingService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Establishment ID is required' },
        { status: 400 }
      )
    }

    // 1. Server-side Authentication & Session Verification
    const userSession = await getSessionUser()

    // 2. Execute Briefing Service (Includes Server-side RBAC Check before context retrieval / LLM call)
    const briefing = await generateInspectorBriefing(id, userSession)

    return NextResponse.json({
      success: true,
      data: briefing,
    })
  } catch (error: any) {
    console.error('API /api/establishments/[id]/inspector-briefing error:', error)

    const status = error?.statusCode || (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized') ? 403 : 500)

    return NextResponse.json(
      { error: error?.message || 'Failed to generate inspector briefing' },
      { status }
    )
  }
}
