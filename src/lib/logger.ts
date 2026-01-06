import pino, { Logger, LoggerOptions } from 'pino';

/**
 * Structured logger using Pino
 * - JSON output in production for log aggregation
 * - Pretty output in development for readability
 * - Request context tracking with child loggers
 */

const isDev = process.env.NODE_ENV !== 'production';

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
    ],
    censor: '[REDACTED]',
  },
  // Standard timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Base fields for all logs
  base: {
    service: 'cursor-for-normies',
    version: process.env.npm_package_version || '1.0.0',
  },
};

// In development, use pino-pretty for readable output
// In production, use JSON for log aggregation tools
const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

// Create the base logger
export const logger: Logger = pino({
  ...baseOptions,
  transport,
});

/**
 * Create a child logger with request context
 * Use this in API routes to track request-specific information
 */
export function createRequestLogger(
  requestId: string,
  context?: Record<string, unknown>
): Logger {
  return logger.child({
    requestId,
    ...context,
  });
}

/**
 * Create a child logger for a specific module/feature
 * Use this to add context about which part of the system is logging
 */
export function createModuleLogger(
  module: string,
  context?: Record<string, unknown>
): Logger {
  return logger.child({
    module,
    ...context,
  });
}

// Pre-configured module loggers for common subsystems
export const loggers = {
  api: createModuleLogger('api'),
  auth: createModuleLogger('auth'),
  commerce: createModuleLogger('commerce'),
  workflow: createModuleLogger('workflow'),
  email: createModuleLogger('email'),
  db: createModuleLogger('database'),
  stripe: createModuleLogger('stripe'),
  middleware: createModuleLogger('middleware'),
  ai: createModuleLogger('ai'),
  upload: createModuleLogger('upload'),
  import: createModuleLogger('import'),
  scraping: createModuleLogger('scraping'),
  analytics: createModuleLogger('analytics'),
  organization: createModuleLogger('organization'),
  domain: createModuleLogger('domain'),
  template: createModuleLogger('template'),
};

/**
 * Log levels:
 * - trace: Extremely detailed debugging (disabled in production)
 * - debug: Detailed debugging information
 * - info: General operational messages
 * - warn: Warning conditions that might need attention
 * - error: Error conditions that need investigation
 * - fatal: Unrecoverable errors
 */

// Type exports for consumers
export type { Logger };
