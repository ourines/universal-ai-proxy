/**
 * Extract API key from Authorization header or direct value
 */
export function extractApiKey(authorization: string | undefined): string | null {
  if (!authorization) return null

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7)
  }

  return authorization
}