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

// GET /api/sites/[siteId]/analytics/summary - Get analytics summary
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
    const period = searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get page views count
    const { count: pageViews } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', params.siteId)
      .eq('event_type', 'page_view')
      .gte('created_at', startDate.toISOString());

    // Get unique visitors (by session_id)
    const { data: uniqueVisitorsData } = await supabase
      .from('analytics_events')
      .select('session_id')
      .eq('site_id', params.siteId)
      .eq('event_type', 'page_view')
      .gte('created_at', startDate.toISOString());

    const uniqueVisitors = new Set(uniqueVisitorsData?.map((v) => v.session_id)).size;

    // Get orders and revenue
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, total, status')
      .eq('site_id', params.siteId)
      .gte('created_at', startDate.toISOString());

    const orders = ordersData?.length || 0;
    const revenue = ordersData?.reduce((sum, order) => {
      if (order.status !== 'cancelled' && order.status !== 'refunded') {
        return sum + (order.total || 0);
      }
      return sum;
    }, 0) || 0;

    // Get form submissions
    const { count: formSubmissions } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', supabase.rpc('get_site_form_ids', { site_id: params.siteId }))
      .gte('created_at', startDate.toISOString());

    // Get top pages
    const { data: topPagesData } = await supabase
      .from('analytics_events')
      .select('page_path')
      .eq('site_id', params.siteId)
      .eq('event_type', 'page_view')
      .gte('created_at', startDate.toISOString());

    const pageCounts: Record<string, number> = {};
    topPagesData?.forEach((event) => {
      const path = event.page_path || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    // Get referrer sources
    const { data: referrerData } = await supabase
      .from('analytics_events')
      .select('referrer')
      .eq('site_id', params.siteId)
      .eq('event_type', 'page_view')
      .gte('created_at', startDate.toISOString())
      .not('referrer', 'is', null);

    const referrerCounts: Record<string, number> = {};
    referrerData?.forEach((event) => {
      if (event.referrer) {
        try {
          const url = new URL(event.referrer);
          const source = url.hostname;
          referrerCounts[source] = (referrerCounts[source] || 0) + 1;
        } catch {
          // Invalid URL, skip
        }
      }
    });

    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, visits]) => ({ source, visits }));

    return NextResponse.json({
      period,
      summary: {
        pageViews: pageViews || 0,
        uniqueVisitors,
        orders,
        revenue,
        formSubmissions: formSubmissions || 0,
        conversionRate: pageViews ? ((orders / (pageViews || 1)) * 100).toFixed(2) : '0.00',
      },
      topPages,
      topReferrers,
    });
  } catch (error) {
    loggers.api.error({ error }, 'Analytics summary error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
