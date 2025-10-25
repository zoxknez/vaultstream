/**
 * Streaming Controller
 * 
 * Handles HTTP streaming and download endpoints for torrent files.
 * Supports:
 * - HEAD requests for metadata (ETag, Accept-Ranges)
 * - Range requests for seeking (HTTP 206 Partial Content)
 * - Full file downloads with resume capability
 * - Piece prioritization for smooth playback
 * - Throughput tracking and metrics
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { NotFoundError, ServiceUnavailableError, InternalServerError } from '../../core/httpErrors';
import * as streamingService from './streaming.service';
import { resolveContentType } from '../../lib/mime';
import { config } from '../../config';

const metrics = require('../../services/metricsService');
const { trackStreamStart, trackStreamEnd } = require('../../services/resourceTrackingService');
const { recordTorrentEvent } = require('../../services/resourceTrackingService');

// Validation Schemas
const streamParamsSchema = z.object({
  identifier: z.string().min(1, 'Torrent identifier required'),
  fileIdx: z.string().regex(/^\d+$/, 'File index must be a number')
});

const DEBUG = process.env.DEBUG === 'true';

/**
 * HEAD /stream - Get stream metadata (ETag, Content-Length, Accept-Ranges)
 */
export async function headStream(req: Request, res: Response): Promise<void> {
  const { identifier, fileIdx } = streamParamsSchema.parse(req.params);
  const fileIndex = parseInt(fileIdx, 10);

  const metadata = await streamingService.getStreamMetadata(identifier, fileIndex);
  
  if (!metadata) {
    throw new NotFoundError('Torrent or file not found for streaming');
  }

  const etag = streamingService.generateETag(metadata.infoHash, fileIndex, metadata.fileLength);
  
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', metadata.fileLength);
  res.setHeader('ETag', etag);
  res.status(200).end();
}

/**
 * GET /stream - Stream file with range request support
 */
