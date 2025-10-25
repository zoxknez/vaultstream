/**
 * System Service - TypeScript Migration (Sprint 2.1)
 * Disk usage monitoring for Windows and Unix systems
 */

const { exec } = require('child_process');
const os = require('os');

interface DiskUsage {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

const FALLBACK_DISK_USAGE: DiskUsage = {
  total: 1024 * 1024 * 1024 * 100,
  used: 1024 * 1024 * 1024 * 50,
  available: 1024 * 1024 * 1024 * 50,
  percentage: 50
};

export function getDiskUsage({ log = true }: { log?: boolean } = {}): Promise<DiskUsage> {
  const isWindows = os.platform() === 'win32';

  if (isWindows) {
    return new Promise((resolve) => {
      const drive = __dirname.substring(0, 2);
      exec(`wmic logicaldisk where "DeviceID='${drive}'" get Size,FreeSpace /format:csv`, (error: any, stdout: string) => {
        if (error) {
          console.error('Error getting disk usage (Windows):', error);
          return resolve({ ...FALLBACK_DISK_USAGE });
        }

        try {
          const lines = stdout
            .trim()
            .split('\n')
            .filter((line) => line && !line.startsWith('Node'));
          const data = lines[lines.length - 1].split(',');
          const freeSpace = parseInt(data[1], 10) || 0;
          const totalSize = parseInt(data[2], 10) || 0;
          const used = totalSize - freeSpace;
          const percentage = totalSize > 0 ? Math.round((used / totalSize) * 100) : 0;

          const diskInfo: DiskUsage = {
            total: totalSize,
            used,
            available: freeSpace,
            percentage
          };

          if (log) {
            console.log('📊 Disk usage (Windows):', diskInfo);
          }

          resolve(diskInfo);
        } catch (parseError) {
          console.error('Error parsing Windows disk data:', parseError);
          resolve({ ...FALLBACK_DISK_USAGE });
        }
      });
    });
  }

  return new Promise((resolve) => {
    exec('df -k .', (error: any, stdout: string) => {
      if (error) {
        console.error('Error getting disk usage (Unix):', error);
        return resolve({ ...FALLBACK_DISK_USAGE });
      }

      try {
        const lines = stdout.trim().split('\n');
        const data = lines[1].split(/\s+/);
        const total = (parseInt(data[1], 10) || 0) * 1024;
        const used = (parseInt(data[2], 10) || 0) * 1024;
        const available = (parseInt(data[3], 10) || 0) * 1024;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

        const diskInfo: DiskUsage = { total, used, available, percentage };

        if (log) {
          console.log('📊 Disk usage (Unix):', diskInfo);
        }

        resolve(diskInfo);
      } catch (parseError) {
        console.error('Error parsing Unix disk data:', parseError);
        resolve({ ...FALLBACK_DISK_USAGE });
      }
    });
  });
}

// CommonJS compatibility
module.exports = {
  FALLBACK_DISK_USAGE,
  getDiskUsage
};
