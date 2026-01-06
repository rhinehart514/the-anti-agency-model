import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { loggers } from '@/lib/logger';
import {
  interpretEditRequest,
  applyOperations,
  validateOperations,
  generateDiffSummary,
  PageContent,
} from '@/lib/ai/natural-language-editor';

// Schema for natural language edit request
const EditRequestSchema = z.object({
  request: z.string().min(1).max(1000),
  pageId: z.string().uuid().optional(),
});

// Schema for applying edits
const ApplyEditSchema = z.object({
  pageId: z.string().uuid(),
  operations: z.array(z.object({
    type: z.enum([
      'update',
      'add_section',
      'remove_section',
      'reorder',
      'add_item',
      'remove_item',
      'update_item',
    ]),
    sectionIndex: z.number().optional(),
    path: z.string().optional(),
    value: z.unknown().optional(),
    position: z.number().optional(),
    componentId: z.string().optional(),
    props: z.record(z.unknown()).optional(),
    fromIndex: z.number().optional(),
    toIndex: z.number().optional(),
    itemIndex: z.number().optional(),
    field: z.string().optional(),
    findSection: z.string().optional(),
  })),
  editId: z.string().uuid().optional(),
});

// Helper to verify site ownership or magic link access
async function verifySiteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  magicToken?: string
): Promise<{
  authorized: boolean;
  userId?: string;
  accessType: 'owner' | 'magic_link' | 'none';
}> {
  // First check for magic link token
  if (magicToken) {
    const { data: magicLink } = await supabase
      .from('magic_links')
      .select('*')
      .eq('site_id', siteId)
      .eq('token', magicToken)
      .eq('is_active', true)
      .single();

    if (magicLink) {
      // Check if expired
      if (magicLink.expires_at && new Date(magicLink.expires_at) < new Date()) {
        return { authorized: false, accessType: 'none' };
      }
      return { authorized: true, accessType: 'magic_link' };
    }
  }

  // Fall back to user auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, accessType: 'none' };
  }

  const { data: site } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .single();

  if (!site || site.user_id !== user.id) {
    return { authorized: false, accessType: 'none' };
  }

  return { authorized: true, userId: user.id, accessType: 'owner' };
}

/**
 * POST /api/sites/[siteId]/edit-natural
 *
 * Interprets a natural language edit request and returns proposed changes.
 * Does NOT apply the changes - use PUT to apply.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    // Check for magic link token in header
    const magicToken = request.headers.get('x-magic-token') || undefined;

    const { authorized, accessType } = await verifySiteAccess(
      supabase,
      siteId,
      magicToken
    );

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = EditRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { request: editRequest, pageId } = parseResult.data;

    // Get the page content
    // If no pageId, get the homepage
    let pageQuery = supabase
      .from('pages')
      .select('id, content, title, slug')
      .eq('site_id', siteId);

    if (pageId) {
      pageQuery = pageQuery.eq('id', pageId);
    } else {
      pageQuery = pageQuery.eq('is_homepage', true);
    }

    const { data: page, error: pageError } = await pageQuery.single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Get site info for context
    const { data: site } = await supabase
      .from('sites')
      .select('name, settings')
      .eq('id', siteId)
      .single();

    // Interpret the edit request
    const result = await interpretEditRequest({
      request: editRequest,
      pageContent: page.content as PageContent,
      siteContext: {
        siteName: site?.name,
        industry: site?.settings?.industry,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Validate operations before returning
    const validation = result.response
      ? validateOperations(result.response.operations, result.response.riskLevel)
      : { valid: true, warnings: [] };

    // Generate diff summary
    const diffSummary = result.updatedContent
      ? generateDiffSummary(page.content as PageContent, result.updatedContent)
      : [];

    // Log the edit request
    if (result.response?.understood) {
      try {
        await supabase.from('site_edits').insert({
          site_id: siteId,
          page_id: page.id,
          request: editRequest,
          operations: result.response.operations,
          risk_level: result.response.riskLevel,
          status: 'pending',
          access_type: accessType,
          original_content: page.content,
          proposed_content: result.updatedContent,
        });
      } catch {
        // Table might not exist yet - that's okay
        loggers.api.warn('site_edits table not found, skipping edit logging');
      }
    }

    return NextResponse.json({
      success: true,
      pageId: page.id,
      pageTitle: page.title,
      response: result.response,
      preview: result.updatedContent,
      original: page.content,
      validation,
      diffSummary,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Natural language edit error');
    return NextResponse.json(
      { error: 'Failed to process edit request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sites/[siteId]/edit-natural
 *
 * Applies the proposed edit operations to the page.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    const magicToken = request.headers.get('x-magic-token') || undefined;

    const { authorized, accessType } = await verifySiteAccess(
      supabase,
      siteId,
      magicToken
    );

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = ApplyEditSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { pageId, operations, editId } = parseResult.data;

    // Get current page content
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id, content, version')
      .eq('id', pageId)
      .eq('site_id', siteId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Apply operations
    const updatedContent = applyOperations(
      page.content as PageContent,
      operations
    );

    // Save the updated content
    const newVersion = (page.version || 0) + 1;

    const { error: updateError } = await supabase
      .from('pages')
      .update({
        content: updatedContent,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    if (updateError) {
      loggers.api.error({ error: updateError }, 'Failed to update page');
      return NextResponse.json(
        { error: 'Failed to apply changes' },
        { status: 500 }
      );
    }

    // Create a content version for history
    try {
      await supabase.from('content_versions').insert({
        page_id: pageId,
        content: page.content, // Save the OLD content as a version
        version: page.version || 1,
        change_summary: `Natural language edit via ${accessType}`,
      });
    } catch {
      // Table might not exist - that's okay
    }

    // Update the edit record if we have an editId
    if (editId) {
      try {
        await supabase
          .from('site_edits')
          .update({ status: 'applied', applied_at: new Date().toISOString() })
          .eq('id', editId);
      } catch {
        // Table might not exist
      }
    }

    return NextResponse.json({
      success: true,
      pageId,
      version: newVersion,
      content: updatedContent,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Apply edit error');
    return NextResponse.json(
      { error: 'Failed to apply changes' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sites/[siteId]/edit-natural
 *
 * Get edit history for a site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();

    const magicToken = request.headers.get('x-magic-token') || undefined;

    const { authorized } = await verifySiteAccess(supabase, siteId, magicToken);

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    let query = supabase
      .from('site_edits')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: edits, count, error } = await query;

    if (error) {
      // Table might not exist yet
      return NextResponse.json({ edits: [], total: 0 });
    }

    return NextResponse.json({
      edits,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Get edit history error');
    return NextResponse.json(
      { error: 'Failed to get edit history' },
      { status: 500 }
    );
  }
}
