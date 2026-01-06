import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export interface MagicLink {
  id: string;
  site_id: string;
  token: string;
  name: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  permissions: MagicLinkPermissions;
  usage_count: number;
  last_used_at: string | null;
}

export interface MagicLinkPermissions {
  canEditText: boolean;
  canEditColors: boolean;
  canEditImages: boolean;
  canAddSections: boolean;
  canRemoveSections: boolean;
  requiresApproval: boolean;
  allowedPages?: string[]; // Page IDs, empty = all pages
  maxEditsPerDay?: number;
}

export interface CreateMagicLinkOptions {
  siteId: string;
  userId: string;
  name: string;
  expiresInDays?: number; // null = never expires
  permissions?: Partial<MagicLinkPermissions>;
}

const DEFAULT_PERMISSIONS: MagicLinkPermissions = {
  canEditText: true,
  canEditColors: true,
  canEditImages: false,
  canAddSections: false,
  canRemoveSections: false,
  requiresApproval: false,
  maxEditsPerDay: 50,
};

/**
 * Generate a secure, URL-safe token
 */
export function generateToken(): string {
  // 21 characters, URL-safe
  return nanoid(21);
}

/**
 * Create a new magic link for a site
 */
export async function createMagicLink(
  options: CreateMagicLinkOptions
): Promise<{ success: boolean; magicLink?: MagicLink; error?: string }> {
  const supabase = await createClient();

  const token = generateToken();
  const permissions: MagicLinkPermissions = {
    ...DEFAULT_PERMISSIONS,
    ...options.permissions,
  };

  let expiresAt: string | null = null;
  if (options.expiresInDays) {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + options.expiresInDays);
    expiresAt = expireDate.toISOString();
  }

  const { data, error } = await supabase
    .from('magic_links')
    .insert({
      site_id: options.siteId,
      token,
      name: options.name,
      created_by: options.userId,
      expires_at: expiresAt,
      is_active: true,
      permissions,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, magicLink: data as MagicLink };
}

/**
 * Validate a magic link token
 */
export async function validateMagicLink(
  siteId: string,
  token: string
): Promise<{
  valid: boolean;
  magicLink?: MagicLink;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('magic_links')
    .select('*')
    .eq('site_id', siteId)
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or expired link' };
  }

  const magicLink = data as MagicLink;

  // Check expiration
  if (magicLink.expires_at && new Date(magicLink.expires_at) < new Date()) {
    return { valid: false, error: 'This link has expired' };
  }

  return { valid: true, magicLink };
}

/**
 * Record usage of a magic link
 */
export async function recordMagicLinkUsage(
  linkId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('magic_links')
    .update({
      usage_count: supabase.rpc('increment_usage_count'),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', linkId);
}

/**
 * Revoke (deactivate) a magic link
 */
export async function revokeMagicLink(
  linkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify ownership through site
  const { data: link } = await supabase
    .from('magic_links')
    .select('site_id')
    .eq('id', linkId)
    .single();

  if (!link) {
    return { success: false, error: 'Link not found' };
  }

  const { data: site } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', link.site_id)
    .single();

  if (!site || site.user_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }

  const { error } = await supabase
    .from('magic_links')
    .update({ is_active: false })
    .eq('id', linkId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all magic links for a site
 */
export async function getSiteMagicLinks(
  siteId: string,
  userId: string
): Promise<{ success: boolean; links?: MagicLink[]; error?: string }> {
  const supabase = await createClient();

  // Verify ownership
  const { data: site } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .single();

  if (!site || site.user_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }

  const { data, error } = await supabase
    .from('magic_links')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, links: data as MagicLink[] };
}

/**
 * Check if an edit is allowed based on magic link permissions
 */
export function isEditAllowed(
  permissions: MagicLinkPermissions,
  operationType: string,
  riskLevel: string
): { allowed: boolean; reason?: string } {
  // Check operation type against permissions
  if (
    operationType === 'add_section' &&
    !permissions.canAddSections
  ) {
    return { allowed: false, reason: 'Adding sections is not allowed' };
  }

  if (
    operationType === 'remove_section' &&
    !permissions.canRemoveSections
  ) {
    return { allowed: false, reason: 'Removing sections is not allowed' };
  }

  // High risk operations require approval
  if (riskLevel === 'high' && permissions.requiresApproval) {
    return {
      allowed: false,
      reason: 'This change requires approval from the site owner',
    };
  }

  return { allowed: true };
}

/**
 * Build the magic link URL
 */
export function buildMagicLinkUrl(
  siteId: string,
  token: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/edit/${siteId}/${token}`;
}
