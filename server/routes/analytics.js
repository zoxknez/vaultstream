/**
 * 📊 STREAMVAULT ANALYTICS ROUTES
 * Analytics and metrics endpoints
 */

const express = require('express');
const { z } = require('zod');
const { logger } = require('../utils/logger');
const { analyticsService } = require('../services/analyticsService');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const analyticsEventSchema = z.object({
  body: z.object({
    type: z.string().min(1, 'Event type is required'),
    data: z.record(z.any()).optional(),
    timestamp: z.number().optional()
  })
});

const analyticsQuerySchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    eventType: z.string().optional(),
    userId: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
});

/**
 * @swagger
 * /api/analytics/event:
 *   post:
 *     summary: Track analytics event
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *               data:
 *                 type: object
 *               timestamp:
 *                 type: number
 *     responses:
 *       200:
 *         description: Event tracked successfully
 */
router.post('/event', validateRequest(analyticsEventSchema), async (req, res, next) => {
  try {
    const { type, data, timestamp } = req.body;
    
    const result = await analyticsService.trackEvent({
      userId: req.user.id,
      type,
      data,
      timestamp: timestamp || Date.now(),
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Track analytics event error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/events:
 *   get:
 *     summary: Get analytics events
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Analytics events retrieved successfully
 */
router.get('/events', validateRequest(analyticsQuerySchema), async (req, res, next) => {
  try {
    const { startDate, endDate, eventType, userId, limit } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType,
      userId,
      limit: parseInt(limit) || 100
    };
    
    const result = await analyticsService.getEvents(queryOptions);
    
    if (result.success) {
      res.json({
        success: true,
        events: result.events,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get analytics events error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/metrics:
 *   get:
 *     summary: Get analytics metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *     responses:
 *       200:
 *         description: Analytics metrics retrieved successfully
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const { startDate, endDate, granularity } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      granularity: granularity || 'day'
    };
    
    const result = await analyticsService.getMetrics(queryOptions);
    
    if (result.success) {
      res.json({
        success: true,
        metrics: result.metrics
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get analytics metrics error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const result = await analyticsService.getDashboardData();
    
    if (result.success) {
      res.json({
        success: true,
        dashboard: result.dashboard
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get analytics dashboard error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/user-activity:
 *   get:
 *     summary: Get user activity analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: User activity analytics retrieved successfully
 */
router.get('/user-activity', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId: req.user.id
    };
    
    const result = await analyticsService.getUserActivity(queryOptions);
    
    if (result.success) {
      res.json({
        success: true,
        activity: result.activity
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get user activity analytics error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/torrent-stats:
 *   get:
 *     summary: Get torrent statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Torrent statistics retrieved successfully
 */
router.get('/torrent-stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    const result = await analyticsService.getTorrentStats(queryOptions);
    
    if (result.success) {
      res.json({
        success: true,
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get torrent statistics error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/performance:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/performance', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    const result = await analyticsService.getPerformanceMetrics(queryOptions);
    
    if (result.success) {
      res.json({
        success: true,
        performance: result.performance
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get performance metrics error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, xlsx]
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 */
router.get('/export', async (req, res, next) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    const queryOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format: format || 'json'
    };
    
    const result = await analyticsService.exportData(queryOptions);
    
    if (result.success) {
      const filename = `analytics-${Date.now()}.${queryOptions.format}`;
      res.set({
        'Content-Type': queryOptions.format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      res.send(result.data);
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Export analytics data error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/real-time:
 *   get:
 *     summary: Get real-time analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
 */
router.get('/real-time', async (req, res, next) => {
  try {
    const result = await analyticsService.getRealTimeMetrics();
    
    if (result.success) {
      res.json({
        success: true,
        realTime: result.realTime
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get real-time analytics error:', error);
    next(error);
  }
});

module.exports = router;
