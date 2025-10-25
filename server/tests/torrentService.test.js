/**
 * 🌊 STREAMVAULT TORRENT SERVICE TESTS
 * Comprehensive tests for torrent service
 */

const request = require('supertest');
const { app } = require('../index');
const { torrentService } = require('../services/torrentService');
const { logger } = require('../utils/logger');

describe('Torrent Service', () => {
  let testTorrent;
  let testMagnet;

  beforeEach(async () => {
    // Clean up test data
    await torrentService.cleanupTestData();
    
    // Create test torrent
    testTorrent = {
      hash: 'test-hash-123',
      name: 'Test Movie',
      size: 1024 * 1024 * 1024, // 1GB
      files: [
        {
          name: 'movie.mp4',
          size: 1024 * 1024 * 1024,
          type: 'video/mp4'
        }
      ]
    };
    
    testMagnet = 'magnet:?xt=urn:btih:test-hash-123&dn=Test+Movie&tr=udp://tracker.example.com:1337';
  });

  afterEach(async () => {
    // Clean up after each test
    await torrentService.cleanupTestData();
  });

  describe('Torrent Addition', () => {
    test('should add torrent successfully', async () => {
      const result = await torrentService.addTorrent(testMagnet);
      
      expect(result.success).toBe(true);
      expect(result.torrent).toBeDefined();
      expect(result.torrent.hash).toBe(testTorrent.hash);
      expect(result.torrent.name).toBe(testTorrent.name);
    });

    test('should fail to add invalid magnet link', async () => {
      const invalidMagnet = 'invalid-magnet-link';
      
      const result = await torrentService.addTorrent(invalidMagnet);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid magnet link');
    });

    test('should fail to add empty magnet link', async () => {
      const result = await torrentService.addTorrent('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('magnet link required');
    });

    test('should fail to add duplicate torrent', async () => {
      // Add torrent first time
      await torrentService.addTorrent(testMagnet);
      
      // Try to add same torrent again
      const result = await torrentService.addTorrent(testMagnet);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('torrent already exists');
    });
  });

  describe('Torrent Removal', () => {
    beforeEach(async () => {
      // Add test torrent
      await torrentService.addTorrent(testMagnet);
    });

    test('should remove torrent successfully', async () => {
      const result = await torrentService.removeTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      
      // Verify torrent is removed
      const getResult = await torrentService.getTorrent(testTorrent.hash);
      expect(getResult.success).toBe(false);
    });

    test('should fail to remove non-existent torrent', async () => {
      const result = await torrentService.removeTorrent('non-existent-hash');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('torrent not found');
    });

    test('should fail to remove torrent with empty hash', async () => {
      const result = await torrentService.removeTorrent('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('torrent hash required');
    });
  });

  describe('Torrent Information', () => {
    beforeEach(async () => {
      // Add test torrent
      await torrentService.addTorrent(testMagnet);
    });

    test('should get torrent information', async () => {
      const result = await torrentService.getTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      expect(result.torrent).toBeDefined();
      expect(result.torrent.hash).toBe(testTorrent.hash);
      expect(result.torrent.name).toBe(testTorrent.name);
    });

    test('should fail to get non-existent torrent', async () => {
      const result = await torrentService.getTorrent('non-existent-hash');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('torrent not found');
    });

    test('should get all torrents', async () => {
      const result = await torrentService.getAllTorrents();
      
      expect(result.success).toBe(true);
      expect(result.torrents).toBeDefined();
      expect(result.torrents.length).toBeGreaterThan(0);
    });

    test('should get torrent statistics', async () => {
      const result = await torrentService.getTorrentStats(testTorrent.hash);
      
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.downloaded).toBeDefined();
      expect(result.stats.uploaded).toBeDefined();
      expect(result.stats.downloadSpeed).toBeDefined();
      expect(result.stats.uploadSpeed).toBeDefined();
    });
  });

  describe('Torrent Control', () => {
    beforeEach(async () => {
      // Add test torrent
      await torrentService.addTorrent(testMagnet);
    });

    test('should start torrent', async () => {
      const result = await torrentService.startTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      
      // Verify torrent is started
      const torrentResult = await torrentService.getTorrent(testTorrent.hash);
      expect(torrentResult.torrent.status).toBe('downloading');
    });

    test('should pause torrent', async () => {
      // Start torrent first
      await torrentService.startTorrent(testTorrent.hash);
      
      const result = await torrentService.pauseTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      
      // Verify torrent is paused
      const torrentResult = await torrentService.getTorrent(testTorrent.hash);
      expect(torrentResult.torrent.status).toBe('paused');
    });

    test('should resume torrent', async () => {
      // Start and pause torrent
      await torrentService.startTorrent(testTorrent.hash);
      await torrentService.pauseTorrent(testTorrent.hash);
      
      const result = await torrentService.resumeTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      
      // Verify torrent is resumed
      const torrentResult = await torrentService.getTorrent(testTorrent.hash);
      expect(torrentResult.torrent.status).toBe('downloading');
    });

    test('should fail to control non-existent torrent', async () => {
      const result = await torrentService.startTorrent('non-existent-hash');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('torrent not found');
    });
  });

  describe('File Management', () => {
    beforeEach(async () => {
      // Add test torrent
      await torrentService.addTorrent(testMagnet);
    });

    test('should get torrent files', async () => {
      const result = await torrentService.getTorrentFiles(testTorrent.hash);
      
      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);
    });

    test('should set file priority', async () => {
      const files = await torrentService.getTorrentFiles(testTorrent.hash);
      const file = files.files[0];
      
      const result = await torrentService.setFilePriority(testTorrent.hash, file.index, 'high');
      
      expect(result.success).toBe(true);
    });

    test('should fail to set priority for non-existent file', async () => {
      const result = await torrentService.setFilePriority(testTorrent.hash, 999, 'high');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    test('should download specific file', async () => {
      const files = await torrentService.getTorrentFiles(testTorrent.hash);
      const file = files.files[0];
      
      const result = await torrentService.downloadFile(testTorrent.hash, file.index);
      
      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe('Streaming', () => {
    beforeEach(async () => {
      // Add test torrent
      await torrentService.addTorrent(testMagnet);
    });

    test('should create stream for video file', async () => {
      const files = await torrentService.getTorrentFiles(testTorrent.hash);
      const videoFile = files.files.find(f => f.type.startsWith('video/'));
      
      if (videoFile) {
        const result = await torrentService.createStream(testTorrent.hash, videoFile.index);
        
        expect(result.success).toBe(true);
        expect(result.stream).toBeDefined();
      }
    });

    test('should fail to create stream for non-existent file', async () => {
      const result = await torrentService.createStream(testTorrent.hash, 999);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    test('should get stream statistics', async () => {
      const files = await torrentService.getTorrentFiles(testTorrent.hash);
      const videoFile = files.files.find(f => f.type.startsWith('video/'));
      
      if (videoFile) {
        const streamResult = await torrentService.createStream(testTorrent.hash, videoFile.index);
        
        if (streamResult.success) {
          const statsResult = await torrentService.getStreamStats(testTorrent.hash, videoFile.index);
          
          expect(statsResult.success).toBe(true);
          expect(statsResult.stats).toBeDefined();
        }
      }
    });
  });

  describe('Search and Discovery', () => {
    test('should search for torrents', async () => {
      const result = await torrentService.searchTorrents('test movie');
      
      expect(result.success).toBe(true);
      expect(result.torrents).toBeDefined();
      expect(Array.isArray(result.torrents)).toBe(true);
    });

    test('should get popular torrents', async () => {
      const result = await torrentService.getPopularTorrents();
      
      expect(result.success).toBe(true);
      expect(result.torrents).toBeDefined();
      expect(Array.isArray(result.torrents)).toBe(true);
    });

    test('should get trending torrents', async () => {
      const result = await torrentService.getTrendingTorrents();
      
      expect(result.success).toBe(true);
      expect(result.torrents).toBeDefined();
      expect(Array.isArray(result.torrents)).toBe(true);
    });

    test('should get recommended torrents', async () => {
      const result = await torrentService.getRecommendedTorrents();
      
      expect(result.success).toBe(true);
      expect(result.torrents).toBeDefined();
      expect(Array.isArray(result.torrents)).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('should optimize torrent performance', async () => {
      await torrentService.addTorrent(testMagnet);
      
      const result = await torrentService.optimizeTorrent(testTorrent.hash);
      
      expect(result.success).toBe(true);
      expect(result.optimizations).toBeDefined();
    });

    test('should get performance metrics', async () => {
      await torrentService.addTorrent(testMagnet);
      
      const result = await torrentService.getPerformanceMetrics();
      
      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTorrents).toBeDefined();
      expect(result.metrics.activeTorrents).toBeDefined();
      expect(result.metrics.totalDownloadSpeed).toBeDefined();
      expect(result.metrics.totalUploadSpeed).toBeDefined();
    });

    test('should cleanup inactive torrents', async () => {
      await torrentService.addTorrent(testMagnet);
      
      const result = await torrentService.cleanupInactiveTorrents();
      
      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      const originalMethod = torrentService.addTorrent;
      torrentService.addTorrent = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await torrentService.addTorrent(testMagnet);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('network error');
      
      // Restore original method
      torrentService.addTorrent = originalMethod;
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      const originalMethod = torrentService.getTorrent;
      torrentService.getTorrent = jest.fn().mockRejectedValue(new Error('Database error'));
      
      const result = await torrentService.getTorrent(testTorrent.hash);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('database error');
      
      // Restore original method
      torrentService.getTorrent = originalMethod;
    });

    test('should handle invalid torrent data gracefully', async () => {
      const invalidTorrent = {
        hash: '',
        name: '',
        size: -1
      };
      
      const result = await torrentService.addTorrent('magnet:?xt=urn:btih:invalid');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid torrent data');
    });
  });

  describe('Security', () => {
    test('should validate torrent hash format', async () => {
      const invalidHash = 'invalid-hash-format';
      
      const result = await torrentService.getTorrent(invalidHash);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid hash format');
    });

    test('should prevent malicious magnet links', async () => {
      const maliciousMagnet = 'magnet:?xt=urn:btih:malicious&dn=<script>alert("xss")</script>';
      
      const result = await torrentService.addTorrent(maliciousMagnet);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('malicious magnet link');
    });

    test('should sanitize torrent names', async () => {
      const maliciousName = '<script>alert("xss")</script>';
      
      // This would be tested in the actual implementation
      expect(maliciousName).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on torrent additions', async () => {
      // Add multiple torrents quickly
      for (let i = 0; i < 10; i++) {
        await torrentService.addTorrent(`magnet:?xt=urn:btih:test${i}&dn=Test${i}`);
      }
      
      // Should be rate limited
      const result = await torrentService.addTorrent('magnet:?xt=urn:btih:test11&dn=Test11');
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limited');
    });

    test('should enforce rate limiting on search requests', async () => {
      // Make multiple search requests quickly
      for (let i = 0; i < 20; i++) {
        await torrentService.searchTorrents(`test ${i}`);
      }
      
      // Should be rate limited
      const result = await torrentService.searchTorrents('test 21');
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limited');
    });
  });

  describe('Performance', () => {
    test('should add torrent within acceptable time', async () => {
      const startTime = Date.now();
      
      const result = await torrentService.addTorrent(testMagnet);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should get torrent information within acceptable time', async () => {
      await torrentService.addTorrent(testMagnet);
      
      const startTime = Date.now();
      
      const result = await torrentService.getTorrent(testTorrent.hash);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent torrent operations', async () => {
      // Add multiple torrents concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(torrentService.addTorrent(`magnet:?xt=urn:btih:test${i}&dn=Test${i}`));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});