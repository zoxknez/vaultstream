/**
 * Enhanced Streaming Handler with Adaptive Optimization - TypeScript Migration
 * Implements smart piece prioritization and buffer health monitoring
 */

import { Request, Response } from 'express';
import { trackStreamData, trackStreamEnd, trackStreamStart } from './resourceTrackingService';

// ===== TYPES =====

export interface StreamRange {
  start: number;
  end: number;
}

export interface PrioritizationOptions {
  chunkSize?: number;
  lookahead?: number;
  strategy?: 'sequential-with-jumps' | 'aggressive';
}

export interface ActiveStreamInfo {
  torrent: string;
  file: number;
  startTime: number;
  bytesStreamed: number;
}

export interface StreamingStats {
  activeStreams: number;
  bufferHealthChecks: number;
  streams: ActiveStreamInfo[];
}

export interface TorrentFile {
  name: string;
  length: number;
  downloaded?: number;
  createReadStream: (options: { start: number; end: number }) => NodeJS.ReadableStream;
  index: number;
}

export interface Torrent {
  infoHash: string;
  name: string;
  pieceLength?: number;
  pieces: { length: number };
  files: TorrentFile[];
  critical?: (start: number, end: number) => void;
  select?: (start: number, end: number, priority?: number, force?: boolean) => void;
  deselect?: (start: number, end: number, force?: boolean) => void;
}

// ===== CLASS =====

class StreamingOptimizer {
  private activeStreams: Map<string, ActiveStreamInfo>;
  private bufferHealthChecks: Map<string, NodeJS.Timeout>;

  constructor() {
    this.activeStreams = new Map();
    this.bufferHealthChecks = new Map();
  }

  /**
   * Detect device type from user agent
   */
  detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'tv' {
    if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
    if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
    if (/TV|SmartTV|GoogleTV|AppleTV/i.test(userAgent)) return 'tv';
    return 'desktop';
  }

  /**
   * Get optimal streaming config based on device type
   */
  getOptimalStreamingConfig(
    deviceType: string,
    _metrics?: { totalSize?: number; downloadSpeed?: number; uploadSpeed?: number }
  ) {
    const configs = {
      mobile: { chunkSize: 256 * 1024, bufferSize: 512 * 1024, lookahead: 20 },
      tablet: { chunkSize: 384 * 1024, bufferSize: 768 * 1024, lookahead: 25 },
      desktop: { chunkSize: 512 * 1024, bufferSize: 1024 * 1024, lookahead: 30 },
      tv: { chunkSize: 1024 * 1024, bufferSize: 2048 * 1024, lookahead: 40 }
    };

    return configs[deviceType as keyof typeof configs] || configs.desktop;
  }

  /**
   * Calculate optimal chunk size based on connection speed
   */
  calculateOptimalChunkSize(req: Request): number {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

    // Mobile devices get smaller chunks for better responsiveness
    // Desktop/WiFi gets larger chunks for better throughput
    return isMobile ? 256 * 1024 : 512 * 1024; // 256KB vs 512KB
  }

  /**
   * Smart piece prioritization with lookahead and deselection
   */
  async prioritizeSmartPieces(
    torrent: Torrent,
    _file: TorrentFile,
    range: StreamRange,
    options: PrioritizationOptions = {}
  ): Promise<void> {
    const { lookahead = 30, strategy = 'sequential-with-jumps' } = options;

    const pieceLength = torrent.pieceLength || 16384;
    const startPiece = Math.floor(range.start / pieceLength);
    const endPiece = Math.ceil(range.end / pieceLength);

    if (strategy === 'sequential-with-jumps') {
      // Critical pieces - download immediately
      const criticalEnd = Math.min(startPiece + 10, endPiece);
      if (typeof torrent.critical === 'function') {
        torrent.critical(startPiece, criticalEnd);
      }

      // Lookahead window - prioritize but not critical
      const lookaheadEnd = Math.min(startPiece + lookahead, endPiece);
      if (typeof torrent.select === 'function') {
        torrent.select(startPiece, lookaheadEnd, 1, true);
      }

      // Deselect pieces far behind (save bandwidth)
      if (startPiece > 50 && typeof torrent.deselect === 'function') {
        torrent.deselect(0, startPiece - 50, false);
      }

      // Deselect pieces far ahead
      if (endPiece < torrent.pieces.length - 50 && typeof torrent.deselect === 'function') {
        torrent.deselect(lookaheadEnd + 50, torrent.pieces.length);
      }
    } else if (strategy === 'aggressive') {
      // Download a larger window aggressively
      const aggressiveEnd = Math.min(startPiece + 50, endPiece);
      if (typeof torrent.critical === 'function') {
        torrent.critical(startPiece, aggressiveEnd);
      }
    }
  }

  /**
   * Start optimization session
   */
  startOptimization(
    torrent: Torrent,
    _file: TorrentFile,
    fileIndex: number
  ): { sessionId: string } {
    const sessionId = `${torrent.infoHash}-${fileIndex}-${Date.now()}`;

    this.activeStreams.set(sessionId, {
      torrent: torrent.infoHash,
      file: fileIndex,
      startTime: Date.now(),
      bytesStreamed: 0
    });

    return { sessionId };
  }

