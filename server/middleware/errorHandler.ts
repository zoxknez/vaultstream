/**
 * Error Handler Middleware - TypeScript Migration (Sprint 2.1 Phase 4)
 * Enhanced with HttpError support (PASS 3)
 */

import { Request, Response, NextFunction } from 'express';
import { isHttpError } from '../core/httpErrors';
const { error: logError, warn: logWarn } = require('../utils/logger');

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Error handler middleware
 * Should be registered last in the middleware chain
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Extract request context
  const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
  const userId = (req.session as any)?.user?.userId || (req as any).user?.id || 'anonymous';
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Handle HttpError instances from core/httpErrors.ts
  if (isHttpError(err)) {
    const logContext = {
      requestId,
      userId,
      method,
      url,
      statusCode: err.statusCode,
      code: err.code
    };

    if (err.statusCode >= 500) {
      logError(`${err.code}: ${err.message}`, logContext);
    } else if (err.statusCode >= 400) {
      logWarn(`${err.code}: ${err.message}`, logContext);
    }

    return res.status(err.statusCode).json({
      ...err.toJSON(),
      requestId
    });
  }

  // Default error properties for non-HttpError
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;
  let stack = err.stack;

  // Handle operational errors (AppError instances)
  const isOperational = err.isOperational === true;

  // Log based on error type and severity
  const logContext: any = {
    requestId,
    userId,
    method,
    url,
    statusCode,
    code,
    isOperational
  };

  if (statusCode >= 500) {
    // Server errors - always log with stack trace
    logError(`${code}: ${message}`, {
      ...logContext,
      stack: isDevelopment ? stack : undefined,
      details
    });
  } else if (statusCode >= 400 && statusCode < 500) {
    // Client errors - log as warnings
    if (statusCode === 401 || statusCode === 403) {
      // Authentication/authorization - less verbose
      logWarn(`${code}: ${message}`, logContext);
    } else {
      // Other client errors
      logWarn(`${code}: ${message}`, { ...logContext, details });
    }
  }

  // Handle specific error types
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    // Zod validation errors
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    if (err.issues) {
      details = err.issues;
    }
  } else if (err.name === 'UnauthorizedError') {
    // JWT/Auth errors
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  } else if (err.name === 'MulterError') {
    // File upload errors
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message = `File upload error: ${err.message}`;
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // Build error response
  const errorResponse: any = {
    error: {
      code,
      message: isOperational || isDevelopment ? message : 'Internal server error',
      ...(details && (isDevelopment || isOperational) && { details })
    },
    requestId
  };

  // Include stack trace in development
  if (isDevelopment && !isOperational && stack) {
    errorResponse.error.stack = stack.split('\n');
  }

  // Set retry-after header for rate limiting
  if (err.retryAfter) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 * Should be registered before the error handler
 */
const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || 'unknown';
  
  // Check if it's an API route
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `API endpoint not found: ${req.method} ${req.path}`
      },
      requestId
    });
  }

  // For non-API routes, pass to next handler (e.g., SPA fallback)
  return next();
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global unhandled rejection handler
 * Should be registered at application startup
 */
const registerGlobalHandlers = (): void => {
  if (!isTest) {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logError('Unhandled Promise Rejection', {
        reason: reason?.message || String(reason),
        stack: reason?.stack,
        promise: String(promise)
      });
      
      // In production, log but don't exit
      // The process manager (PM2, Docker) will restart if needed
    });

    process.on('uncaughtException', (error: Error) => {
      logError('Uncaught Exception', {
        message: error.message,
        stack: error.stack
      });
      
      // Critical errors - exit and let process manager restart
      if (isDevelopment) {
        console.error('Uncaught exception:', error);
      }
      
      // Give time to flush logs, then exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
  }
};

export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  registerGlobalHandlers
};

// CommonJS compatibility
module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  registerGlobalHandlers
};
