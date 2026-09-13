import { CopilotContext } from './types'
import { SYSTEM_PROMPT, buildUserPrompt } from './promptBuilder'
import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL } from '@/lib/constants'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL

export interface OllamaHealthStatus {
  isHealthy: boolean
  isModelAvailable: boolean
  model: string
  baseUrl: string
  availableModels: string[]
  error?: string
}

export interface OllamaProviderResult {
  answer: string
  isFallback: boolean
  provider: string
  model: string
}

/**
  * Health check helper for local Ollama HTTP API service.
  * Checks GET /api/tags for model availability.
  */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const targetModel = OLLAMA_MODEL
  const baseUrl = OLLAMA_BASE_URL

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000), // 3s timeout
    })

    if (!res.ok) {
      return {
        isHealthy: false,
        isModelAvailable: false,
        model: targetModel,
        baseUrl,
        availableModels: [],
        error: `Ollama HTTP API returned status ${res.status}`,
      }
    }

    const data = await res.json()
    const models: string[] = (data.models || []).map((m: any) => m.name || m.model)
    const isModelAvailable = models.some((m) => m === targetModel || m.startsWith(targetModel))

    return {
      isHealthy: true,
      isModelAvailable,
      model: targetModel,
      baseUrl,
      availableModels: models,
      error: isModelAvailable ? undefined : `Model '${targetModel}' not found in local Ollama instance`,
    }
  } catch (err: any) {
    return {
      isHealthy: false,
      isModelAvailable: false,
      model: targetModel,
      baseUrl,
      availableModels: [],
      error: `Could not connect to Ollama at ${baseUrl}: ${err?.message || 'Connection refused'}`,
    }
  }
}

/**
  * Executes Grounded LLM reasoning via local Ollama HTTP API (/api/chat).
  * Uses llama3.1:8b model with strict system instructions and authorized DB context.
  */
export async function generateOllamaAnswer(context: CopilotContext): Promise<OllamaProviderResult> {
  const userPrompt = buildUserPrompt(context)
  const baseUrl = OLLAMA_BASE_URL
  const model = OLLAMA_MODEL

  console.log(`[OLLAMA-REQUEST] Sending query to ${baseUrl}/api/chat using model=${model}...`)

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    stream: false,
    options: {
      temperature: 0.2, // Low temperature for high factual precision
      num_predict: 750, // Concise operational output
    },
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000), // 90 second timeout for local LLM inference
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Ollama API error HTTP ${response.status}: ${errText.substring(0, 100)}`)
  }

  const json = await response.json()
  const content = json?.message?.content

  if (!content || typeof content !== 'string') {
    throw new Error('Malformed or empty message content returned by Ollama API.')
  }

  console.log(`[OLLAMA-RESPONSE] Successfully received generated response (${content.length} chars).`)

  return {
    answer: content.trim(),
    isFallback: false,
    provider: 'ollama',
    model,
  }
}
