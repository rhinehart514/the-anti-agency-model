/**
 * API Security Utilities
 * Centralized security helpers for API routes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UnauthorizedError, ForbiddenError } from '@/lib/api-errors';

// ============================================================================
// Authentication Helpers
// ============================================================================

export interface AuthResult {
  userId: string;
  email?: string;
}

/**
 * Require authentication - throws UnauthorizedError if not authenticated
 */
export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

/**
 * Require site ownership - throws ForbiddenError if user doesn't own the site
 */
export async function requireSiteOwnership(
  supabase: SupabaseClient,
  siteId: string
): Promise<AuthResult> {
  const auth = await requireAuth(supabase);

  const { data: site, error } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .single();

  if (error || !site) {
    throw new ForbiddenError('Site not found or access denied');
  }

  if (site.user_id !== auth.userId) {
    throw new ForbiddenError('You do not have permission to access this site');
  }

  return auth;
}

/**
 * Require organization membership - throws ForbiddenError if user is not a member
 */
export async function requireOrgMembership(
  supabase: SupabaseClient,
  orgId: string,
  requiredRoles?: string[]
): Promise<AuthResult & { role: string }> {
  const auth = await requireAuth(supabase);

  const { data: member, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', auth.userId)
    .single();

  if (error || !member) {
    throw new ForbiddenError('You are not a member of this organization');
  }

  if (requiredRoles && !requiredRoles.includes(member.role)) {
    throw new ForbiddenError('Insufficient permissions for this action');
  }

  return { ...auth, role: member.role };
}

// ============================================================================
// SSRF Protection
// ============================================================================

// Private/internal IP ranges that should be blocked
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 127.x.x.x
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,   // 10.x.x.x
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,  // 172.16.x.x - 172.31.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/,      // 192.168.x.x
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,    // 0.x.x.x
  /^169\.254\.\d{1,3}\.\d{1,3}$/,      // Link-local
  /^::1$/,                              // IPv6 localhost
  /^fc00:/i,                            // IPv6 private
  /^fe80:/i,                            // IPv6 link-local
  /^fd[0-9a-f]{2}:/i,                   // IPv6 private
];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Validate an external URL for SSRF protection
 * Blocks requests to internal/private IP addresses
 */
export function validateExternalUrl(urlString: string): UrlValidationResult {
  try {
    const url = new URL(urlString);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Block internal hostnames and IPs
    const hostname = url.hostname.toLowerCase();

    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Internal network addresses are not allowed' };
      }
    }

    // Block common internal hostnames
    const blockedHostnames = [
      'localhost',
      'internal',
      'intranet',
      'private',
      'metadata',
      'metadata.google.internal',
      '169.254.169.254',  // AWS/GCP metadata
    ];

    if (blockedHostnames.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return { valid: false, error: 'This hostname is not allowed' };
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize search parameter for use in PostgreSQL ilike queries
 * Escapes special characters: %, _, \
 */
export function sanitizeSearchParam(input: string): string {
  if (!input) return '';

  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore
}

/**
 * Sanitize and limit string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input) return '';
  return input.slice(0, maxLength).trim();
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Check if request body size is within limits
 * Returns true if within limits, false if exceeded
 */
export function checkBodySize(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get('content-length');

  if (!contentLength) {
    // If no content-length header, we can't check ahead of time
    // The actual body parsing will fail if too large
    return true;
  }

  return parseInt(contentLength, 10) <= maxBytes;
}

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { limit: number; maxLimit: number } = { limit: 50, maxLimit: 100 }
): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') || String(defaults.limit), 10)),
    defaults.maxLimit
  );

  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  return { limit, offset };
}

// ============================================================================
// Rate Limit Helpers
// ============================================================================

/**
 * Get a consistent identifier for rate limiting from a request
 * Handles proxy headers and falls back gracefully
 */
export function getRateLimitIdentifier(
  request: Request,
  additionalContext?: string
): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  if (additionalContext) {
    return `${ip}:${additionalContext}`;
  }

  return ip;
}
