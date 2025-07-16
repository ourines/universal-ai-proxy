import { Context } from 'hono'
import { getTargetConfig, getAppInfo, getEnvVarsDoc } from '../config'


/**
 * Config controller
 */
export class ConfigController {
  /**
   * Get configuration
   */
  static async getConfig(c: Context<{ Bindings: CloudflareBindings }>) {
    const targetConfig = getTargetConfig(c.env)
    const envVarsDoc = getEnvVarsDoc()

    return c.json({
      current_config: {
        target_model: targetConfig.model,
        target_provider: targetConfig.provider,
        target_base_url: targetConfig.baseURL,
        target_max_tokens: targetConfig.maxTokens
      },
      environment_variables: envVarsDoc
    })
  }

  /**
   * Get app info
   */
  static async getInfo(c: Context) {
    const info = getAppInfo()
    return c.json(info)
  }
}