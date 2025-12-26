'use client';

import { nanoid } from 'nanoid';

// Session storage key
const SESSION_KEY = 'analytics_session_id';
const USER_KEY = 'analytics_site_user_id';

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = nanoid(16);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Get site user ID if logged in
function getSiteUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY);
}

// Set site user ID when user logs in
export function setSiteUserId(userId: string | null) {
  if (typeof window === 'undefined') return;
  if (userId) {
    localStorage.setItem(USER_KEY, userId);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

// Parse user agent for device info
function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Detect device type
  if (/Mobi|Android/i.test(ua)) {
    deviceType = /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { deviceType, browser, os };
}

// Analytics configuration
interface AnalyticsConfig {
  siteId: string;
  endpoint?: string;
  debug?: boolean;
}

let config: AnalyticsConfig | null = null;

// Initialize analytics
export function initAnalytics(options: AnalyticsConfig) {
  config = {
    endpoint: '/api/analytics/track',
    debug: false,
    ...options,
  };

  if (config.debug) {
    console.log('[Analytics] Initialized:', config);
  }

  // Auto-track initial page view
  trackPageView();

  // Track page views on navigation (SPA)
  if (typeof window !== 'undefined') {
    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      trackPageView();
    });

    // Patch pushState and replaceState
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      trackPageView();
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      trackPageView();
    };
  }
}

// Track page view
export function trackPageView(customPath?: string) {
  if (!config) {
    console.warn('[Analytics] Not initialized. Call initAnalytics first.');
    return;
  }

  if (typeof window === 'undefined') return;

  const { deviceType, browser, os } = getDeviceInfo();

  const data = {
    type: 'pageview',
    siteId: config.siteId,
    path: customPath || window.location.pathname,
    referrer: document.referrer || null,
    sessionId: getSessionId(),
    siteUserId: getSiteUserId(),
    deviceType,
    browser,
    os,
    metadata: {
      title: document.title,
      url: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
    },
  };

  if (config.debug) {
    console.log('[Analytics] Page view:', data);
  }

  // Send tracking data
  sendTrackingData(data);
}

// Track custom event
export function trackEvent(
  eventName: string,
  eventData?: Record<string, any>,
  category?: string
) {
  if (!config) {
    console.warn('[Analytics] Not initialized. Call initAnalytics first.');
    return;
  }

  if (typeof window === 'undefined') return;

  const data = {
    type: 'event',
    siteId: config.siteId,
    eventName,
    eventCategory: category,
    eventData: eventData || {},
    path: window.location.pathname,
    sessionId: getSessionId(),
    siteUserId: getSiteUserId(),
  };

  if (config.debug) {
    console.log('[Analytics] Event:', data);
  }

  sendTrackingData(data);
}

// Pre-defined e-commerce events
export const ecommerceEvents = {
  viewProduct: (productId: string, productName: string, price: number) => {
    trackEvent('view_product', { productId, productName, price }, 'ecommerce');
  },

  addToCart: (productId: string, productName: string, quantity: number, price: number) => {
    trackEvent('add_to_cart', { productId, productName, quantity, price }, 'ecommerce');
  },

  removeFromCart: (productId: string, productName: string, quantity: number) => {
    trackEvent('remove_from_cart', { productId, productName, quantity }, 'ecommerce');
  },

  beginCheckout: (cartValue: number, itemCount: number) => {
    trackEvent('begin_checkout', { cartValue, itemCount }, 'ecommerce');
  },

  purchase: (orderId: string, total: number, itemCount: number) => {
    trackEvent('purchase', { orderId, total, itemCount }, 'ecommerce');
  },
};

// Pre-defined engagement events
export const engagementEvents = {
  signUp: (method?: string) => {
    trackEvent('sign_up', { method }, 'engagement');
  },

  login: (method?: string) => {
    trackEvent('login', { method }, 'engagement');
  },

  formSubmit: (formId: string, formName: string) => {
    trackEvent('form_submit', { formId, formName }, 'engagement');
  },

  click: (elementId: string, elementText?: string) => {
    trackEvent('click', { elementId, elementText }, 'engagement');
  },

  scroll: (depth: number) => {
    trackEvent('scroll', { depth }, 'engagement');
  },

  share: (platform: string, contentId: string) => {
    trackEvent('share', { platform, contentId }, 'engagement');
  },
};

// Send tracking data to API
async function sendTrackingData(data: any) {
  if (!config) return;

  try {
    // Use sendBeacon for better reliability on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], {
        type: 'application/json',
      });
      navigator.sendBeacon(config.endpoint!, blob);
    } else {
      // Fallback to fetch
      fetch(config.endpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      });
    }
  } catch (error) {
    if (config.debug) {
      console.error('[Analytics] Send error:', error);
    }
  }
}

// React hook for analytics
export function useAnalytics() {
  return {
    trackPageView,
    trackEvent,
    ...ecommerceEvents,
    ...engagementEvents,
  };
}
