import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { loggers } from '@/lib/logger';
import {
  createMagicLink,
  getSiteMagicLinks,
  revokeMagicLink,
  buildMagicLinkUrl,
  MagicLinkPermissions,
} from '@/lib/magic-links';

const CreateMagicLinkSchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().min(1).max(365).optional(),
  permissions: z.object({
    canEditText: z.boolean().optional(),
    canEditColors: z.boolean().optional(),
    canEditImages: z.boolean().optional(),
    canAddSections: z.boolean().optional(),
    canRemoveSections: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    allowedPages: z.array(z.string()).optional(),
    maxEditsPerDay: z.number().min(1).max(1000).optional(),
  }).optional(),
});

/**
 * GET /api/sites/[siteId]/magic-links
 *
 * Get all magic links for a site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getSiteMagicLinks(siteId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    // Build full URLs for each link
    const linksWithUrls = result.links?.map((link) => ({
      ...link,
      url: buildMagicLinkUrl(siteId, link.token),
    }));

    return NextResponse.json({
      success: true,
      links: linksWithUrls,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Get magic links error');
    return NextResponse.json(
      { error: 'Failed to get magic links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites/[siteId]/magic-links
 *
 * Create a new magic link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify site ownership
    const { data: site } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', siteId)
      .single();

    if (!site || site.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = CreateMagicLinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { name, expiresInDays, permissions } = parseResult.data;

    const result = await createMagicLink({
      siteId,
      userId: user.id,
      name,
      expiresInDays,
      permissions: permissions as Partial<MagicLinkPermissions>,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return with full URL
    const url = buildMagicLinkUrl(siteId, result.magicLink!.token);

    return NextResponse.json({
      success: true,
      magicLink: {
        ...result.magicLink,
        url,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Create magic link error');
    return NextResponse.json(
      { error: 'Failed to create magic link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sites/[siteId]/magic-links
 *
 * Revoke a magic link (expects linkId in body)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId is required' },
        { status: 400 }
      );
    }

    const result = await revokeMagicLink(linkId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    loggers.api.error({ error }, 'Revoke magic link error');
    return NextResponse.json(
      { error: 'Failed to revoke magic link' },
      { status: 500 }
    );
  }
}
