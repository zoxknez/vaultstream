/**
 * System Service
 * 
 * Business logic for system monitoring:
 * - Health status aggregation
 * - Disk usage (Windows/Linux compatible)
 * - Memory statistics
 * - Heap snapshots
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

const { getDiskUsage, FALLBACK_DISK_USAGE } = require('../../services/systemService');
const { getMemoryStats, getHeapSnapshot } = require('../../services/systemService');
const { getRateLimitStats } = require('../../middleware/requestLimiter');

interface HealthStatus {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  startedAt: string;
  disk: any;
  rateLimiting: any;
  build: any;
}

interface DiskInfo {
  total: number;
  used: number;
  available: number;
  percentUsed: number;
  mount: string;
}

// Server boot timestamp (set once at startup)
let serverBootTimestamp: string = new Date().toISOString();

// Build metadata (set once at startup)
let buildMetadata: any = {
  version: process.env.npm_package_version || '2.1.0',
  node: process.version,
  environment: process.env.NODE_ENV || 'development'
};

/**
 * Initialize server metadata
 * Should be called once at app startup
 */
export function initializeServerMetadata(timestamp: string, metadata: any): void {
  serverBootTimestamp = timestamp;
  buildMetadata = metadata;
}

/**
 * Get comprehensive health status
 * 
 * Aggregates:
 * - Uptime and boot time
 * - Disk usage
 * - Rate limiting stats
 * - Build metadata
 */
export async function getHealthStatus(): Promise<HealthStatus | null> {
  try {
    const diskInfo = await getDiskUsage({ log: false }).catch(() => ({ ...FALLBACK_DISK_USAGE }));
    const rateLimitStats = getRateLimitStats();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: serverBootTimestamp,
      disk: diskInfo,
      rateLimiting: rateLimitStats,
      build: { ...buildMetadata }
    };
  } catch (error: any) {
    console.error('Health check failed:', error);
    return null;
  }
}

/**
 * Get disk usage information
 * 
 * Supports:
 * - Windows (wmic, fsutil)
 * - Linux (df)
 * - Fallback to default values
 */
export async function getDiskInfo(): Promise<DiskInfo | null> {
  try {
    const diskInfo = await getDiskUsage({ log: false }).catch(() => ({ ...FALLBACK_DISK_USAGE }));
    return diskInfo;
  } catch (error: any) {
    console.error('Failed to get disk info:', error);
    return null;
  }
}

/**
 * Export memory stats function
 * (Re-export from systemService)
 */
export { getMemoryStats, getHeapSnapshot };
