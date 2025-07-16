import { LoadBalancerConfig, LoadBalancerStats, ApiKeyConfig } from '../types'
import { Logger } from '../utils/logger'

/**
 * Load balancer service for managing multiple API keys
 */
export class LoadBalancerService {
  private config: LoadBalancerConfig
  private kv: KVNamespace
  private statsKey = 'load_balancer_stats'

  constructor(kv: KVNamespace, env: CloudflareBindings) {
    this.kv = kv
    this.config = this.parseConfig(env)
  }

  /**
   * Parse load balancer configuration from environment
   */
  private parseConfig(env: CloudflareBindings): LoadBalancerConfig {
    const enabled = env.LOAD_BALANCER_ENABLED?.toLowerCase() === 'true'
    const apiKeysStr = env.LOAD_BALANCER_API_KEYS || ''
    const strategy = (env.LOAD_BALANCER_STRATEGY as any) || 'round-robin'
    const windowSize = parseInt(env.LOAD_BALANCER_WINDOW_SIZE || '5')

    const apiKeys: ApiKeyConfig[] = apiKeysStr
      .split(',')
      .map(key => key.trim())
      .filter(Boolean)
      .map(key => {
        // Support formats:
        // 1. "key" - simple key
        // 2. "key:weight" - key with weight
        // 3. "key:weight:provider:baseURL:model:maxTokens" - full config
        const parts = key.split(':')
        const apiKey = parts[0].trim()
        const weight = parts[1] ? parseInt(parts[1]) : 1
        const provider = parts[2]?.trim() || env.TARGET_PROVIDER || 'groq'
        const baseURL = parts[3]?.trim() || env.TARGET_BASE_URL || 'https://api.groq.com/openai/v1'
        const model = parts[4]?.trim() || env.TARGET_MODEL || 'moonshotai/kimi-k2-instruct'
        const maxTokens = parts[5] ? parseInt(parts[5]) : parseInt(env.TARGET_MAX_TOKENS || '16384')
        
        return {
          key: apiKey,
          weight,
          lastUsed: 0,
          failureCount: 0,
          isActive: true,
          provider,
          baseURL,
          model,
          maxTokens
        }
      })

    return {
      enabled,
      apiKeys,
      strategy,
      windowSize
    }
  }

  /**
   * Get current load balancer configuration
   */
  getConfig(): LoadBalancerConfig {
    return this.config
  }

