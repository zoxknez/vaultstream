/**
 * Format Bytes Utility
 * 
 * Converts byte values to human-readable format
 */

/**
 * Formats bytes into human-readable format (B, KB, MB, GB, TB)
 * 
 * @param bytes - Number of bytes to format
 * @returns Formatted string with size and unit
 * 
 * @example
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1048576) // "1.00 MB"
 * formatBytes(0) // "0 B"
 */
export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// CommonJS compatibility
module.exports = {
  formatBytes
};
