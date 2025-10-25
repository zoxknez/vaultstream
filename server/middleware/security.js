/**
 * Security Middleware - Enhanced Security Headers
 * Implements Content Security Policy, HSTS, and other security best practices
 */

const helmet = require('helmet');

/**
 * Configure security middleware with strict CSP
 */
function configureSecurityMiddleware(app, config) {
  // Content Security Policy
  const cspDirectives = {
    defaultSrc: ["'self'"],

    // Scripts - allow self and trusted CDNs
    scriptSrc: [
      "'self'",
      // Vercel Analytics
      'https://va.vercel-scripts.com',
      'https://vercel.live',
      // Development only
      ...(config.isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
    ],

    // Styles
    styleSrc: [
      "'self'",
      "'unsafe-inline'" // Required for dynamic styles
    ],

    // Images - allow self, data URIs, and TMDB
    imgSrc: ["'self'", 'data:', 'blob:', 'https://image.tmdb.org', 'https://*.supabase.co'],

    // Media - allow self and blob for video streaming
    mediaSrc: ["'self'", 'blob:'],

    // Connections - API endpoints
    connectSrc: [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://va.vercel-scripts.com'
    ],

    // Fonts
    fontSrc: ["'self'", 'data:'],

    // Frames - prevent clickjacking
    frameSrc: ["'none'"],

    // Objects - no Flash or Java
    objectSrc: ["'none'"],

    // Base URI restriction
    baseUri: ["'self'"],

    // Form actions
    formAction: ["'self'"],

    // Upgrade insecure requests in production
    ...(config.isProduction ? { upgradeInsecureRequests: [] } : {})
  };

  // Apply Helmet with custom configuration
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: cspDirectives,
        reportOnly: config.isDevelopment // Report-only in dev, enforce in prod
      },

      // HTTP Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },

      // X-Frame-Options
      frameguard: {
        action: 'deny'
      },

      // X-Content-Type-Options
      noSniff: true,

      // X-XSS-Protection (legacy but still useful)
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },

      // Permissions Policy (formerly Feature Policy)
      permissionsPolicy: {
        features: {
          camera: ["'none'"],
          microphone: ["'none'"],
          geolocation: ["'none'"],
          payment: ["'none'"]
        }
      },

      // Cross-Origin-Embedder-Policy - disabled for streaming
      crossOriginEmbedderPolicy: false,

      // Cross-Origin-Resource-Policy - open for streaming
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // Additional security headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent page from being displayed in iframe (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable browser XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control how much referrer information is sent
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Feature Policy / Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Expect-CT header (Certificate Transparency)
    if (config.isProduction) {
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }

    next();
  });

  console.log('🔒 Security middleware configured');
}

/**
 * IP Reputation Check Middleware
 * Checks IP reputation against known malicious IPs
 */
function createIPReputationMiddleware() {
  // Blacklist of known malicious IP patterns
  const blacklist = new Set();

  // Whitelist of trusted IPs (e.g., monitoring services)
  const whitelist = new Set(['127.0.0.1', '::1']);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    // Check whitelist first
    if (whitelist.has(ip)) {
      return next();
    }

    // Check blacklist
    if (blacklist.has(ip)) {
      console.warn(`🚫 Blocked request from blacklisted IP: ${ip}`);
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    // TODO: Integrate with IP reputation service (e.g., AbuseIPDB, IPQualityScore)
    // For now, allow through
    next();
  };
}

/**
 * Adaptive Rate Limiting based on user reputation
 */
function createAdaptiveRateLimiter() {
  const userReputations = new Map(); // userId -> reputation score

  // Calculate user reputation based on behavior
  function getUserReputation(userId) {
    const reputation = userReputations.get(userId) || { score: 100, lastUpdated: Date.now() };

    // Decay reputation over time (reset to 100 after 7 days)
    const daysSinceUpdate = (Date.now() - reputation.lastUpdated) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) {
      reputation.score = 100;
      reputation.lastUpdated = Date.now();
    }

    return reputation;
  }

  // Update reputation based on behavior
  function updateReputation(userId, change) {
    const reputation = getUserReputation(userId);
    reputation.score = Math.max(0, Math.min(100, reputation.score + change));
    reputation.lastUpdated = Date.now();
    userReputations.set(userId, reputation);
  }

  // Get rate limit configuration based on reputation
  function getRateLimitConfig(userId) {
    if (!userId) {
      // Anonymous users - strict limits
      return { windowMs: 60000, max: 20 };
    }

    const reputation = getUserReputation(userId);

    if (reputation.score >= 80) {
      // Trusted users
      return { windowMs: 60000, max: 1000 };
    } else if (reputation.score >= 50) {
      // Normal users
      return { windowMs: 60000, max: 500 };
    } else if (reputation.score >= 20) {
      // Suspicious users
      return { windowMs: 60000, max: 100 };
    } else {
      // Highly suspicious - very restrictive
      return { windowMs: 60000, max: 10 };
    }
  }

  return {
    getRateLimitConfig,
    updateReputation,
    getUserReputation,

    // Middleware to track behavior
    trackBehavior: (req, res, next) => {
      const userId = req.session?.userId;
      if (!userId) return next();

      // Track request completion
      res.on('finish', () => {
        if (res.statusCode >= 500) {
          // Server errors - neutral (not user's fault)
          updateReputation(userId, 0);
        } else if (res.statusCode >= 400) {
          // Client errors - decrease reputation
          updateReputation(userId, -1);
        } else if (res.statusCode === 200 || res.statusCode === 201) {
          // Successful requests - slowly increase reputation
          updateReputation(userId, 0.1);
        }
      });

      next();
    }
  };
}

/**
 * Request signature validation (optional, for API clients)
 */
function validateRequestSignature(secret) {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    if (!signature) {
      return res.status(401).json({
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Request signature required'
        }
      });
    }

    // TODO: Implement HMAC signature validation
    // For now, just check if signature exists
    next();
  };
}

module.exports = {
  configureSecurityMiddleware,
  createIPReputationMiddleware,
  createAdaptiveRateLimiter,
  validateRequestSignature
};
