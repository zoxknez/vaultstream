/**
 * Streaming Service
 * 
 * Business logic for streaming and download operations.
 * Handles:
 * - Range header parsing
 * - Chunk size calculation
 * - Piece prioritization for seeking
 * - Torrent preparation and file selection
 * - ETag generation
 * 
 * Sprint 2.1 PASS 1 - Feature Extraction
 */

const { universalTorrentResolver } = require('../../services/torrentService');

interface RangeResult {
  start: number;
  end: number;
}

interface StreamMetadata {
  infoHash: string;
  fileLength: number;
  fileName: string;
}

interface StreamContext {
  torrent: any; // WebTorrent.Torrent type
  file: any; // WebTorrent.TorrentFile type
}

interface PrioritizationResult {
  startPiece: number;
  endPiece: number;
  windowSize: number;
}

/**
 * Parse HTTP Range header
 * 
 * @example
 * parseRangeHeader('bytes=0-1023', 2048) => { start: 0, end: 1023 }
 * parseRangeHeader('bytes=1024-', 2048) => { start: 1024, end: 2047 } (with chunk heuristic)
 */
export function parseRangeHeader(
  rangeHeader: string,
  fileLength: number
): RangeResult | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);

  if (isNaN(start) || start < 0 || start >= fileLength) {
    return null;
  }

  // Calculate end position
  let end: number;

  if (parts[1]) {
    // Explicit end requested
    end = parseInt(parts[1], 10);
    if (isNaN(end) || end < start || end >= fileLength) {
      return null;
    }
  } else {
    // No end specified - calculate chunk
    end = calculateChunkEnd(start, fileLength);
  }

  return { start, end };
}

/**
 * Calculate intelligent chunk end position
 * 
 * Strategy:
 * - Initial request (start=0): 4MB chunk for fast startup
 * - Seek operations (start>0): 8MB chunk for smooth playback
 * - Never exceed file length
 */
export function calculateChunkEnd(start: number, fileLength: number): number {
  const MAX_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB for seeks
  const INITIAL_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB for initial load

  const chunkSize = start > 0 ? MAX_CHUNK_SIZE : INITIAL_CHUNK_SIZE;
  return Math.min(start + chunkSize, fileLength - 1);
}

/**
 * Prioritize torrent pieces for streaming
 * 
 * Strategy:
 * - Calculate piece range for requested byte range
 * - Prime a larger window (1.5x + 30 pieces max) for smooth playback
 * - Use torrent.select() for range prioritization
 * - Use torrent.critical() for immediate pieces
 * 
 * @returns Prioritization metadata or null if failed
 */
export function prioritizePieces(
  torrent: any,
  start: number,
  end: number
): PrioritizationResult | null {
  try {
    const pieceLength = torrent.pieceLength || 16384;
    const startPiece = Math.floor(start / pieceLength);
    const endPiece = Math.ceil(end / pieceLength);

    // Prime a larger window for smoother playback
    const PRIORITY_WINDOW = Math.min(30, Math.ceil((endPiece - startPiece) * 1.5));
    const priorityEnd = startPiece + PRIORITY_WINDOW;

    // More robust piece selection
    if (typeof torrent.select === 'function') {
      torrent.select(startPiece, priorityEnd, 1, true);
    }

    if (typeof torrent.critical === 'function') {
      torrent.critical(startPiece, Math.min(priorityEnd, startPiece + 10));
    }

    return {
      startPiece,
      endPiece: priorityEnd,
      windowSize: PRIORITY_WINDOW
    };
  } catch (err: any) {
    console.log(`⚠️ Prioritization error: ${err.message}`);
    return null;
  }
}

/**
 * Generate ETag for stream caching
 * 
 * Format: {infoHash}-{fileIdx}-{fileLength}
 */
export function generateETag(
  infoHash: string,
  fileIdx: number,
  fileLength: number
): string {
  return `${infoHash}-${fileIdx}-${fileLength}`;
}

/**
 * Get stream metadata (for HEAD requests)
 */
export async function getStreamMetadata(
  identifier: string,
  fileIdx: number
): Promise<StreamMetadata | null> {
  const torrent = await universalTorrentResolver(identifier);
  
  if (!torrent) {
    return null;
  }

  const file = torrent.files[fileIdx];
  
  if (!file) {
    return null;
  }

  return {
    infoHash: torrent.infoHash,
    fileLength: file.length,
    fileName: file.name
  };
}

/**
 * Prepare torrent for streaming
 * 
 * - Resolve torrent by identifier
 * - Validate file exists
 * - Resume torrent if paused
 * - Select file for download
 * - Set minimum upload limit for peer reciprocity
 */
export async function prepareStream(
  identifier: string,
  fileIdx: number
): Promise<StreamContext | null> {
  const torrent = await universalTorrentResolver(identifier);
  
  if (!torrent) {
    return null;
  }

  const file = torrent.files[fileIdx];
  
  if (!file) {
    return null;
  }

  // Ensure torrent is active and file is selected with high priority
  torrent.resume();
  
  if (typeof file.select === 'function') {
    file.select();
  }

  // Ensure we don't have too strict upload limits while streaming
  if (torrent.uploadLimit < 5000) {
    torrent.uploadLimit = 5000; // Set minimum upload for better peer reciprocity
  }

  return { torrent, file };
}