  /**
   * Stop optimization session
   */
  stopOptimization(sessionId: string): void {
    this.activeStreams.delete(sessionId);

    if (this.bufferHealthChecks.has(sessionId)) {
      clearInterval(this.bufferHealthChecks.get(sessionId)!);
      this.bufferHealthChecks.delete(sessionId);
    }
  }

  /**
   * Monitor buffer health and adjust priorities
   */
  monitorBufferHealth(torrent: Torrent, file: TorrentFile, streamId: string): void {
    const checkInterval = setInterval(() => {
      const downloaded = file.downloaded || 0;
      const total = file.length || 1;
      const bufferHealth = (downloaded / total) * 100;

      if (bufferHealth < 5) {
        console.warn(`⚠️  Low buffer health for stream ${streamId}: ${bufferHealth.toFixed(2)}%`);

        // Trigger more aggressive downloading
        if (typeof torrent.critical === 'function') {
          const pieceLength = torrent.pieceLength || 16384;
          const currentPiece = Math.floor(downloaded / pieceLength);
          torrent.critical(currentPiece, currentPiece + 20);
        }
      } else if (bufferHealth > 95) {
        // Buffer is healthy, can reduce priority
        clearInterval(checkInterval);
        this.bufferHealthChecks.delete(streamId);
      }
    }, 2000);

    this.bufferHealthChecks.set(streamId, checkInterval);

    // Cleanup after 10 minutes
    setTimeout(() => {
      if (this.bufferHealthChecks.has(streamId)) {
        clearInterval(this.bufferHealthChecks.get(streamId)!);
        this.bufferHealthChecks.delete(streamId);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Handle streaming with backpressure and optimization
   */
  async handleStream(
    req: Request,
    res: Response,
    torrent: Torrent,
    fileIndex: number,
    range: StreamRange
  ): Promise<NodeJS.ReadableStream> {
    const file = torrent.files[fileIndex];
    const streamId = `${torrent.infoHash}-${fileIndex}-${Date.now()}`;

    // Calculate optimal chunk size
    const chunkSize = this.calculateOptimalChunkSize(req);

    // Track stream start
    trackStreamStart(streamId, torrent.infoHash, file.name);

    // Smart piece prioritization
    await this.prioritizeSmartPieces(torrent, file, range, {
      chunkSize,
      lookahead: 30,
      strategy: 'sequential-with-jumps'
    });

    // Start buffer health monitoring
    this.monitorBufferHealth(torrent, file, streamId);

    // Create read stream
    const stream = file.createReadStream({
      start: range.start,
      end: range.end
    });

    let bytesStreamed = 0;
    const startTime = Date.now();

    // Handle backpressure
    stream.on('data', (chunk: Buffer) => {
      bytesStreamed += chunk.length;
      trackStreamData(streamId, chunk.length);

      // If write buffer is full, pause reading
      if (!res.write(chunk)) {
        stream.pause();

        // Resume when drain event fires
        res.once('drain', () => {
          stream.resume();
        });
      }
    });

    stream.on('end', () => {
      const duration = Date.now() - startTime;
      const speed = bytesStreamed / (duration / 1000); // bytes per second

      console.log(
        `✅ Stream complete: ${bytesStreamed} bytes in ${duration}ms (${(
          speed /
          1024 /
          1024
        ).toFixed(2)} MB/s)`
      );

      trackStreamEnd(streamId);
      this.activeStreams.delete(streamId);

      // Cleanup buffer health monitoring
      if (this.bufferHealthChecks.has(streamId)) {
        clearInterval(this.bufferHealthChecks.get(streamId)!);
        this.bufferHealthChecks.delete(streamId);
      }
    });

    stream.on('error', (error: Error) => {
      console.error(`❌ Stream error for ${streamId}:`, error);
      this.activeStreams.delete(streamId);

      if (this.bufferHealthChecks.has(streamId)) {
        clearInterval(this.bufferHealthChecks.get(streamId)!);
        this.bufferHealthChecks.delete(streamId);
      }
    });

    // Track active stream
    this.activeStreams.set(streamId, {
      torrent: torrent.infoHash,
      file: fileIndex,
      startTime,
      bytesStreamed: 0
    });

    return stream;
  }

  /**
   * Get active streams statistics
   */
  getStats(): StreamingStats {
    return {
      activeStreams: this.activeStreams.size,
      bufferHealthChecks: this.bufferHealthChecks.size,
      streams: Array.from(this.activeStreams.values())
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    // Clear all buffer health check intervals
    for (const interval of this.bufferHealthChecks.values()) {
      clearInterval(interval);
    }
    this.bufferHealthChecks.clear();
    this.activeStreams.clear();
  }
}

// ===== EXPORTS =====

// Singleton instance
const streamingOptimizer = new StreamingOptimizer();

export default streamingOptimizer;

// Named exports
export { streamingOptimizer, StreamingOptimizer };

// CommonJS compatibility
module.exports = streamingOptimizer;
module.exports.streamingOptimizer = streamingOptimizer;
module.exports.StreamingOptimizer = StreamingOptimizer;
