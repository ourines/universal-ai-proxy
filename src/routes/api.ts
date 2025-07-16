import { Hono } from 'hono'
import { uuidValidationMiddleware } from '../middleware/uuid'
import { ClaudeController } from '../controllers/claude'
import { GeminiController } from '../controllers/gemini'
import { ModelsController } from '../controllers/models'
import { ConfigController } from '../controllers/config'


/**
 * Create API routes with UUID validation
 */
export function createApiRoutes() {
  const apiRoutes = new Hono<{ Bindings: CloudflareBindings }>()

  // UUID validation middleware for all API routes
  apiRoutes.use('*', uuidValidationMiddleware)

  // Claude API routes
  apiRoutes.post('/v1/messages', ClaudeController.messages)
  apiRoutes.get('/v1/models', ModelsController.claudeModels)

  // Gemini API routes
  apiRoutes.post('/v1beta/models/:model\\:generateContent', GeminiController.generateContent)
  apiRoutes.get('/v1beta/models', ModelsController.geminiModels)

  // Config routes
  apiRoutes.get('/v1/config', ConfigController.getConfig)

  return apiRoutes
}