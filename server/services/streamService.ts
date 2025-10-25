import { logger } from '../utils/logger';
import { cacheService } from './cacheService';
import { subtitleService } from './subtitleService';
import { torrentService } from './torrentService';

export interface StreamInfo {
  id: string;
  name: string;
  magnet: string;
  size: number;
  quality: string;
  type: 'movie' | 'series' | 'episode';
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  subtitles?: SubtitleInfo[];
}

export interface SubtitleInfo {
  id: string;
  language: string;
  name: string;
  url: string;
  format: 'srt' | 'vtt';
}

export interface StreamRequest {
  magnet: string;
  quality?: string;
  startTime?: number;
  subtitleLanguage?: string;
}

export interface StreamResponse {
  success: boolean;
  streamUrl?: string;
  subtitles?: SubtitleInfo[];
  error?: string;
  metadata?: {
    name: string;
    size: number;
    quality: string;
    duration?: number;
  };
}

export class StreamService {
  private activeStreams = new Map<string, any>();

  /**
   * Start streaming a torrent
   */
  async startStream(request: StreamRequest): Promise<StreamResponse> {
    try {
      logger.info(`Starting stream for magnet: ${request.magnet.substring(0, 50)}...`);

      // Check cache first
      const cacheKey = `stream:${Buffer.from(request.magnet).toString('base64')}`;
      const cachedStream = await cacheService.get(cacheKey);
      
      if (cachedStream) {
        logger.info('Stream found in cache');
        return {
          success: true,
          streamUrl: cachedStream.streamUrl,
          subtitles: cachedStream.subtitles,
          metadata: cachedStream.metadata
        };
      }

      // Add torrent to WebTorrent
      const torrent = await torrentService.addTorrent(request.magnet);
      
      if (!torrent) {
        return {
          success: false,
          error: 'Failed to add torrent'
        };
      }

      // Wait for torrent to be ready
      await this.waitForTorrentReady(torrent);

      // Get the main video file
      const videoFile = this.getMainVideoFile(torrent);
      if (!videoFile) {
        return {
          success: false,
          error: 'No video file found in torrent'
        };
      }

      // Create stream URL
      const streamUrl = await this.createStreamUrl(torrent, videoFile);

      // Get subtitles if requested
      let subtitles: SubtitleInfo[] = [];
      if (request.subtitleLanguage) {
        subtitles = await subtitleService.getSubtitles(
          torrent.name,
          request.subtitleLanguage
        );
      }

      // Prepare metadata
      const metadata = {
        name: torrent.name,
        size: torrent.length,
        quality: this.detectQuality(videoFile.name),
        duration: videoFile.length ? Math.round(videoFile.length / 1000) : undefined
      };

      // Cache the stream info
      await cacheService.set(cacheKey, {
        streamUrl,
        subtitles,
        metadata
      }, 3600); // Cache for 1 hour

      // Store active stream
      this.activeStreams.set(torrent.infoHash, {
        torrent,
        streamUrl,
        startTime: Date.now()
      });

      logger.info(`Stream started successfully: ${streamUrl}`);

      return {
        success: true,
        streamUrl,
        subtitles,
        metadata
      };
    } catch (error) {
      logger.error('Stream start error:', error);
      return {
        success: false,
        error: 'Failed to start stream'
      };
    }
  }

