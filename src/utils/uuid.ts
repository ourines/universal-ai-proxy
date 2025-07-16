import { validate as uuidValidate } from 'uuid'
import {  ValidationResult } from '../types'

/**
 * Validate UUID from path parameter
 */
export function validateUuid(uuid: string, env: CloudflareBindings): ValidationResult {
  const requireUuid = env.REQUIRE_UUID?.toLowerCase() === 'true'
  
  if (!requireUuid) {
    return { valid: true }
  }

  if (!uuid) {
    return { 
      valid: false, 
      error: 'UUID required in path' 
    }
  }
  
  if (!uuidValidate(uuid)) {
    return { 
      valid: false, 
      error: 'Invalid UUID format' 
    }
  }
  
  const validUuids = env.VALID_UUIDS?.split(',').map((id: string) => id.trim()).filter(Boolean) || []
  
  if (validUuids.length > 0 && !validUuids.includes(uuid)) {
    return { 
      valid: false, 
      error: 'UUID not authorized' 
    }
  }
  
  return { valid: true }
}