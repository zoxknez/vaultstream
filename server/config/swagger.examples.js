/**
 * Swagger API Examples
 * Common request/response examples for documentation
 */

module.exports = {
  // Authentication Examples
  loginRequest: {
    password: 'your-secure-password'
  },
  loginResponse: {
    success: true,
    message: 'Authentication successful',
    data: {
      authenticated: true,
      csrfToken: 'abc123def456...'
    }
  },

  // Torrent Examples
  torrentListResponse: {
    torrents: [
      {
        infoHash: 'a1b2c3d4e5f6789012345678901234567890abcd',
        name: 'The Matrix (1999) 1080p BluRay',
        size: 2147483648,
        downloaded: 1073741824,
        uploaded: 0,
        progress: 0.5,
        downloadSpeed: 1048576,
        uploadSpeed: 0,
        peers: 25,
        addedAt: '2025-10-13T10:30:00.000Z'
      }
    ],
    total: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1
  },

  uploadMagnetRequest: {
    magnet: 'magnet:?xt=urn:btih:...'
  },

  // Search Examples
  searchQuery: {
    query: 'The Matrix',
    sources: ['1337x', 'thepiratebay'],
    page: 1,
    limit: 20
  },

  searchResponse: {
    query: 'The Matrix',
    page: 1,
    limit: 20,
    sources: ['1337x', 'thepiratebay'],
    results: [
      {
        title: 'The Matrix (1999) 1080p BluRay',
        magnet: 'magnet:?xt=urn:btih:...',
        seeders: 150,
        leechers: 25,
        size: '2.0 GB',
        source: '1337x'
      }
    ],
    errors: []
  },

  // Cache Examples
  cacheStatsResponse: {
    totalSizeFormatted: '5.2 GB',
    totalSize: 5580472320,
    activeTorrents: 12,
    fileCount: 345,
    cacheLimitFormatted: '5.0 GB',
    usagePercentage: 104.2,
    directories: [
      {
        path: 'downloads',
        fileCount: 234,
        totalSize: 4294967296,
        totalSizeFormatted: '4.0 GB'
      }
    ]
  },

  clearCacheRequest: {
    days: 7
  },

  // System Examples
  healthCheckResponse: {
    status: 'healthy',
    timestamp: '2025-10-13T10:30:00.000Z',
    uptime: 86400,
    environment: 'production',
    version: '1.0.0'
  },

  systemOverviewResponse: {
    cache: {
      totalSizeFormatted: '5.2 GB',
      activeTorrents: 12
    },
    disk: {
      total: 107374182400,
      used: 53687091200,
      available: 53687091200
    },
    torrents: {
      active: 12
    },
    metrics: {
      cacheUsagePercentage: 4.9,
      totalDiskFormatted: '100.0 GB'
    }
  },

  // Memory Examples
  memoryStatsResponse: {
    current: {
      heapUsed: 157286400,
      heapTotal: 209715200,
      external: 5242880,
      rss: 314572800
    },
    baseline: {
      heapUsed: 104857600,
      heapTotal: 157286400
    },
    uptime: 86400,
    leaksDetected: 0,
    connections: {
      active: 15,
      peak: 42
    }
  },

  // Audit Examples
  auditStatsResponse: {
    totalEvents: 1523,
    byType: {
      'auth:success': 145,
      'auth:failure': 8,
      'torrent:added': 234,
      'cache:cleared': 12
    },
    dateRange: {
      earliest: '2025-07-13T00:00:00.000Z',
      latest: '2025-10-13T10:30:00.000Z'
    },
    retentionDays: 90
  },

  auditQueryResponse: {
    events: [
      {
        timestamp: '2025-10-13T10:30:00.000Z',
        type: 'auth:success',
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          sessionId: 'sess123'
        }
      }
    ],
    total: 145,
    page: 1,
    pageSize: 50
  },

  // Analytics Examples
  analyticsEventRequest: {
    events: [
      {
        type: 'watchlist_add',
        tmdbId: 603,
        mediaType: 'movie',
        source: 'frontend'
      }
    ]
  },

  analyticsInsightsResponse: {
    summary: {
      totalEvents: 5432,
      uniqueUsers: 127,
      dateRange: {
        start: '2025-10-01',
        end: '2025-10-13'
      }
    },
    topActivities: [
      { type: 'watchlist_add', count: 234 },
      { type: 'video_progress', count: 1523 }
    ],
    topTitles: [{ tmdbId: 603, title: 'The Matrix', count: 45 }],
    topGenres: [
      { genre: 'Action', count: 345 },
      { genre: 'Sci-Fi', count: 278 }
    ]
  },

  // Database Examples
  databaseStatsResponse: {
    pool: {
      total: 10,
      active: 3,
      idle: 7,
      waiting: 0
    },
    queries: {
      total: 12345,
      successful: 12289,
      failed: 56
    },
    performance: {
      avgQueryTime: 45,
      slowQueries: 23
    },
    health: 'healthy'
  }
};
