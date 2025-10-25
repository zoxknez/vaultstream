/**
 * Streaming Routes
 *
 * Routes for streaming and downloading torrent files.
 *
 * Endpoints:
 * - HEAD /:identifier/files/:fileIdx/stream - Get stream metadata
 * - GET /:identifier/files/:fileIdx/stream - Stream file (with range support)
 * - GET /:identifier/files/:fileIdx/download - Download file (with resume)
 *
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import { NextFunction, Request, Response, Router } from 'express';
import * as streamingController from './streaming.controller';

const createAuthMiddleware = require('../../middleware/auth');
const { streamingRateLimiter } = require('../../middleware/rateLimiting');
const { config } = require('../../config');

// Create auth middleware instance
const requireAuth = createAuthMiddleware();

// Create configured rate limiter
const streamingLimiter = streamingRateLimiter(config.env);

export const streamingRouter = Router({ mergeParams: true });

/**
 * HEAD /:identifier/files/:fileIdx/stream
 *
 * Get stream metadata (ETag, Content-Length, Accept-Ranges)
 * Used by media players to determine file size and range support
 */
streamingRouter.head(
  '/:identifier/files/:fileIdx/stream',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await streamingController.headStream(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /:identifier/files/:fileIdx/stream
 *
 * Stream file with range request support (HTTP 206 Partial Content)
 * Handles:
 * - Initial playback (bytes=0-)
 * - Seeking (bytes=12345-)
 * - Explicit ranges (bytes=0-1023)
 *
 * Rate limited to prevent abuse
 */
streamingRouter.get(
  '/:identifier/files/:fileIdx/stream',
  streamingLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await streamingController.stream(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /:identifier/files/:fileIdx/download
 *
 * Download file with resume capability (Content-Disposition: attachment)
 * Supports range requests for interrupted downloads
 */
streamingRouter.get(
  '/:identifier/files/:fileIdx/download',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await streamingController.download(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// CommonJS compatibility
module.exports = { streamingRouter };
