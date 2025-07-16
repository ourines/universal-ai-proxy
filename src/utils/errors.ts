/**
 * Error handling utilities
 */

// Global process declaration for Cloudflare Workers
declare global {
  var process: { env?: { NODE_ENV?: string } } | undefined
}

export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Not authorized') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR')
  }
}

export class TokenCapError extends APIError {
  constructor(message: string = 'Token limit exceeded') {
    super(message, 400, 'TOKEN_CAP_ERROR')
  }
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: Error | APIError, includeStack = false) {
  const isAPIError = error instanceof APIError
  
  const response: any = {
    error: {
      message: error.message,
      code: isAPIError ? error.code : 'UNKNOWN_ERROR',
      status: isAPIError ? error.status : 500
    }
  }

  if (includeStack && typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    response.error.stack = error.stack
  }

  return response
}

/**
 * Gemini-style error response formatter
 */
export function formatGeminiErrorResponse(error: Error | APIError) {
  const isAPIError = error instanceof APIError
  
  return {
    error: {
      code: isAPIError ? error.status : 500,
      message: error.message,
      status: isAPIError ? error.code || 'INTERNAL' : 'INTERNAL'
    }
  }
}