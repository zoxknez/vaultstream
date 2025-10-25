/**
 * Rate Limiting Middleware - TypeScript Migration (Sprint 2.1 Phase 4)
 * Redis-backed distributed rate limiting with fallback to in-memory
 */

import { NextFunction, Request, Response } from 'express';
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');
const logger = require('../utils/logger');
const { RateLimitError } = require('../utils/errors');
const { logRateLimitExceeded } = require('../services/auditService');

let redisClient: any = null;
let redisStore: any = null;

interface RateLimiterOptions {
  windowMs: number;
  maxAnonymous: number;
  maxAuthenticated: number;
  message?: string;
  code?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEnv {
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  LOGIN_RATE_LIMIT_WINDOW_MS: number;
  LOGIN_RATE_LIMIT_MAX: number;
}

/**
 * Initialize Redis client for rate limiting
 */
async function initializeRedisStore(redisUrl: string): Promise<boolean> {
  if (!redisUrl) {
    logger.warn(
      '⚠️  REDIS_URL not configured. Using in-memory rate limiting (not recommended for production).'
    );
    return false;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error(
              'Redis reconnection failed after 10 attempts. Falling back to in-memory store.'
            );
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 50, 3000);
        }
      }
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis client error:', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected for rate limiting');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready for rate limiting');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️  Redis reconnecting...');
    });

    await redisClient.connect();

    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
      sendCommand: (...args: any[]) => redisClient.sendCommand(args)
    });

    logger.info('✅ Redis-backed rate limiting initialized');
    return true;
  } catch (error: any) {
    logger.error('Failed to initialize Redis for rate limiting:', { error: error.message });
    logger.warn('⚠️  Falling back to in-memory rate limiting');
    return false;
  }
}

/**
 * Get user identifier from request
 */
function getUserIdentifier(req: Request): string {
  if ((req.session as any)?.user?.id) {
    return `user:${(req.session as any).user.id}`;
  }
  return `ip:${req.ip}`;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(req: Request): boolean {
  return !!(req.session as any)?.user?.id;
}

/**
 * Create enhanced rate limiter with Redis support
 */
function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxAnonymous,
    maxAuthenticated,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max: (req: Request) => {
      return isAuthenticated(req) ? maxAuthenticated : maxAnonymous;
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore || undefined,
    keyGenerator: getUserIdentifier,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: async (req: Request, res: Response, next: NextFunction, options: any) => {
      const identifier = getUserIdentifier(req);
      const retryAfter = Math.ceil(options.windowMs / 1000);

      logger.warn('Rate limit exceeded', {
        identifier,
        path: req.path,
        method: req.method,
        limit: options.max,
        retryAfter
      });

      await logRateLimitExceeded(req, req.path, options.max);

      if (!res.headersSent) {
        res.setHeader('Retry-After', retryAfter);
      }

      const error: any = new RateLimitError(message);
      error.retryAfter = retryAfter;
      error.limit = options.max;
      next(error);
    }
  });
}

/**
 * Rate limiter instances (created once during initialization)
 */
let _globalRateLimiter: any;
let _loginRateLimiter: any;
let _streamingRateLimiter: any;
let _searchRateLimiter: any;
let _apiRateLimiter: any;

/**
 * Initialize all rate limiters
 * MUST be called during app initialization, before any requests are handled
 */
function initializeRateLimiters() {
  const env = {
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '500'),
    LOGIN_RATE_LIMIT_WINDOW_MS: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'),
    LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5')
  };

  // Global rate limiter - applies to all requests
  _globalRateLimiter = createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxAnonymous: env.RATE_LIMIT_MAX,
    maxAuthenticated: env.RATE_LIMIT_MAX * 2,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMITED'
  });

  // Login rate limiter - stricter limits for authentication endpoints
  _loginRateLimiter = createRateLimiter({
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
    maxAnonymous: env.LOGIN_RATE_LIMIT_MAX,
    maxAuthenticated: env.LOGIN_RATE_LIMIT_MAX * 2,
    message: 'Too many login attempts. Please try again after a few minutes.',
    code: 'LOGIN_RATE_LIMIT',
    skipSuccessfulRequests: true
  });

  // Streaming rate limiter - for torrent streaming endpoints
  _streamingRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxAnonymous: 5,
    maxAuthenticated: 15,
    message: 'Too many streaming requests. Please wait before starting another stream.',
    code: 'STREAMING_RATE_LIMIT',
    skipSuccessfulRequests: false
  });

  // Search rate limiter - for search endpoints
  _searchRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxAnonymous: 20,
    maxAuthenticated: 50,
    message: 'Too many search requests. Please slow down.',
    code: 'SEARCH_RATE_LIMIT'
  });

  // API rate limiter - for general API endpoints
  _apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxAnonymous: 30,
    maxAuthenticated: 100,
    message: 'Too many API requests. Please slow down.',
    code: 'API_RATE_LIMIT'
  });

  logger.info('✅ Rate limiters initialized successfully');
}

/**
 * Wrapper middleware functions that delegate to the actual rate limiters
 * These can be safely imported before initialization
 */
const globalRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!_globalRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return _globalRateLimiter(req, res, next);
};

const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!_loginRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return _loginRateLimiter(req, res, next);
};

const streamingRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!_streamingRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return _streamingRateLimiter(req, res, next);
};

const searchRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!_searchRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return _searchRateLimiter(req, res, next);
};

const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!_apiRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return _apiRateLimiter(req, res, next);
};

/**
 * Cleanup Redis connection on shutdown
 */
async function cleanup(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis client for rate limiting disconnected');
    } catch (error: any) {
      logger.error('Error disconnecting Redis client:', { error: error.message });
    }
  }
}

/**
 * Get rate limiting statistics
 */
function getStats() {
  return {
    redisEnabled: !!redisStore,
    storeType: redisStore ? 'redis' : 'memory',
    redisConnected: redisClient?.isReady || false
  };
}

export {
  apiRateLimiter,
  cleanup,
  getStats,
  getUserIdentifier,
  globalRateLimiter,
  initializeRateLimiters,
  initializeRedisStore,
  isAuthenticated,
  loginRateLimiter,
  searchRateLimiter,
  streamingRateLimiter
};

// CommonJS compatibility
module.exports = {
  initializeRedisStore,
  initializeRateLimiters,
  globalRateLimiter,
  loginRateLimiter,
  streamingRateLimiter,
  searchRateLimiter,
  apiRateLimiter,
  getUserIdentifier,
  isAuthenticated,
  cleanup,
  getStats
};
