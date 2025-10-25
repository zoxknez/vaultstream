/**
 * Resource Tracking Service - TypeScript Migration (Sprint 1.4)
 * 
 * Tracks file handles, streams, torrents lifecycle for leak detection
 */

import * as logger from '../utils/logger';
import type { 
  ResourceStats, 
  FileHandleInfo, 
  StreamInfo, 
  TorrentLifecycle,
  TorrentEvent,
  IdleTorrent,
  ResourceLeak 
} from '../types/monitoring';

// ===== CONFIGURATION =====

const TORRENT_IDLE_THRESHOLD_MS = parseInt(process.env.TORRENT_IDLE_THRESHOLD_MS || '1800000'); // 30 min
const IDLE_CHECK_INTERVAL_MS = parseInt(process.env.IDLE_CHECK_INTERVAL_MS || '300000'); // 5 min

// ===== STATE =====

interface ResourceState {
  fileHandles: Map<string, FileHandleInfo>;
  streams: Map<string, StreamInfo>;
  torrents: Map<string, TorrentLifecycle>;
}

const state: ResourceState = {
  fileHandles: new Map(),
  streams: new Map(),
  torrents: new Map()
};

let idleMonitoringInterval: NodeJS.Timeout | null = null;

// ===== FILE HANDLE TRACKING =====

export function trackFileHandleOpen(id: string, path: string): void {
  state.fileHandles.set(id, {
    id,
    path,
    openedAt: new Date().toISOString(),
    lastAccess: new Date().toISOString()
  });
}

export function trackFileHandleClose(id: string): void {
  state.fileHandles.delete(id);
}

// ===== STREAM TRACKING =====

export function trackStreamStart(id: string, infoHash: string, fileName: string): void {
  state.streams.set(id, {
    id,
    infoHash,
    fileName,
    startedAt: new Date().toISOString(),
    bytesRead: 0,
    lastActivity: new Date().toISOString(),
    active: true
  });
}

export function trackStreamData(id: string, bytes: number): void {
  const stream = state.streams.get(id);
  if (stream) {
    stream.bytesRead += bytes;
    stream.lastActivity = new Date().toISOString();
  }
}

export function trackStreamEnd(id: string): void {
  const stream = state.streams.get(id);
  if (stream) {
    stream.active = false;
    setTimeout(() => state.streams.delete(id), 60000);
  }
}

// ===== TORRENT TRACKING =====

export function recordTorrentEvent(infoHash: string, name: string, eventType: TorrentEvent['type'], details?: any): void {
  let lifecycle = state.torrents.get(infoHash);
  
  if (!lifecycle) {
    lifecycle = {
      infoHash,
      name,
      events: [],
      stats: {
        added: 0,
        removed: 0,
        uploaded: 0,
        lastActivity: Date.now()
      }
    };
    state.torrents.set(infoHash, lifecycle);
  }
  
  lifecycle.events.push({
    type: eventType,
    timestamp: new Date().toISOString(),
    details
  });
  
  lifecycle.stats.lastActivity = Date.now();
  
  if (eventType === 'added') lifecycle.stats.added++;
  if (eventType === 'removed') lifecycle.stats.removed++;
  if (eventType === 'upload' && details?.bytes) {
    lifecycle.stats.uploaded += details.bytes;
  }
}

export function getTorrentLifecycle(infoHash: string): TorrentLifecycle | undefined {
  return state.torrents.get(infoHash);
}

// ===== IDLE DETECTION =====

export function detectIdleTorrents(): IdleTorrent[] {
  const now = Date.now();
  const idle: IdleTorrent[] = [];
  
  state.torrents.forEach((lifecycle) => {
    const idleDuration = now - lifecycle.stats.lastActivity;
    
    if (idleDuration > TORRENT_IDLE_THRESHOLD_MS) {
      idle.push({
        infoHash: lifecycle.infoHash,
        name: lifecycle.name,
        lastActivity: new Date(lifecycle.stats.lastActivity).toISOString(),
        idleDuration,
        idleDurationFormatted: formatDuration(idleDuration),
        size: 0,
        sizeFormatted: '0 B'
      });
    }
  });
  
  return idle;
}

export async function cleanupIdleTorrents(): Promise<any> {
  const idleTorrents = detectIdleTorrents();
  let removed = 0;
  let skipped = 0;
  
  for (const idle of idleTorrents) {
    try {
      // Cleanup logic would go here
      state.torrents.delete(idle.infoHash);
      removed++;
      
      logger.info('🗑️  Removed idle torrent', {
        infoHash: idle.infoHash,
        name: idle.name,
        idleDuration: idle.idleDurationFormatted
      });
    } catch (error) {
      skipped++;
      logger.warn('Failed to remove idle torrent', {
        infoHash: idle.infoHash,
        error: (error as Error).message
      });
    }
  }
  
  return { removed, skipped, total: idleTorrents.length };
}

