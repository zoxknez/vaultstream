const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../services/webTorrentClient', () => {
  const path = require('path');
  const os = require('os');

  return {
    client: {
      torrents: [
        {
          length: 1024 * 1024,
          downloaded: 512 * 1024,
          files: [
            {
              length: 512 * 1024,
              path: path.join(os.tmpdir(), 'webtorrent', 'mock-file.mkv'),
            }
          ]
        }
      ]
    }
  };
});

const { getCacheStats } = require('../services/cacheService');

describe('cacheService metrics', () => {
  const testDir = path.join(process.cwd(), 'uploads', '__jest__');
  const testFile = path.join(testDir, 'sample.bin');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFile, Buffer.alloc(2048));
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('povratna vrednost obuhvata detalje direktorijuma i broj fajlova', () => {
    const stats = getCacheStats({ log: false, includeDirectories: true });

    expect(stats).toBeDefined();
    expect(typeof stats.totalSize).toBe('number');
    expect(typeof stats.usagePercentage).toBe('number');
    expect(stats.lastUpdated).toBeTruthy();
    expect(Array.isArray(stats.directories)).toBe(true);

    const uploadsDir = path.normalize(path.join(process.cwd(), 'uploads'));
    const uploadsSummary = stats.directories.find((dir) => dir.path === uploadsDir);

    expect(uploadsSummary).toBeDefined();
    expect(uploadsSummary.exists).toBe(true);
    expect(uploadsSummary.fileCount).toBeGreaterThanOrEqual(1);
    expect(uploadsSummary.totalSize).toBeGreaterThanOrEqual(2048);

    expect(typeof stats.fileCount).toBe('number');
    expect(stats.fileCount).toBeGreaterThanOrEqual(uploadsSummary.fileCount);
  });
});
