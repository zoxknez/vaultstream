/**
 * 🏥 STREAMVAULT HEALTH ROUTES
 * Health check and system monitoring endpoints
 */

const express = require('express');
const { logger } = require('../utils/logger');
const { getMemoryStats, getMemoryUsage } = require('../services/memoryService');
const { getResourceStats } = require('../services/resourceTrackingService');
const { getRateLimitStats } = require('../middleware/rateLimiting');
const { getClient } = require('../services/webTorrentClient');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 */
router.get('/detailed', async (req, res) => {
  try {
    const memoryStats = getMemoryStats();
    const resourceStats = getResourceStats();
    const rateLimitStats = getRateLimitStats();
    const webtorrentClient = getClient();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: memoryStats.used,
        total: memoryStats.total,
        limit: memoryStats.limit,
        percentage: memoryStats.percentage
      },
      resources: {
        activeTorrents: resourceStats.activeTorrents,
        totalConnections: resourceStats.totalConnections,
        idleTorrents: resourceStats.idleTorrents
      },
      rateLimiting: {
        totalRequests: rateLimitStats.totalRequests,
        blockedRequests: rateLimitStats.blockedRequests,
        activeConnections: rateLimitStats.activeConnections
      },
      webtorrent: {
        connected: !!webtorrentClient,
        torrents: webtorrentClient ? webtorrentClient.torrents.length : 0
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    // Check if any critical services are unhealthy
    const isUnhealthy = 
      memoryStats.percentage > 90 ||
      resourceStats.activeTorrents > 1000 ||
      rateLimitStats.blockedRequests > 1000;

    if (isUnhealthy) {
      health.status = 'degraded';
      res.status(206).json(health);
    } else {
      res.json(health);
    }
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    const webtorrentClient = getClient();
    const memoryStats = getMemoryStats();
    
    const isReady = 
      webtorrentClient &&
      memoryStats.percentage < 95 &&
      process.uptime() > 10; // At least 10 seconds uptime

    if (isReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reasons: [
          !webtorrentClient && 'WebTorrent client not initialized',
          memoryStats.percentage >= 95 && 'High memory usage',
          process.uptime() <= 10 && 'Service starting up'
        ].filter(Boolean)
      });
    }
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', async (req, res) => {
  try {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Liveness check error:', error);
    res.status(503).json({
      status: 'dead',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 */
router.get('/metrics', async (req, res) => {
  try {
    const memoryStats = getMemoryStats();
    const resourceStats = getResourceStats();
    const rateLimitStats = getRateLimitStats();
    const webtorrentClient = getClient();

    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        used: memoryStats.used,
        total: memoryStats.total,
        limit: memoryStats.limit,
        percentage: memoryStats.percentage,
        external: memoryStats.external,
        arrayBuffers: memoryStats.arrayBuffers
      },
      resources: {
        activeTorrents: resourceStats.activeTorrents,
        totalConnections: resourceStats.totalConnections,
        idleTorrents: resourceStats.idleTorrents,
        memoryLeaks: resourceStats.memoryLeaks
      },
      rateLimiting: {
        totalRequests: rateLimitStats.totalRequests,
        blockedRequests: rateLimitStats.blockedRequests,
        activeConnections: rateLimitStats.activeConnections,
        averageResponseTime: rateLimitStats.averageResponseTime
      },
      webtorrent: {
        connected: !!webtorrentClient,
        torrents: webtorrentClient ? webtorrentClient.torrents.length : 0,
        downloadSpeed: webtorrentClient ? webtorrentClient.downloadSpeed : 0,
        uploadSpeed: webtorrentClient ? webtorrentClient.uploadSpeed : 0
      },
      system: {
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Get service status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 */
router.get('/status', async (req, res) => {
  try {
    const memoryStats = getMemoryStats();
    const resourceStats = getResourceStats();
    const rateLimitStats = getRateLimitStats();
    const webtorrentClient = getClient();

    const status = {
      timestamp: new Date().toISOString(),
      services: {
        webtorrent: {
          status: webtorrentClient ? 'running' : 'stopped',
          torrents: webtorrentClient ? webtorrentClient.torrents.length : 0
        },
        memory: {
          status: memoryStats.percentage < 90 ? 'healthy' : 'warning',
          usage: memoryStats.percentage
        },
        resources: {
          status: resourceStats.activeTorrents < 500 ? 'healthy' : 'warning',
          activeTorrents: resourceStats.activeTorrents
        },
        rateLimiting: {
          status: rateLimitStats.blockedRequests < 100 ? 'healthy' : 'warning',
          blockedRequests: rateLimitStats.blockedRequests
        }
      },
      overall: 'healthy'
    };

    // Determine overall status
    const hasWarning = Object.values(status.services).some(service => service.status === 'warning');
    const hasStopped = Object.values(status.services).some(service => service.status === 'stopped');
    
    if (hasStopped) {
      status.overall = 'unhealthy';
    } else if (hasWarning) {
      status.overall = 'degraded';
    }

    res.json(status);
  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
