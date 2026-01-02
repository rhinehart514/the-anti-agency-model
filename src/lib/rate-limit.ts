/**
 * In-memory rate limiter for API routes
 * Uses sliding window algorithm
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (resets on server restart)
// For production, consider Upstash Redis or similar
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000

let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)

  // Don't prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

startCleanup()

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
  /** Identifier for the rate limit (used in headers) */
  identifier?: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowSeconds } = config
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const entry = store.get(key)

  // No existing entry or window expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs
    store.set(key, { count: 1, resetTime })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime,
    }
  }

  // Within window, check count
  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(
  request: Request,
  prefix: string = 'rl'
): string {
  // Try to get real IP from headers (works behind proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return `${prefix}:${ip}`
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Auth endpoints: 5 requests per minute */
  auth: { limit: 5, windowSeconds: 60, identifier: 'auth' },

  /** API general: 100 requests per minute */
  api: { limit: 100, windowSeconds: 60, identifier: 'api' },

  /** Form submissions: 10 per minute */
  forms: { limit: 10, windowSeconds: 60, identifier: 'forms' },

  /** File uploads: 20 per minute */
  uploads: { limit: 20, windowSeconds: 60, identifier: 'uploads' },

  /** Checkout: 10 per minute */
  checkout: { limit: 10, windowSeconds: 60, identifier: 'checkout' },

  /** AI endpoints: 20 per minute */
  ai: { limit: 20, windowSeconds: 60, identifier: 'ai' },
}

/**
 * Middleware helper for rate limiting
 * Returns null if allowed, or Response if rate limited
 */
export function withRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: true; headers: Record<string, string> } | { allowed: false; response: Response } {
  const key = getRateLimitKey(request, config.identifier || 'rl')
  const result = checkRateLimit(key, config)
  const headers = rateLimitHeaders(result)

  if (!result.success) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            ...headers,
          },
        }
      ),
    }
  }

  return { allowed: true, headers }
}
