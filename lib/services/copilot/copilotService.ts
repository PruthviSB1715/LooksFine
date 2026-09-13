import { prisma } from '@/lib/prisma'
import { UserSessionPayload } from '@/lib/auth'
import { CopilotRequest, CopilotResponse } from './types'
import { classifyIntent } from './intentClassifier'
import { resolveEstablishment } from './entityResolver'
import { buildCopilotContext } from './retrievalService'
import { generateGroundedAnswer } from './llmProvider'

/**
 * Main Entry Point for Grounded AI Copilot
 */
export async function askCopilot(
  request: CopilotRequest,
  userSession?: UserSessionPayload | null
): Promise<CopilotResponse> {
  const { question, establishmentId, conversationId } = request

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new Error('Invalid query: question is required.')
  }

  // 1. Resolve Establishment Entity
  const establishment = await resolveEstablishment(question, establishmentId)

  // 2. Classify Intent
  const intent = classifyIntent(question, !!establishment)

  // 3. Retrieve Grounded Context (Role-Aware)
  const context = await buildCopilotContext(intent, question, establishment, userSession)

  // 4. Generate Grounded Answer (Gemini API or Deterministic Grounded Engine)
  const llmResult = await generateGroundedAnswer(context)

  // 5. Optionally Persist Conversation Log in Database
  let activeConvId = conversationId
  if (userSession?.id) {
    try {
      const userExists = await prisma.user.findUnique({ where: { id: userSession.id } })
      if (userExists) {
        if (!activeConvId) {
          const conv = await prisma.copilotConversation.create({
            data: {
              userId: userSession.id,
              title: establishment ? `Query re: ${establishment.name}` : question.substring(0, 40),
            },
          })
          activeConvId = conv.id
        }

        if (activeConvId) {
          await prisma.copilotMessage.createMany({
            data: [
              {
                conversationId: activeConvId,
                role: 'user',
                content: question,
                intent,
              },
              {
                conversationId: activeConvId,
                role: 'assistant',
                content: llmResult.answer,
                intent,
                sources: JSON.stringify(context.sources),
              },
            ],
          })
        }
      }
    } catch (dbErr) {
      console.warn('[COPILOT-DB-LOG-WARN] Could not persist conversation log:', dbErr)
    }
  }

  // 6. Return Clean Response Output Payload
  return {
    answer: llmResult.answer,
    sources: context.sources,
    intent,
    establishment: establishment
      ? {
          id: establishment.id,
          name: establishment.name,
          riskLevel: establishment.riskLevel,
          currentRiskScore: establishment.currentRiskScore,
        }
      : undefined,
    modelInfo: context.mlAssessment
      ? {
          seriousViolationProbability: context.mlAssessment.seriousViolationProbability,
          riskScore: context.mlAssessment.riskScore,
          riskLevel: context.mlAssessment.riskLevel,
          modelVersion: context.mlAssessment.modelVersion,
        }
      : undefined,
    isFallback: llmResult.isFallback,
    provider: llmResult.provider,
    providerModel: llmResult.model,
    conversationId: activeConvId,
  }
}
