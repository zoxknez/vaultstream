/**
 * Custom Error Classes
 * Sprint 2.1 - TypeScript Migration
 */

/**
 * Rate Limit Error
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string = 'Rate limit exceeded', code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error
 * Thrown when authentication fails
 */
export class AuthenticationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string = 'Authentication failed', code: string = 'AUTH_FAILED') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authorization Error
 * Thrown when user is not authorized
 */
export class AuthorizationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string = 'Not authorized', code: string = 'NOT_AUTHORIZED') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 * Thrown when validation fails
 */
export class ValidationError extends Error {
  statusCode: number;
  code: string;
  errors?: any[];

  constructor(message: string = 'Validation failed', code: string = 'VALIDATION_ERROR', errors?: any[]) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error
 * Thrown when resource is not found
 */
export class NotFoundError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// CommonJS exports for compatibility
module.exports = {
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError
};
