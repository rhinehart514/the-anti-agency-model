import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server-side configuration
 * Captures server-side errors and performance data
 */

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Percentage of transactions to sample (0.1 = 10%)
  tracesSampleRate: 0.1,

  // Debug mode for troubleshooting
  debug: process.env.SENTRY_DEBUG === 'true',

  // Environment tag
  environment: process.env.NODE_ENV,

  // Add custom tags for all events
  initialScope: {
    tags: {
      service: 'the-anti-agency',
    },
  },

  // Filter out noisy errors
  ignoreErrors: [
    // Supabase auth errors that are expected
    'Invalid JWT',
    'JWT expired',
    // Network timeouts
    'ETIMEDOUT',
    'ECONNRESET',
  ],

  // Add additional context to events
  beforeSend(event, hint) {
    // Don't send events during development
    if (process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG !== 'true') {
      return null;
    }

    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }

    return event;
  },
});
