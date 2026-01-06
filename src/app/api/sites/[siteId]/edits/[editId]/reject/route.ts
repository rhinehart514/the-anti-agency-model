import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { loggers } from '@/lib/logger';

const RejectSchema = z.object({
  reason: z.string().optional(),
});

/**
 * POST /api/sites/[siteId]/edits/[editId]/reject
 *
 * Reject a pending edit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; editId: string }> }
) {
  try {
    const { siteId, editId } = await params;
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

    // Parse request body
    const body = await request.json();
    const parseResult = RejectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { reason } = parseResult.data;

    // Update the edit status
    const { error: updateError } = await supabase
      .from('site_edits')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason || null,
      })
      .eq('id', editId)
      .eq('site_id', siteId);

    if (updateError) {
      loggers.api.error({ error: updateError }, 'Failed to reject edit');
      return NextResponse.json(
        { error: 'Failed to reject edit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    loggers.api.error({ error }, 'Reject edit error');
    return NextResponse.json(
      { error: 'Failed to reject edit' },
      { status: 500 }
    );
  }
}
