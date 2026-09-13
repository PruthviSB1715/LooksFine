import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { askCopilot } from '@/lib/services/copilot/copilotService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, establishmentId, conversationId } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question string is required' }, { status: 400 })
    }

    // Server-side authentication & role extraction
    const userSession = await getSessionUser()

    const result = await askCopilot(
      {
        question: question.trim(),
        establishmentId: establishmentId || undefined,
        conversationId: conversationId || undefined,
      },
      userSession
    )

    return NextResponse.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      intent: result.intent,
      establishment: result.establishment,
      modelInfo: result.modelInfo,
      isFallback: result.isFallback,
      provider: result.provider,
      providerModel: result.providerModel,
      conversationId: result.conversationId,
    })
  } catch (error: any) {
    console.error('API /api/copilot error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process Copilot request' },
      { status: 500 }
    )
  }
}
