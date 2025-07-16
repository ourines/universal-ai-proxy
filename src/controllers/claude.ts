import { Context } from 'hono'
import { extractApiKey } from '../utils/auth'
import { createProvider, getTargetConfig } from '../config'
import { OpenAIService } from '../services/openai'
import { MessagesRequest } from '../types'
import { AuthenticationError } from '../utils/errors'

/**
 * Claude API controller
 */
export class ClaudeController {
  /**
   * Handle Claude messages endpoint
   */
  static async messages(c: Context<{ Bindings: CloudflareBindings }>) {
    const authorization = c.req.header('Authorization') || c.req.header('x-api-key')
    const apiKey = extractApiKey(authorization)

    if (!apiKey) {
      throw new AuthenticationError('Missing API key in Authorization header or x-api-key header')
    }

    const request: MessagesRequest = await c.req.json()
    const provider = createProvider(c.env)
    const targetConfig = getTargetConfig(c.env)

    const openaiService = new OpenAIService(apiKey, provider, targetConfig)
    const response = await openaiService.processClaudeMessages(request)

    return c.json(response)
  }
}