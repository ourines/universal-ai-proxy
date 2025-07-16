/**
 * Universal AI API Proxy
 * Converts Claude and Gemini API requests to any OpenAI-compatible endpoint
 * 
 * Features:
 * - Claude API compatibility (/v1/messages)
 * - Gemini API compatibility (/v1beta/models/:model:generateContent)
 * - Configurable target model via environment variables
 * - Tool/function calling support
 * - UUID-based access control
 * - No caching for real-time responses
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createApiRoutes } from './routes/api'
import { createLoadBalancerRoutes } from './routes/loadBalancer'
import { ConfigController } from './controllers/config'
import { errorMiddleware } from './middleware/error'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Global error handling middleware
app.use('*', errorMiddleware)

// Enable CORS for all routes
app.use('*', cors())

// Health check and info endpoint
app.get('/', ConfigController.getInfo)

// Mount API routes with UUID prefix
app.route('/:uuid', createApiRoutes())

// Mount load balancer routes with UUID prefix (separate endpoint)
app.route('/:uuid/lb', createLoadBalancerRoutes())

export default app