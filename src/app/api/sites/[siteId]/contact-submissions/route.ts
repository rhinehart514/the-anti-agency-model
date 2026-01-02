import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeSearchParam } from '@/lib/api-security';
import { loggers } from '@/lib/logger';

// Helper to verify site ownership
async function verifySiteOwnership(
  supabase: any,
  siteId: string
): Promise<{ authorized: boolean; userId?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false };
  }

  const { data: site } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .single();

  if (!site || site.user_id !== user.id) {
    return { authorized: false };
  }

  return { authorized: true, userId: user.id };
}

// GET /api/sites/[siteId]/contact-submissions - List contact form submissions
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('contact_submissions')
      .select('*', { count: 'exact' })
      .eq('site_id', params.siteId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const safeSearch = sanitizeSearchParam(search);
      query = query.or(`email.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%`);
    }

    const { data: submissions, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching contact submissions');
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submissions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Contact submissions error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/[siteId]/contact-submissions - Update submission status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submissionIds, status } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: 'submissionIds array is required' },
        { status: 400 }
      );
    }

    if (!status || !['new', 'read', 'replied', 'archived', 'spam'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from('contact_submissions')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', submissionIds)
      .eq('site_id', params.siteId)
      .select();

    if (error) {
      loggers.api.error({ error }, 'Error updating submissions');
      return NextResponse.json(
        { error: 'Failed to update submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated: updated?.length || 0,
      submissions: updated,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Update submissions error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/sites/[siteId]/contact-submissions - Delete submissions
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submissionIds } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: 'submissionIds array is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .in('id', submissionIds)
      .eq('site_id', params.siteId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting submissions');
      return NextResponse.json(
        { error: 'Failed to delete submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: submissionIds.length });
  } catch (error) {
    loggers.api.error({ error }, 'Delete submissions error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
