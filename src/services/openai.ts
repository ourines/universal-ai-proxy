import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { MessagesRequest, Provider, TargetConfig, ContentBlock, ToolUseBlock } from '../types'
import { convertMessages, convertTools, convertToolCallsToAnthropic } from '../utils/converters'
import { Logger } from '../utils/logger'
import { AuthenticationError, APIError, InternalServerError, TokenCapError } from '../utils/errors'

/**
 * OpenAI service for handling API requests
 */
export class OpenAIService {
  private client: OpenAI
  private provider: Provider
  private targetConfig: TargetConfig

  constructor(apiKey: string, provider: Provider, targetConfig: TargetConfig) {
    this.client = new OpenAI({
      apiKey,
      baseURL: provider.baseURL
    })
    this.provider = provider
    this.targetConfig = targetConfig
  }

  /**
   * Process Claude messages request
   */
  async processClaudeMessages(request: MessagesRequest) {
    Logger.apiCall(this.provider.name, request.model, this.targetConfig.model)

    const openaiMessages = convertMessages(request.messages)
    const tools = request.tools ? convertTools(request.tools) : undefined

    const maxTokens = Math.min(
      request.max_tokens || this.provider.maxTokens,
      this.provider.maxTokens
    )

    if (request.max_tokens && request.max_tokens > this.provider.maxTokens) {
      Logger.tokenCapping(request.max_tokens, this.provider.maxTokens)
      
      // If the token cap is too severe (reducing by more than 50%), throw an error
      const reductionPercentage = ((request.max_tokens - this.provider.maxTokens) / request.max_tokens) * 100
      if (reductionPercentage > 50) {
        throw new TokenCapError(
          `Token limit exceeded by ${reductionPercentage.toFixed(1)}%. Requested: ${request.max_tokens}, Maximum: ${this.provider.maxTokens}`
        )
      }
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.targetConfig.model,
        messages: openaiMessages as any,
        temperature: request.temperature,
        max_tokens: maxTokens,
        tools: tools as any,
        tool_choice: request.tool_choice as any,
        stream: false
      })

      return this.formatClaudeResponse(completion, request.model)
    } catch (error: any) {
      this.handleAPIError(error)
    }
  }

  /**
   * Process Gemini request
   */
  async processGeminiRequest(messages: any[], tools?: any[], maxTokens?: number, temperature?: number, model?: string) {
    Logger.apiCall(this.provider.name, model || 'gemini', this.targetConfig.model)

    try {
      const completion = await this.client.chat.completions.create({
        model: this.targetConfig.model,
        messages: messages as any,
        temperature: temperature,
        max_tokens: maxTokens,
        tools: tools as any,
        tool_choice: 'auto',
        stream: false
      })

      return completion
    } catch (error: any) {
      this.handleAPIError(error)
    }
  }

  /**
   * Format response for Claude API
   */
  private formatClaudeResponse(completion: any, originalModel: string) {
    const choice = completion.choices[0]
    const msg = choice.message

    let content: Array<ContentBlock | ToolUseBlock>
    let stopReason: string

    if (msg.tool_calls) {
      content = convertToolCallsToAnthropic(msg.tool_calls)
      stopReason = 'tool_use'
    } else {
      content = [{ type: 'text', text: msg.content || '' }]
      stopReason = 'end_turn'
    }

    return {
      id: `msg_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      model: `${this.provider.name}/${originalModel}`,
      role: 'assistant',
      type: 'message',
      content,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0
      }
    }
  }

  /**
   * Handle API errors from OpenAI client
   */
  private handleAPIError(error: any): never {
    Logger.error(`API Error: ${error.message}`, error)

    // Handle authentication errors
    if (error.status === 401) {
      throw new AuthenticationError('Invalid API Key')
    }

    // Handle rate limiting
    if (error.status === 429) {
      throw new APIError('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED')
    }

    // Handle quota exceeded
    if (error.status === 403) {
      throw new APIError('API quota exceeded or insufficient permissions', 403, 'QUOTA_EXCEEDED')
    }

    // Handle model not found
    if (error.status === 404) {
      throw new APIError('Model not found or unavailable', 404, 'MODEL_NOT_FOUND')
    }

    // Handle bad request
    if (error.status === 400) {
      throw new APIError(`Bad request: ${error.message}`, 400, 'BAD_REQUEST')
    }

    // Handle server errors
    if (error.status >= 500) {
      throw new InternalServerError(`Provider service error: ${error.message}`)
    }

    // Handle network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new InternalServerError(`Network error: ${error.message}`)
    }

    // Handle unknown errors
    throw new InternalServerError(`Unknown API error: ${error.message}`)
  }
}