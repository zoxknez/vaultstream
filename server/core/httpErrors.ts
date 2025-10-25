/**
 * HTTP Error Hierarchy (Sprint 2.1 - PASS 3)
 * Centralized error classes for consistent API responses
 */

/**
 * Base HTTP error class
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details })
      }
    };
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends HttpError {
  constructor(message: string, details?: any) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required', details?: any) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends HttpError {
  constructor(message = 'Access forbidden', details?: any) {
    super(403, 'FORBIDDEN', message, details);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found', details?: any) {
    super(404, 'NOT_FOUND', message, details);
  }
}

/**
 * 408 Request Timeout
 */
export class TimeoutError extends HttpError {
  constructor(message = 'Request timed out', details?: any) {
    super(408, 'REQUEST_TIMEOUT', message, details);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends HttpError {
  constructor(message: string, details?: any) {
    super(409, 'CONFLICT', message, details);
  }
}

/**
 * 422 Unprocessable Entity (Validation)
 */
export class ValidationError extends HttpError {
  constructor(message: string, details?: any) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends HttpError {
  constructor(message = 'Rate limit exceeded', details?: any) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends HttpError {
  constructor(message = 'Internal server error', details?: any) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service temporarily unavailable', details?: any) {
    super(503, 'SERVICE_UNAVAILABLE', message, details);
  }
}

/**
 * Type guard to check if error is HttpError
 */
export function isHttpError(error: any): error is HttpError {
  return error instanceof HttpError;
}

// CommonJS compatibility
module.exports = {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TimeoutError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  isHttpError
};
