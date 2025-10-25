/**
 * Memory & Resource Management Service - TypeScript Migration
 * 
 * Provides comprehensive memory monitoring, leak detection, and resource management.
 */

import * as logger from '../utils/logger';
import { logAuditEvent, AUDIT_EVENT_TYPES, SEVERITY_LEVELS } from './auditService';
import type { MemoryStats, MemoryThresholds } from '../types/monitoring';

// ===== CONFIGURATION =====

const MEMORY_THRESHOLDS: MemoryThresholds = {
  WARNING: 512,      // Warn at 512MB
  CRITICAL: 1024,    // Critical at 1GB
  FORCE_GC: 768,     // Force GC at 768MB
  MAX_HEAP: 1536     // Maximum heap size (1.5GB)
};

// ===== STATE =====

interface MemoryMeasurement {
  timestamp: number;
  heapUsed: number;
  rss: number;
}

interface MemoryState {
  lastCheck: number;
  measurements: MemoryMeasurement[];
  maxMeasurements: number;
  leakDetected: boolean;
  gcTriggered: number;
  warnings: number;
  criticalEvents: number;
  baseline: number | null;
  peakUsage: number;
}

interface ResourceTracking {
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  peakConnections: number;
  torrents: {
    active: number;
    total: number;
    stalled: number;
  };
}

const memoryState: MemoryState = {
  lastCheck: Date.now(),
  measurements: [],
  maxMeasurements: 100,
  leakDetected: false,
  gcTriggered: 0,
  warnings: 0,
  criticalEvents: 0,
  baseline: null,
  peakUsage: 0
};

const resourceTracking: ResourceTracking = {
  activeConnections: 0,
  totalRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
  peakConnections: 0,
  torrents: {
    active: 0,
    total: 0,
    stalled: 0
  }
};

let monitoringInterval: NodeJS.Timeout | null = null;

// ===== CORE FUNCTIONS =====

export function getMemoryUsage(): MemoryStats {
  const usage = process.memoryUsage();
  
  const heapUsed = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(usage.heapTotal / 1024 / 1024);
  const rss = Math.round(usage.rss / 1024 / 1024);
  
  return {
    heap: {
      used: heapUsed,
      total: heapTotal,
      limit: MEMORY_THRESHOLDS.MAX_HEAP,
      percentage: Math.round((heapUsed / MEMORY_THRESHOLDS.MAX_HEAP) * 100)
    },
    rss,
    external: Math.round(usage.external / 1024 / 1024),
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024),
    timestamp: new Date().toISOString(),
    formattedHeapUsed: `${heapUsed}MB`,
    formattedRSS: `${rss}MB`
  };
}

function recordMeasurement(usage: { heapUsed: number; rss: number }): void {
  const timestamp = Date.now();
  
  memoryState.measurements.push({
    timestamp,
    heapUsed: usage.heapUsed,
    rss: usage.rss
  });

  if (memoryState.measurements.length > memoryState.maxMeasurements) {
    memoryState.measurements.shift();
  }

  if (usage.rss > memoryState.peakUsage) {
    memoryState.peakUsage = usage.rss;
  }

  if (!memoryState.baseline) {
    memoryState.baseline = usage.rss;
  }
}

function detectMemoryLeak(): boolean {
  if (memoryState.measurements.length < 10) {
    return false;
  }

  const recent = memoryState.measurements.slice(-10);
  const trend = recent.reduce((sum, m, i) => {
    if (i === 0) return sum;
    return sum + (m.rss - recent[i - 1].rss);
  }, 0);

  const avgIncrease = trend / 9;
  const isLeak = avgIncrease > 50; // 50MB+ consistent growth

  if (isLeak && !memoryState.leakDetected) {
    memoryState.leakDetected = true;
    logger.error('🚨 Memory leak detected!', {
      avgIncrease: `${avgIncrease.toFixed(2)}MB per check`,
      currentRSS: `${recent[recent.length - 1].rss}MB`,
      baseline: `${memoryState.baseline}MB`
    });

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.SYSTEM_ERROR,
      severity: SEVERITY_LEVELS.CRITICAL,
      details: {
        type: 'memory_leak',
        avgIncrease,
        currentRSS: recent[recent.length - 1].rss
      }
    });
  }

  return isLeak;
}

