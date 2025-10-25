/**
 * ✅ STREAMVAULT VALIDATION MIDDLEWARE
 * Request validation using Zod schemas
 */

const { z } = require('zod');
const { logger } = require('../utils/logger');

/**
 * Validate request against schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace original data with validated data
      if (validatedData.body) {
        req.body = validatedData.body;
      }
      if (validatedData.query) {
        req.query = validatedData.query;
      }
      if (validatedData.params) {
        req.params = validatedData.params;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation error:', {
          errors: errorMessages,
          body: req.body,
          query: req.query,
          params: req.params
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
      } else {
        logger.error('Validation middleware error:', error);
        next(error);
      }
    }
  };
};

/**
 * Validate request body only
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: errorMessages
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request query only
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errorMessages
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request params only
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          success: false,
          error: 'Invalid path parameters',
          details: errorMessages
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    next(error);
  }
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
};

/**
 * Sanitize individual value
 */
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Remove potentially dangerous characters
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  return value;
};

/**
 * Validate file upload
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;

  return (req, res, next) => {
    try {
      if (!req.file && required) {
        return res.status(400).json({
          success: false,
          error: 'File is required'
        });
      }

      if (req.file) {
        // Check file size
        if (req.file.size > maxSize) {
          return res.status(400).json({
            success: false,
            error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
          });
        }

        // Check file type
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
          });
        }
      }

      next();
    } catch (error) {
      logger.error('File upload validation error:', error);
      next(error);
    }
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  try {
    const { page, limit } = req.query;
    
    if (page) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          error: 'Page must be a positive integer'
        });
      }
      req.query.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100'
        });
      }
      req.query.limit = limitNum;
    }

    next();
  } catch (error) {
    logger.error('Pagination validation error:', error);
    next(error);
  }
};

/**
 * Validate date range
 */
const validateDateRange = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start date format'
        });
      }
      req.query.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end date format'
        });
      }
      req.query.endDate = end;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Date range validation error:', error);
    next(error);
  }
};

module.exports = {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  sanitizeInput,
  validateFileUpload,
  validatePagination,
  validateDateRange
};
