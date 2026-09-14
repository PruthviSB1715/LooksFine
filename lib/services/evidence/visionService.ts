import fs from 'fs'
import path from 'path'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_VISION_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CandidateFinding {
  category: 'IMPROPER_STORAGE' | 'CROSS_CONTAMINATION' | 'FACILITY_HYGIENE' | 'PEST_ACTIVITY' | 'UNSAFE_HANDLING'
  confidence: number // 0.0 to 1.0
  title: string
  description: string
  reasoning: string
  severityRecommendation: 'MINOR' | 'MAJOR' | 'CRITICAL'
  boundingBox?: BoundingBox
}

export interface VisionAnalysisResult {
  canDetermine: boolean
  findings: CandidateFinding[]
  reason?: string
  isUnavailable?: boolean
  rawResponse?: string
}

export const VISION_SYSTEM_PROMPT = `You are LooksFine Vision AI, an operational decision-support assistant for certified food-safety inspectors.

STRICT INSTRUCTIONS:
1. Analyze ONLY what is visually observable in the supplied kitchen or food establishment photograph.
2. Do NOT invent hidden conditions, microscopic pathogens, or unobservable facts.
3. Do NOT claim exact internal food temperatures unless a legible digital/dial thermometer is explicitly visible in the photograph.
4. Do NOT make definitive legal, legal compliance, or regulatory enforcement claims. Your output is an "AI candidate finding" for human inspector verification.
5. Candidate findings may ONLY belong to these supported visual categories:
   - IMPROPER_STORAGE
   - CROSS_CONTAMINATION
   - FACILITY_HYGIENE
   - PEST_ACTIVITY
   - UNSAFE_HANDLING
6. If the image does not contain clear visual evidence of a food-safety risk, set "canDetermine": false and provide an explanation in "reason".
7. Return strictly valid JSON adhering to this JSON schema:

{
  "canDetermine": boolean,
  "reason": "explanation if canDetermine is false",
  "findings": [
    {
      "category": "IMPROPER_STORAGE | CROSS_CONTAMINATION | FACILITY_HYGIENE | PEST_ACTIVITY | UNSAFE_HANDLING",
      "confidence": number between 0.10 and 0.99,
      "title": "Short descriptive candidate finding title",
      "description": "Detailed visual description of observable finding",
      "reasoning": "Operational food safety rationale for why this is a candidate finding",
      "severityRecommendation": "MINOR | MAJOR | CRITICAL",
      "boundingBox": { "x": float (0-1), "y": float (0-1), "width": float (0-1), "height": float (0-1) } // optional normalized coordinates
    }
  ]
}`

/**
 * Executes visual analysis on an uploaded food safety image file using Gemini Vision API.
 * Gracefully falls back if Gemini Vision API is unavailable without fabricating fake findings.
 */
