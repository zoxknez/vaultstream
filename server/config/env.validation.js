const { z } = require('zod');
const crypto = require('crypto');

/**
 * Environment Variable Validation Schema
 * 
 * This module validates all required and optional environment variables
 * at server startup to catch configuration errors early.
 * 
 * Security considerations:
 * - SESSION_SECRET must be ≥32 characters for cryptographic strength
 * - SESSION_SECRET entropy is checked to prevent weak secrets
 * - Required variables are explicitly marked to prevent silent failures
 * - Type coercion is applied for numeric/boolean values
 */

// Helper: Boolean schema that accepts string or boolean
function booleanEnv(defaultValue = false) {
  return z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (val === undefined) return defaultValue;
      if (typeof val === 'boolean') return val;
      return val === 'true';
    })
    .default(defaultValue);
}

// Helper: Inverted boolean (default true, false if 'false')
function invertedBooleanEnv(defaultValue = true) {
  return z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (val === undefined) return defaultValue;
      if (typeof val === 'boolean') return val;
      return val !== 'false';
    })
    .default(defaultValue);
}

// Helper: Calculate Shannon entropy (bits per character)
function calculateEntropy(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Helper: Validate SESSION_SECRET strength
function validateSessionSecret(secret) {
  // Minimum length check
  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET must be at least 32 characters long (current: ${secret.length} characters)`
    );
  }
  
  // Maximum length check (reasonable upper bound)
  if (secret.length > 256) {
    throw new Error(
      `SESSION_SECRET is too long (current: ${secret.length} characters, max: 256)`
    );
  }
  
  // Entropy check: minimum 3 bits per character (decent randomness)
  const entropy = calculateEntropy(secret);
  const minEntropy = 3.0;
  
  if (entropy < minEntropy) {
    throw new Error(
      `SESSION_SECRET has insufficient entropy (${entropy.toFixed(2)} bits/char, minimum: ${minEntropy}). ` +
      `Use a cryptographically random generator: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  
  // Warn about common weak patterns
  const weakPatterns = [
    /^(.)\1{10,}$/, // Repeated characters (e.g., "aaaaaaaaaa...")
    /^(0123456789|abcdefghij)/i, // Sequential patterns
    /^(password|secret|key|admin)/i, // Common words
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      console.warn(
        '⚠️  WARNING: SESSION_SECRET contains weak patterns. ' +
        'Consider using: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
      );
      break;
    }
  }
  
  return true;
}

// Custom Zod schema for SESSION_SECRET
const sessionSecretSchema = z
  .string()
  .min(32, 'SESSION_SECRET must be at least 32 characters long')
  .max(256, 'SESSION_SECRET must not exceed 256 characters')
  .refine(
    (val) => {
      try {
        return validateSessionSecret(val);
      } catch (err) {
        throw new Error(err.message);
      }
    },
    { message: 'SESSION_SECRET validation failed' }
  );

