import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsStats, getDailyPageViews } from '@/lib/analytics/server';

// GET /api/sites/[siteId]/analytics - Get analytics stats
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Parse custom date range
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (startParam) {
      startDate.setTime(new Date(startParam).getTime());
    }

    if (endParam) {
      endDate.setTime(new Date(endParam).getTime());
    }

    // Get aggregated stats
    const stats = await getAnalyticsStats(params.siteId, {
      startDate,
      endDate,
    });

    // Get daily page views for chart
    const dailyViews = await getDailyPageViews(params.siteId, {
      startDate,
      endDate,
    });

    return NextResponse.json({
      stats,
      dailyViews,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
