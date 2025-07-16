import { Context } from 'hono'
import { extractApiKey } from '../utils/auth'
import { createProvider, getTargetConfig } from '../config'
import { OpenAIService } from '../services/openai'
import { LoadBalancerService } from '../services/loadBalancer'
import { MessagesRequest, GeminiRequest } from '../types'
import { AuthenticationError, APIError } from '../utils/errors'
import { convertGeminiToOpenAI, convertOpenAIToGemini } from '../utils/converters'
import { Logger } from '../utils/logger'

/**
 * Load balancer controller for handling requests with multiple API keys
 */
export class LoadBalancerController {
  /**
   * Handle Claude messages endpoint with load balancing
   */
  static async messages(c: Context<{ Bindings: CloudflareBindings }>) {
    const loadBalancer = new LoadBalancerService(c.env.PROXY_LOAD_BALANCER_KV, c.env)
    
    if (!loadBalancer.isEnabled()) {
      throw new APIError('Load balancer is not enabled', 503, 'LOAD_BALANCER_DISABLED')
    }

    const request: MessagesRequest = await c.req.json()

    // Get API key configuration from load balancer
    const keyConfig = await loadBalancer.getNextApiKey()
    if (!keyConfig) {
      throw new APIError('No API keys available', 503, 'NO_API_KEYS_AVAILABLE')
    }

    // Create provider and target config from selected key
    const provider = {
      name: keyConfig.provider!,
      baseURL: keyConfig.baseURL!,
      models: [keyConfig.model!],
      maxTokens: keyConfig.maxTokens!
    }
    
    const targetConfig = {
      model: keyConfig.model!,
      provider: keyConfig.provider!,
      baseURL: keyConfig.baseURL!,
      maxTokens: keyConfig.maxTokens!
    }

    let response
    try {
      const openaiService = new OpenAIService(keyConfig.key, provider, targetConfig)
      response = await openaiService.processClaudeMessages(request)
      
      // Record successful request
      await loadBalancer.recordSuccess(keyConfig.key)
      
      return c.json(response)
    } catch (error: any) {
      // Record failure
      await loadBalancer.recordFailure(keyConfig.key)
      
      Logger.error(`Load balancer API key ${keyConfig.key.substring(0, 10)}... failed:`, error.message)
      throw error
    }
  }

  /**
   * Handle Gemini generateContent endpoint with load balancing
   */
  static async generateContent(c: Context<{ Bindings: CloudflareBindings }>) {
    const loadBalancer = new LoadBalancerService(c.env.PROXY_LOAD_BALANCER_KV, c.env)
    
    if (!loadBalancer.isEnabled()) {
      throw new APIError('Load balancer is not enabled', 503, 'LOAD_BALANCER_DISABLED')
    }

    const model = c.req.param('model') || 'gemini-2.5-flash'
    const geminiRequest: GeminiRequest = await c.req.json()

    // Get API key configuration from load balancer
    const keyConfig = await loadBalancer.getNextApiKey()
    if (!keyConfig) {
      throw new APIError('No API keys available', 503, 'NO_API_KEYS_AVAILABLE')
    }

    // Create provider and target config from selected key
    const provider = {
      name: keyConfig.provider!,
      baseURL: keyConfig.baseURL!,
      models: [keyConfig.model!],
      maxTokens: keyConfig.maxTokens!
    }
    
    const targetConfig = {
      model: keyConfig.model!,
      provider: keyConfig.provider!,
      baseURL: keyConfig.baseURL!,
      maxTokens: keyConfig.maxTokens!
    }

    let response
    try {
      // Convert Gemini request to OpenAI format
      const { messages, tools, max_tokens, temperature } = convertGeminiToOpenAI(geminiRequest)

      const maxTokens = Math.min(
        max_tokens || provider.maxTokens,
        provider.maxTokens
      )

      const openaiService = new OpenAIService(keyConfig.key, provider, targetConfig)
      const completion = await openaiService.processGeminiRequest(messages, tools, maxTokens, temperature, model)

      // Convert back to Gemini format
      const geminiResponse = convertOpenAIToGemini(completion, model)
      
      // Record successful request
      await loadBalancer.recordSuccess(keyConfig.key)
      
      return c.json(geminiResponse)
    } catch (error: any) {
      // Record failure
      await loadBalancer.recordFailure(keyConfig.key)
      
      Logger.error(`Load balancer API key ${keyConfig.key.substring(0, 10)}... failed:`, error.message)
      throw error
    }
  }

  /**
   * Get load balancer health status
   */
  static async getStatus(c: Context<{ Bindings: CloudflareBindings }>) {
    const loadBalancer = new LoadBalancerService(c.env.PROXY_LOAD_BALANCER_KV, c.env)
    const status = await loadBalancer.getHealthStatus()
    
    return c.json({
      loadBalancer: status,
      config: loadBalancer.getConfig()
    })
  }

  /**
   * Reset load balancer statistics
   */
  static async resetStats(c: Context<{ Bindings: CloudflareBindings }>) {
    const loadBalancer = new LoadBalancerService(c.env.PROXY_LOAD_BALANCER_KV, c.env)
    await loadBalancer.resetStats()
    
    return c.json({
      message: 'Load balancer statistics reset successfully'
    })
  }

  /**
   * Get load balancer configuration
   */
  static async getConfig(c: Context<{ Bindings: CloudflareBindings }>) {
    const loadBalancer = new LoadBalancerService(c.env.PROXY_LOAD_BALANCER_KV, c.env)
    const config = loadBalancer.getConfig()
    
    // Mask API keys for security
    const maskedConfig = {
      ...config,
      apiKeys: config.apiKeys.map(key => ({
        ...key,
        key: key.key.substring(0, 10) + '...'
      }))
    }
    
    return c.json({
      config: maskedConfig
    })
  }
}