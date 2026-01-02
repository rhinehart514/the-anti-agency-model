import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

// GET /api/sites/[siteId]/workflows/[workflowId]/executions - List workflow executions
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; workflowId: string } }
) {
  try {
    const supabase = await createClient();

    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workflow belongs to site
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', params.workflowId)
      .eq('site_id', params.siteId)
      .single();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const triggerType = searchParams.get('triggerType');

    let query = supabase
      .from('workflow_executions')
      .select('*', { count: 'exact' })
      .eq('workflow_id', params.workflowId)
      .range(offset, offset + limit - 1)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (triggerType) {
      query = query.eq('trigger_type', triggerType);
    }

    const { data: executions, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching executions');
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      executions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Executions error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