export function startIdleMonitoring(): void {
  if (idleMonitoringInterval) {
    logger.warn('⚠️  Idle monitoring already started');
    return;
  }
  
  logger.info('🔍 Starting idle torrent monitoring', {
    threshold: formatDuration(TORRENT_IDLE_THRESHOLD_MS),
    interval: formatDuration(IDLE_CHECK_INTERVAL_MS)
  });
  
  idleMonitoringInterval = setInterval(() => {
    const idle = detectIdleTorrents();
    if (idle.length > 0) {
      logger.info(`⏰ Detected ${idle.length} idle torrents`);
    }
  }, IDLE_CHECK_INTERVAL_MS);
}

// ===== LEAK DETECTION =====

export function scanForLeaks(): ResourceLeak[] {
  const now = Date.now();
  const leaks: ResourceLeak[] = [];
  const LEAK_THRESHOLD = 3600000; // 1 hour
  
  // Check file handles
  state.fileHandles.forEach((handle) => {
    const age = now - new Date(handle.openedAt).getTime();
    if (age > LEAK_THRESHOLD) {
      leaks.push({
        type: 'file_handle',
        resource: handle,
        age,
        ageFormatted: formatDuration(age),
        details: `File handle open for ${formatDuration(age)}: ${handle.path}`
      });
    }
  });
  
  // Check streams
  state.streams.forEach((stream) => {
    if (stream.active) {
      const age = now - new Date(stream.startedAt).getTime();
      if (age > LEAK_THRESHOLD) {
        leaks.push({
          type: 'stream',
          resource: stream,
          age,
          ageFormatted: formatDuration(age),
          details: `Stream active for ${formatDuration(age)}: ${stream.fileName}`
        });
      }
    }
  });
  
  return leaks;
}

export function getResourceStats(): ResourceStats {
  const fileHandles = {
    open: state.fileHandles.size,
    closed: 0,
    leaked: 0,
    active: state.fileHandles.size
  };
  
  const activeStreams = Array.from(state.streams.values()).filter(s => s.active).length;
  const streams = {
    active: activeStreams,
    started: state.streams.size,
    ended: state.streams.size - activeStreams,
    errored: 0
  };
  
  const activeTorrents = Array.from(state.torrents.values()).filter(t => 
    Date.now() - t.stats.lastActivity < TORRENT_IDLE_THRESHOLD_MS
  ).length;
  
  const torrents = {
    total: state.torrents.size,
    active: activeTorrents,
    idle: state.torrents.size - activeTorrents,
    removed: 0
  };
  
  return {
    fileHandles,
    streams,
    torrents,
    idleDetection: {
      enabled: idleMonitoringInterval !== null,
      threshold: TORRENT_IDLE_THRESHOLD_MS,
      checkInterval: IDLE_CHECK_INTERVAL_MS,
      lastCheck: null
    }
  };
}

export function forceCleanupResources(): any {
  const before = getResourceStats();
  
  // Close old file handles
  const now = Date.now();
  let closedHandles = 0;
  state.fileHandles.forEach((handle, id) => {
    const age = now - new Date(handle.openedAt).getTime();
    if (age > 3600000) {
      state.fileHandles.delete(id);
      closedHandles++;
    }
  });
  
  // End old streams
  let endedStreams = 0;
  state.streams.forEach((stream) => {
    if (stream.active) {
      const age = now - new Date(stream.startedAt).getTime();
      if (age > 3600000) {
        stream.active = false;
        endedStreams++;
      }
    }
  });
  
  const after = getResourceStats();
  
  logger.info('🧹 Forced resource cleanup', {
    closedHandles,
    endedStreams,
    before,
    after
  });
  
  return {
    closedHandles,
    endedStreams,
    before,
    after
  };
}

// ===== HELPERS =====

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// CommonJS compatibility
module.exports = {
  trackFileHandleOpen,
  trackFileHandleClose,
  trackStreamStart,
  trackStreamData,
  trackStreamEnd,
  recordTorrentEvent,
  getTorrentLifecycle,
  detectIdleTorrents,
  cleanupIdleTorrents,
  startIdleMonitoring,
  scanForLeaks,
  getResourceStats,
  forceCleanupResources
};
