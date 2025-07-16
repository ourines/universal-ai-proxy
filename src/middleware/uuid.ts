import { Context, Next } from 'hono'
import { validateUuid } from '../utils/uuid'

import { AuthorizationError } from '../utils/errors'

/**
 * UUID validation middleware
 */
export async function uuidValidationMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  const uuid = c.req.param('uuid')
  const uuidCheck = validateUuid(uuid || '', c.env)
  
  if (!uuidCheck.valid) {
    throw new AuthorizationError(uuidCheck.error)
  }
  
  await next()
}