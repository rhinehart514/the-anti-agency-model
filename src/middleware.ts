import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { loggers } from '@/lib/logger'
import { withRateLimit, rateLimiters } from '@/lib/rate-limit'

// App domain (requests to this domain use normal routing)
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'

// DNS Cache for custom domain lookups (5 minute TTL)
const DNS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const dnsCache = new Map<string, { siteId: string | null; expiresAt: number }>()

/**
 * Get cached DNS lookup result
 */
function getCachedDomain(hostname: string): string | null | undefined {
  const cached = dnsCache.get(hostname)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.siteId
  }
  // Remove expired entry
  if (cached) {
    dnsCache.delete(hostname)
  }
  return undefined // Cache miss
}

/**
 * Cache DNS lookup result
 */
function cacheDomain(hostname: string, siteId: string | null): void {
  dnsCache.set(hostname, {
    siteId,
    expiresAt: Date.now() + DNS_CACHE_TTL_MS,
  })

  // Periodically clean up expired entries (every 100 new entries)
  if (dnsCache.size % 100 === 0) {
    const now = Date.now()
    for (const [key, value] of dnsCache.entries()) {
      if (value.expiresAt <= now) {
        dnsCache.delete(key)
      }
    }
  }
}

// Check if hostname is a custom domain (with caching)
async function getCustomDomainSite(hostname: string): Promise<string | null> {
  // Skip for app domain and localhost
  if (
    hostname === APP_DOMAIN ||
    hostname.endsWith(`.${APP_DOMAIN}`) ||
    hostname === 'localhost' ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1')
  ) {
    return null
  }

  // Check cache first
  const cachedResult = getCachedDomain(hostname)
  if (cachedResult !== undefined) {
    loggers.middleware.debug({ hostname, cached: true }, 'Custom domain cache hit')
    return cachedResult
  }

  try {
    // Use service role for middleware (server-side only)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      loggers.middleware.error({ hostname }, 'Missing Supabase configuration for custom domain lookup')
      return null
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Check if this is a verified custom domain
    const { data } = await supabase
      .from('site_domains')
      .select('site_id, verified')
      .eq('domain', hostname)
      .eq('verified', true)
      .single()

    const siteId = data?.site_id || null

    // Cache the result (both positive and negative)
    cacheDomain(hostname, siteId)
    loggers.middleware.debug({ hostname, siteId, cached: false }, 'Custom domain lookup completed')

    return siteId
  } catch (error) {
    // Domain not found or database error - cache as negative result
    cacheDomain(hostname, null)
    loggers.middleware.error({ hostname, error }, 'Custom domain lookup error')
  }

  return null
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Generate unique request ID for tracing
  const requestId = request.headers.get('x-request-id') || nanoid(16)

  // Apply rate limiting to API routes (except exempted endpoints)
  if (pathname.startsWith('/api/')) {
    const exemptPaths = [
      '/api/health',           // Health checks should always respond
      '/api/analytics/track',  // High-volume tracking, has its own controls
      '/api/webhooks/stripe',  // Verified by Stripe signature, not rate limited
    ]

    const isExempt = exemptPaths.some(p => pathname.startsWith(p))

    if (!isExempt) {
      const rateLimit = withRateLimit(request, rateLimiters.api)
      if (!rateLimit.allowed) {
        loggers.middleware.warn(
          { pathname, ip: request.headers.get('x-forwarded-for') },
          'Rate limit exceeded'
        )
        return rateLimit.response
      }
    }
  }

  // Check for custom domain
  const customDomainSiteId = await getCustomDomainSite(hostname)

  if (customDomainSiteId) {
    // Rewrite to the site's published pages
    // For custom domains, we serve the published site
    const url = request.nextUrl.clone()

    // If requesting root, serve the site's home page
    if (pathname === '/') {
      url.pathname = `/sites/${customDomainSiteId}`
    } else {
      // Otherwise, rewrite to the site's path
      url.pathname = `/sites/${customDomainSiteId}${pathname}`
    }

    // Add custom domain header for downstream processing
    const response = NextResponse.rewrite(url)
    response.headers.set('x-custom-domain', hostname)
    response.headers.set('x-site-id', customDomainSiteId)
    response.headers.set('x-request-id', requestId)

    return response
  }

  // Normal session handling for app domain
  const response = await updateSession(request)

  // Add request ID to response headers
  if (response) {
    response.headers.set('x-request-id', requestId)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