  /**
   * Check if load balancer is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.apiKeys.length > 0
  }

  /**
   * Get statistics from KV storage
   */
  async getStats(): Promise<LoadBalancerStats> {
    const stats = await this.kv.get(this.statsKey, 'json') as LoadBalancerStats | null
    return stats || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastUsed: 0,
      apiKeyStats: {}
    }
  }

  /**
   * Update statistics in KV storage
   */
  async updateStats(stats: LoadBalancerStats): Promise<void> {
    await this.kv.put(this.statsKey, JSON.stringify(stats))
  }

  /**
   * Get next API key configuration based on load balancing strategy
   */
  async getNextApiKey(): Promise<ApiKeyConfig | null> {
    if (!this.isEnabled()) {
      return null
    }

    const activeKeys = this.config.apiKeys.filter(k => k.isActive)
    if (activeKeys.length === 0) {
      Logger.error('No active API keys available for load balancing')
      return null
    }

    const stats = await this.getStats()
    const now = Date.now()

    let selectedKey: ApiKeyConfig

    switch (this.config.strategy) {
      case 'round-robin':
        selectedKey = this.roundRobinSelect(activeKeys, stats)
        break
      case 'time-window':
        selectedKey = this.timeWindowSelect(activeKeys, stats, now)
        break
      case 'weighted':
        selectedKey = this.weightedSelect(activeKeys, stats)
        break
      default:
        selectedKey = activeKeys[0]
    }

    // Update usage statistics
    await this.recordUsage(selectedKey.key, stats, now)

    Logger.info(`🔄 Load balancer selected: ${selectedKey.provider}/${selectedKey.model} (${selectedKey.key.substring(0, 10)}...)`)
    return selectedKey
  }

  /**
   * Round-robin selection strategy
   */
  private roundRobinSelect(keys: ApiKeyConfig[], stats: LoadBalancerStats): ApiKeyConfig {
    const keyStats = stats.apiKeyStats
    
    // Find the key with the lowest request count
    let selectedKey = keys[0]
    let minRequests = keyStats[selectedKey.key]?.requests || 0

    for (const key of keys) {
      const requests = keyStats[key.key]?.requests || 0
      if (requests < minRequests) {
        minRequests = requests
        selectedKey = key
      }
    }

    return selectedKey
  }

  /**
   * Time-window selection strategy
   */
  private timeWindowSelect(keys: ApiKeyConfig[], stats: LoadBalancerStats, now: number): ApiKeyConfig {
    const windowMs = this.config.windowSize * 60 * 1000
    const keyStats = stats.apiKeyStats

    // Find keys that haven't been used recently
    const availableKeys = keys.filter(key => {
      const lastUsed = keyStats[key.key]?.lastUsed || 0
      return (now - lastUsed) >= windowMs
    })

    if (availableKeys.length > 0) {
      // Select the key that was used longest ago
      return availableKeys.reduce((oldest, current) => {
        const oldestTime = keyStats[oldest.key]?.lastUsed || 0
        const currentTime = keyStats[current.key]?.lastUsed || 0
        return currentTime < oldestTime ? current : oldest
      })
    }

    // If no keys are available, select the one with the oldest last used time
    return keys.reduce((oldest, current) => {
      const oldestTime = keyStats[oldest.key]?.lastUsed || 0
      const currentTime = keyStats[current.key]?.lastUsed || 0
      return currentTime < oldestTime ? current : oldest
    })
  }

  /**
   * Weighted selection strategy
   */
  private weightedSelect(keys: ApiKeyConfig[], stats: LoadBalancerStats): ApiKeyConfig {
    const keyStats = stats.apiKeyStats
    
    // Calculate weighted scores (higher weight = more likely to be selected)
    const weightedKeys = keys.map(key => ({
      key,
      score: (key.weight || 1) / Math.max(1, keyStats[key.key]?.requests || 0)
    }))

    // Select the key with the highest weighted score
    return weightedKeys.reduce((best, current) => 
      current.score > best.score ? current : best
    ).key
  }

  /**
   * Record API key usage
   */
  private async recordUsage(apiKey: string, stats: LoadBalancerStats, now: number): Promise<void> {
    stats.totalRequests++
    stats.lastUsed = now

    if (!stats.apiKeyStats[apiKey]) {
      stats.apiKeyStats[apiKey] = {
        requests: 0,
        failures: 0,
        lastUsed: 0
      }
    }

    stats.apiKeyStats[apiKey].requests++
    stats.apiKeyStats[apiKey].lastUsed = now

    await this.updateStats(stats)
  }

  /**
   * Record API key failure
   */
  async recordFailure(apiKey: string): Promise<void> {
    const stats = await this.getStats()
    stats.failedRequests++

    if (!stats.apiKeyStats[apiKey]) {
      stats.apiKeyStats[apiKey] = {
        requests: 0,
        failures: 0,
        lastUsed: 0
      }
    }

    stats.apiKeyStats[apiKey].failures++

    // Temporarily disable key if failure rate is too high
    const keyStats = stats.apiKeyStats[apiKey]
    const failureRate = keyStats.failures / Math.max(1, keyStats.requests)
    
    if (failureRate > 0.5 && keyStats.requests > 5) {
      Logger.warn(`🚨 API key ${apiKey.substring(0, 10)}... has high failure rate (${(failureRate * 100).toFixed(1)}%), temporarily disabling`)
      
      // Find and disable the key
      const keyConfig = this.config.apiKeys.find(k => k.key === apiKey)
      if (keyConfig) {
        keyConfig.isActive = false
        keyConfig.failureCount = (keyConfig.failureCount || 0) + 1
      }
    }

    await this.updateStats(stats)
  }

  /**
   * Record successful API call
   */
  async recordSuccess(apiKey: string): Promise<void> {
    const stats = await this.getStats()
    stats.successfulRequests++

    // Reset failure count on success
    const keyConfig = this.config.apiKeys.find(k => k.key === apiKey)
    if (keyConfig) {
      keyConfig.failureCount = 0
      keyConfig.isActive = true
    }

    await this.updateStats(stats)
  }

  /**
   * Get load balancer health status
   */
  async getHealthStatus(): Promise<{
    enabled: boolean
    activeKeys: number
    totalKeys: number
    strategy: string
    stats: LoadBalancerStats
  }> {
    const stats = await this.getStats()
    const activeKeys = this.config.apiKeys.filter(k => k.isActive).length

    return {
      enabled: this.config.enabled,
      activeKeys,
      totalKeys: this.config.apiKeys.length,
      strategy: this.config.strategy,
      stats
    }
  }

  /**
   * Reset all statistics
   */
  async resetStats(): Promise<void> {
    const emptyStats: LoadBalancerStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastUsed: 0,
      apiKeyStats: {}
    }

    await this.updateStats(emptyStats)
    
    // Reactivate all keys
    this.config.apiKeys.forEach(key => {
      key.isActive = true
      key.failureCount = 0
    })

    Logger.info('🔄 Load balancer statistics reset')
  }
}