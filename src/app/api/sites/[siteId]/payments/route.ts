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

// GET /api/sites/[siteId]/payments - List payment history
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const supabase = await createClient();

    const { authorized } = await verifySiteOwnership(supabase, params.siteId);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');

    // Get order IDs for this site first
    const { data: siteOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('site_id', params.siteId);

    if (!siteOrders || siteOrders.length === 0) {
      return NextResponse.json({
        payments: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    const orderIds = siteOrders.map((o) => o.id);

    let query = supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          order_number,
          email,
          total
        )
      `, { count: 'exact' })
      .in('order_id', orderIds)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: payments, count, error } = await query;

    if (error) {
      loggers.api.error({ error }, 'Error fetching payments');
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payments,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    loggers.api.error({ error }, 'Payments error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
