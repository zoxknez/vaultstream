/**
 * Audit Routes
 * 
 * Routes for audit log management and monitoring.
 * 
 * Endpoints:
 * - GET /logs - Query audit logs (protected)
 * - GET /stats - Get audit statistics (protected)
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as auditController from './audit.controller';

const createAuthMiddleware = require('../../middleware/auth');
const requireAuth = createAuthMiddleware();

export const auditRouter = Router();

/**
 * GET /logs
 * 
 * Query audit logs with filters
 * Protected - requires authentication
 * 
 * Query params:
 * - eventType, username, ipAddress, severity
 * - startDate, endDate, success, limit
 */
auditRouter.get(
  '/logs',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditController.logs(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /stats
 * 
 * Get audit statistics
 * Protected - requires authentication
 */
auditRouter.get(
  '/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditController.stats(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// CommonJS compatibility
module.exports = { auditRouter };
