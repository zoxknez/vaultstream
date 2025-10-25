/**
 * System Routes
 * 
 * Routes for system monitoring and health checks.
 * 
 * Endpoints:
 * - GET /health - System health check (public)
 * - GET /disk - Disk usage information (protected)
 * - GET /memory/stats - Memory statistics (protected)
 * - GET /memory/heap - Heap snapshot (protected)
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as systemController from './system.controller';

const createAuthMiddleware = require('../../middleware/auth');
const requireAuth = createAuthMiddleware();

export const systemRouter = Router();

/**
 * GET /health
 * 
 * Public health check endpoint
 * Used by monitoring systems, load balancers, etc.
 */
systemRouter.get(
  '/health',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await systemController.health(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /disk
 * 
 * Get disk usage information
 * Protected - requires authentication
 */
systemRouter.get(
  '/disk',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await systemController.disk(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /memory/stats
 * 
 * Get memory usage statistics
 * Protected - requires authentication
 */
systemRouter.get(
  '/memory/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await systemController.memoryStats(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /memory/heap
 * 
 * Get heap snapshot
 * Protected - requires authentication
 */
systemRouter.get(
  '/memory/heap',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await systemController.heapSnapshot(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// CommonJS compatibility
module.exports = { systemRouter };