export async function analyzeEvidenceImage(
  imagePathOrBuffer: string | Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || ''
  const visionModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  // If GEMINI_API_KEY is missing, gracefully return unavailable status
  if (!apiKey) {
    return {
      canDetermine: false,
      findings: [],
      reason: 'AI evidence analysis is currently unavailable. You can continue with manual evidence review.',
      isUnavailable: true,
    }
  }

  try {
    let base64Image: string
    if (Buffer.isBuffer(imagePathOrBuffer)) {
      base64Image = imagePathOrBuffer.toString('base64')
    } else {
      const absPath = path.isAbsolute(imagePathOrBuffer)
        ? imagePathOrBuffer
        : path.join(process.cwd(), 'public', imagePathOrBuffer.replace(/^\//, ''))
      
      if (!fs.existsSync(absPath)) {
        throw new Error(`Evidence file not found at path: ${absPath}`)
      }
      const fileBuffer = await fs.promises.readFile(absPath)
      base64Image = fileBuffer.toString('base64')
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${VISION_SYSTEM_PROMPT}\n\nAnalyze this food-safety inspection photograph and return the structured JSON candidate finding object.` },
            {
              inline_data: {
                mime_type: mimeType.toLowerCase(),
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 sec timeout
    })

    if (!response.ok) {
      console.warn(`[VISION-AI-WARN] Gemini Vision API returned HTTP ${response.status}`)
      return {
        canDetermine: false,
        findings: [],
        reason: 'AI evidence analysis is currently unavailable. You can continue with manual evidence review.',
        isUnavailable: true,
      }
    }

    const json = await response.json()
    const textContent = json?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent || typeof textContent !== 'string') {
      return {
        canDetermine: false,
        findings: [],
        reason: 'The vision model did not produce a parseable finding payload.',
      }
    }

    // Safely parse JSON response
    const parsed = JSON.parse(textContent)
    return validateAndFormatVisionResult(parsed, textContent)
  } catch (err) {
    console.warn('[VISION-AI-ERROR] Vision AI scan failed:', err)
    return {
      canDetermine: false,
      findings: [],
      reason: 'AI evidence analysis is currently unavailable. You can continue with manual evidence review.',
      isUnavailable: true,
    }
  }
}

function roundCoord(val: number): number {
  return Math.round(val * 1000) / 1000
}

/**
 * Server-side validation of parsed vision AI output payload.
 * Prevents malformed AI outputs from polluting database records.
 */
export function validateAndFormatVisionResult(raw: any, textContent: string): VisionAnalysisResult {
  if (typeof raw !== 'object' || raw === null) {
    return { canDetermine: false, findings: [], reason: 'Invalid JSON payload from Vision AI.' }
  }

  const canDetermine = Boolean(raw.canDetermine)
  const reason = typeof raw.reason === 'string' ? raw.reason : undefined

  if (!canDetermine || !Array.isArray(raw.findings) || raw.findings.length === 0) {
    return {
      canDetermine: false,
      findings: [],
      reason: reason || 'The image does not provide sufficient visual evidence of a food-safety violation.',
      rawResponse: textContent,
    }
  }

  const validCategories = new Set([
    'IMPROPER_STORAGE',
    'CROSS_CONTAMINATION',
    'FACILITY_HYGIENE',
    'PEST_ACTIVITY',
    'UNSAFE_HANDLING',
  ])

  const validSeverities = new Set(['MINOR', 'MAJOR', 'CRITICAL'])

  const validatedFindings: CandidateFinding[] = []

  for (const item of raw.findings) {
    if (!item || typeof item !== 'object') continue

    const category = validCategories.has(item.category) ? item.category : 'IMPROPER_STORAGE'
    const confidence = typeof item.confidence === 'number' ? Math.min(0.99, Math.max(0.10, item.confidence)) : 0.85
    const title = typeof item.title === 'string' ? item.title.trim() : `Possible ${category.toLowerCase().replace('_', ' ')}`
    const description = typeof item.description === 'string' ? item.description.trim() : 'Visual evidence candidate finding.'
    const reasoning = typeof item.reasoning === 'string' ? item.reasoning.trim() : 'Observable candidate risk factor requiring inspector verification.'
    const severityRecommendation = validSeverities.has(item.severityRecommendation) ? item.severityRecommendation : 'MAJOR'

    let boundingBox: BoundingBox | undefined = undefined
    if (item.boundingBox && typeof item.boundingBox === 'object') {
      let x = item.boundingBox.x
      let y = item.boundingBox.y
      let width = item.boundingBox.width
      let height = item.boundingBox.height

      // Handle conversion from ymin, xmin, ymax, xmax format if returned by model
      if (
        typeof item.boundingBox.ymin === 'number' &&
        typeof item.boundingBox.xmin === 'number' &&
        typeof item.boundingBox.ymax === 'number' &&
        typeof item.boundingBox.xmax === 'number'
      ) {
        x = item.boundingBox.xmin
        y = item.boundingBox.ymin
        width = item.boundingBox.xmax - item.boundingBox.xmin
        height = item.boundingBox.ymax - item.boundingBox.ymin
      }

      if (
        typeof x === 'number' &&
        typeof y === 'number' &&
        typeof width === 'number' &&
        typeof height === 'number'
      ) {
        const validX = Math.min(1.0, Math.max(0.0, x))
        const validY = Math.min(1.0, Math.max(0.0, y))
        const validW = Math.min(1.0 - validX, Math.max(0.01, width))
        const validH = Math.min(1.0 - validY, Math.max(0.01, height))
        boundingBox = {
          x: roundCoord(validX),
          y: roundCoord(validY),
          width: roundCoord(validW),
          height: roundCoord(validH),
        }
      }
    }

    validatedFindings.push({
      category,
      confidence,
      title,
      description,
      reasoning,
      severityRecommendation,
      boundingBox,
    })
  }

  return {
    canDetermine: validatedFindings.length > 0,
    findings: validatedFindings,
    reason: validatedFindings.length === 0 ? 'No valid candidate findings could be validated from model output.' : undefined,
    rawResponse: textContent,
  }
}
