import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      siteId,
      eventType,
      pagePath,
      referrer,
      visitorId,
      deviceType,
      browser,
    } = body

    if (!siteId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get country from request headers (set by Vercel/Cloudflare)
    const country = request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      null

    // Insert analytics event
    const { error } = await supabase.from('analytics_events').insert({
      site_id: siteId,
      event_type: eventType,
      page_path: pagePath,
      referrer,
      visitor_id: visitorId,
      device_type: deviceType,
      browser,
      country,
    })

    if (error) {
      console.error('Analytics insert error:', error)
      // Don't return error to client - analytics shouldn't break user experience
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics track error:', error)
    return NextResponse.json({ success: true }) // Always return success
  }
}
