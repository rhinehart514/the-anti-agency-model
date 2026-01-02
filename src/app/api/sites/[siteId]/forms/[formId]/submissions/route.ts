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

// GET /api/sites/[siteId]/forms/[formId]/submissions - List form submissions
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; formId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication and site ownership
    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Verify form exists and belongs to site
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, name')
      .eq('id', params.formId)
      .eq('site_id', params.siteId)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('form_submissions')
      .select('*', { count: 'exact' })
      .eq('form_id', params.formId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    // For search, we search in the JSONB data field
    // This is a simple implementation - production might need full-text search
    if (search) {
      const safeSearch = sanitizeSearchParam(search);
      query = query.or(`data->>'email'.ilike.%${safeSearch}%,data->>'name'.ilike.%${safeSearch}%`);
    }

    const { data: submissions, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching submissions');
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      form: { id: form.id, name: form.name },
      submissions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Submissions error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/[siteId]/forms/[formId]/submissions - Bulk update submissions
export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string; formId: string } }
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

    if (!status || !['new', 'read', 'archived', 'spam'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (new, read, archived, spam)' },
        { status: 400 }
      );
    }

    // Verify form belongs to site
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.formId)
      .eq('site_id', params.siteId)
      .single();

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Update submissions
    const { data: updated, error } = await supabase
      .from('form_submissions')
      .update({ status })
      .in('id', submissionIds)
      .eq('form_id', params.formId)
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

// DELETE /api/sites/[siteId]/forms/[formId]/submissions - Bulk delete submissions
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; formId: string } }
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

    // Verify form belongs to site
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.formId)
      .eq('site_id', params.siteId)
      .single();

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Delete submissions
    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .in('id', submissionIds)
      .eq('form_id', params.formId);

    if (error) {
      loggers.api.error({ error }, 'Error deleting submissions');
      return NextResponse.json(
        { error: 'Failed to delete submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deleted: submissionIds.length,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Delete submissions error');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
