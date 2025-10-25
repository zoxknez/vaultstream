/**
 * Authentication Helpers
 *
 * Basic authentication utilities for password verification and session management.
 * Temporary implementation until full migration to features/auth module.
 *
 * @module lib/authHelpers
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Check if authentication is configured
 */
async function isAuthenticationConfigured() {
  const hasPlainPassword = Boolean(process.env.ACCESS_PASSWORD);
  const hasHashedPassword = Boolean(process.env.ACCESS_PASSWORD_HASH);
  return hasPlainPassword || hasHashedPassword;
}

/**
 * Verify password against configured credentials
 */
async function verifyPassword(inputPassword) {
  if (!inputPassword) {
    return false;
  }

  // Check hashed password first (production)
  if (process.env.ACCESS_PASSWORD_HASH) {
    try {
      return await bcrypt.compare(inputPassword, process.env.ACCESS_PASSWORD_HASH);
    } catch (error) {
      console.error('❌ Password verification error:', error.message);
      return false;
    }
  }

  // Fall back to plain password (development only)
  if (process.env.ACCESS_PASSWORD) {
    return inputPassword === process.env.ACCESS_PASSWORD;
  }

  return false;
}

/**
 * Build session payload
 */
function buildSessionPayload() {
  return {
    id: crypto.randomBytes(16).toString('hex'),
    authenticated: true,
    loginTime: Date.now()
  };
}

/**
 * Create session secret
 */
function createSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // Generate temporary secret for development
  console.warn('⚠️ No SESSION_SECRET found, generating temporary secret');
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Build cookie options
 */
function buildCookieOptions({ isProduction, sameSite = 'lax', secure = false }) {
  return {
    httpOnly: true,
    sameSite,
    secure: isProduction ? true : secure,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };
}

/**
 * Get password source type
 */
function getPasswordSource() {
  if (process.env.ACCESS_PASSWORD_HASH) {
    return 'hashed';
  }
  if (process.env.ACCESS_PASSWORD) {
    return 'plain';
  }
  return 'none';
}

module.exports = {
  isAuthenticationConfigured,
  verifyPassword,
  buildSessionPayload,
  createSessionSecret,
  buildCookieOptions,
  getPasswordSource
};
