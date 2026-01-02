import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client-side configuration
 * Captures client-side errors and performance data
 */

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Percentage of transactions to sample (0.1 = 10%)
  // Adjust based on traffic volume
  tracesSampleRate: 0.1,

  // Session Replay - captures user sessions for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode for troubleshooting (disable in production)
  debug: process.env.SENTRY_DEBUG === 'true',

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    // Network errors that happen during navigation
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Common user errors
    'ResizeObserver loop',
    // Script errors from external sources
    'Script error.',
  ],

  // Add additional context to events
  beforeSend(event, hint) {
    // Don't send events during development unless debugging
    if (process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG !== 'true') {
      return null;
    }
    return event;
  },

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      // Additional configuration options
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
