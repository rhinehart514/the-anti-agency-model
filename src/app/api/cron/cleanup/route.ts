import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  try {
    const results: Record<string, number> = {}

    // 1. Clean up old analytics events (older than 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { error: analyticsError } = await supabaseAdmin
      .from('analytics_events')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())

    results.analytics_cleaned = analyticsError ? 0 : 1

    // 2. Reset monthly AI usage counters (first of month)
    const today = new Date()
    if (today.getDate() === 1) {
      const { error: usageError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          ai_requests_this_month: 0,
          ai_requests_reset_at: new Date().toISOString(),
        })
        .neq('ai_requests_this_month', 0)

      results.usage_counters_reset = usageError ? 0 : 1
    }

    // 3. Clean up old content versions (keep last 10 per page)
    // This is more complex, skip for now
    results.content_versions_cleaned = 0

    console.log('Cron cleanup completed:', results)

    return NextResponse.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
