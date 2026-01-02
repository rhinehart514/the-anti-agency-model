import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ZodError, z } from 'zod';

// ============================================================================
// RATE LIMIT TESTS
// ============================================================================

describe('Rate Limit Module', () => {
  // Re-import module fresh for each test to reset state
  beforeEach(() => {
    vi.resetModules();
  });

  describe('checkRateLimit', () => {
    it('allows first request and sets count to 1', async () => {
      const { checkRateLimit } = await import('../rate-limit');

      const result = checkRateLimit('test-key-1', { limit: 10, windowSeconds: 60 });

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('decrements remaining count on subsequent requests', async () => {
      const { checkRateLimit } = await import('../rate-limit');

      const key = 'test-key-2';
      const config = { limit: 5, windowSeconds: 60 };

      const result1 = checkRateLimit(key, config);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit(key, config);
      expect(result2.remaining).toBe(3);

      const result3 = checkRateLimit(key, config);
      expect(result3.remaining).toBe(2);
    });

    it('blocks requests when limit is reached', async () => {
      const { checkRateLimit } = await import('../rate-limit');

      const key = 'test-key-3';
      const config = { limit: 3, windowSeconds: 60 };

      // Use up the limit
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // Fourth request should be blocked
      const result = checkRateLimit(key, config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('resets count after window expires', async () => {
      const { checkRateLimit } = await import('../rate-limit');

      // Use a very short window
      const key = 'test-key-4';
      const config = { limit: 2, windowSeconds: 0.01 }; // 10ms window

      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should be allowed again
      const result = checkRateLimit(key, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('handles exactly at limit correctly', async () => {
      const { checkRateLimit } = await import('../rate-limit');

      const key = 'test-key-5';
      const config = { limit: 1, windowSeconds: 60 };

      // First request uses up the single allowed request
      const result1 = checkRateLimit(key, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(0);

      // Second request should be blocked
      const result2 = checkRateLimit(key, config);
      expect(result2.success).toBe(false);
    });
  });

  describe('getRateLimitKey', () => {
    it('extracts IP from x-forwarded-for header', async () => {
      const { getRateLimitKey } = await import('../rate-limit');

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:192.168.1.1');
    });

    it('extracts first IP from comma-separated x-forwarded-for', async () => {
      const { getRateLimitKey } = await import('../rate-limit');

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' },
      });

      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:192.168.1.1');
    });

    it('falls back to x-real-ip header', async () => {
      const { getRateLimitKey } = await import('../rate-limit');

      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.1' },
      });

      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:10.0.0.1');
    });

    it('uses unknown when no IP headers present', async () => {
      const { getRateLimitKey } = await import('../rate-limit');

      const request = new Request('http://localhost');

      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:unknown');
    });

    it('uses default prefix when not specified', async () => {
      const { getRateLimitKey } = await import('../rate-limit');

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      const key = getRateLimitKey(request);
      expect(key).toBe('rl:1.2.3.4');
    });
  });

  describe('rateLimitHeaders', () => {
    it('creates correct rate limit headers', async () => {
      const { rateLimitHeaders } = await import('../rate-limit');

      const result = {
        success: true,
        limit: 100,
        remaining: 95,
        resetTime: Date.now() + 60000,
      };

      const headers = rateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });
  });

  describe('withRateLimit', () => {
    it('returns allowed with headers when under limit', async () => {
      const { withRateLimit } = await import('../rate-limit');

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      const result = withRateLimit(request, { limit: 10, windowSeconds: 60, identifier: 'test' });

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.headers['X-RateLimit-Limit']).toBe('10');
      }
    });

    it('returns 429 response when rate limited', async () => {
      const { withRateLimit, checkRateLimit } = await import('../rate-limit');

      // Exhaust the limit
      const key = 'test:192.168.1.101';
      checkRateLimit(key, { limit: 1, windowSeconds: 60 });

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.101' },
      });

      const result = withRateLimit(request, { limit: 1, windowSeconds: 60, identifier: 'test' });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(429);
        expect(result.response.headers.get('Retry-After')).toBeDefined();
      }
    });

    it('includes correct error message in 429 response', async () => {
      const { withRateLimit, checkRateLimit } = await import('../rate-limit');

      // Exhaust the limit
      const key = 'test:192.168.1.102';
      checkRateLimit(key, { limit: 1, windowSeconds: 60 });

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.102' },
      });

      const result = withRateLimit(request, { limit: 1, windowSeconds: 60, identifier: 'test' });

      if (!result.allowed) {
        const body = await result.response.json();
        expect(body.error).toBe('Too many requests');
        expect(body.retryAfter).toBeGreaterThan(0);
      }
    });
  });

  describe('rateLimiters config', () => {
    it('has correct auth config', async () => {
      const { rateLimiters } = await import('../rate-limit');

      expect(rateLimiters.auth.limit).toBe(5);
      expect(rateLimiters.auth.windowSeconds).toBe(60);
      expect(rateLimiters.auth.identifier).toBe('auth');
    });

    it('has correct api config', async () => {
      const { rateLimiters } = await import('../rate-limit');

      expect(rateLimiters.api.limit).toBe(100);
      expect(rateLimiters.api.windowSeconds).toBe(60);
    });

    it('has correct ai config', async () => {
      const { rateLimiters } = await import('../rate-limit');

      expect(rateLimiters.ai.limit).toBe(20);
      expect(rateLimiters.ai.windowSeconds).toBe(60);
    });

    it('has correct uploads config', async () => {
      const { rateLimiters } = await import('../rate-limit');

      expect(rateLimiters.uploads.limit).toBe(20);
      expect(rateLimiters.uploads.windowSeconds).toBe(60);
    });
  });
});