// Main environment schema
const envSchema = z.object({
  // ============================================================================
  // REQUIRED VARIABLES (Server will not start without these)
  // ============================================================================
  
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),
  
  SESSION_SECRET: sessionSecretSchema
    .describe('Cryptographically strong session secret (≥32 chars, high entropy)'),
  
  // ============================================================================
  // SERVER CONFIGURATION
  // ============================================================================
  
  SERVER_PORT: z
    .string()
    .regex(/^\d+$/, 'SERVER_PORT must be a numeric string')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default('3000')
    .describe('Server port (1-65535)'),
  
  SERVER_HOST: z
    .string()
    .min(1)
    .default('localhost')
    .describe('Server host address'),
  
  SERVER_PROTOCOL: z
    .enum(['http', 'https'])
    .default('http')
    .describe('Server protocol'),
  
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL')
    .default('http://localhost:5173')
    .describe('Frontend application URL'),
  
  // ============================================================================
  // AUTHENTICATION & SESSION
  // ============================================================================
  
  ACCESS_PASSWORD: z
    .string()
    .optional()
    .describe('Plain password for development (will be hashed at startup)'),
  
  ACCESS_PASSWORD_HASH: z
    .string()
    .optional()
    .describe('Pre-hashed bcrypt password for production'),
  
  SESSION_COOKIE_NAME: z
    .string()
    .min(1)
    .default('sbx.sid')
    .describe('Session cookie name'),
  
  SESSION_COOKIE_SAMESITE: z
    .enum(['strict', 'lax', 'none'])
    .default('lax')
    .describe('Session cookie SameSite attribute'),
  
  SESSION_COOKIE_SECURE: booleanEnv(false).describe('Session cookie Secure flag'),
  
  // ============================================================================
  // DATABASE & REDIS
  // ============================================================================
  
  REDIS_URL: z
    .string()
    .url('REDIS_URL must be a valid URL (redis:// or rediss://)')
    .optional()
    .describe('Redis connection URL for session storage'),
  
  // ============================================================================
  // EXTERNAL APIS
  // ============================================================================
  
  TMDB_API_KEY: z
    .string()
    .optional()
    .describe('The Movie Database (TMDB) API key'),
  
  OMDB_API_KEY: z
    .string()
    .optional()
    .describe('Open Movie Database (OMDb) API key'),
  
  JACKETT_URL: z
    .string()
    .optional()
    .describe('Jackett server URL'),
  
  JACKETT_API_KEY: z
    .string()
    .optional()
    .describe('Jackett API key'),
  
  JACKETT_INDEXER: z
    .string()
    .optional()
    .describe('Jackett indexer name'),
  
  // ============================================================================
  // RATE LIMITING & SECURITY
  // ============================================================================
  
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1000))
    .default('900000')
    .describe('Rate limit window in milliseconds (default: 15 minutes)'),
  
  RATE_LIMIT_MAX: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default('500')
    .describe('Maximum requests per window'),
  
  MAX_CONCURRENT_REQUESTS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default('50')
    .describe('Maximum concurrent requests'),
  
  MAX_REQUESTS_PER_IP: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default('10')
    .describe('Maximum concurrent requests per IP'),
  
  REQUEST_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1000))
    .default('30000')
    .describe('Request timeout in milliseconds'),
  
  LOGIN_RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1000))
    .default('60000')
    .describe('Login rate limit window in milliseconds'),
  
  LOGIN_RATE_LIMIT_MAX: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default('5')
    .describe('Maximum login attempts per window'),
  
  // ============================================================================
  // CORS CONFIGURATION
  // ============================================================================
  
  CORS_ALLOW_ALL: booleanEnv(false).describe('Allow all CORS origins (not recommended for production)'),
  
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .describe('Comma-separated list of allowed CORS origins'),
  
  CORS_ALLOWED_METHODS: z
    .string()
    .default('GET,POST,PUT,DELETE,OPTIONS,PATCH')
    .describe('Comma-separated list of allowed HTTP methods'),
  
  CORS_ALLOWED_HEADERS: z
    .string()
    .default('Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Seedbox-CSRF')
    .describe('Comma-separated list of allowed headers'),
  
  CORS_EXPOSED_HEADERS: z
    .string()
    .default('Content-Length,Content-Disposition,Content-Range,Accept-Ranges')
    .describe('Comma-separated list of exposed headers'),
  
  CORS_ALLOW_CREDENTIALS: invertedBooleanEnv(true).describe('Allow credentials in CORS requests'),
  
  CORS_PREFLIGHT_CONTINUE: booleanEnv(false).describe('Pass preflight requests to next handler'),
  
  CORS_OPTIONS_SUCCESS_STATUS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(200).max(299))
    .default('204')
    .describe('Status code for successful OPTIONS requests'),
  
  // ============================================================================
  // LOGGING & MONITORING
  // ============================================================================
  
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info')
    .describe('Winston log level'),
  
  LOG_FORMAT: z
    .enum(['json', 'text'])
    .default('text')
    .describe('Log output format'),
  
  LOG_DIR: z
    .string()
    .default('logs')
    .describe('Directory for log files'),
  
  ENABLE_FILE_LOGGING: invertedBooleanEnv(true).describe('Enable file-based logging'),
  
  LOG_REQUESTS: invertedBooleanEnv(true).describe('Log HTTP requests'),
  
  REQUEST_ID_HEADER: z
    .string()
    .default('x-request-id')
    .describe('Request ID header name'),
  
  RESPONSE_ID_HEADER: z
    .string()
    .default('X-Request-Id')
    .describe('Response ID header name'),
  
  METRICS_ENABLED: invertedBooleanEnv(true).describe('Enable metrics collection'),
  
  // ============================================================================
  // SEARCH & TORRENT SOURCES
  // ============================================================================
  
  SEARCH_ENABLED: invertedBooleanEnv(true).describe('Enable torrent search functionality'),
  
  SEARCH_SOURCES: z
    .string()
    .default('apibay,yts,1337x,eztv,torrentgalaxy')
    .describe('Comma-separated list of enabled search sources'),
  
  SEARCH_CACHE_TTL: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0))
    .default('30000')
    .describe('Search cache TTL in milliseconds'),
  
  SEARCH_DEFAULT_LIMIT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default('25')
    .describe('Default search results limit'),
  
  SEARCH_APIBAY_URL: z
    .string()
    .url()
    .default('https://apibay.org')
    .describe('ApiBay API URL'),
  
  SEARCH_YTS_URL: z
    .string()
    .url()
    .default('https://yts.mx/api/v2')
    .describe('YTS API URL'),
  
  SEARCH_YTS_ENABLED: invertedBooleanEnv(true).describe('Enable YTS search'),
  
  SEARCH_1337X_URL: z
    .string()
    .url()
    .default('https://1337x.to')
    .describe('1337x website URL'),
  
  SEARCH_1337X_ENABLED: invertedBooleanEnv(true).describe('Enable 1337x search'),
  
  SEARCH_EZTV_URL: z
    .string()
    .url()
    .default('https://eztv.re/api')
    .describe('EZTV API URL'),
  
  SEARCH_EZTV_ENABLED: invertedBooleanEnv(true).describe('Enable EZTV search'),
  
  SEARCH_TGX_URL: z
    .string()
    .url()
    .default('https://torrentgalaxy.to')
    .describe('TorrentGalaxy website URL'),
  
  SEARCH_TGX_ENABLED: invertedBooleanEnv(true).describe('Enable TorrentGalaxy search'),
  
  // ============================================================================
  // SECURITY HEADERS
  // ============================================================================
  
  HSTS_ENABLED: invertedBooleanEnv(true).describe('Enable HTTP Strict Transport Security'),
  
  HSTS_MAX_AGE: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0))
    .default('63072000')
    .describe('HSTS max-age in seconds (default: 2 years)'),
  
  PERMISSIONS_POLICY: z
    .string()
    .optional()
    .describe('Permissions-Policy header value'),
  
  // ============================================================================
  // DEPLOYMENT & BUILD
  // ============================================================================
  
  BUILD_VERSION: z
    .string()
    .optional()
    .describe('Build version number'),
  
  BUILD_COMMIT: z
    .string()
    .optional()
    .describe('Git commit hash'),
  
  BUILD_TIMESTAMP: z
    .string()
    .optional()
    .describe('Build timestamp'),
  
  VERCEL_ENV: z
    .string()
    .optional()
    .describe('Vercel environment'),
  
  VERCEL_GIT_COMMIT_SHA: z
    .string()
    .optional()
    .describe('Vercel Git commit SHA'),
  
  VERCEL_DEPLOYMENT_TIME: z
    .string()
    .optional()
    .describe('Vercel deployment timestamp'),
  
  RENDER_GIT_COMMIT: z
    .string()
    .optional()
    .describe('Render Git commit hash'),
  
  RENDER_GIT_COMMIT_TIMESTAMP: z
    .string()
    .optional()
    .describe('Render Git commit timestamp'),
  
  GIT_COMMIT: z
    .string()
    .optional()
    .describe('Git commit hash (generic)'),
  
  CLOUD_DEPLOYMENT: booleanEnv(false).describe('Cloud deployment flag'),
  
  DIGITAL_OCEAN: booleanEnv(false).describe('DigitalOcean deployment flag'),
  
  HOSTING: z
    .string()
    .optional()
    .describe('Hosting provider'),
  
  DISABLE_BACKGROUND_TASKS: booleanEnv(false).describe('Disable background task runners'),
});

