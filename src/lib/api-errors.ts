import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes for client identification
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Auth errors (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Resource errors (404, 409)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Base API Error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toResponse(requestId?: string): NextResponse {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
        ...(requestId && { requestId }),
      },
      { status: this.statusCode }
    );
  }
}

// Specific error classes for common cases
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED, details);
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Invalid request', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_REQUEST, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMITED,
      retryAfter ? { retryAfter } : undefined);
    this.name = 'RateLimitError';
  }
}

export class InternalError extends ApiError {
  constructor(message = 'Internal server error', code: ErrorCode = ERROR_CODES.INTERNAL_ERROR) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
    this.name = 'InternalError';
  }
}

export class DatabaseError extends ApiError {
  constructor(message = 'Database error') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, message?: string) {
    super(
      message || `${service} service error`,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      { service }
    );
    this.name = 'ExternalServiceError';
  }
}

// Helper to convert Zod errors to ValidationError
export function fromZodError(error: ZodError): ValidationError {
  const errors = error.errors.reduce((acc, err) => {
    const path = err.path.join('.');
    acc[path] = err.message;
    return acc;
  }, {} as Record<string, string>);

  return new ValidationError('Validation failed', { errors });
}

// Helper to determine if an error is a client error (4xx) vs server error (5xx)
export function isClientError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  return false;
}

export function isServerError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode >= 500;
  }
  return true; // Unknown errors are treated as server errors
}

// Helper to handle any error and return appropriate response
export function handleApiError(
  error: unknown,
  requestId?: string
): NextResponse {
  // Already an ApiError - use it directly
  if (error instanceof ApiError) {
    return error.toResponse(requestId);
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return fromZodError(error).toResponse(requestId);
  }

  // Generic Error - treat as internal error (don't leak details)
  if (error instanceof Error) {
    // Log the actual error for debugging (will be replaced with Pino later)
    console.error('Unhandled error:', error.message, error.stack);

    return new InternalError('An unexpected error occurred').toResponse(requestId);
  }

  // Unknown error type
  console.error('Unknown error type:', error);
  return new InternalError('An unexpected error occurred').toResponse(requestId);
}

// Type guard for ApiError
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
