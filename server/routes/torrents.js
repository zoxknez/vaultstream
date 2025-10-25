/**
 * 🌊 STREAMVAULT TORRENT ROUTES
 * Torrent management and streaming endpoints
 */

const express = require('express');
const { z } = require('zod');
const { logger } = require('../utils/logger');
const { torrentService } = require('../services/torrentService');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const addTorrentSchema = z.object({
  body: z.object({
    magnet: z.string().url('Invalid magnet link'),
    name: z.string().optional(),
    category: z.string().optional()
  })
});

const torrentActionSchema = z.object({
  params: z.object({
    hash: z.string().min(1, 'Torrent hash is required')
  })
});

const fileActionSchema = z.object({
  params: z.object({
    hash: z.string().min(1, 'Torrent hash is required'),
    fileIndex: z.string().regex(/^\d+$/, 'File index must be a number')
  })
});

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    category: z.string().optional(),
    sort: z.enum(['relevance', 'date', 'size', 'seeds']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
});

/**
 * @swagger
 * /api/torrents:
 *   get:
 *     summary: Get all torrents
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Torrents retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await torrentService.getAllTorrents();
    
    if (result.success) {
      res.json({
        success: true,
        torrents: result.torrents
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get torrents error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents:
 *   post:
 *     summary: Add new torrent
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - magnet
 *             properties:
 *               magnet:
 *                 type: string
 *                 format: uri
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Torrent added successfully
 *       400:
 *         description: Invalid magnet link
 */
router.post('/', validateRequest(addTorrentSchema), async (req, res, next) => {
  try {
    const { magnet, name, category } = req.body;
    
    const result = await torrentService.addTorrent(magnet, { name, category });
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Torrent added successfully',
        torrent: result.torrent
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Add torrent error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}:
 *   get:
 *     summary: Get torrent by hash
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent retrieved successfully
 *       404:
 *         description: Torrent not found
 */
router.get('/:hash', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.getTorrent(hash);
    
    if (result.success) {
      res.json({
        success: true,
        torrent: result.torrent
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get torrent error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}:
 *   delete:
 *     summary: Remove torrent
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent removed successfully
 *       404:
 *         description: Torrent not found
 */
router.delete('/:hash', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.removeTorrent(hash);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Torrent removed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Remove torrent error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/start:
 *   post:
 *     summary: Start torrent
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent started successfully
 *       404:
 *         description: Torrent not found
 */
router.post('/:hash/start', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.startTorrent(hash);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Torrent started successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Start torrent error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/pause:
 *   post:
 *     summary: Pause torrent
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent paused successfully
 *       404:
 *         description: Torrent not found
 */
router.post('/:hash/pause', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.pauseTorrent(hash);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Torrent paused successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Pause torrent error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/stats:
 *   get:
 *     summary: Get torrent statistics
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent statistics retrieved successfully
 *       404:
 *         description: Torrent not found
 */
router.get('/:hash/stats', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.getTorrentStats(hash);
    
    if (result.success) {
      res.json({
        success: true,
        stats: result.stats
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get torrent stats error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/files:
 *   get:
 *     summary: Get torrent files
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Torrent files retrieved successfully
 *       404:
 *         description: Torrent not found
 */
router.get('/:hash/files', validateRequest(torrentActionSchema), async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    const result = await torrentService.getTorrentFiles(hash);
    
    if (result.success) {
      res.json({
        success: true,
        files: result.files
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get torrent files error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/files/{fileIndex}/priority:
 *   put:
 *     summary: Set file priority
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileIndex
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priority
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *     responses:
 *       200:
 *         description: File priority set successfully
 *       404:
 *         description: File not found
 */
router.put('/:hash/files/:fileIndex/priority', validateRequest(fileActionSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const { priority } = req.body;
    
    const result = await torrentService.setFilePriority(hash, parseInt(fileIndex), priority);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'File priority set successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Set file priority error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/{hash}/files/{fileIndex}/download:
 *   get:
 *     summary: Download specific file
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File download initiated
 *       404:
 *         description: File not found
 */
router.get('/:hash/files/:fileIndex/download', validateRequest(fileActionSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    
    const result = await torrentService.downloadFile(hash, parseInt(fileIndex));
    
    if (result.success) {
      res.json({
        success: true,
        downloadUrl: result.downloadUrl
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Download file error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/search:
 *   get:
 *     summary: Search torrents
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, date, size, seeds]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/search', validateRequest(searchSchema), async (req, res, next) => {
  try {
    const { q, category, sort, page, limit } = req.query;
    
    const result = await torrentService.searchTorrents(q, {
      category,
      sort,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    if (result.success) {
      res.json({
        success: true,
        torrents: result.torrents,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Search torrents error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/popular:
 *   get:
 *     summary: Get popular torrents
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular torrents retrieved successfully
 */
router.get('/popular', async (req, res, next) => {
  try {
    const result = await torrentService.getPopularTorrents();
    
    if (result.success) {
      res.json({
        success: true,
        torrents: result.torrents
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get popular torrents error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/torrents/trending:
 *   get:
 *     summary: Get trending torrents
 *     tags: [Torrents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trending torrents retrieved successfully
 */
router.get('/trending', async (req, res, next) => {
  try {
    const result = await torrentService.getTrendingTorrents();
    
    if (result.success) {
      res.json({
        success: true,
        torrents: result.torrents
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get trending torrents error:', error);
    next(error);
  }
});

module.exports = router;