export function forceGarbageCollection(): void {
  if (global.gc) {
    const before = getMemoryUsage();
    global.gc();
    const after = getMemoryUsage();
    
    memoryState.gcTriggered++;
    
    logger.info('🗑️  Forced garbage collection', {
      before: `${before.heap.used}MB`,
      after: `${after.heap.used}MB`,
      freed: `${before.heap.used - after.heap.used}MB`
    });
  } else {
    logger.warn('⚠️  Garbage collection not exposed (run with --expose-gc)');
  }
}

function checkMemoryPressure(): void {
  const usage = getMemoryUsage();
  const heapUsed = usage.heap.used;

  recordMeasurement({ heapUsed, rss: usage.rss });

  if (heapUsed >= MEMORY_THRESHOLDS.CRITICAL) {
    memoryState.criticalEvents++;
    logger.error('🔴 CRITICAL memory usage', {
      heapUsed: `${heapUsed}MB`,
      threshold: `${MEMORY_THRESHOLDS.CRITICAL}MB`
    });

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.SYSTEM_ERROR,
      severity: SEVERITY_LEVELS.CRITICAL,
      details: { type: 'critical_memory', heapUsed, threshold: MEMORY_THRESHOLDS.CRITICAL }
    });

    forceGarbageCollection();
  } else if (heapUsed >= MEMORY_THRESHOLDS.FORCE_GC) {
    forceGarbageCollection();
  } else if (heapUsed >= MEMORY_THRESHOLDS.WARNING) {
    memoryState.warnings++;
    logger.warn('⚠️  High memory usage', {
      heapUsed: `${heapUsed}MB`,
      threshold: `${MEMORY_THRESHOLDS.WARNING}MB`
    });
  }

  detectMemoryLeak();
  memoryState.lastCheck = Date.now();
}

export function startMonitoring(intervalSeconds: number = 60): void {
  if (monitoringInterval) {
    logger.warn('⚠️  Memory monitoring already started');
    return;
  }

  logger.info('📊 Starting memory monitoring', {
    interval: `${intervalSeconds}s`,
    thresholds: MEMORY_THRESHOLDS
  });

  monitoringInterval = setInterval(() => {
    checkMemoryPressure();
  }, intervalSeconds * 1000);

  checkMemoryPressure();
}

export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('⏹️  Memory monitoring stopped');
  }
}

export function getMemoryStats(): any {
  const usage = getMemoryUsage();
  
  return {
    current: usage,
    baseline: memoryState.baseline,
    peak: memoryState.peakUsage,
    measurements: memoryState.measurements.length,
    leakDetected: memoryState.leakDetected,
    gcTriggered: memoryState.gcTriggered,
    warnings: memoryState.warnings,
    criticalEvents: memoryState.criticalEvents,
    thresholds: MEMORY_THRESHOLDS
  };
}

export function trackConnection(delta: number = 1): void {
  resourceTracking.activeConnections += delta;
  if (resourceTracking.activeConnections > resourceTracking.peakConnections) {
    resourceTracking.peakConnections = resourceTracking.activeConnections;
  }
}

export function trackRequest(success: boolean, responseTime: number): void {
  resourceTracking.totalRequests++;
  if (!success) {
    resourceTracking.failedRequests++;
  }
  
  const totalTime = resourceTracking.avgResponseTime * (resourceTracking.totalRequests - 1) + responseTime;
  resourceTracking.avgResponseTime = Math.round(totalTime / resourceTracking.totalRequests);
}

export function updateTorrentTracking(active: number, total: number, stalled: number = 0): void {
  resourceTracking.torrents.active = active;
  resourceTracking.torrents.total = total;
  resourceTracking.torrents.stalled = stalled;
}

export function getHeapSnapshot(): any {
  if (typeof (global as any).v8 !== 'undefined') {
    const v8 = require('v8');
    return v8.writeHeapSnapshot();
  }
  
  logger.warn('⚠️  v8 heap snapshot not available');
  return null;
}

// CommonJS compatibility
module.exports = {
  startMonitoring,
  stopMonitoring,
  getMemoryStats,
  getMemoryUsage,
  forceGarbageCollection,
  trackConnection,
  trackRequest,
  updateTorrentTracking,
  getHeapSnapshot
};
