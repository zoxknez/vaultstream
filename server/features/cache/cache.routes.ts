/**
 * Cache Routes
 * 
 * Routes for cache management and monitoring.
 * 
 * Endpoints:
 * - GET /stats - Cache statistics (public)
 * - POST /clear-old - Clear old cache files (protected + CSRF)
 * - POST /clear - Clear all caches (protected + CSRF)
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as cacheController from './cache.controller';

const createAuthMiddleware = require('../../middleware/auth');
const { createCsrfGuard } = require('../../services/csrfService');

const requireAuth = createAuthMiddleware();
const csrfGuard = createCsrfGuard();

export const cacheRouter = Router();

/**
 * GET /stats
 * 
 * Get cache statistics
 * Public endpoint (used by monitoring)
 */
cacheRouter.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cacheController.stats(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /clear-old
 * 
 * Clear cache files older than N days
 * Protected - requires authentication + CSRF
 * 
 * Body: { days?: number } (default: 7)
 */
cacheRouter.post(
  '/clear-old',
  requireAuth,
  csrfGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cacheController.clearOld(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /clear
 * 
 * Clear all caches (torrents + files)
 * Protected - requires authentication + CSRF
 * 
 * WARNING: This removes all active torrents!
 */
cacheRouter.post(
  '/clear',
  requireAuth,
  csrfGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cacheController.clearAll(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// CommonJS compatibility
module.exports = { cacheRouter };
