/**
 * Cache Service
 * 
 * Business logic for cache management:
 * - Cache statistics aggregation
 * - Old file cleanup (by age)
 * - Full cache clearing (files + torrents)
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

const { getCacheStats: getStats, clearOldCacheFiles: clearOld, CACHE_DIRECTORIES } = require('../../services/cacheService');
const { cacheRegistry } = require('../../lib/cacheRegistry');
const { formatBytes } = require('../../utils/formatBytes');

const torrentService = require('../../services/torrentService');

interface CacheStats {
  totalSize: number;
  totalFiles: number;
  directories: any[];
  cacheDirectories: string[];
}

interface ClearOldResult {
  deletedFiles: number;
  freedSpace: number;
  freedFormatted: string;
  cacheDirectories: string[];
}

interface ClearAllResult {
  success: boolean;
  message: string;
  clearedTorrents: number;
  failedTorrents: number;
  torrentFreedBytes: number;
  torrentFreedFormatted: string;
  cacheCleanup: {
    deletedFiles: number;
    freedSpace: number;
    freedFormatted: string;
  };
  cacheDirectories: string[];
}

/**
 * Get cache statistics
 * 
 * Returns:
 * - Total cache size (bytes)
 * - Total file count
 * - Per-directory breakdown
 */
export function getCacheStats(): CacheStats | null {
  try {
    const stats = getStats();
    return stats;
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

/**
 * Clear old cache files
 * 
 * @param days - Files older than N days will be deleted
 */
export function clearOldCacheFiles(days: number): ClearOldResult | null {
  try {
    const result = clearOld({ days });

    return {
      deletedFiles: result.deletedFiles || 0,
      freedSpace: result.freedSpace || 0,
      freedFormatted: formatBytes(result.freedSpace || 0),
      cacheDirectories: CACHE_DIRECTORIES
    };
  } catch (error: any) {
    console.error('Error clearing old cache files:', error);
    return null;
  }
}

/**
 * Clear all caches
 * 
 * Operations:
 * 1. Remove all active torrents
 * 2. Clear torrent caches (LRU via cacheRegistry)
 * 3. Delete all cache files (days=0)
 * 
 * Returns detailed breakdown of cleared items
 */
export async function clearAllCaches(): Promise<ClearAllResult | null> {
  try {
    // 1. Remove all active torrents
    const activeTorrents = torrentService.getActiveTorrentInstances();
    const removalResults = await Promise.all(
      activeTorrents.map((torrent: any) => torrentService.removeTorrentInstance(torrent))
    );

    const successful = removalResults.filter((result: any) => result.success);
    const failed = removalResults.filter((result: any) => !result.success);
    const torrentsFreedBytes = successful.reduce(
      (sum: number, result: any) => sum + (result.freedSpace || 0),
      0
    );

    // 2. Clear torrent caches (LRU)
    cacheRegistry.clearAll();
    
    // Update metrics
    if (torrentService.updateActiveTorrentMetric) {
      torrentService.updateActiveTorrentMetric();
    }

    // 3. Clear all cache files
    const cacheCleanup = clearOld({ days: 0 });

    // Build response message
    const messageParts: string[] = [];

    if (successful.length > 0) {
      messageParts.push(`Removed ${successful.length} torrent${successful.length === 1 ? '' : 's'}.`);
    }
    if (failed.length > 0) {
      const uniqueFailures = new Set(
        failed.map((failure: any) => failure.infoHash || failure.torrentName || 'unknown-torrent')
      );
      messageParts.push(`Failed to remove ${uniqueFailures.size} torrent${uniqueFailures.size === 1 ? '' : 's'}.`);
    }
    if ((cacheCleanup?.deletedFiles || 0) > 0) {
      messageParts.push(`Deleted ${cacheCleanup.deletedFiles} cache file${cacheCleanup.deletedFiles === 1 ? '' : 's'}.`);
    }

    return {
      success: failed.length === 0,
      message: messageParts.join(' ') || 'Cache cleared.',
      clearedTorrents: successful.length,
      failedTorrents: failed.length,
      torrentFreedBytes: torrentsFreedBytes,
      torrentFreedFormatted: formatBytes(torrentsFreedBytes),
      cacheCleanup: {
        deletedFiles: cacheCleanup?.deletedFiles || 0,
        freedSpace: cacheCleanup?.freedSpace || 0,
        freedFormatted: formatBytes(cacheCleanup?.freedSpace || 0)
      },
      cacheDirectories: CACHE_DIRECTORIES
    };
  } catch (error: any) {
    console.error('Error clearing caches:', error);
    return null;
  }
}
