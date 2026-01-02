import * as Sentry from '@sentry/nextjs';

/**
 * Sentry edge runtime configuration
 * Captures errors from edge functions and middleware
 */

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Percentage of transactions to sample
  tracesSampleRate: 0.1,

  // Debug mode for troubleshooting
  debug: process.env.SENTRY_DEBUG === 'true',

  // Environment tag
  environment: process.env.NODE_ENV,
});
