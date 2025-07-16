import { Context } from 'hono'
import { extractApiKey } from '../utils/auth'
import { createProvider, getTargetConfig } from '../config'
import { OpenAIService } from '../services/openai'
import { convertGeminiToOpenAI, convertOpenAIToGemini } from '../utils/converters'
import { GeminiRequest } from '../types'
import { AuthenticationError } from '../utils/errors'

/**
 * Gemini API controller
 */
export class GeminiController {
  /**
   * Handle Gemini generateContent endpoint
   */
  static async generateContent(c: Context<{ Bindings: CloudflareBindings }>) {
    const authorization = c.req.header('Authorization') || c.req.header('x-goog-api-key')
    const apiKey = extractApiKey(authorization)

    if (!apiKey) {
      throw new AuthenticationError('Missing API key in Authorization header or x-goog-api-key header')
    }

    const model = c.req.param('model') || 'gemini-2.5-flash'
    const geminiRequest: GeminiRequest = await c.req.json()
    const provider = createProvider(c.env)
    const targetConfig = getTargetConfig(c.env)

    // Convert Gemini request to OpenAI format
    const { messages, tools, max_tokens, temperature } = convertGeminiToOpenAI(geminiRequest)

    const maxTokens = Math.min(
      max_tokens || provider.maxTokens,
      provider.maxTokens
    )

    const openaiService = new OpenAIService(apiKey, provider, targetConfig)
    const completion = await openaiService.processGeminiRequest(messages, tools, maxTokens, temperature, model)

    // Convert back to Gemini format
    const geminiResponse = convertOpenAIToGemini(completion, model)

    return c.json(geminiResponse)
  }
}