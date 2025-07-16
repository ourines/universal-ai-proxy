import { Provider, TargetConfig } from '../types'

/**
 * Get target configuration from environment variables
 */
export function getTargetConfig(env: CloudflareBindings): TargetConfig {
  return {
    model: env.TARGET_MODEL || 'moonshotai/kimi-k2-instruct',
    provider: env.TARGET_PROVIDER || 'groq',
    baseURL: env.TARGET_BASE_URL || 'https://api.groq.com/openai/v1',
    maxTokens: parseInt(env.TARGET_MAX_TOKENS || '16384')
  }
}

/**
 * Create provider configuration from environment
 */
export function createProvider(env: CloudflareBindings): Provider {
  const config = getTargetConfig(env)
  return {
    name: config.provider,
    baseURL: config.baseURL,
    models: [config.model],
    maxTokens: config.maxTokens
  }
}

/**
 * Get application info
 */
export function getAppInfo() {
  return {
    name: 'Universal AI API Proxy',
    message: 'Universal AI API Proxy is running 💡',
    version: '1.0.0',
    description: 'Proxy server that converts Claude and Gemini API requests to any OpenAI-compatible endpoint',
    features: [
      'Claude API compatibility',
      'Gemini API compatibility', 
      'Configurable target model via environment variables',
      'Tool/function calling support',
      'Real-time responses (no caching)',
      'CORS enabled',
      'UUID-based access control'
    ],
    endpoints: {
      '/': 'This endpoint - health check and info',
      '/{uuid}/v1/messages': 'Claude API proxy endpoint',
      '/{uuid}/v1/models': 'List supported Claude models',
      '/{uuid}/v1beta/models/{model}:generateContent': 'Gemini API proxy endpoint',
      '/{uuid}/v1beta/models': 'List supported Gemini models',
      '/{uuid}/v1/config': 'View current proxy configuration'
    },
    supported_apis: [
      'Claude (Anthropic)',
      'Gemini (Google)'
    ],
    github: 'https://github.com/ourines/universal-ai-proxy',
    license: 'MIT'
  }
}

/**
 * Get environment variables documentation
 */
export function getEnvVarsDoc() {
  return {
    TARGET_MODEL: 'Target model to use (default: moonshotai/kimi-k2-instruct)',
    TARGET_PROVIDER: 'Target provider name (default: groq)',
    TARGET_BASE_URL: 'Target API base URL (default: https://api.groq.com/openai/v1)',
    TARGET_MAX_TOKENS: 'Maximum tokens limit (default: 16384)',
    REQUIRE_UUID: 'Require UUID validation (default: false)',
    VALID_UUIDS: 'Comma-separated list of valid UUIDs (optional)'
  }
}

/**
 * Get model lists
 */
export function getClaudeModels() {
  return [
    'claude-4.0',
    'claude-3.5-sonnet', 
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3-opus'
  ]
}

export function getGeminiModels() {
  return [
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ]
}