  /**
   * Stop streaming a torrent
   */
  async stopStream(torrentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const streamInfo = this.activeStreams.get(torrentId);
      if (!streamInfo) {
        return {
          success: false,
          error: 'Stream not found'
        };
      }

      // Remove torrent from WebTorrent
      await torrentService.removeTorrent(torrentId);
      
      // Remove from active streams
      this.activeStreams.delete(torrentId);

      logger.info(`Stream stopped: ${torrentId}`);
      return { success: true };
    } catch (error) {
      logger.error('Stream stop error:', error);
      return {
        success: false,
        error: 'Failed to stop stream'
      };
    }
  }

  /**
   * Get stream status
   */
  async getStreamStatus(torrentId: string): Promise<{
    success: boolean;
    status?: {
      isActive: boolean;
      progress: number;
      downloadSpeed: number;
      uploadSpeed: number;
      peers: number;
      timeRemaining?: number;
    };
    error?: string;
  }> {
    try {
      const streamInfo = this.activeStreams.get(torrentId);
      if (!streamInfo) {
        return {
          success: false,
          error: 'Stream not found'
        };
      }

      const torrent = streamInfo.torrent;
      const progress = torrent.progress;
      const downloadSpeed = torrent.downloadSpeed;
      const uploadSpeed = torrent.uploadSpeed;
      const peers = torrent.numPeers;

      let timeRemaining: number | undefined;
      if (downloadSpeed > 0 && progress < 1) {
        const remainingBytes = torrent.length * (1 - progress);
        timeRemaining = Math.round(remainingBytes / downloadSpeed);
      }

      return {
        success: true,
        status: {
          isActive: true,
          progress,
          downloadSpeed,
          uploadSpeed,
          peers,
          timeRemaining
        }
      };
    } catch (error) {
      logger.error('Get stream status error:', error);
      return {
        success: false,
        error: 'Failed to get stream status'
      };
    }
  }

  /**
   * Get active streams
   */
  async getActiveStreams(): Promise<{
    success: boolean;
    streams?: Array<{
      id: string;
      name: string;
      progress: number;
      downloadSpeed: number;
      uploadSpeed: number;
      peers: number;
    }>;
    error?: string;
  }> {
    try {
      const streams = Array.from(this.activeStreams.entries()).map(([id, info]) => ({
        id,
        name: info.torrent.name,
        progress: info.torrent.progress,
        downloadSpeed: info.torrent.downloadSpeed,
        uploadSpeed: info.torrent.uploadSpeed,
        peers: info.torrent.numPeers
      }));

      return {
        success: true,
        streams
      };
    } catch (error) {
      logger.error('Get active streams error:', error);
      return {
        success: false,
        error: 'Failed to get active streams'
      };
    }
  }

  /**
   * Wait for torrent to be ready
   */
  private async waitForTorrentReady(torrent: any, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (torrent.ready) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Torrent ready timeout'));
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  /**
   * Get main video file from torrent
   */
  private getMainVideoFile(torrent: any): any {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    
    const videoFiles = torrent.files.filter((file: any) => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return videoExtensions.includes(extension);
    });

    if (videoFiles.length === 0) {
      return null;
    }

    // Return the largest video file
    return videoFiles.reduce((largest: any, current: any) => {
      return current.length > largest.length ? current : largest;
    });
  }

  /**
   * Create stream URL for video file
   */
  private async createStreamUrl(torrent: any, videoFile: any): Promise<string> {
    // Create a stream URL that can be used by the video player
    const streamId = torrent.infoHash;
    const fileName = videoFile.name;
    
    // Return a URL that the frontend can use to stream the file
    return `/api/stream/${streamId}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Detect video quality from filename
   */
  private detectQuality(fileName: string): string {
    const qualityPatterns = [
      { pattern: /2160p|4k/i, quality: '4K' },
      { pattern: /1080p/i, quality: '1080p' },
      { pattern: /720p/i, quality: '720p' },
      { pattern: /480p/i, quality: '480p' },
      { pattern: /360p/i, quality: '360p' }
    ];

    for (const { pattern, quality } of qualityPatterns) {
      if (pattern.test(fileName)) {
        return quality;
      }
    }

    return 'Unknown';
  }

  /**
   * Clean up inactive streams
   */
  async cleanupInactiveStreams(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [id, info] of this.activeStreams.entries()) {
      if (now - info.startTime > inactiveThreshold) {
        await this.stopStream(id);
        logger.info(`Cleaned up inactive stream: ${id}`);
      }
    }
  }
}

export const streamService = new StreamService();
export default streamService;
