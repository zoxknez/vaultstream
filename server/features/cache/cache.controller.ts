/**
 * Cache Controller
 * 
 * Handles cache management endpoints:
 * - Get cache statistics
 * - Clear old cache files
 * - Clear all caches (files + torrents)
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { BadRequestError, InternalServerError } from '../../core/httpErrors';
import * as cacheService from './cache.service';

const metrics = require('../../services/metricsService');
const { config } = require('../../config');

// Validation Schemas
const clearOldSchema = z.object({
  days: z.number().min(0).max(365).optional()
});

/**
 * GET /stats - Cache statistics
 * 
 * Returns:
 * - Total cache size
 * - File counts per directory
 * - Cache directories list
 */
export async function stats(_req: Request, res: Response): Promise<void> {
  const stats = cacheService.getCacheStats();
  
  if (!stats) {
    throw new InternalServerError('Failed to get cache stats');
  }

  res.json(stats);
}

/**
 * POST /clear-old - Clear old cache files
 * 
 * Body:
 * - days: number (default: 7) - Files older than N days
 * 
 * Returns:
 * - deletedFiles: number
 * - freedSpace: number
 * - cacheDirectories: string[]
 */
export async function clearOld(req: Request, res: Response): Promise<void> {
  const body = clearOldSchema.parse(req.body);
  const days = body.days ?? 7;

  if (days < 0) {
    throw new BadRequestError('Days must be a positive number');
  }

  const result = cacheService.clearOldCacheFiles(days);
  
  if (!result) {
    throw new InternalServerError('Failed to clear old cache files');
  }

  res.json({
    success: true,
    ...result
  });
}

/**
 * POST /clear - Clear all caches
 * 
 * Operations:
 * 1. Remove all active torrents
 * 2. Clear torrent caches (LRU)
 * 3. Delete all cache files
 * 
 * Returns:
 * - clearedTorrents: number
 * - failedTorrents: number
 * - torrentFreedBytes: number
 * - cacheCleanup: { deletedFiles, freedSpace }
 */
export async function clearAll(req: Request, res: Response): Promise<void> {
  if (config.metrics.enabled) {
    metrics.trackRequestDuration(req, res, '/api/v2/cache/clear');
  }

  const result = await cacheService.clearAllCaches();
  
  if (!result) {
    throw new InternalServerError('Failed to clear caches');
  }

  res.json(result);
}
