/**
 * Configuration Module - TypeScript Migration (Sprint 2.1 Phase 6)
 * Central configuration with environment validation
 */

require('dotenv').config();

const { validateEnv, getConfigSummary } = require('./env.validation');

// Validate environment variables at startup
const env = validateEnv();

interface ServerConfig {
  port: number;
  host: string;
  protocol: string;
}

interface FrontendConfig {
  url: string;
}

interface CorsConfig {
  allowAll: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

interface OmdbConfig {
  apiKey: string | null;
}

interface SearchSourceConfig {
  baseUrl: string;
  enabled?: boolean;
  apiKey?: string;
  indexer?: string;
}

interface SearchConfig {
  enabled: boolean;
  enabledSources: string[];
  cacheTTL: number;
  defaultLimit: number;
  apibay: SearchSourceConfig;
  yts: SearchSourceConfig;
  jackett: SearchSourceConfig;
  '1337x': SearchSourceConfig;
  eztv: SearchSourceConfig;
  torrentgalaxy: SearchSourceConfig;
}

interface LoggingConfig {
  logRequests: boolean;
  requestIdHeader: string;
  responseIdHeader: string;
}

interface SecurityConfig {
  sessionCookieName: string;
  sessionSameSite: string;
  sessionSecureCookies: boolean;
  hstsEnabled: boolean;
  hstsMaxAge: number;
  permissionsPolicy: string;
}

interface MetricsConfig {
  enabled: boolean;
}

interface SwaggerConfig {
  enabled: boolean;
  title: string;
  version: string;
  description: string;
}

interface StreamingConfig {
  maxConnectionTime: number;
  defaultChunkSize: number;
  streamingUploadRate: number;
  optimizeForRemote: boolean;
}

interface CacheConfig {
  torrentListTTL: number;
  torrentDetailsTTL: number;
  imdbDataTTL: number;
  memoryCachePurgeThreshold: number;
}

interface SystemConfig {
  maxMemory: number;
  monitoring: boolean;
  logLevel: number;
}

interface NetworkConfig {
  maxConns: number;
  defaultUploadLimit: number;
  apiTimeout: number;
}

interface ProductionConfig {
  streaming: StreamingConfig;
  cache: CacheConfig;
  system: SystemConfig;
  network: NetworkConfig;
}

interface AppConfig {
  env: any;
  server: ServerConfig;
  frontend: FrontendConfig;
  cors: CorsConfig;
  omdb: OmdbConfig;
  search: SearchConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  metrics: MetricsConfig;
  isDevelopment: boolean;
  production: ProductionConfig;
}

const config: AppConfig = {
  env,
  server: {
    port: parseInt(process.env.SERVER_PORT || '3000', 10),
    host: process.env.SERVER_HOST || 'localhost',
    protocol: process.env.SERVER_PROTOCOL || 'http'
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  },
  cors: {
    allowAll: process.env.CORS_ALLOW_ALL === 'true',
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    allowedMethods: (process.env.CORS_ALLOWED_METHODS || 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
      .split(',')
      .map((method) => method.trim().toUpperCase())
      .filter(Boolean),
    allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Seedbox-CSRF')
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean),
    exposedHeaders: (process.env.CORS_EXPOSED_HEADERS || 'Content-Length,Content-Disposition,Content-Range,Accept-Ranges')
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean),
    credentials: process.env.CORS_ALLOW_CREDENTIALS !== 'false',
    preflightContinue: process.env.CORS_PREFLIGHT_CONTINUE === 'true',
    optionsSuccessStatus: parseInt(process.env.CORS_OPTIONS_SUCCESS_STATUS || '204', 10)
  },
  omdb: {
    apiKey: process.env.OMDB_API_KEY || null
  },
  search: {
    enabled: process.env.SEARCH_ENABLED !== 'false',
    enabledSources: (process.env.SEARCH_SOURCES || 'apibay,yts,1337x,eztv,torrentgalaxy')
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean),
    cacheTTL: parseInt(process.env.SEARCH_CACHE_TTL || '30000', 10),
    defaultLimit: parseInt(process.env.SEARCH_DEFAULT_LIMIT || '25', 10),
    apibay: {
      baseUrl: process.env.SEARCH_APIBAY_URL || 'https://apibay.org'
    },
    yts: {
      baseUrl: process.env.SEARCH_YTS_URL || 'https://yts.mx/api/v2',
      enabled: process.env.SEARCH_YTS_ENABLED !== 'false'
    },
    jackett: {
      baseUrl: process.env.JACKETT_URL || '',
      apiKey: process.env.JACKETT_API_KEY || '',
      indexer: process.env.JACKETT_INDEXER || ''
    },
    '1337x': {
      baseUrl: process.env.SEARCH_1337X_URL || 'https://1337x.to',
      enabled: process.env.SEARCH_1337X_ENABLED !== 'false'
    },
    eztv: {
      baseUrl: process.env.SEARCH_EZTV_URL || 'https://eztv.re/api',
      enabled: process.env.SEARCH_EZTV_ENABLED !== 'false'
    },
    torrentgalaxy: {
      baseUrl: process.env.SEARCH_TGX_URL || 'https://torrentgalaxy.to',
      enabled: process.env.SEARCH_TGX_ENABLED !== 'false'
    }
  },
  logging: {
    logRequests: process.env.LOG_REQUESTS !== 'false',
    requestIdHeader: (process.env.REQUEST_ID_HEADER || 'x-request-id').toLowerCase(),
    responseIdHeader: process.env.RESPONSE_ID_HEADER || 'X-Request-Id'
  },
  security: {
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sbx.sid',
    sessionSameSite: process.env.SESSION_COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
    sessionSecureCookies:
      process.env.SESSION_COOKIE_SECURE === 'true' ||
      (process.env.SESSION_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production'),
    hstsEnabled: process.env.HSTS_ENABLED !== 'false',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '63072000', 10),
    permissionsPolicy:
      process.env.PERMISSIONS_POLICY ||
      'accelerometer=(), autoplay=(), camera=(), fullscreen=(), geolocation=(), gyro=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()'
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false'
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'StreamVault API',
    version: '1.0.0',
    description: 'Premium Torrent Streaming Platform API'
  },
  isDevelopment: process.env.NODE_ENV !== 'production',
  production: {
    streaming: {
      maxConnectionTime: 300000,
      defaultChunkSize: 4 * 1024 * 1024,
      streamingUploadRate: 10000,
      optimizeForRemote: true
    },
    cache: {
      torrentListTTL: 5000,
      torrentDetailsTTL: 8000,
      imdbDataTTL: 3600000,
      memoryCachePurgeThreshold: 800
    },
    system: {
      maxMemory: 1024,
      monitoring: true,
      logLevel: parseInt(process.env.LOG_LEVEL || '1', 10)
    },
    network: {
      maxConns: 100,
      defaultUploadLimit: 5000,
      apiTimeout: 15000
    }
  }
};

