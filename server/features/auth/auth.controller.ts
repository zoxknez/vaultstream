/**
 * Auth Controller (Sprint 2.1 - PASS 1)
 * HTTP handlers for authentication endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { BadRequestError, UnauthorizedError, InternalServerError } from '../../core/httpErrors';

const loginSchema = z.object({
  password: z.string().min(8).max(128)
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export async function login(req: Request, res: Response): Promise<void> {
  // Check if authentication is configured
  const isConfigured = await authService.isAuthenticationConfigured();
  if (!isConfigured) {
    console.warn('❌ Authentication attempt blocked: credentials not configured');
    throw new InternalServerError('Authentication temporarily unavailable');
  }

  // Validate request body
  let credentials;
  try {
    credentials = loginSchema.parse(req.body);
  } catch (error) {
    throw new BadRequestError('Password is required and must be between 8 and 128 characters');
  }

  // Verify password
  const isValid = await authService.verifyPassword(credentials.password);
  if (!isValid) {
    // Log failed attempt
    await authService.logAuthFailure(req, 'admin', 'Invalid password');
    throw new UnauthorizedError('Invalid password');
  }

  // Regenerate session for security
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenError) => {
      if (regenError) {
        console.error(`❌ Failed to regenerate session: ${regenError.message}`);
        return reject(new InternalServerError('Unable to establish secure session'));
      }

      // Set session data
      req.session.isAuthenticated = true;
      req.session.user = authService.buildSessionPayload();
      const csrfToken = authService.ensureCsrfToken(req.session);

      // Save session
      req.session.save((saveError) => {
        if (saveError) {
          console.error(`❌ Failed to persist session: ${saveError.message}`);
          return reject(new InternalServerError('Failed to persist session'));
        }

        // Log successful login
        authService.logAuthSuccess(req, 'admin');

        res.json({
          success: true,
          data: {
            message: 'Authentication successful',
            csrfToken
          }
        });

        resolve();
      });
    });
  });
}

/**
 * POST /api/auth/logout
 * Destroy user session
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const { sessionCookieName, sessionCookieOptions } = authService.getSessionConfig();

  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        console.error(`❌ Failed to destroy session: ${error.message}`);
        return reject(new InternalServerError('Failed to terminate session'));
      }

      res.clearCookie(sessionCookieName, sessionCookieOptions);
      res.json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      });

      resolve();
    });
  });
}

/**
 * GET /api/auth/csrf-token
 * Get CSRF token for authenticated user
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = authService.ensureCsrfToken(req.session);
  
  res.json({
    success: true,
    data: {
      csrfToken: token
    }
  });
}

/**
 * GET /api/auth/status
 * Check authentication status
 */
export function getStatus(req: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      authenticated: !!req.session?.isAuthenticated,
      user: req.session?.user || null
    }
  });
}

// CommonJS compatibility
module.exports = {
  login,
  logout,
  getCsrfToken,
  getStatus
};
