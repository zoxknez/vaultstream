/**
 * Audit Service
 * 
 * Business logic for audit logging:
 * - Query logs with filters
 * - Get audit statistics
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

const { queryAuditLogs: query, getAuditStats: getStats } = require('../../services/auditService');

interface AuditFilters {
  eventType?: string;
  username?: string;
  ipAddress?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  username?: string;
  ipAddress?: string;
  severity: string;
  success: boolean;
  details?: any;
}

interface AuditStats {
  totalLogs: number;
  eventTypes: Record<string, number>;
  successRate: number;
  recentActivity: AuditLog[];
}

/**
 * Query audit logs with filters
 * 
 * @param filters - Filter criteria
 * @returns Array of matching audit log entries
 */
export function queryAuditLogs(filters: AuditFilters): AuditLog[] | null {
  try {
    const logs = query(filters);
    return logs;
  } catch (error: any) {
    console.error('Failed to query audit logs:', error);
    return null;
  }
}

/**
 * Get audit statistics
 * 
 * Returns:
 * - Total log count
 * - Event type breakdown
 * - Success/failure rates
 * - Recent activity
 */
export function getAuditStats(): AuditStats | null {
  try {
    const stats = getStats();
    return stats;
  } catch (error: any) {
    console.error('Failed to get audit stats:', error);
    return null;
  }
}
