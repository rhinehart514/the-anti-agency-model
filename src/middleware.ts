import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

// App domain (requests to this domain use normal routing)
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'

// Check if hostname is a custom domain
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

  try {
    // Use service role for middleware (server-side only)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if this is a verified custom domain
    const { data } = await supabase
      .from('site_domains')
      .select('site_id, verified')
      .eq('domain', hostname)
      .eq('verified', true)
      .single()

    if (data?.site_id) {
      return data.site_id
    }
  } catch (error) {
    // Domain not found or database error
    console.error('Custom domain lookup error:', error)
  }

  return null
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

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

    return response
  }

  // Normal session handling for app domain
  return await updateSession(request)
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
