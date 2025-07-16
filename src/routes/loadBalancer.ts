import { Hono } from 'hono'
import { LoadBalancerController } from '../controllers/loadBalancer'
import { uuidValidationMiddleware } from '../middleware/uuid'

/**
 * Create load balancer routes
 */
export function createLoadBalancerRoutes() {
  const app = new Hono<{ Bindings: CloudflareBindings }>()

  // Apply UUID validation middleware to all routes
  app.use('*', uuidValidationMiddleware)

  // Load balanced Claude API endpoint
  app.post('/v1/messages', LoadBalancerController.messages)

  // Load balanced Gemini API endpoint
  app.post('/v1beta/models/:model\\:generateContent', LoadBalancerController.generateContent)

  // Load balancer management endpoints
  app.get('/v1/load-balancer/status', LoadBalancerController.getStatus)
  app.get('/v1/load-balancer/config', LoadBalancerController.getConfig)
  app.post('/v1/load-balancer/reset', LoadBalancerController.resetStats)

  return app
}