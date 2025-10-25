/**
 * Auth Routes
 *
 * Authentication and session management endpoints.
 *
 * Endpoints:
 * - POST /login - User authentication
 * - POST /logout - Session termination
 * - GET /csrf-token - CSRF token retrieval
 * - GET /status - Authentication status check
 *
 * Sprint 2.1 - PASS 1 - Feature Extraction
 */

import { Router } from 'express';
import * as authController from './auth.controller';

const createAuthMiddleware = require('../../middleware/auth');
const { loginRateLimiter } = require('../../middleware/rateLimiting');
const { createCsrfGuard } = require('../../services/csrfService');
const { config } = require('../../config');

// Configure middleware
const requireAuth = createAuthMiddleware();
const csrfGuard = createCsrfGuard();
const loginLimiter = loginRateLimiter(config.env);

export const authRouter = Router();

/**
 * POST /login
 * Authenticate user
 */
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    await authController.login(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /logout
 * Destroy session
 */
authRouter.post('/logout', requireAuth, csrfGuard, async (req, res, next) => {
  try {
    await authController.logout(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /csrf-token
 * Get CSRF token
 */
authRouter.get('/csrf-token', requireAuth, (req, res, next) => {
  try {
    authController.getCsrfToken(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /status
 * Check auth status
 */
authRouter.get('/status', (req, res, next) => {
  try {
    authController.getStatus(req, res);
  } catch (error) {
    next(error);
  }
});

// CommonJS compatibility
module.exports = { authRouter };
