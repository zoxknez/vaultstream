/**
 * Audit Logging Service - TypeScript Migration (Simplified)
 * 
 * GDPR-compliant audit logging for security events and admin actions
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as logger from '../utils/logger';

// ===== CONFIGURATION =====

const AUDIT_LOG_DIR = path.join(__dirname, '..', 'logs', 'audit');

if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
  logger.info('📁 Created audit log directory');
}

// ===== CONSTANTS =====

export const AUDIT_EVENT_TYPES = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',
  AUTH_INVALID_TOKEN: 'auth.invalid_token',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
  RATE_LIMIT_WARNING: 'rate_limit.warning',
  SUSPICIOUS_MULTIPLE_FAILURES: 'suspicious.multiple_failures',
  SUSPICIOUS_IP_CHANGE: 'suspicious.ip_change',
  SUSPICIOUS_UNUSUAL_PATTERN: 'suspicious.unusual_pattern',
  TORRENT_UPLOAD: 'admin.torrent.upload',
  TORRENT_DELETE: 'admin.torrent.delete',
  CACHE_CLEAR: 'admin.cache.clear',
  CONFIG_CHANGE: 'admin.config.change',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning'
} as const;

export const SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

// ===== TYPES =====

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  severity: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  anonymized?: boolean;
}

interface AuditLogParams {
  eventType: string;
  severity?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

// ===== HELPERS =====

function getAuditLogFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return path.join(AUDIT_LOG_DIR, `audit-${year}-${month}-${day}.jsonl`);
}

export function anonymizeData(data: any): any {
  if (!data) return data;
  
  const anonymized = { ...data };
  
  // Anonymize sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
  sensitiveFields.forEach(field => {
    if (anonymized[field]) {
      anonymized[field] = '[REDACTED]';
    }
  });
  
  // Hash IP addresses
  if (anonymized.ip) {
    anonymized.ip = crypto.createHash('sha256').update(anonymized.ip).digest('hex').substring(0, 12);
  }
  
  return anonymized;
}

function createAuditEntry(params: AuditLogParams): AuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: params.eventType,
    severity: params.severity || SEVERITY_LEVELS.INFO,
    userId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    details: params.details
  };
}

// ===== PUBLIC API =====

export function logAuditEvent(params: AuditLogParams): void {
  try {
    const entry = createAuditEntry(params);
    const filename = getAuditLogFilename();
    const line = JSON.stringify(entry) + '\n';
    
    fs.appendFileSync(filename, line, 'utf8');
    
    if (entry.severity === SEVERITY_LEVELS.CRITICAL || entry.severity === SEVERITY_LEVELS.ERROR) {
      logger.error(`Audit: ${entry.eventType}`, entry);
    } else if (entry.severity === SEVERITY_LEVELS.WARNING) {
      logger.warn(`Audit: ${entry.eventType}`, entry);
    }
  } catch (error) {
    logger.error('Failed to write audit log', { error: (error as Error).message });
  }
}

export function logAuthSuccess(userId: string, ip?: string, userAgent?: string): void {
  logAuditEvent({
    eventType: AUDIT_EVENT_TYPES.AUTH_LOGIN_SUCCESS,
    severity: SEVERITY_LEVELS.INFO,
    userId,
    ip,
    userAgent
  });
}

export function logAuthFailure(ip?: string, userAgent?: string, reason?: string): void {
  logAuditEvent({
    eventType: AUDIT_EVENT_TYPES.AUTH_LOGIN_FAILURE,
    severity: SEVERITY_LEVELS.WARNING,
    ip,
    userAgent,
    details: { reason }
  });
}

export function logTorrentAction(action: 'upload' | 'delete', userId?: string, details?: any): void {
  logAuditEvent({
    eventType: action === 'upload' ? AUDIT_EVENT_TYPES.TORRENT_UPLOAD : AUDIT_EVENT_TYPES.TORRENT_DELETE,
    severity: SEVERITY_LEVELS.INFO,
    userId,
    details
  });
}

export function logCacheAction(action: string, details?: any): void {
  logAuditEvent({
    eventType: AUDIT_EVENT_TYPES.CACHE_CLEAR,
    severity: SEVERITY_LEVELS.INFO,
    details: { action, ...details }
  });
}

export function queryAuditLogs(filters: any = {}): AuditEntry[] {
  const results: AuditEntry[] = [];
  const files = fs.readdirSync(AUDIT_LOG_DIR).filter(f => f.endsWith('.jsonl'));
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(AUDIT_LOG_DIR, file), 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          let matches = true;
          if (filters.eventType && entry.eventType !== filters.eventType) matches = false;
          if (filters.severity && entry.severity !== filters.severity) matches = false;
          if (filters.userId && entry.userId !== filters.userId) matches = false;
          
          if (matches) {
            results.push(entry);
          }
        } catch (err) {
          // Skip invalid lines
        }
      });
    } catch (err) {
      logger.warn(`Failed to read audit log ${file}`, { error: (err as Error).message });
    }
  });
  
  return results.slice(-100); // Return last 100
}

export function getAuditStats(): any {
  const files = fs.readdirSync(AUDIT_LOG_DIR).filter(f => f.endsWith('.jsonl'));
  let totalEvents = 0;
  const eventTypes: Record<string, number> = {};
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(AUDIT_LOG_DIR, file), 'utf8');
      const lines = content.split('\n').filter(Boolean);
      totalEvents += lines.length;
      
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          eventTypes[entry.eventType] = (eventTypes[entry.eventType] || 0) + 1;
        } catch (err) {
          // Skip
        }
      });
    } catch (err) {
      // Skip
    }
  });
  
  return {
    totalFiles: files.length,
    totalEvents,
    eventTypes,
    directory: AUDIT_LOG_DIR
  };
}

export function cleanOldAuditLogs(retentionDays: number = 90): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const files = fs.readdirSync(AUDIT_LOG_DIR).filter(f => f.endsWith('.jsonl'));
  let deletedCount = 0;
  
  files.forEach(file => {
    const match = file.match(/audit-(\d{4})-(\d{2})-(\d{2})\.jsonl/);
    if (match) {
      const fileDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
      if (fileDate < cutoffDate) {
        fs.unlinkSync(path.join(AUDIT_LOG_DIR, file));
        deletedCount++;
      }
    }
  });
  
  logger.info(`🧹 Cleaned ${deletedCount} old audit log files (retention: ${retentionDays} days)`);
}

// CommonJS compatibility
module.exports = {
  AUDIT_EVENT_TYPES,
  SEVERITY_LEVELS,
  logAuditEvent,
  logAuthSuccess,
  logAuthFailure,
  logTorrentAction,
  logCacheAction,
  queryAuditLogs,
  getAuditStats,
  cleanOldAuditLogs
};