/**
 * Validate environment variables and return parsed config
 * 
 * @throws {Error} If validation fails with detailed error messages
 * @returns {Object} Validated and typed environment configuration
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Additional cross-field validations
    if (parsed.NODE_ENV === 'production') {
      // Production-specific warnings
      if (parsed.CORS_ALLOW_ALL) {
        console.warn(
          '⚠️  WARNING: CORS_ALLOW_ALL is enabled in production. ' +
          'This is a security risk. Set CORS_ALLOWED_ORIGINS instead.'
        );
      }
      
      if (!parsed.REDIS_URL) {
        console.warn(
          '⚠️  WARNING: REDIS_URL is not set in production. ' +
          'Session persistence will use in-memory storage, which is not recommended.'
        );
      }
      
      if (!parsed.ACCESS_PASSWORD_HASH && !parsed.ACCESS_PASSWORD) {
        console.warn(
          '⚠️  WARNING: Neither ACCESS_PASSWORD_HASH nor ACCESS_PASSWORD is set. ' +
          'Authentication may not be configured properly.'
        );
      }
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment Variable Validation Failed:\n');
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  • ${path}: ${err.message}`);
      });
      
      console.error('\n📖 See server/.env.example for configuration reference.\n');
      
      throw new Error('Environment validation failed. Check the errors above.');
    }
    
    throw error;
  }
}

/**
 * Get human-readable configuration summary for logging
 * 
 * @param {Object} env Validated environment config
 * @returns {Object} Safe configuration summary (no secrets)
 */
