import { NextRequest, NextResponse } from 'next/server';
import { recordPageView, recordEvent } from '@/lib/analytics/server';

// POST /api/analytics/track - Track page views and events
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and beacon data
    let data: any;

    const contentType = request.headers.get('content-type');

    if (contentType?.includes('text/plain')) {
      // Beacon sends as text/plain
      const text = await request.text();
      data = JSON.parse(text);
    } else {
      data = await request.json();
    }

    const { type, siteId } = data;

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    // Get client IP for hashing (privacy-preserving)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0].trim() || 'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || '';

    if (type === 'pageview') {
      await recordPageView({
        siteId: data.siteId,
        path: data.path,
        pageId: data.pageId,
        referrer: data.referrer,
        userAgent,
        ip,
        sessionId: data.sessionId,
        siteUserId: data.siteUserId,
        deviceType: data.deviceType,
        browser: data.browser,
        os: data.os,
        metadata: data.metadata,
      });
    } else if (type === 'event') {
      await recordEvent({
        siteId: data.siteId,
        eventName: data.eventName,
        eventCategory: data.eventCategory,
        eventData: data.eventData,
        path: data.path,
        sessionId: data.sessionId,
        siteUserId: data.siteUserId,
        metadata: data.metadata,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid tracking type' },
        { status: 400 }
      );
    }

    // Return minimal response (1x1 pixel could also be returned for image tracking)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Still return 204 to not break client
    return new NextResponse(null, { status: 204 });
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
