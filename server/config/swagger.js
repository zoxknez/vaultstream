/**
 * Swagger/OpenAPI Configuration
 * API documentation setup for StreamVault
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StreamVault API',
      version: '1.0.0',
      description:
        'Premium Torrent Streaming Platform API - Netflix-style interface with instant playback',
      contact: {
        name: 'StreamVault Team',
        url: 'https://github.com/zoxknez/netflix'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.streamvault.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using HTTP-only cookies'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Seedbox-CSRF',
          description: 'CSRF token required for state-changing operations'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request parameters' },
                details: { type: 'object' }
              }
            }
          }
        },
        Torrent: {
          type: 'object',
          properties: {
            infoHash: { type: 'string', example: 'a1b2c3d4e5f6...' },
            name: { type: 'string', example: 'Movie Name (2024) 1080p' },
            size: { type: 'number', example: 2147483648 },
            downloaded: { type: 'number', example: 1073741824 },
            uploaded: { type: 'number', example: 0 },
            progress: { type: 'number', format: 'float', example: 0.5 },
            downloadSpeed: { type: 'number', example: 1048576 },
            uploadSpeed: { type: 'number', example: 0 },
            peers: { type: 'number', example: 25 },
            addedAt: { type: 'string', format: 'date-time' }
          }
        },
        TorrentFile: {
          type: 'object',
          properties: {
            index: { type: 'number', example: 0 },
            name: { type: 'string', example: 'movie.mp4' },
            size: { type: 'number', example: 2147483648 },
            downloaded: { type: 'number', example: 1073741824 },
            progress: { type: 'number', format: 'float', example: 0.5 }
          }
        },
        SearchResult: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Movie Name' },
            magnet: { type: 'string' },
            seeders: { type: 'number', example: 150 },
            leechers: { type: 'number', example: 25 },
            size: { type: 'string', example: '2.0 GB' },
            source: { type: 'string', example: '1337x' }
          }
        },
        CacheStats: {
          type: 'object',
          properties: {
            totalSizeFormatted: { type: 'string', example: '5.2 GB' },
            totalSize: { type: 'number', example: 5580472320 },
            activeTorrents: { type: 'number', example: 12 },
            fileCount: { type: 'number', example: 345 },
            cacheLimitFormatted: { type: 'string', example: '5.0 GB' },
            usagePercentage: { type: 'number', example: 104.2 }
          }
        },
        MemoryStats: {
          type: 'object',
          properties: {
            heapUsed: { type: 'number', example: 157286400 },
            heapTotal: { type: 'number', example: 209715200 },
            external: { type: 'number', example: 5242880 },
            rss: { type: 'number', example: 314572800 },
            uptime: { type: 'number', example: 86400 },
            leaksDetected: { type: 'number', example: 0 }
          }
        },
        AuditStats: {
          type: 'object',
          properties: {
            totalEvents: { type: 'number', example: 1523 },
            authSuccess: { type: 'number', example: 145 },
            authFailure: { type: 'number', example: 8 },
            torrentAdded: { type: 'number', example: 234 },
            cacheCleared: { type: 'number', example: 12 }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'CSRF token missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Invalid CSRF token'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Torrents',
        description: 'Torrent management and streaming'
      },
      {
        name: 'Search',
        description: 'Torrent search across multiple providers'
      },
      {
        name: 'Subtitles',
        description: 'Subtitle search and management'
      },
      {
        name: 'Cache',
        description: 'Cache management and statistics'
      },
      {
        name: 'System',
        description: 'System monitoring and health checks'
      },
      {
        name: 'Analytics',
        description: 'User analytics and insights'
      },
      {
        name: 'Memory',
        description: 'Memory monitoring and leak detection'
      },
      {
        name: 'Audit',
        description: 'Audit logs and compliance'
      },
      {
        name: 'Database',
        description: 'Database monitoring and statistics'
      }
    ]
  },
  apis: ['./index.js', './routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
