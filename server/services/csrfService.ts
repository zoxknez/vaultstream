/**
 * CSRF Service
 * 
 * Cross-Site Request Forgery protection service.
 * 
 * Features:
 * - Token generation and validation
 * - Origin/Referer header validation
 * - Constant-time comparison
 * - Express middleware factory
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const { config } = require('../config');

interface Session {
  csrfToken?: string;
  isAuthenticated?: boolean;
}

/**
 * CSRF header name
 */
export const CSRF_HEADER_NAME = 'x-seedbox-csrf';

/**
 * Normalize origin for comparison
 * - Convert to lowercase
 * - Remove trailing slash
 */
export function normalizeOrigin(value: string = ''): string {
  return value.toLowerCase().replace(/\/$/, '');
}

/**
 * Generate a new CSRF token
 * 
 * Uses crypto.randomBytes for secure token generation
 * 
 * @returns 64-character hex token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Ensure session has CSRF token
 * 
 * If token doesn't exist, generate a new one
 * 
 * @param session - Express session object
 * @returns CSRF token
 */
export function ensureToken(session: Session): string {
  if (!session.csrfToken) {
    session.csrfToken = generateToken();
  }
  return session.csrfToken;
}

/**
 * Validate CSRF token (constant-time comparison)
 * 
 * @param expectedToken - Token stored in session
 * @param providedToken - Token provided by client
 * @returns true if tokens match
 */
export function validateToken(expectedToken: string, providedToken: string): boolean {
  if (!expectedToken || !providedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');
    const providedBuffer = Buffer.from(providedToken, 'utf8');
    
    // Length must match
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    console.error('CSRF token comparison error:', error);
    return false;
  }
}

/**
 * Validate origin header
 * 
 * @param origin - Origin or Referer header value
 * @param allowedOrigins - Set of allowed origins
 * @param allowAll - Whether to allow all origins
 * @returns true if origin is allowed
 */
export function validateOrigin(
  origin: string,
  allowedOrigins: Set<string>,
  allowAll: boolean = false
): boolean {
  if (allowAll) {
    return true;
  }

  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.has(normalizedOrigin);
}

/**
 * Build allowed origins set
 * 
 * Combines:
 * - CORS config allowed origins
 * - Frontend URL from config
 * 
 * @returns Set of normalized allowed origins
 */
export function buildAllowedOrigins(): Set<string> {
  const corsConfig = config.cors || {};
  const allowedOriginSet = new Set<string>(
    (corsConfig.allowedOrigins || []).map(normalizeOrigin)
  );

  if (config.frontend?.url) {
    allowedOriginSet.add(normalizeOrigin(config.frontend.url));
  }

  return allowedOriginSet;
}

/**
 * Create CSRF guard middleware
 * 
 * Validates:
 * 1. Safe methods (GET, HEAD, OPTIONS) are always allowed
 * 2. User must be authenticated
 * 3. Origin header must be allowed
 * 4. CSRF token must match
 * 
 * @returns Express middleware function
 */
export function createCsrfGuard() {
  const allowedOriginSet = buildAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';
  const corsConfig = config.cors || {};

  return (req: Request, res: Response, next: NextFunction): void => {
    // Safe methods don't need CSRF protection
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // User must be authenticated
    if (!(req.session as Session)?.isAuthenticated) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.'
        }
      });
      return;
    }

    // Validate origin (unless allowAll is enabled)
    if (!corsConfig.allowAll) {
      const originHeaderRaw = req.headers.origin || req.headers.referer || '';
      const originHeader = normalizeOrigin(originHeaderRaw);

      if (originHeader) {
        if (!allowedOriginSet.has(originHeader)) {
          res.status(403).json({
            error: {
              code: 'CSRF_CHECK_FAILED',
              message: 'Origin not allowed.'
            }
          });
          return;
        }
      } else if (isProduction) {
        res.status(403).json({
          error: {
            code: 'CSRF_CHECK_FAILED',
            message: 'Missing Origin header.'
          }
        });
        return;
      }
    }

    // Validate CSRF token
    const expectedToken = ensureToken(req.session as Session);
    const providedTokenHeader = req.headers[CSRF_HEADER_NAME];
    const providedToken = Array.isArray(providedTokenHeader)
      ? providedTokenHeader[0]
      : providedTokenHeader;

    if (!validateToken(expectedToken, providedToken || '')) {
      res.status(403).json({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token.'
        }
      });
      return;
    }

    next();
  };
}