// ============================================================================
// API ERRORS TESTS
// ============================================================================

describe('API Errors Module', () => {
  describe('ApiError base class', () => {
    it('creates error with correct properties', async () => {
      const { ApiError, ERROR_CODES, HTTP_STATUS } = await import('../api-errors');

      const error = new ApiError(
        'Test error',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_FAILED,
        { field: 'email' }
      );

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ApiError');
    });

    it('toResponse creates valid NextResponse', async () => {
      const { ApiError, ERROR_CODES, HTTP_STATUS } = await import('../api-errors');

      const error = new ApiError('Not allowed', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      const response = error.toResponse();

      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('Not allowed');
      expect(body.code).toBe('FORBIDDEN');
    });

    it('toResponse includes requestId when provided', async () => {
      const { ApiError, ERROR_CODES, HTTP_STATUS } = await import('../api-errors');

      const error = new ApiError('Test', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_REQUEST);
      const response = error.toResponse('req-123');

      const body = await response.json();
      expect(body.requestId).toBe('req-123');
    });
  });

  describe('Specific error classes', () => {
    it('ValidationError has correct defaults', async () => {
      const { ValidationError } = await import('../api-errors');

      const error = new ValidationError();

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.name).toBe('ValidationError');
    });

    it('UnauthorizedError has correct defaults', async () => {
      const { UnauthorizedError } = await import('../api-errors');

      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('ForbiddenError has correct defaults', async () => {
      const { ForbiddenError } = await import('../api-errors');

      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('NotFoundError formats resource name', async () => {
      const { NotFoundError } = await import('../api-errors');

      const error = new NotFoundError('Product');

      expect(error.message).toBe('Product not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('ConflictError has correct defaults', async () => {
      const { ConflictError } = await import('../api-errors');

      const error = new ConflictError();

      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('RateLimitError includes retryAfter in details', async () => {
      const { RateLimitError } = await import('../api-errors');

      const error = new RateLimitError('Slow down', 30);

      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 30 });
    });

    it('InternalError has correct defaults', async () => {
      const { InternalError } = await import('../api-errors');

      const error = new InternalError();

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('DatabaseError has correct code', async () => {
      const { DatabaseError, ERROR_CODES } = await import('../api-errors');

      const error = new DatabaseError();

      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('ExternalServiceError includes service name', async () => {
      const { ExternalServiceError } = await import('../api-errors');

      const error = new ExternalServiceError('Stripe', 'Payment failed');

      expect(error.message).toBe('Payment failed');
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({ service: 'Stripe' });
    });
  });

  describe('fromZodError', () => {
    it('converts single ZodError to ValidationError', async () => {
      const { fromZodError } = await import('../api-errors');

      const schema = z.object({ email: z.string().email() });

      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);

          expect(validationError.message).toBe('Validation failed');
          expect(validationError.statusCode).toBe(400);
          expect(validationError.details?.errors).toBeDefined();
        }
      }
    });

    it('converts multiple ZodErrors correctly', async () => {
      const { fromZodError } = await import('../api-errors');

      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(2),
      });

      try {
        schema.parse({ email: 'bad', name: 'x' });
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          const errors = validationError.details?.errors as Record<string, string>;

          expect(errors['email']).toBeDefined();
          expect(errors['name']).toBeDefined();
        }
      }
    });

    it('handles nested path correctly', async () => {
      const { fromZodError } = await import('../api-errors');

      const schema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number().min(0),
          }),
        }),
      });

      try {
        schema.parse({ user: { profile: { age: -5 } } });
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          const errors = validationError.details?.errors as Record<string, string>;

          expect(errors['user.profile.age']).toBeDefined();
        }
      }
    });
  });

  describe('handleApiError', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles ApiError directly', async () => {
      const { handleApiError, NotFoundError } = await import('../api-errors');

      const error = new NotFoundError('User');
      const response = handleApiError(error);

      expect(response.status).toBe(404);
    });

    it('handles ZodError', async () => {
      const { handleApiError } = await import('../api-errors');

      const schema = z.object({ name: z.string() });

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        const response = handleApiError(error);
        expect(response.status).toBe(400);
      }
    });

    it('handles generic Error as internal error', async () => {
      const { handleApiError } = await import('../api-errors');

      const error = new Error('Something went wrong');
      const response = handleApiError(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('An unexpected error occurred');
    });

    it('handles unknown error type', async () => {
      const { handleApiError } = await import('../api-errors');

      const response = handleApiError('string error');

      expect(response.status).toBe(500);
    });

    it('includes requestId when provided', async () => {
      const { handleApiError, BadRequestError } = await import('../api-errors');

      const error = new BadRequestError('Invalid input');
      const response = handleApiError(error, 'req-456');

      const body = await response.json();
      expect(body.requestId).toBe('req-456');
    });
  });

  describe('isClientError / isServerError', () => {
    it('isClientError returns true for 4xx errors', async () => {
      const { isClientError, NotFoundError, BadRequestError, ForbiddenError } = await import('../api-errors');

      expect(isClientError(new NotFoundError())).toBe(true);
      expect(isClientError(new BadRequestError())).toBe(true);
      expect(isClientError(new ForbiddenError())).toBe(true);
    });

    it('isClientError returns false for 5xx errors', async () => {
      const { isClientError, InternalError, DatabaseError } = await import('../api-errors');

      expect(isClientError(new InternalError())).toBe(false);
      expect(isClientError(new DatabaseError())).toBe(false);
    });

    it('isClientError returns false for non-ApiError', async () => {
      const { isClientError } = await import('../api-errors');

      expect(isClientError(new Error())).toBe(false);
      expect(isClientError('string')).toBe(false);
    });

    it('isServerError returns true for 5xx errors', async () => {
      const { isServerError, InternalError, DatabaseError } = await import('../api-errors');

      expect(isServerError(new InternalError())).toBe(true);
      expect(isServerError(new DatabaseError())).toBe(true);
    });

    it('isServerError returns false for 4xx errors', async () => {
      const { isServerError, NotFoundError, BadRequestError } = await import('../api-errors');

      expect(isServerError(new NotFoundError())).toBe(false);
      expect(isServerError(new BadRequestError())).toBe(false);
    });

    it('isServerError returns true for unknown errors', async () => {
      const { isServerError } = await import('../api-errors');

      expect(isServerError(new Error())).toBe(true);
      expect(isServerError('unknown')).toBe(true);
    });
  });

  describe('HTTP_STATUS constants', () => {
    it('has correct status codes', async () => {
      const { HTTP_STATUS } = await import('../api-errors');

      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });
});

