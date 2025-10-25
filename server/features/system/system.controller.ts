/**
 * System Controller
 * 
 * Handles system health, disk usage, and memory monitoring endpoints.
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import type { Request, Response } from 'express';
import { InternalServerError } from '../../core/httpErrors';
import * as systemService from './system.service';

/**
 * GET /health - System health check
 * 
 * Returns:
 * - Uptime and boot timestamp
 * - Disk usage
 * - Rate limiting stats
 * - Build metadata
 */
export async function health(_req: Request, res: Response): Promise<void> {
  const healthData = await systemService.getHealthStatus();
  
  if (!healthData) {
    throw new InternalServerError('Unable to compute health status');
  }

  res.json(healthData);
}

/**
 * GET /disk - Disk usage information
 * 
 * Returns:
 * - Total, used, available space
 * - Usage percentage
 * - Mount point
 */
export async function disk(_req: Request, res: Response): Promise<void> {
  const diskInfo = await systemService.getDiskInfo();
  
  if (!diskInfo) {
    throw new InternalServerError('Unable to retrieve disk information');
  }

  res.json({
    success: true,
    data: diskInfo
  });
}

/**
 * GET /memory/stats - Memory usage statistics
 * 
 * Returns:
 * - Heap used, total, limit
 * - RSS, external memory
 * - GC statistics
 */
export async function memoryStats(_req: Request, res: Response): Promise<void> {
  const stats = systemService.getMemoryStats();
  
  if (!stats) {
    throw new InternalServerError('Unable to retrieve memory statistics');
  }

  res.json({
    success: true,
    data: stats
  });
}

/**
 * GET /memory/heap - Heap snapshot
 * 
 * Returns:
 * - Detailed heap usage breakdown
 * - Object counts
 * - Memory distribution
 */
export async function heapSnapshot(_req: Request, res: Response): Promise<void> {
  const snapshot = systemService.getHeapSnapshot();
  
  if (!snapshot) {
    throw new InternalServerError('Unable to retrieve heap snapshot');
  }

  res.json({
    success: true,
    data: snapshot
  });
}