function getConfigSummary(env) {
  return {
    environment: env.NODE_ENV,
    server: {
      port: env.SERVER_PORT,
      host: env.SERVER_HOST,
      protocol: env.SERVER_PROTOCOL,
    },
    frontend: {
      url: env.FRONTEND_URL,
    },
    security: {
      sessionSecretLength: env.SESSION_SECRET.length,
      sessionSecretEntropy: calculateEntropy(env.SESSION_SECRET).toFixed(2) + ' bits/char',
      redisConfigured: !!env.REDIS_URL,
      corsAllowAll: env.CORS_ALLOW_ALL,
    },
    features: {
      searchEnabled: env.SEARCH_ENABLED,
      searchSources: env.SEARCH_SOURCES.split(',').map(s => s.trim()),
      metricsEnabled: env.METRICS_ENABLED,
      fileLogging: env.ENABLE_FILE_LOGGING,
    },
    apis: {
      tmdb: !!env.TMDB_API_KEY,
      omdb: !!env.OMDB_API_KEY,
      jackett: !!env.JACKETT_URL && !!env.JACKETT_API_KEY,
    },
    rateLimiting: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX,
      maxConcurrent: env.MAX_CONCURRENT_REQUESTS,
      maxPerIp: env.MAX_REQUESTS_PER_IP,
    },
  };
}

module.exports = {
  validateEnv,
  getConfigSummary,
  calculateEntropy,
  validateSessionSecret,
  envSchema,
};
