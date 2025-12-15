import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const siteSlug = searchParams.get('siteSlug')
  const period = searchParams.get('period') || '7d'

  if (!siteSlug) {
    return NextResponse.json({ error: 'Site slug required' }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get site and verify ownership
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, owner_id')
    .eq('slug', siteSlug)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  if (site.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Calculate date range
  const now = new Date()
  const days = period === '30d' ? 30 : period === '7d' ? 7 : 1
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Get analytics data
  const { data: events, error: eventsError } = await supabase
    .from('analytics_events')
    .select('event_type, page_path, device_type, browser, country, created_at')
    .eq('site_id', site.id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (eventsError) {
    console.error('Analytics fetch error:', eventsError)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }

  // Process data
  const pageViews = events?.filter((e) => e.event_type === 'page_view').length || 0
  const contactSubmissions = events?.filter((e) => e.event_type === 'contact_submit').length || 0

  // Unique visitors (by counting unique days with activity as approximation)
  const uniqueVisitors = new Set(
    events
      ?.filter((e) => e.event_type === 'page_view')
      .map((e) => e.created_at?.slice(0, 10))
  ).size

  // Top pages
  const pageCounts: Record<string, number> = {}
  events?.filter((e) => e.event_type === 'page_view').forEach((e) => {
    const path = e.page_path || '/'
    pageCounts[path] = (pageCounts[path] || 0) + 1
  })
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }))

  // Device breakdown
  const deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 }
  events?.filter((e) => e.event_type === 'page_view').forEach((e) => {
    const device = e.device_type || 'desktop'
    deviceCounts[device] = (deviceCounts[device] || 0) + 1
  })

  // Browser breakdown
  const browserCounts: Record<string, number> = {}
  events?.filter((e) => e.event_type === 'page_view').forEach((e) => {
    const browser = e.browser || 'Other'
    browserCounts[browser] = (browserCounts[browser] || 0) + 1
  })
  const topBrowsers = Object.entries(browserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([browser, count]) => ({ browser, count }))

  // Daily breakdown for chart
  const dailyViews: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().slice(0, 10)
    dailyViews[dateStr] = 0
  }
  events?.filter((e) => e.event_type === 'page_view').forEach((e) => {
    const dateStr = e.created_at?.slice(0, 10)
    if (dateStr && dailyViews.hasOwnProperty(dateStr)) {
      dailyViews[dateStr]++
    }
  })
  const chartData = Object.entries(dailyViews)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, views]) => ({ date, views }))

  return NextResponse.json({
    summary: {
      pageViews,
      uniqueVisitors,
      contactSubmissions,
      period,
    },
    topPages,
    devices: deviceCounts,
    browsers: topBrowsers,
    chartData,
  })
}
