# Load Balancer Feature

## Overview

The load balancer feature allows you to distribute API requests across multiple API keys automatically. This helps improve reliability, throughput, and resilience against rate limiting.

## Features

- **Multiple API Keys**: Support for multiple API keys with automatic failover
- **Load Balancing Strategies**: Round-robin, time-window, and weighted distribution
- **Automatic Failover**: Disabled keys with high failure rates automatically
- **Statistics Tracking**: Real-time monitoring via Cloudflare KV
- **Health Monitoring**: Status endpoints for monitoring load balancer health

## Configuration

### Environment Variables

```bash
# Enable load balancing
LOAD_BALANCER_ENABLED=true

# API keys (format: key1:weight1,key2:weight2,...)
LOAD_BALANCER_API_KEYS=sk-1234567890abcdef:1,sk-abcdef1234567890:2,sk-fedcba0987654321:1

# Strategy: round-robin, time-window, or weighted
LOAD_BALANCER_STRATEGY=round-robin

# Time window size in minutes (for time-window strategy)
LOAD_BALANCER_WINDOW_SIZE=5
```

### Cloudflare KV Setup

1. Create a KV namespace in Cloudflare dashboard
2. Update `wrangler.jsonc` with your KV namespace ID:

```json
{
  "kv_namespaces": [
    {
      "binding": "LOAD_BALANCER_KV",
      "id": "your-kv-namespace-id",
      "preview_id": "your-preview-kv-namespace-id"
    }
  ]
}
```

## Load Balancing Strategies

### 1. Round-Robin
Distributes requests evenly across all active API keys.

```bash
LOAD_BALANCER_STRATEGY=round-robin
```

### 2. Time-Window
Uses API keys that haven't been used recently. Configurable window size.

```bash
LOAD_BALANCER_STRATEGY=time-window
LOAD_BALANCER_WINDOW_SIZE=5  # 5 minutes
```

### 3. Weighted
Uses weights to prefer certain API keys. Higher weight = more requests.

```bash
LOAD_BALANCER_STRATEGY=weighted
LOAD_BALANCER_API_KEYS=key1:1,key2:3,key3:2  # key2 gets 3x more requests
```

## Endpoints

### Load Balanced API Endpoints

These endpoints use load balancing when enabled:

```bash
# Claude API with load balancing
POST /:uuid/lb/v1/messages

# Gemini API with load balancing
POST /:uuid/lb/v1beta/models/:model:generateContent
```

### Management Endpoints

```bash
# Get load balancer status
GET /:uuid/lb/v1/load-balancer/status

# Get load balancer configuration
GET /:uuid/lb/v1/load-balancer/config

# Reset statistics
POST /:uuid/lb/v1/load-balancer/reset
```

## Usage Examples

### Basic Usage
```bash
# Use load balanced Claude API
curl -X POST "https://your-domain.com/your-uuid/lb/v1/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-sonnet",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ],
    "max_tokens": 100
  }'
```

### Check Status
```bash
# Check load balancer health
curl "https://your-domain.com/your-uuid/lb/v1/load-balancer/status"
```

### Response Format
```json
{
  "loadBalancer": {
    "enabled": true,
    "activeKeys": 3,
    "totalKeys": 3,
    "strategy": "round-robin",
    "stats": {
      "totalRequests": 150,
      "successfulRequests": 145,
      "failedRequests": 5,
      "lastUsed": 1642694400000,
      "apiKeyStats": {
        "sk-1234567890abcdef": {
          "requests": 50,
          "failures": 1,
          "lastUsed": 1642694400000
        }
      }
    }
  }
}
```

## Failure Handling

The load balancer automatically handles API key failures:

- **High Failure Rate**: Keys with >50% failure rate are temporarily disabled
- **Automatic Recovery**: Keys are re-enabled after successful requests
- **Fallback**: Falls back to remaining active keys when some are disabled

## Monitoring

Monitor your load balancer using the status endpoint:

```bash
# Get detailed statistics
curl "https://your-domain.com/your-uuid/lb/v1/load-balancer/status"

# Reset statistics (useful for testing)
curl -X POST "https://your-domain.com/your-uuid/lb/v1/load-balancer/reset"
```

## Migration Guide

### From Single API Key to Load Balancer

1. **Enable load balancing** in environment variables
2. **Add multiple API keys** to `LOAD_BALANCER_API_KEYS`
3. **Choose strategy** (recommend starting with `round-robin`)
4. **Update API endpoints** to use `/lb/` prefix
5. **Monitor performance** using status endpoints

### Gradual Migration

You can run both single-key and load-balanced endpoints simultaneously:

- Original: `/:uuid/v1/messages`
- Load balanced: `/:uuid/lb/v1/messages`

This allows gradual migration and A/B testing.

## Best Practices

1. **Use different providers** for better redundancy
2. **Monitor failure rates** regularly
3. **Set appropriate weights** based on key limits
4. **Test failover scenarios** in staging
5. **Keep statistics** for capacity planning

## Troubleshooting

### Common Issues

1. **No API keys available**
   - Check `LOAD_BALANCER_API_KEYS` configuration
   - Verify API keys are valid and active

2. **High failure rates**
   - Check API key quotas and limits
   - Verify network connectivity to providers

3. **KV namespace errors**
   - Ensure KV namespace is created and bound correctly
   - Check permissions for KV operations

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
# Check load balancer selection
# Logs will show: "🔄 Load balancer selected API key: sk-1234567890..."
```