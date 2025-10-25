/**
 * Cache Types
 */

export interface CacheStats {
  metadata: DirectoryStats;
  streaming: DirectoryStats;
  subtitles: DirectoryStats;
  total: {
    files: number;
    size: number;
    sizeFormatted: string;
  };
}

export interface DirectoryStats {
  directory: string;
  files: number;
  size: number;
  sizeFormatted: string;
  oldestFile?: string;
  newestFile?: string;
}

export interface CacheFile {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
  age: number;
  ageFormatted: string;
}

export interface CacheCleanupResult {
  filesRemoved: number;
  bytesFreed: number;
  bytesFreedFormatted: string;
  errors: string[];
}
