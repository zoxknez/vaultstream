/**
 * Cache Service - TypeScript Migration
 * 
 * Manages cache directories, statistics, and cleanup for WebTorrent data.
 * Tracks cache usage, file counts, and provides cleanup functionality.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { getClient } from './webTorrentClient';
import { formatBytes } from '../utils/formatBytes';

// ===== TYPES =====

interface DirectorySummary {
  path: string;
  exists: boolean;
  fileCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  lastModifiedISO: string | null;
}

interface CacheStats {
  totalSizeFormatted: string;
  totalSize: number;
  activeTorrents: number;
  cacheSize: number;
  downloadedBytes: number;
  totalTorrentSize: number;
  totalTorrentSizeFormatted: string;
  cacheLimit: number;
  cacheLimitFormatted: string;
  usagePercentage: number;
  fileCount: number;
  directories: DirectorySummary[];
  lastUpdated: string;
}

interface CacheStatsOptions {
  log?: boolean;
  includeDirectories?: boolean;
}

interface ClearCacheOptions {
  days?: number;
  log?: boolean;
}

interface ClearCacheResult {
  deletedFiles: number;
  deletedSize: number;
  deletedSizeFormatted: string;
  freedSpace: number;
  freedSpaceFormatted: string;
  days: number;
}

// ===== CONSTANTS =====

export const CACHE_DIRECTORIES: string[] = Array.from(
  new Set(
    [
      path.join(os.tmpdir(), 'webtorrent'),
      path.join(os.homedir(), '.webtorrent'),
      path.join(os.homedir(), 'Library', 'Caches', 'webtorrent'),
      path.join(__dirname, '..', 'uploads'),
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'server', 'uploads'),
      process.env.DOWNLOAD_PATH ? path.resolve(process.env.DOWNLOAD_PATH) : null
    ].filter(Boolean) as string[]
  )
);

const CACHE_LIMIT_BYTES: number = Number.parseInt(process.env.CACHE_LIMIT_BYTES || '0', 10) > 0
  ? Number.parseInt(process.env.CACHE_LIMIT_BYTES || '0', 10)
  : 5 * 1024 * 1024 * 1024; // 5GB default

// ===== HELPER FUNCTIONS =====

const summarizeDirectory = (dirPath: string, visited: Set<string>, log: boolean): DirectorySummary => {
  const normalized = path.normalize(dirPath);
  const summary: DirectorySummary = {
    path: normalized,
    exists: false,
    fileCount: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B',
    lastModifiedISO: null
  };

  if (!normalized || visited.has(normalized)) {
    return summary;
  }

  visited.add(normalized);

  if (!fs.existsSync(normalized)) {
    return summary;
  }

  summary.exists = true;

  const stack: string[] = [normalized];
  let latestModified = 0;

  while (stack.length) {
    const current = stack.pop()!;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      if (log) {
        console.warn(`⚠️  Failed to inspect cache directory ${current}: ${(error as Error).message}`);
      }
      continue;
    }

    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);

      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          if (!visited.has(fullPath)) {
            visited.add(fullPath);
            stack.push(fullPath);
          }
        } else {
          summary.fileCount += 1;
          summary.totalSize += stats.size;
          if (stats.mtimeMs && stats.mtimeMs > latestModified) {
            latestModified = stats.mtimeMs;
          }
        }
      } catch (error) {
        if (log) {
          console.warn(`⚠️  Failed to process ${fullPath}: ${(error as Error).message}`);
        }
      }
    });
  }

  summary.totalSizeFormatted = formatBytes(summary.totalSize);
  summary.lastModifiedISO = latestModified ? new Date(latestModified).toISOString() : null;

  return summary;
};

const buildDirectorySummaries = (includeDirectories: boolean, log: boolean): DirectorySummary[] => {
  if (!includeDirectories) {
    return [];
  }

  const visited = new Set<string>();
  return CACHE_DIRECTORIES.map((dirPath) => summarizeDirectory(dirPath, visited, log));
};

// ===== PUBLIC API =====

export const getCacheStats = (options: CacheStatsOptions = {}): CacheStats => {
  const { log = true, includeDirectories = true } = options;
  
  const client = getClient();
  const torrents = Array.isArray(client?.torrents) ? client.torrents : [];
  const activeTorrents = torrents.length;

  let torrentBytes = 0;
  let downloadedBytes = 0;
  let torrentFileCount = 0;

  torrents.forEach((torrent: any) => {
    torrentBytes += Number(torrent.length) || 0;
    downloadedBytes += Number(torrent.downloaded) || 0;

    if (Array.isArray(torrent.files)) {
      torrentFileCount += torrent.files.length;
    }
  });

  const directories = buildDirectorySummaries(includeDirectories, log);
  const directoryBytes = directories.reduce((sum, dir) => sum + (dir.totalSize || 0), 0);
  const directoryFileCount = directories.reduce((sum, dir) => sum + (dir.fileCount || 0), 0);

  const cacheSize = directoryBytes > 0 ? directoryBytes : torrentBytes;
  const usagePercentageRaw = CACHE_LIMIT_BYTES > 0 ? (cacheSize / CACHE_LIMIT_BYTES) * 100 : 0;
  const usagePercentage = Math.round(usagePercentageRaw * 100) / 100;
  const totalSizeFormatted = formatBytes(cacheSize);
  const cacheLimitFormatted = formatBytes(CACHE_LIMIT_BYTES);
  const totalTorrentSize = torrentBytes;
  const totalTorrentSizeFormatted = formatBytes(totalTorrentSize);
  const fileCount = directoryFileCount > 0 ? directoryFileCount : torrentFileCount;
  const lastUpdated = new Date().toISOString();

  if (log) {
    console.log(
      `📊 Cache stats: ${totalSizeFormatted} cached (${activeTorrents} torrents, ${usagePercentageRaw.toFixed(
        1
      )}% of ${cacheLimitFormatted} limit)`
    );
  }

  return {
    totalSizeFormatted,
    totalSize: cacheSize,
    activeTorrents,
    cacheSize,
    downloadedBytes,
    totalTorrentSize,
    totalTorrentSizeFormatted,
    cacheLimit: CACHE_LIMIT_BYTES,
    cacheLimitFormatted,
    usagePercentage,
    fileCount,
    directories,
    lastUpdated
  };
};

export const clearOldCacheFiles = (options: ClearCacheOptions = {}): ClearCacheResult => {
  const { days = 7, log = true } = options;
  
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let deletedFiles = 0;
  let deletedSize = 0;
  const visited = new Set<string>();

  const walkDirectory = (dirPath: string): void => {
    const normalized = path.normalize(dirPath);
    if (visited.has(normalized)) return;
    visited.add(normalized);

    if (!fs.existsSync(normalized)) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(normalized, { withFileTypes: true });
    } catch (error) {
      if (log) {
        console.warn(`⚠️  Failed to inspect cache directory ${normalized}: ${(error as Error).message}`);
      }
      return;
    }

    entries.forEach((entry) => {
      const fullPath = path.join(normalized, entry.name);

      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          walkDirectory(fullPath);
          return;
        }

        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
          deletedFiles += 1;
          deletedSize += stats.size;

          if (log) {
            const ageDays = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));
            console.log(`🗑️ Deleted old cache file: ${fullPath} (${ageDays} days old)`);
          }
        }
      } catch (error) {
        if (log) {
          console.warn(`⚠️  Failed to process ${fullPath}: ${(error as Error).message}`);
        }
      }
    });
  };

  CACHE_DIRECTORIES.forEach(walkDirectory);

  if (log) {
    console.log(`🧹 Old cache cleanup complete: ${deletedFiles} files removed, freed ${formatBytes(deletedSize)}`);
  }

  const freedSpaceFormatted = formatBytes(deletedSize);

  return {
    deletedFiles,
    deletedSize,
    deletedSizeFormatted: freedSpaceFormatted,
    freedSpace: deletedSize,
    freedSpaceFormatted,
    days
  };
};

// CommonJS compatibility
module.exports = {
  CACHE_DIRECTORIES,
  getCacheStats,
  clearOldCacheFiles
};
