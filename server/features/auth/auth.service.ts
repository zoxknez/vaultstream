/**
 * Auth Service
 *
 * Authentication service layer that wraps authentication helpers
 * and provides additional functionality like audit logging and CSRF tokens.
 *
 * Sprint 2.1 - PASS 1 - Feature Extraction
 */

const authServiceBase = require('../../lib/authHelpers');
const {
  logAuthSuccess: logAuthSuccessAudit,
  logAuthFailure: logAuthFailureAudit
} = require('../../services/auditService');
const { ensureToken: ensureCsrfToken } = require('../../services/csrfService');

// Re-export all base functions
export const isAuthenticationConfigured = authServiceBase.isAuthenticationConfigured;
export const verifyPassword = authServiceBase.verifyPassword;
export const buildSessionPayload = authServiceBase.buildSessionPayload;
export const createSessionSecret = authServiceBase.createSessionSecret;
export const buildCookieOptions = authServiceBase.buildCookieOptions;
export const getPasswordSource = authServiceBase.getPasswordSource;

// Re-export CSRF token function from centralized service
export { ensureCsrfToken };

/**
 * Log successful authentication
 */
export async function logAuthSuccess(req: any, username: string): Promise<void> {
  return logAuthSuccessAudit(req, username);
}

/**
 * Log failed authentication
 */
export async function logAuthFailure(req: any, username: string, reason: string): Promise<void> {
  return logAuthFailureAudit(req, username, reason);
}

/**
 * Get session configuration
 */
export function getSessionConfig() {
  const { config } = require('../../config');
  const normalizedSameSite =
    typeof config.security.sessionSameSite === 'string'
      ? config.security.sessionSameSite.toLowerCase()
      : 'lax';

  return {
    sessionCookieName: config.security.sessionCookieName,
    sessionCookieOptions: {
      httpOnly: true,
      sameSite: normalizedSameSite as any,
      secure: config.security.sessionSecureCookies,
      maxAge: config.security.sessionMaxAge
    }
  };
}

// CommonJS compatibility
module.exports = {
  isAuthenticationConfigured,
  verifyPassword,
  buildSessionPayload,
  createSessionSecret,
  buildCookieOptions,
  getPasswordSource,
  ensureCsrfToken,
  logAuthSuccess,
  logAuthFailure,
  getSessionConfig
};