const isProduction = process.env.NODE_ENV === 'production';
const isCloud =
  process.env.CLOUD_DEPLOYMENT === 'true' ||
  process.env.DIGITAL_OCEAN === 'true' ||
  process.env.HOSTING === 'cloud';

// Log validated configuration summary
console.log('\n✅ Environment Variables Validated Successfully\n');
console.log(`🌐 Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
if (isCloud) {
  console.log('☁️ Cloud/DigitalOcean deployment detected');
}

if (config.isDevelopment) {
  const configSummary = getConfigSummary(env);
  console.log('\n🔧 Configuration Summary:');
  console.log(configSummary);
}

if (!config.omdb.apiKey) {
  console.warn('\n⚠️  OMDb API key is not set. Metadata lookups will skip OMDb and rely on TMDB fallbacks.');
}

if (config.cors.allowAll) {
  console.warn('\n⚠️  CORS_ALLOW_ALL is enabled. All origins will be permitted. Consider specifying CORS_ALLOWED_ORIGINS in production.');
} else if (config.cors.allowedOrigins.length === 0) {
  console.warn('\n⚠️  No CORS_ALLOWED_ORIGINS configured. Defaulting to permissive mode for localhost.');
  config.cors.allowAll = true;
}

console.log(''); // Empty line for readability

export {
    config, env,
    getConfigSummary, isCloud, isProduction
};

// CommonJS compatibility
module.exports = {
  config,
  isProduction,
  isCloud,
  env,
  getConfigSummary
};
