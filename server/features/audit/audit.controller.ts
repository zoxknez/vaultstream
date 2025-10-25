/**
 * Audit Controller
 * 
 * Handles audit logging endpoints:
 * - Query audit logs with filters
 * - Get audit statistics
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { InternalServerError } from '../../core/httpErrors';
import * as auditService from './audit.service';

// Validation Schemas
const auditQuerySchema = z.object({
  eventType: z.string().optional(),
  username: z.string().optional(),
  ipAddress: z.string().optional(),
  severity: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional()
});

/**
 * GET /logs - Query audit logs
 * 
 * Query params:
 * - eventType: Filter by event type (e.g., 'login', 'upload')
 * - username: Filter by username
 * - ipAddress: Filter by IP address
 * - severity: Filter by severity level
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - success: Filter by success status ('true' or 'false')
 * - limit: Maximum number of results (default: 100)
 * 
 * Returns:
 * - logs: Array of audit log entries
 * - total: Total number of results
 * - filters: Applied filters
 */
export async function logs(req: Request, res: Response): Promise<void> {
  const query = auditQuerySchema.parse(req.query);
  
  const filters = {
    eventType: query.eventType,
    username: query.username,
    ipAddress: query.ipAddress,
    severity: query.severity,
    startDate: query.startDate,
    endDate: query.endDate,
    success: query.success === 'true' ? true : query.success === 'false' ? false : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : 100
  };

  const result = auditService.queryAuditLogs(filters);
  
  if (!result) {
    throw new InternalServerError('Failed to retrieve audit logs');
  }

  res.json({
    success: true,
    data: {
      logs: result,
      total: result.length,
      filters
    }
  });
}

/**
 * GET /stats - Get audit statistics
 * 
 * Returns:
 * - Total log count
 * - Event type breakdown
 * - Success/failure rates
 * - Recent activity
 */
export async function stats(_req: Request, res: Response): Promise<void> {
  const auditStats = auditService.getAuditStats();
  
  if (!auditStats) {
    throw new InternalServerError('Failed to retrieve audit statistics');
  }

  res.json({
    success: true,
    data: auditStats
  });
}
