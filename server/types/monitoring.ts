/**
 * Monitoring & Resource Tracking Types
 */

export interface MemoryStats {
  heap: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  rss: number;
  external: number;
  arrayBuffers: number;
  timestamp: string;
  formattedHeapUsed: string;
  formattedRSS: string;
}

export interface MemoryThresholds {
  WARNING: number;
  CRITICAL: number;
  FORCE_GC: number;
  MAX_HEAP: number;
}

export interface ResourceStats {
  fileHandles: {
    open: number;
    closed: number;
    leaked: number;
    active: number;
  };
  streams: {
    active: number;
    started: number;
    ended: number;
    errored: number;
  };
  torrents: {
    total: number;
    active: number;
    idle: number;
    removed: number;
  };
  idleDetection: {
    enabled: boolean;
    threshold: number;
    checkInterval: number;
    lastCheck: string | null;
  };
}

export interface FileHandleInfo {
  id: string;
  path: string;
  openedAt: string;
  lastAccess: string;
}

export interface StreamInfo {
  id: string;
  infoHash: string;
  fileName: string;
  startedAt: string;
  bytesRead: number;
  lastActivity: string;
  active: boolean;
}

export interface TorrentLifecycle {
  infoHash: string;
  name: string;
  events: TorrentEvent[];
  stats: {
    added: number;
    removed: number;
    uploaded: number;
    lastActivity: number;
  };
}

export interface TorrentEvent {
  type: 'added' | 'removed' | 'upload' | 'download' | 'error';
  timestamp: string;
  details?: any;
}

export interface IdleTorrent {
  infoHash: string;
  name: string;
  lastActivity: string;
  idleDuration: number;
  idleDurationFormatted: string;
  size: number;
  sizeFormatted: string;
}

export interface ResourceLeak {
  type: 'file_handle' | 'stream' | 'torrent';
  resource: any;
  age: number;
  ageFormatted: string;
  details: string;
}
