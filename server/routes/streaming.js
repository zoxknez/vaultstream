/**
 * 🎬 STREAMVAULT STREAMING ROUTES
 * Video streaming and playback endpoints
 */

const express = require('express');
const { z } = require('zod');
const { logger } = require('../utils/logger');
const { streamService } = require('../services/streamService');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const streamSchema = z.object({
  params: z.object({
    hash: z.string().min(1, 'Torrent hash is required'),
    fileIndex: z.string().regex(/^\d+$/, 'File index must be a number')
  })
});

const seekSchema = z.object({
  params: z.object({
    hash: z.string().min(1, 'Torrent hash is required'),
    fileIndex: z.string().regex(/^\d+$/, 'File index must be a number')
  }),
  query: z.object({
    time: z.string().regex(/^\d+$/, 'Time must be a number')
  })
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}:
 *   get:
 *     summary: Stream video file
 *     tags: [Streaming]
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
 *         description: Video stream started
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
router.get('/:hash/:fileIndex', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.createStream(hash, fileIndexNum);
    
    if (result.success) {
      // Set appropriate headers for video streaming
      res.set({
        'Content-Type': result.contentType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      
      // Handle range requests for video seeking
      const range = req.headers.range;
      if (range) {
        const result = await streamService.handleRangeRequest(hash, fileIndexNum, range);
        if (result.success) {
          res.status(206).set({
            'Content-Range': result.contentRange,
            'Content-Length': result.contentLength
          });
          result.stream.pipe(res);
        } else {
          res.status(416).json({
            success: false,
            error: 'Range not satisfiable'
          });
        }
      } else {
        result.stream.pipe(res);
      }
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Stream video error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/info:
 *   get:
 *     summary: Get stream information
 *     tags: [Streaming]
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
 *         description: Stream information retrieved successfully
 *       404:
 *         description: File not found
 */
router.get('/:hash/:fileIndex/info', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.getStreamInfo(hash, fileIndexNum);
    
    if (result.success) {
      res.json({
        success: true,
        info: result.info
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get stream info error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/stats:
 *   get:
 *     summary: Get stream statistics
 *     tags: [Streaming]
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
 *         description: Stream statistics retrieved successfully
 *       404:
 *         description: File not found
 */
router.get('/:hash/:fileIndex/stats', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.getStreamStats(hash, fileIndexNum);
    
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
    logger.error('Get stream stats error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/seek:
 *   post:
 *     summary: Seek to specific time in video
 *     tags: [Streaming]
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
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Seek successful
 *       400:
 *         description: Invalid time
 */
router.post('/:hash/:fileIndex/seek', validateRequest(seekSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const { time } = req.query;
    const fileIndexNum = parseInt(fileIndex);
    const timeNum = parseInt(time);
    
    const result = await streamService.seekToTime(hash, fileIndexNum, timeNum);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Seek successful',
        newTime: result.newTime
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Seek error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/subtitles:
 *   get:
 *     summary: Get available subtitles
 *     tags: [Streaming]
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
 *         description: Subtitles retrieved successfully
 *       404:
 *         description: File not found
 */
router.get('/:hash/:fileIndex/subtitles', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.getSubtitles(hash, fileIndexNum);
    
    if (result.success) {
      res.json({
        success: true,
        subtitles: result.subtitles
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get subtitles error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/subtitles/{subtitleIndex}:
 *   get:
 *     summary: Get specific subtitle file
 *     tags: [Streaming]
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
 *       - in: path
 *         name: subtitleIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subtitle file retrieved successfully
 *       404:
 *         description: Subtitle not found
 */
router.get('/:hash/:fileIndex/subtitles/:subtitleIndex', async (req, res, next) => {
  try {
    const { hash, fileIndex, subtitleIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    const subtitleIndexNum = parseInt(subtitleIndex);
    
    const result = await streamService.getSubtitleFile(hash, fileIndexNum, subtitleIndexNum);
    
    if (result.success) {
      res.set({
        'Content-Type': 'text/vtt',
        'Cache-Control': 'public, max-age=3600'
      });
      res.send(result.subtitleContent);
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get subtitle file error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/progress:
 *   post:
 *     summary: Save playback progress
 *     tags: [Streaming]
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
 *               - currentTime
 *               - duration
 *             properties:
 *               currentTime:
 *                 type: number
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Progress saved successfully
 */
router.post('/:hash/:fileIndex/progress', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const { currentTime, duration } = req.body;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.saveProgress(hash, fileIndexNum, {
      currentTime,
      duration,
      userId: req.user.id
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Progress saved successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Save progress error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/stream/{hash}/{fileIndex}/progress:
 *   get:
 *     summary: Get playback progress
 *     tags: [Streaming]
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
 *         description: Progress retrieved successfully
 */
router.get('/:hash/:fileIndex/progress', validateRequest(streamSchema), async (req, res, next) => {
  try {
    const { hash, fileIndex } = req.params;
    const fileIndexNum = parseInt(fileIndex);
    
    const result = await streamService.getProgress(hash, fileIndexNum, req.user.id);
    
    if (result.success) {
      res.json({
        success: true,
        progress: result.progress
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get progress error:', error);
    next(error);
  }
});

module.exports = router;
