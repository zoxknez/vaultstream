/**
 * 🚀 STREAMVAULT MAIN APPLICATION
 * Modular Express application with all features
 */

require('dotenv').config();

// Register ts-node only if not already registered via NODE_OPTIONS
if (!process[Symbol.for('ts-node.register.instance')]) {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs'
    }
  });
}

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// Import services
const { configureLogger, logger } = require('./utils/logger');
const productionLogger = require('./utils/productionLogger');
const { config } = require('./config');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestContext } = require('./middleware/requestContext');
const { trackRequestMetrics } = require('./middleware/metrics');
const {
  initializeRateLimiters,
  globalRateLimiter,
  streamingRateLimiter,
  searchRateLimiter,
  apiRateLimiter
} = require('./middleware/rateLimiting');

// Import routes
const torrentRoutes = require('./routes/torrents');
const streamRoutes = require('./routes/streaming');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');

// Import services
const {
  initializeClient: initWebTorrentClient,
  getClient
} = require('./services/webTorrentClient');
const { startMonitoring: startMemoryMonitoring } = require('./services/memoryService');
const { startIdleMonitoring } = require('./services/resourceTrackingService');
const { initializeRedisStore: initRateLimitRedis } = require('./middleware/rateLimiting');

class StreamVaultApp {
  constructor() {
    this.app = express();
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure logger
      configureLogger();

      // Initialize rate limiting (in-memory only, no Redis)
      await this.initializeRateLimiting();

      // Initialize WebTorrent client
      await this.initializeWebTorrent();

      // Initialize monitoring services
      await this.initializeMonitoring();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      logger.info('StreamVault application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Initialize rate limiting
   */
  async initializeRateLimiting() {
    try {
      logger.warn('Rate limiting initialized without Redis (in-memory)');

      // Initialize rate limiter instances
      initializeRateLimiters();
      logger.info('✅ Rate limiters initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize rate limiting:', error);
      throw error;
    }
  }

  /**
   * Initialize WebTorrent client
   */
  async initializeWebTorrent() {
    try {
      await initWebTorrentClient();
      logger.info('WebTorrent client initialized');
    } catch (error) {
      logger.error('Failed to initialize WebTorrent client:', error);
      throw error;
    }
  }

  /**
   * Initialize monitoring services
   */
  async initializeMonitoring() {
    try {
      startMemoryMonitoring();
      startIdleMonitoring();
      logger.info('Monitoring services initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring services:', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        crossOriginEmbedderPolicy: false
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
      })
    );

    // Compression
    this.app.use(
      compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      })
    );

    // Request context middleware
    this.app.use(requestContext);

    // Metrics middleware
    this.app.use(trackRequestMetrics);

    // Rate limiting
    this.app.use(globalRateLimiter);
    this.app.use('/api/stream', streamingRateLimiter);
    this.app.use('/api/search', searchRateLimiter);
    this.app.use('/api', apiRateLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use(
      express.static(path.join(__dirname, '../client/dist'), {
        maxAge: '1y',
        etag: true,
        lastModified: true
      })
    );
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // API routes
    this.app.use('/api/torrents', torrentRoutes);
    this.app.use('/api/stream', streamRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/health', healthRoutes);

    // Swagger documentation
    if (config.swagger.enabled) {
      const swaggerUi = require('swagger-ui-express');
      const swaggerSpecs = require('./config/swagger');

      this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
    }

    // SPA fallback
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Get Express app
   */
  getApp() {
    return this.app;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');

      // Close Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
      }

      // Cleanup WebTorrent client
      const client = getClient();
      if (client) {
        client.destroy();
      }

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

module.exports = StreamVaultApp;
