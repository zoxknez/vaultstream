/**
 * MIME Type Resolution (Sprint 2.1 - PASS 0)
 * Video file MIME type resolution with overrides
 */

const mime = require('mime-types');

/**
 * Manual MIME type overrides for common video formats
 * Ensures consistent MIME types across different environments
 */
export const EXTENSION_MIME_OVERRIDES: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  webm: 'video/webm',
  m4v: 'video/mp4',
  ts: 'video/mp2t',
  mts: 'video/mp2t',
  '3gp': 'video/3gpp',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg'
};

/**
 * Resolve content type for a filename
 * @param filename - File name with extension
 * @param fallback - Fallback MIME type if detection fails
 * @returns MIME type string
 */
export function resolveContentType(
  filename: string | undefined | null, 
  fallback = 'application/octet-stream'
): string {
  if (!filename || typeof filename !== 'string') {
    return fallback;
  }

  const ext = filename.includes('.') 
    ? filename.split('.').pop()?.toLowerCase() 
    : '';
  
  if (ext && EXTENSION_MIME_OVERRIDES[ext]) {
    return EXTENSION_MIME_OVERRIDES[ext];
  }

  const detected = mime.lookup(filename);
  return typeof detected === 'string' ? detected : fallback;
}

// CommonJS compatibility
module.exports = {
  EXTENSION_MIME_OVERRIDES,
  resolveContentType
};
