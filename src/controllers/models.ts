import { Context } from 'hono'
import { getTargetConfig, getClaudeModels, getGeminiModels } from '../config'


/**
 * Models controller
 */
export class ModelsController {
  /**
   * Get Claude models
   */
  static async claudeModels(c: Context<{ Bindings: CloudflareBindings }>) {
    const targetConfig = getTargetConfig(c.env)
    const claudeModels = getClaudeModels()

    const models = claudeModels.map(model => ({
      id: model,
      object: 'model',
      provider: targetConfig.provider,
      max_tokens: targetConfig.maxTokens,
      target_model: targetConfig.model
    }))

    return c.json({
      object: 'list',
      data: models
    })
  }

  /**
   * Get Gemini models
   */
  static async geminiModels(c: Context<{ Bindings: CloudflareBindings }>) {
    const targetConfig = getTargetConfig(c.env)
    const geminiModels = getGeminiModels()

    const models = geminiModels.map(model => ({
      name: `models/${model}`,
      displayName: model,
      description: `${model} model proxied through ${targetConfig.provider}`,
      inputTokenLimit: targetConfig.maxTokens,
      outputTokenLimit: targetConfig.maxTokens,
      supportedGenerationMethods: ['generateContent'],
      target_model: targetConfig.model
    }))

    return c.json({
      models
    })
  }
}