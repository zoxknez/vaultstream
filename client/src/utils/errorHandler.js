/**
 * 🎬 STREAMVAULT ERROR HANDLER
 * Centralized error handling for frontend
 */

import { logger } from './logger';

class StreamVaultError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'StreamVaultError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    };
  }
}

// Error types
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error factory functions
export const createNetworkError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.NETWORK_ERROR, 0, details);

export const createValidationError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.VALIDATION_ERROR, 400, details);

export const createAuthError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.AUTH_ERROR, 401, details);

export const createPermissionError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.PERMISSION_ERROR, 403, details);

export const createNotFoundError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.NOT_FOUND, 404, details);

export const createRateLimitError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.RATE_LIMIT, 429, details);

export const createServerError = (message, details = null) => 
  new StreamVaultError(message, ErrorTypes.SERVER_ERROR, 500, details);

// Error handler
export class ErrorHandler {
  static handle(error, context = {}) {
    // Log error
    logger.error('Error occurred:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      context,
      stack: error.stack
    });

    // Send to error tracking service
    if (typeof window !== 'undefined' && window.__STREAMVAULT_ERROR_TRACKER__) {
      window.__STREAMVAULT_ERROR_TRACKER__(error, context);
    }

    // Return user-friendly error
    return {
      message: this.getUserFriendlyMessage(error),
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  static getUserFriendlyMessage(error) {
    const friendlyMessages = {
      [ErrorTypes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
      [ErrorTypes.VALIDATION_ERROR]: 'Invalid input. Please check your data and try again.',
      [ErrorTypes.AUTH_ERROR]: 'Authentication failed. Please log in again.',
      [ErrorTypes.PERMISSION_ERROR]: 'You do not have permission to perform this action.',
      [ErrorTypes.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorTypes.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
      [ErrorTypes.SERVER_ERROR]: 'Server error occurred. Please try again later.',
      [ErrorTypes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    };

    return friendlyMessages[error.code] || friendlyMessages[ErrorTypes.UNKNOWN_ERROR];
  }

  static isOperational(error) {
    return error instanceof StreamVaultError && error.isOperational;
  }
}

// Global error handler
export const setupGlobalErrorHandler = () => {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason);
    ErrorHandler.handle(event.reason, { type: 'unhandledrejection' });
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    logger.error('Global error:', event.error);
    ErrorHandler.handle(event.error, { type: 'global' });
  });
};

export default ErrorHandler;
export { StreamVaultError };
