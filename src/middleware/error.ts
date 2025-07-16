import { Context, Next } from 'hono'

import { APIError, InternalServerError, formatErrorResponse, formatGeminiErrorResponse } from '../utils/errors'
import { Logger } from '../utils/logger'

/**
 * Global error handling middleware
 */
export async function errorMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  try {
    await next()
  } catch (error: any) {
    Logger.error('Unhandled error:', error)
    
    // Determine if this is a Gemini endpoint by checking the path
    const isGeminiEndpoint = c.req.path.includes('/generateContent')
    
    // If it's already an APIError, just format and return it
    if (error instanceof APIError) {
      const errorResponse = isGeminiEndpoint 
        ? formatGeminiErrorResponse(error)
        : formatErrorResponse(error)
      return c.json(errorResponse, error.status as 400 | 401 | 403 | 404 | 500)
    }
    
    // For unknown errors, wrap them in InternalServerError
    const internalError = new InternalServerError(`Internal server error: ${error.message}`)
    const errorResponse = isGeminiEndpoint 
      ? formatGeminiErrorResponse(internalError)
      : formatErrorResponse(internalError)
    return c.json(errorResponse, 500 as 500)
  }
}