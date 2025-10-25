/**
 * Auth Middleware - TypeScript Migration (Sprint 2.1 Phase 4)
 * Session-based authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
const { logAuthFailure } = require('../services/auditService');

interface AuthMiddlewareOptions {
  requireSession?: boolean;
}

const createAuthMiddleware = ({ requireSession = true }: AuthMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const isAuthenticated = Boolean((req.session as any)?.isAuthenticated);

    if (!requireSession || isAuthenticated) {
      return next();
    }

    const requestId = (req as any).requestId || null;
    
    // Log unauthorized access attempt
    await logAuthFailure(req, (req.session as any)?.username || 'unknown', 'No valid session');

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      },
      requestId
    });
  };
};

export default createAuthMiddleware;

// CommonJS compatibility
module.exports = createAuthMiddleware;
