import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Hash IP address for privacy
function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

// Record a page view
export async function recordPageView(data: {
  siteId: string;
  path: string;
  pageId?: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  sessionId?: string;
  siteUserId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  metadata?: Record<string, any>;
  country?: string;
  city?: string;
  region?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from('page_views').insert({
    site_id: data.siteId,
    page_id: data.pageId,
    path: data.path,
    referrer: data.referrer,
    user_agent: data.userAgent,
    ip_hash: data.ip ? hashIP(data.ip) : null,
    session_id: data.sessionId,
    site_user_id: data.siteUserId,
    device_type: data.deviceType,
    browser: data.browser,
    os: data.os,
    metadata: data.metadata || {},
    country: data.country,
    city: data.city,
    region: data.region,
  });

  if (error) {
    console.error('Failed to record page view:', error);
  }

  return !error;
}

// Record an event
export async function recordEvent(data: {
  siteId: string;
  eventName: string;
  eventCategory?: string;
  eventData?: Record<string, any>;
  path?: string;
  sessionId?: string;
  siteUserId?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from('analytics_events').insert({
    site_id: data.siteId,
    event_name: data.eventName,
    event_category: data.eventCategory,
    event_data: data.eventData || {},
    page_path: data.path,
    session_id: data.sessionId,
    site_user_id: data.siteUserId,
    metadata: data.metadata || {},
  });

  if (error) {
    console.error('Failed to record event:', error);
  }

  return !error;
}

// Get page views for a time period
export async function getPageViews(
  siteId: string,
  options: {
    startDate: Date;
    endDate: Date;
    path?: string;
    limit?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('page_views')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString())
    .order('created_at', { ascending: false });

  if (options.path) {
    query = query.eq('path', options.path);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, count, error } = await query;

  return { data, count, error };
}

// Get events for a time period
export async function getEvents(
  siteId: string,
  options: {
    startDate: Date;
    endDate: Date;
    eventName?: string;
    eventCategory?: string;
    limit?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString())
    .order('created_at', { ascending: false });

  if (options.eventName) {
    query = query.eq('event_name', options.eventName);
  }

  if (options.eventCategory) {
    query = query.eq('event_category', options.eventCategory);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, count, error } = await query;

  return { data, count, error };
}

// Get aggregated stats
export async function getAnalyticsStats(
  siteId: string,
  options: {
    startDate: Date;
    endDate: Date;
  }
) {
  const supabase = await createClient();

  // Get page view counts
  const { count: totalPageViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  // Get unique sessions
  const { data: sessionsData } = await supabase
    .from('page_views')
    .select('session_id')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  const uniqueSessions = new Set(sessionsData?.map((d) => d.session_id).filter(Boolean)).size;

  // Get unique visitors (by IP hash)
  const { data: visitorsData } = await supabase
    .from('page_views')
    .select('ip_hash')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  const uniqueVisitors = new Set(visitorsData?.map((d) => d.ip_hash).filter(Boolean)).size;

  // Get top pages
  const { data: topPages } = await supabase
    .from('page_views')
    .select('path')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  const pageCounts = (topPages || []).reduce((acc, { path }) => {
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPagesArray = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Get device breakdown
  const { data: devicesData } = await supabase
    .from('page_views')
    .select('device_type')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  const deviceCounts = (devicesData || []).reduce((acc, { device_type }) => {
    if (device_type) {
      acc[device_type] = (acc[device_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get browser breakdown
  const { data: browsersData } = await supabase
    .from('page_views')
    .select('browser')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  const browserCounts = (browsersData || []).reduce((acc, { browser }) => {
    if (browser) {
      acc[browser] = (acc[browser] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get referrers
  const { data: referrersData } = await supabase
    .from('page_views')
    .select('referrer')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString())
    .not('referrer', 'is', null);

  const referrerCounts = (referrersData || []).reduce((acc, { referrer }) => {
    if (referrer) {
      try {
        const url = new URL(referrer);
        const domain = url.hostname;
        acc[domain] = (acc[domain] || 0) + 1;
      } catch {
        acc['direct'] = (acc['direct'] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  // Get event counts
  const { count: totalEvents } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString());

  return {
    totalPageViews: totalPageViews || 0,
    uniqueSessions,
    uniqueVisitors,
    totalEvents: totalEvents || 0,
    topPages: topPagesArray,
    devices: deviceCounts,
    browsers: browserCounts,
    topReferrers,
  };
}

// Get daily page view trends
export async function getDailyPageViews(
  siteId: string,
  options: {
    startDate: Date;
    endDate: Date;
  }
) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('page_views')
    .select('created_at')
    .eq('site_id', siteId)
    .gte('created_at', options.startDate.toISOString())
    .lte('created_at', options.endDate.toISOString())
    .order('created_at', { ascending: true });

  // Group by date
  const dailyCounts = (data || []).reduce((acc, { created_at }) => {
    const date = new Date(created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fill in missing dates
  const result: Array<{ date: string; views: number }> = [];
  const current = new Date(options.startDate);
  const end = new Date(options.endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      views: dailyCounts[dateStr] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