export async function stream(req: Request, res: Response): Promise<void> {
  if (config.metrics.enabled) {
    metrics.trackRequestDuration(req, res, '/api/v2/torrents/:identifier/files/:fileIdx/stream');
  }

  const { identifier, fileIdx } = streamParamsSchema.parse(req.params);
  const fileIndex = parseInt(fileIdx, 10);
  
  // Track this specific stream request
  const streamRequestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  if (DEBUG) console.log(`🎬 STREAM: ${identifier}/${fileIdx} [${streamRequestId}]`);

  // Throughput tracking
  const throughputTracker = {
    bytes: 0,
    started: Date.now(),
    record() {
      if (!config.metrics.enabled) return;
      const durationMs = Date.now() - this.started;
      if (durationMs <= 0) return;
      const bytesPerSecond = (this.bytes / durationMs) * 1000;
      metrics.setStreamThroughput(bytesPerSecond);
    }
  };

  const finalizeThroughput = () => {
    throughputTracker.record();
    trackStreamEnd(streamRequestId);
  };
  res.on('finish', finalizeThroughput);
  res.on('close', finalizeThroughput);

  // Stream timeout (60s for setup)
  const streamTimeout = setTimeout(() => {
    console.log(`⏱️ Stream request ${streamRequestId} timed out`);
    if (!res.headersSent && !res.writableEnded) {
      throw new ServiceUnavailableError('Streaming request timed out');
    }
  }, 60000);

  try {
    // Get torrent and file
    const streamContext = await streamingService.prepareStream(identifier, fileIndex);
    
    if (!streamContext) {
      clearTimeout(streamTimeout);
      throw new NotFoundError('Torrent or file not found for streaming');
    }

    const { torrent, file } = streamContext;
    
    if (DEBUG) {
      console.log(`🎬 Streaming: ${file.name} (${(file.length / 1024 / 1024).toFixed(1)} MB)`);
    }

    // Track stream start and torrent activity
    trackStreamStart(streamRequestId, torrent.infoHash, fileIndex);
    recordTorrentEvent(torrent.infoHash, 'file_streamed', {
      fileIdx: fileIndex,
      fileName: file.name,
      fileSize: file.length
    });

    // Detect file type for proper MIME type
    const contentType = resolveContentType(file.name, 'video/mp4');

    // Enhanced range request handling
    const range = req.headers.range;
    
    let streamEnded = false;
    const markStreamEnded = () => {
      if (!streamEnded) {
        streamEnded = true;
        clearTimeout(streamTimeout);
        if (DEBUG) console.log(`✅ Stream ${streamRequestId} ended properly`);
      }
    };

    if (range) {
      // Parse range header
      const rangeResult = streamingService.parseRangeHeader(range, file.length);
      
      if (!rangeResult) {
        clearTimeout(streamTimeout);
        throw new Error('Invalid range header');
      }

      const { start, end } = rangeResult;
      const chunkSize = (end - start) + 1;

      // Log seeking behavior
      if (start > 0 && DEBUG) {
        console.log(`⏩ [${streamRequestId}] Seek: ${(start / file.length * 100).toFixed(1)}%, chunk: ${(chunkSize / 1024 / 1024).toFixed(1)}MB`);
      }

      // Prioritize pieces for seeking
      if (start > 0) {
        const prioritized = streamingService.prioritizePieces(torrent, start, end);
        if (DEBUG && prioritized) {
          console.log(`🔄 [${streamRequestId}] Prioritizing pieces ${prioritized.startPiece} to ${prioritized.endPiece}`);
        }
      }

      // Send partial content response
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive'
      });

      // Create stream
      try {
        const stream = file.createReadStream({ start, end });

        stream.on('data', (chunk: any) => {
          throughputTracker.bytes += chunk.length;
        });

        stream.on('error', (err: Error) => {
          console.error(`❌ [${streamRequestId}] Stream error:`, err.message);
          if (!res.headersSent && !res.writableEnded) {
            throw new InternalServerError(`Stream error: ${err.message}`);
          }
        });

        stream.on('end', markStreamEnded);
        res.on('close', markStreamEnded);

        stream.pipe(res);
      } catch (streamError: any) {
        console.error(`❌ [${streamRequestId}] Failed to create stream:`, streamError.message);
        clearTimeout(streamTimeout);
        throw new InternalServerError(`Streaming error: ${streamError.message}`);
      }

    } else {
      // Handle full file request (less common)
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      try {
        const stream = file.createReadStream();
        
        stream.on('data', (chunk: any) => {
          throughputTracker.bytes += chunk.length;
        });
        
        stream.on('error', (err: Error) => {
          console.error(`❌ [${streamRequestId}] Stream error:`, err.message);
          if (!res.headersSent && !res.writableEnded) {
            throw new InternalServerError(`Stream error: ${err.message}`);
          }
        });

        stream.on('end', markStreamEnded);
        res.on('close', markStreamEnded);

        stream.pipe(res);
      } catch (streamError: any) {
        clearTimeout(streamTimeout);
        throw new InternalServerError(`Streaming error: ${streamError.message}`);
      }
    }

  } catch (error: any) {
    clearTimeout(streamTimeout);
    console.error(`❌ Universal streaming failed:`, error.message);
    throw error;
  }
}

/**
 * GET /download - Download file with resume support
 */
export async function download(req: Request, res: Response): Promise<void> {
  if (config.metrics.enabled) {
    metrics.trackRequestDuration(req, res, '/api/v2/torrents/:identifier/files/:fileIdx/download');
  }

  const { identifier, fileIdx } = streamParamsSchema.parse(req.params);
  const fileIndex = parseInt(fileIdx, 10);
  
  console.log(`📥 DOWNLOAD: ${identifier}/${fileIdx}`);

  try {
    // Get torrent and file
    const streamContext = await streamingService.prepareStream(identifier, fileIndex);
    
    if (!streamContext) {
      throw new NotFoundError('Torrent or file not found for download');
    }

    const { file } = streamContext;
    
    console.log(`📥 Downloading: ${file.name} (${(file.length / 1024 / 1024).toFixed(1)} MB)`);

    // Set download headers
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const downloadContentType = resolveContentType(file.name, 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', downloadContentType);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests for resume capability
    const range = req.headers.range;
    
    if (range) {
      const rangeResult = streamingService.parseRangeHeader(range, file.length);
      
      if (!rangeResult) {
        throw new Error('Invalid range header');
      }

      const { start, end } = rangeResult;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': downloadContentType
      });

      const stream = file.createReadStream({ start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': downloadContentType
      });
      file.createReadStream().pipe(res);
    }

  } catch (error: any) {
    console.error(`❌ Universal download failed:`, error.message);
    throw error;
  }
}