// ============================================================================
// LOGGER TESTS
// ============================================================================

describe('Logger Module', () => {
  describe('createRequestLogger', () => {
    it('creates child logger with requestId', async () => {
      const { createRequestLogger } = await import('../logger');

      const logger = createRequestLogger('req-123');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('includes additional context', async () => {
      const { createRequestLogger } = await import('../logger');

      const logger = createRequestLogger('req-456', { userId: 'user-123' });

      expect(logger).toBeDefined();
    });
  });

  describe('createModuleLogger', () => {
    it('creates child logger with module name', async () => {
      const { createModuleLogger } = await import('../logger');

      const logger = createModuleLogger('test-module');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('includes additional context', async () => {
      const { createModuleLogger } = await import('../logger');

      const logger = createModuleLogger('test-module', { version: '1.0.0' });

      expect(logger).toBeDefined();
    });
  });

  describe('Pre-configured loggers', () => {
    it('has all expected module loggers', async () => {
      const { loggers } = await import('../logger');

      expect(loggers.api).toBeDefined();
      expect(loggers.auth).toBeDefined();
      expect(loggers.commerce).toBeDefined();
      expect(loggers.workflow).toBeDefined();
      expect(loggers.email).toBeDefined();
      expect(loggers.db).toBeDefined();
      expect(loggers.stripe).toBeDefined();
      expect(loggers.middleware).toBeDefined();
      expect(loggers.ai).toBeDefined();
      expect(loggers.upload).toBeDefined();
      expect(loggers.import).toBeDefined();
      expect(loggers.scraping).toBeDefined();
      expect(loggers.analytics).toBeDefined();
      expect(loggers.organization).toBeDefined();
      expect(loggers.domain).toBeDefined();
      expect(loggers.template).toBeDefined();
    });

    it('loggers have info method', async () => {
      const { loggers } = await import('../logger');

      expect(typeof loggers.api.info).toBe('function');
      expect(typeof loggers.api.error).toBe('function');
      expect(typeof loggers.api.warn).toBe('function');
      expect(typeof loggers.api.debug).toBe('function');
    });
  });

  describe('Logger configuration', () => {
    it('exports main logger', async () => {
      const { logger } = await import('../logger');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });
});

// ============================================================================
// REDIS TESTS (with mocks)
// ============================================================================

describe('Redis Module', () => {
  describe('Connection options parsing', () => {
    it('parses valid redis:// URL', async () => {
      // We can't easily test parseRedisUrl directly since it's not exported
      // But we can verify the module loads without error
      const redis = await import('../redis');
      expect(redis.redisConnection).toBeDefined();
    });
  });

  describe('isRedisAvailable', () => {
    it('returns false when REDIS_URL not set', async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      vi.resetModules();
      const { isRedisAvailable } = await import('../redis');

      const available = await isRedisAvailable();
      expect(available).toBe(false);

      process.env.REDIS_URL = originalEnv;
    });
  });

  describe('Module exports', () => {
    it('exports getRedisClient function', async () => {
      const { getRedisClient } = await import('../redis');
      expect(typeof getRedisClient).toBe('function');
    });

    it('exports redisConnection object', async () => {
      const { redisConnection } = await import('../redis');
      expect(redisConnection).toBeDefined();
      expect(typeof redisConnection.host).toBe('string');
      expect(typeof redisConnection.port).toBe('number');
    });

    it('exports closeRedis function', async () => {
      const { closeRedis } = await import('../redis');
      expect(typeof closeRedis).toBe('function');
    });
  });
});

// ============================================================================
// API SECURITY TESTS
// ============================================================================

describe('API Security Module', () => {
  describe('validateExternalUrl', () => {
    it('rejects localhost URLs', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('http://localhost:3000/test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Internal');
    });

    it('rejects 127.0.0.1 URLs', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('http://127.0.0.1/test');
      expect(result.valid).toBe(false);
    });

    it('rejects private network URLs (10.x.x.x)', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('http://10.0.0.1/api');
      expect(result.valid).toBe(false);
    });

    it('rejects private network URLs (192.168.x.x)', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('http://192.168.1.1/config');
      expect(result.valid).toBe(false);
    });

    it('rejects file:// protocol', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('accepts valid external URLs', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('https://example.com/page');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid URL format', async () => {
      const { validateExternalUrl } = await import('../api-security');

      const result = validateExternalUrl('not-a-url');
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeSearchParam', () => {
    it('escapes percent signs', async () => {
      const { sanitizeSearchParam } = await import('../api-security');

      const result = sanitizeSearchParam('test%value');
      expect(result).toBe('test\\%value');
    });

    it('escapes underscores', async () => {
      const { sanitizeSearchParam } = await import('../api-security');

      const result = sanitizeSearchParam('test_value');
      expect(result).toBe('test\\_value');
    });

    it('handles both percent and underscore', async () => {
      const { sanitizeSearchParam } = await import('../api-security');

      const result = sanitizeSearchParam('test%_value');
      expect(result).toBe('test\\%\\_value');
    });

    it('returns safe input unchanged', async () => {
      const { sanitizeSearchParam } = await import('../api-security');

      const result = sanitizeSearchParam('safe search term');
      expect(result).toBe('safe search term');
    });
  });

  describe('checkBodySize', () => {
    it('returns true for requests within limit', async () => {
      const { checkBodySize } = await import('../api-security');

      const request = new Request('http://localhost', {
        headers: { 'content-length': '1000' },
      });

      expect(checkBodySize(request, 2000)).toBe(true);
    });

    it('returns false for requests exceeding limit', async () => {
      const { checkBodySize } = await import('../api-security');

      const request = new Request('http://localhost', {
        headers: { 'content-length': '5000' },
      });

      expect(checkBodySize(request, 2000)).toBe(false);
    });

    it('returns true when content-length not set', async () => {
      const { checkBodySize } = await import('../api-security');

      const request = new Request('http://localhost');

      expect(checkBodySize(request, 2000)).toBe(true);
    });
  });
});
