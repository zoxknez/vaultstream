/**
 * 🔗 STREAMVAULT REQUEST CONTEXT MIDDLEWARE
 * Request context and correlation ID management
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Request context middleware
 */
const requestContext = (req, res, next) => {
  // Generate correlation ID
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Set correlation ID in response headers
  res.set('X-Correlation-ID', correlationId);
  
  // Create request context
  req.context = {
    correlationId,
    startTime: Date.now(),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: req.headers,
    body: req.body,
    session: req.session,
    user: req.user
  };
  
  // Add correlation ID to logger context
  req.logger = logger.child({ correlationId });
  
  // Log request start
  req.logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.context.ip,
    userAgent: req.context.userAgent
  });
  
  // Track request end
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - req.context.startTime;
    
    // Log request completion
    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration + 'ms',
      ip: req.context.ip
    });
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Add user context to request
 */
const addUserContext = (req, res, next) => {
  if (req.user) {
    req.context.userId = req.user.id;
    req.context.userEmail = req.user.email;
    req.context.userRole = req.user.role;
    
    // Add user context to logger
    req.logger = req.logger.child({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role
    });
  }
  
  next();
};

/**
 * Add session context to request
 */
const addSessionContext = (req, res, next) => {
  if (req.session) {
    req.context.sessionId = req.sessionID;
    req.context.sessionUserId = req.session.userId;
    
    // Add session context to logger
    req.logger = req.logger.child({
      sessionId: req.sessionID,
      sessionUserId: req.session.userId
    });
  }
  
  next();
};

/**
 * Add performance context to request
 */
const addPerformanceContext = (req, res, next) => {
  req.context.performance = {
    startTime: Date.now(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
  
  // Track performance at request end
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const duration = endTime - req.context.performance.startTime;
    const endMemoryUsage = process.memoryUsage();
    const endCpuUsage = process.cpuUsage();
    
    req.context.performance = {
      ...req.context.performance,
      endTime,
      duration,
      memoryDelta: {
        rss: endMemoryUsage.rss - req.context.performance.memoryUsage.rss,
        heapUsed: endMemoryUsage.heapUsed - req.context.performance.memoryUsage.heapUsed,
        heapTotal: endMemoryUsage.heapTotal - req.context.performance.memoryUsage.heapTotal
      },
      cpuDelta: {
        user: endCpuUsage.user - req.context.performance.cpuUsage.user,
        system: endCpuUsage.system - req.context.performance.cpuUsage.system
      }
    };
    
    // Log performance metrics
    req.logger.info('Request performance', {
      duration: duration + 'ms',
      memoryDelta: req.context.performance.memoryDelta,
      cpuDelta: req.context.performance.cpuDelta
    });
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Add security context to request
 */
const addSecurityContext = (req, res, next) => {
  req.context.security = {
    isSecure: req.secure,
    protocol: req.protocol,
    host: req.get('Host'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    forwardedFor: req.get('X-Forwarded-For'),
    realIp: req.get('X-Real-IP')
  };
  
  // Detect potential security issues
  const securityWarnings = [];
  
  // Check for suspicious user agents
  if (req.context.security.userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(req.context.security.userAgent))) {
      securityWarnings.push('Suspicious user agent detected');
    }
  }
  
  // Check for multiple IPs in X-Forwarded-For
  if (req.context.security.forwardedFor && req.context.security.forwardedFor.includes(',')) {
    securityWarnings.push('Multiple IPs in X-Forwarded-For header');
  }
  
  // Check for missing referer on sensitive endpoints
  if (req.path.includes('/api/auth/') && !req.context.security.referer) {
    securityWarnings.push('Missing referer on authentication endpoint');
  }
  
  if (securityWarnings.length > 0) {
    req.context.security.warnings = securityWarnings;
    req.logger.warn('Security warnings detected', {
      warnings: securityWarnings,
      ip: req.context.security.ip,
      userAgent: req.context.security.userAgent
    });
  }
  
  next();
};

/**
 * Add rate limiting context to request
 */
const addRateLimitContext = (req, res, next) => {
  req.context.rateLimit = {
    limit: req.rateLimit?.limit,
    remaining: req.rateLimit?.remaining,
    reset: req.rateLimit?.reset,
    retryAfter: req.rateLimit?.retryAfter
  };
  
  // Log rate limiting info
  if (req.rateLimit) {
    req.logger.info('Rate limit info', {
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining,
      reset: req.rateLimit.reset
    });
  }
  
  next();
};

/**
 * Add error context to request
 */
const addErrorContext = (error, req, res, next) => {
  req.context.error = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString()
  };
  
  // Log error with context
  req.logger.error('Request error occurred', {
    error: req.context.error,
    method: req.method,
    url: req.url,
    ip: req.context.ip,
    userAgent: req.context.userAgent,
    userId: req.context.userId
  });
  
  next(error);
};

/**
 * Get request context
 */
const getRequestContext = (req) => {
  return req.context || {};
};

/**
 * Clear request context
 */
const clearRequestContext = (req) => {
  delete req.context;
  delete req.logger;
};

/**
 * Export request context for external use
 */
const exportRequestContext = (req) => {
  return {
    correlationId: req.context?.correlationId,
    userId: req.context?.userId,
    sessionId: req.context?.sessionId,
    ip: req.context?.ip,
    userAgent: req.context?.userAgent,
    method: req.context?.method,
    url: req.context?.url,
    startTime: req.context?.startTime,
    performance: req.context?.performance,
    security: req.context?.security,
    rateLimit: req.context?.rateLimit,
    error: req.context?.error
  };
};

module.exports = {
  requestContext,
  addUserContext,
  addSessionContext,
  addPerformanceContext,
  addSecurityContext,
  addRateLimitContext,
  addErrorContext,
  getRequestContext,
  clearRequestContext,
  exportRequestContext
};
