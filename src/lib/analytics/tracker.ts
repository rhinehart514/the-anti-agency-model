'use client'

interface TrackEventOptions {
  siteId: string
  eventType: 'page_view' | 'contact_submit' | 'cta_click'
  pagePath?: string
  metadata?: Record<string, string>
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return ''

  let visitorId = localStorage.getItem('_aa_visitor')
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    localStorage.setItem('_aa_visitor', visitorId)
  }
  return visitorId
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera')) return 'Opera'
  return 'Other'
}

export async function trackEvent(options: TrackEventOptions): Promise<void> {
  const { siteId, eventType, pagePath, metadata } = options

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        eventType,
        pagePath: pagePath || window.location.pathname,
        referrer: document.referrer || null,
        visitorId: getVisitorId(),
        deviceType: getDeviceType(),
        browser: getBrowser(),
        metadata,
      }),
    })
  } catch (error) {
    // Silently fail - don't break the user experience for analytics
    console.debug('Analytics tracking error:', error)
  }
}

export function trackPageView(siteId: string): void {
  trackEvent({
    siteId,
    eventType: 'page_view',
    pagePath: window.location.pathname,
  })
}
