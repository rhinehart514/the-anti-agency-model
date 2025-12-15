import { NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export const RATE_LIMITS = {
  // General API rate limit
  api: { interval: 60000, maxRequests: 100 }, // 100 requests per minute

  // Stricter limits for expensive operations
  ai: { interval: 60000, maxRequests: 20 }, // 20 AI requests per minute
  upload: { interval: 60000, maxRequests: 10 }, // 10 uploads per minute
  contact: { interval: 60000, maxRequests: 5 }, // 5 contact submissions per minute

  // Auth rate limits
  auth: { interval: 300000, maxRequests: 10 }, // 10 auth attempts per 5 minutes
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

export function getRateLimitKey(
  type: RateLimitType,
  identifier: string
): string {
  return `${type}:${identifier}`
}

export function checkRateLimit(
  type: RateLimitType,
  identifier: string
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(type, identifier)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Reset if window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.interval,
    }
  }

  const remaining = Math.max(0, config.maxRequests - entry.count - 1)
  const resetIn = Math.max(0, entry.resetAt - now)

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return { allowed: true, remaining, resetIn }
}

export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Please slow down and try again later',
      retryAfter: Math.ceil(resetIn / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(resetIn / 1000)),
        'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
      },
    }
  )
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  return forwarded?.split(',')[0]?.trim() || realIp || cfIp || 'unknown'
}

// Middleware helper for rate limiting
export function withRateLimit(
  type: RateLimitType,
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const identifier = getClientIdentifier(request)
    const { allowed, resetIn } = checkRateLimit(type, identifier)

    if (!allowed) {
      return rateLimitResponse(resetIn)
    }

    return handler(request)
  }
}
