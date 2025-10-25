const request = require('supertest');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'tajna-lozinka';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

const BASE_ENV = {
  NODE_ENV: 'test',
  SERVER_PORT: '0',
  SERVER_HOST: '127.0.0.1',
  FRONTEND_URL: 'http://allowed.test',
  CORS_ALLOWED_ORIGINS: 'http://allowed.test',
  CORS_ALLOW_ALL: 'false',
  DISABLE_BACKGROUND_TASKS: 'true',
  LOG_LEVEL: 'warn',
  LOG_REQUESTS: 'false',
  ACCESS_PASSWORD_HASH: TEST_PASSWORD_HASH,
  SESSION_SECRET: 'test-session-secret-1234567890-abcdef'
};

const ALLOWED_ORIGIN = BASE_ENV.FRONTEND_URL;
const CSRF_HEADER = 'X-Seedbox-CSRF';

const withEnv = (overrides, fn) => {
  const applied = { ...BASE_ENV, ...overrides };
  const previous = {};

  Object.entries(applied).forEach(([key, value]) => {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  try {
    return fn();
  } finally {
    Object.keys(applied).forEach((key) => {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    });
  }
};

const DEFAULT_CACHE_STATS = {
  totalSizeFormatted: '0 B',
  totalSize: 0,
  activeTorrents: 0,
  cacheSize: 0,
  downloadedBytes: 0,
  totalTorrentSize: 0,
  totalTorrentSizeFormatted: '0 B',
  cacheLimit: 5 * 1024 * 1024 * 1024,
  cacheLimitFormatted: '5 GB',
  usagePercentage: 0,
  fileCount: 0,
  directories: [],
  lastUpdated: new Date(0).toISOString()
};

const DEFAULT_CACHE_CLEAR_RESULT = {
  deletedFiles: 0,
  deletedSize: 0,
  deletedSizeFormatted: '0 B',
  freedSpace: 0,
  freedSpaceFormatted: '0 B',
  days: 7
};

const DEFAULT_DISK_USAGE = {
  total: 1024 * 1024 * 1024 * 100,
  used: 1024 * 1024 * 1024 * 40,
  available: 1024 * 1024 * 1024 * 60,
  percentage: 40
};

const expectRequestIdHeader = (response, expected) => {
  const header = response.headers['x-request-id'];
  expect(header).toBeDefined();
  if (expected) {
    expect(header).toBe(expected);
  } else {
    expect(header).toMatch(/^[a-zA-Z0-9_-]{8,}$/);
  }
};

const expectRequestIdBody = (response, expected) => {
  expect(response.body).toBeDefined();
  expect(response.body.requestId).toBeDefined();
  const { requestId } = response.body;
  if (expected) {
    expect(requestId).toBe(expected);
  } else {
    expect(requestId).toBe(response.headers['x-request-id']);
  }
};

const resolveValue = (value, fallback) => {
  if (typeof value === 'function') {
    return value();
  }
  return value !== undefined ? value : fallback;
};

const loadApp = (envOverrides = {}, options = {}) => {
  const { cacheStats, cacheClearResult, diskUsage } = options;
  let app;

  withEnv(envOverrides, () => {
    jest.isolateModules(() => {
      jest.doMock('../services/webTorrentClient', () => ({
        client: {
          torrents: [],
          add: jest.fn(),
          remove: jest.fn((torrent, options, callback) => {
            if (typeof callback === 'function') {
              callback();
            }
          }),
          destroy: jest.fn()
        }
      }));

      jest.doMock('../services/cacheService', () => {
        const resolvedStats = resolveValue(cacheStats, DEFAULT_CACHE_STATS);
        const resolvedClearResult = resolveValue(cacheClearResult, DEFAULT_CACHE_CLEAR_RESULT);

        return {
          CACHE_DIRECTORIES: ['test-cache'],
          getCacheStats: jest.fn(() => ({ ...resolvedStats })),
          clearOldCacheFiles: jest.fn(() => ({ ...resolvedClearResult }))
        };
      });

      jest.doMock('../services/systemService', () => {
        const resolvedDiskUsage = resolveValue(diskUsage, DEFAULT_DISK_USAGE);
        return {
          FALLBACK_DISK_USAGE: resolvedDiskUsage,
          getDiskUsage: jest.fn(() => Promise.resolve({ ...resolvedDiskUsage }))
        };
      });

      const moduleExports = require('../index');
      app = moduleExports.app;
      app.__testClient = require('../services/webTorrentClient').client;
      app.__testTorrentService = require('../services/torrentService');
    });
  });

  return app;
};

describe('Bezbednosne zaštite', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('blokira prijavu kada autentikacija nije podešena', async () => {
    const app = loadApp({ ACCESS_PASSWORD: undefined, ACCESS_PASSWORD_HASH: undefined });

    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: 'bilošta' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('AUTH_NOT_CONFIGURED');
    expect(response.body.error.message).toBe('Authentication is temporarily unavailable. Please contact the administrator.');
    expectRequestIdHeader(response);
    expectRequestIdBody(response);
  });

  test('dozvoljava prijavu sa ispravnom lozinkom i kreira sesiju', async () => {
    const app = loadApp();
    const agent = request.agent(app);

    const response = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('Authentication successful');
    expect(typeof response.body.data.csrfToken).toBe('string');
    expect(response.body.data.csrfToken.length).toBeGreaterThanOrEqual(32);
    expectRequestIdHeader(response);

    const cookies = response.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('sbx.sid='))).toBe(true);

    const metricsResponse = await agent
      .get('/api/metrics')
      .set('Origin', ALLOWED_ORIGIN);
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.headers['content-type']).toContain('text/plain');
    expect(metricsResponse.text.length).toBeGreaterThan(0);
    expectRequestIdHeader(metricsResponse);
  });

  test('odbija prijavu sa pogrešnom lozinkom', async () => {
    const app = loadApp();

    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: 'netačna-lozinka' });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid password.'
    });
    expectRequestIdHeader(response);
    expectRequestIdBody(response);
  });

  test('CORS odbija zahteve sa neautorizovanog origin-a', async () => {
    const app = loadApp({ ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' });

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://zlonamerni.test');

    expect(response.status).toBe(403);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('UNKNOWN_ERROR');
    expect(response.body.error.message).toBe('CORS origin denied');
    expectRequestIdHeader(response);
    expectRequestIdBody(response);
  });

  test('CORS dozvoljava zahteve sa dozvoljenog origin-a', async () => {
    const app = loadApp({ ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' });

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.test');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://trusted.test');
    expectRequestIdHeader(response);
  });

  test('poštuje dolazeći X-Request-Id header', async () => {
    const app = loadApp({ ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' });
    const requestId = 'existing-request-123ABC';

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.test')
      .set('X-Request-Id', requestId);

    expect(response.status).toBe(200);
    expectRequestIdHeader(response, requestId);
    expect(response.body.requestId).toBeUndefined();
  });

  test('health endpoint izveštava disk statistiku i build metapodatke bez curenja tajni', async () => {
    const buildEnv = {
      ACCESS_PASSWORD: 'tajna',
      CORS_ALLOWED_ORIGINS: 'http://trusted.test',
      BUILD_VERSION: '2024.09.1',
      BUILD_COMMIT: 'abcdef1234567890fedcba',
      BUILD_TIMESTAMP: '2024-09-10T12:34:56Z'
    };

    const app = loadApp(buildEnv);

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.test');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(response.body.startedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(response.body.disk).toEqual(DEFAULT_DISK_USAGE);

    const build = response.body.build;
    expect(build).toBeDefined();
    expect(build).toMatchObject({
      version: '2024.09.1',
      commit: 'abcdef123456',
      timestamp: '2024-09-10T12:34:56.000Z',
      environment: 'test'
    });
    expect(typeof build.node).toBe('string');

    const allowedKeys = ['version', 'commit', 'timestamp', 'environment', 'node'];
    expect(Object.keys(build).every((key) => allowedKeys.includes(key))).toBe(true);
    expect(Object.values(build).some((value) => typeof value === 'string' && value.includes('tajna'))).toBe(false);

    expectRequestIdHeader(response);
  });

  test('globalni rate limiter vraća 429 nakon prve prekoračene kvote', async () => {
    const app = loadApp({
      ACCESS_PASSWORD: 'tajna',
      CORS_ALLOWED_ORIGINS: 'http://trusted.test',
      RATE_LIMIT_MAX: '1',
      RATE_LIMIT_WINDOW_MS: '60000'
    });

    const first = await request(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.test');

    expect(first.status).toBe(200);
    expectRequestIdHeader(first);

    const second = await request(app)
      .get('/api/health')
      .set('Origin', 'http://trusted.test');

    expect(second.status).toBe(429);
    expect(second.body.error).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.'
    });
    expectRequestIdHeader(second);
    expectRequestIdBody(second);
  });

  test('metrics endpoint zahteva aktivnu sesiju', async () => {
    const app = loadApp();

    const unauthorized = await request(app)
      .get('/api/metrics');

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body.error).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Authentication required.'
    });
    expectRequestIdHeader(unauthorized);
    expectRequestIdBody(unauthorized);

    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ password: TEST_PASSWORD })
      .expect(200);

    const authorized = await agent
      .get('/api/metrics');

    expect(authorized.status).toBe(200);
    expect(authorized.headers['content-type']).toContain('text/plain');
    expect(authorized.text.length).toBeGreaterThan(0);
    expectRequestIdHeader(authorized);
  });

  test('logout zahteva CSRF token', async () => {
    const app = loadApp();
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    const csrfToken = login.body.data.csrfToken;

    const missingToken = await agent
      .post('/api/auth/logout')
      .set('Origin', ALLOWED_ORIGIN);

    expect(missingToken.status).toBe(403);
    expect(missingToken.body.error).toEqual({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token.'
    });
    expectRequestIdHeader(missingToken);
    expectRequestIdBody(missingToken);

    const success = await agent
      .post('/api/auth/logout')
      .set('Origin', ALLOWED_ORIGIN)
      .set(CSRF_HEADER, csrfToken);

    expect(success.status).toBe(200);
    expect(success.body.success).toBe(true);
    expect(success.body.data.message).toBe('Logged out successfully.');
    expectRequestIdHeader(success);
  });

  test('clear-old cache zahteva CSRF token', async () => {
    const cacheClearResult = {
      deletedFiles: 3,
      deletedSize: 1024,
      deletedSizeFormatted: '1 KB',
      freedSpace: 1024,
      freedSpaceFormatted: '1 KB',
      days: 7
    };

    const app = loadApp({}, { cacheClearResult });
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    const csrfToken = login.body.data.csrfToken;

    const forbidden = await agent
      .post('/api/cache/clear-old')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ days: 5 });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toEqual({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token.'
    });
    expectRequestIdHeader(forbidden);
    expectRequestIdBody(forbidden);

    const allowed = await agent
      .post('/api/cache/clear-old')
      .set('Origin', ALLOWED_ORIGIN)
      .set(CSRF_HEADER, csrfToken)
      .send({ days: 5 });

    expect(allowed.status).toBe(200);
    expect(allowed.body.success).toBe(true);
    expect(allowed.body.deletedFiles).toBe(cacheClearResult.deletedFiles);
    expect(allowed.body.cacheDirectories).toEqual(['test-cache']);
    expectRequestIdHeader(allowed);
  });

  test('cache clear endpoint uklanja torente i zahteva CSRF token', async () => {
    const cacheClearResult = {
      deletedFiles: 5,
      deletedSize: 4096,
      deletedSizeFormatted: '4 KB',
      freedSpace: 4096,
      freedSpaceFormatted: '4 KB',
      days: 0
    };

  const app = loadApp({}, { cacheClearResult });
  const agent = request.agent(app);

  const client = app.__testClient;
  const { registerTorrent } = app.__testTorrentService;

    const sampleTorrent = {
      infoHash: 'abc123',
      name: 'Test torrent',
      downloaded: 2048,
      length: 4096
    };

    client.torrents.push(sampleTorrent);
    client.remove.mockImplementation((torrent, options, callback) => {
      client.torrents = client.torrents.filter((item) => item !== torrent);
      if (typeof callback === 'function') {
        callback();
      }
    });
    registerTorrent(sampleTorrent, 'test.torrent');

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    const csrfToken = login.body.data.csrfToken;

    const forbidden = await agent
      .post('/api/cache/clear')
      .set('Origin', ALLOWED_ORIGIN);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toEqual({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token.'
    });
    expectRequestIdHeader(forbidden);
    expectRequestIdBody(forbidden);

    const allowed = await agent
      .post('/api/cache/clear')
      .set('Origin', ALLOWED_ORIGIN)
      .set(CSRF_HEADER, csrfToken);

    expect(allowed.status).toBe(200);
    expect(allowed.body.success).toBe(true);
    expect(allowed.body.clearedTorrents).toBe(1);
    expect(allowed.body.failedTorrents).toBe(0);
    expect(allowed.body.cacheDirectories).toEqual(['test-cache']);
    expect(allowed.body.cacheCleanup).toEqual({
      deletedFiles: cacheClearResult.deletedFiles,
      deletedSize: cacheClearResult.deletedSize,
      deletedSizeFormatted: cacheClearResult.deletedSizeFormatted,
      freedSpace: cacheClearResult.freedSpace,
      freedSpaceFormatted: cacheClearResult.freedSpaceFormatted,
      days: cacheClearResult.days
    });
    expect(client.remove).toHaveBeenCalledTimes(1);
    expectRequestIdHeader(allowed);
  });

  test('cache stats vraćaju stubirane vrednosti', async () => {
    const customStats = {
      totalSizeFormatted: '1.00 GB',
      totalSize: 1024 * 1024 * 1024,
      activeTorrents: 3,
      cacheSize: 1024 * 1024 * 1024,
      downloadedBytes: 1024 * 1024 * 512,
      totalTorrentSize: 1024 * 1024 * 2048,
      totalTorrentSizeFormatted: '2.00 GB',
      cacheLimitFormatted: '5 GB',
      usagePercentage: 20
    };

    const app = loadApp(
      { ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' },
      { cacheStats: customStats }
    );

    const response = await request(app)
      .get('/api/cache/stats')
      .set('Origin', 'http://trusted.test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(customStats);
    expectRequestIdHeader(response);
  });

  test('system overview vraća zbirne metrike', async () => {
    const cacheStats = {
      totalSizeFormatted: '512.00 MB',
      totalSize: 512 * 1024 * 1024,
      activeTorrents: 5,
      cacheSize: 512 * 1024 * 1024,
      downloadedBytes: 400 * 1024 * 1024,
      totalTorrentSize: 800 * 1024 * 1024,
      totalTorrentSizeFormatted: '800.00 MB',
      cacheLimitFormatted: '5 GB',
      usagePercentage: 15
    };

    const diskUsage = {
      total: 2 * 1024 * 1024 * 1024,
      used: 1024 * 1024 * 1024,
      available: 1024 * 1024 * 1024,
      percentage: 50
    };

    const app = loadApp(
      { ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' },
      { cacheStats, diskUsage }
    );

    const response = await request(app)
      .get('/api/system/overview')
      .set('Origin', 'http://trusted.test');

    expect(response.status).toBe(200);
    expect(response.body.cache).toEqual(cacheStats);
    expect(response.body.disk).toEqual(diskUsage);
    expect(response.body.torrents.active).toBe(cacheStats.activeTorrents);

    const expectedCacheUsage = Math.round(((cacheStats.cacheSize / diskUsage.total) * 100) * 10) / 10;
    expect(response.body.metrics.cacheUsagePercentage).toBe(expectedCacheUsage);
    expect(typeof response.body.metrics.totalDiskFormatted).toBe('string');
    expectRequestIdHeader(response);
  });

  test('nepoznati API put vraća 404 i requestId', async () => {
    const app = loadApp({ ACCESS_PASSWORD: 'tajna', CORS_ALLOWED_ORIGINS: 'http://trusted.test' });

    const response = await request(app)
      .get('/api/unknown-route')
      .set('Origin', 'http://trusted.test');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Route not found'
    });
    expectRequestIdHeader(response);
    expectRequestIdBody(response);
  });
});

describe('Analytics API', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('zahteva autentikaciju za slanje događaja', async () => {
    const app = loadApp();

    const response = await request(app)
      .post('/api/analytics/events')
      .set('Origin', ALLOWED_ORIGIN)
      .send({
        events: [
          {
            name: 'watchlist_add',
            payload: { tmdbId: 'tmdb-unauth', title: 'Unauthorized Movie' }
          }
        ]
      });

    expect(response.status).toBe(401);
  });

  test('čuva događaje i vraća sumarni pregled', async () => {
    const app = loadApp();
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    expect(loginResponse.status).toBe(200);
    const csrfToken = loginResponse.body.data.csrfToken;

    const events = [
      {
        name: 'watchlist_add',
        payload: { tmdbId: 'tmdb-1', title: 'Primer filma', mediaType: 'movie' }
      },
      {
        name: 'watch_progress',
        payload: {
          tmdbId: 'tmdb-1',
          title: 'Primer filma',
          mediaType: 'movie',
          genres: ['Akcija', 'SF']
        }
      },
      {
        name: 'search_performed',
        payload: { query: 'najbolji sf filmovi' }
      }
    ];

    const postResponse = await agent
      .post('/api/analytics/events')
      .set('Origin', ALLOWED_ORIGIN)
      .set(CSRF_HEADER, csrfToken)
      .send({ events });

    expect(postResponse.status).toBe(204);

    const summaryResponse = await agent
      .get('/api/analytics/summary')
      .set('Origin', ALLOWED_ORIGIN);

    expect(summaryResponse.status).toBe(200);
    const summary = summaryResponse.body;

    expect(summary.totals).toMatchObject({
      watchlist_add: 1,
      watch_progress: 1,
      search_performed: 1
    });

    expect(summary.topWatchlist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tmdbId: 'tmdb-1', title: 'Primer filma', count: 1 })
      ])
    );

    expect(summary.topProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tmdbId: 'tmdb-1', title: 'Primer filma', count: 1 })
      ])
    );

    expect(summary.topGenres).toEqual(
      expect.arrayContaining([
        { name: 'Akcija', count: 1 },
        { name: 'SF', count: 1 }
      ])
    );

    expect(summary.topSearches).toEqual(
      expect.arrayContaining([
        { query: 'najbolji sf filmovi', count: 1 }
      ])
    );

    expect(Array.isArray(summary.recent)).toBe(true);
    expect(summary.recent[0].name).toBe('search_performed');
    expect(summary.recent[0].source).toBe('frontend');

    expect(Array.isArray(summary.dailyTotals)).toBe(true);
  const latestDay = summary.dailyTotals[summary.dailyTotals.length - 1];
    expect(latestDay).toBeDefined();
    expect(latestDay.total).toBeGreaterThanOrEqual(events.length);
    expect(typeof latestDay.date).toBe('string');

    expect(Array.isArray(summary.anomalies)).toBe(true);
  });

  test('zahteva CSRF token za batch', async () => {
    const app = loadApp();
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post('/api/analytics/events')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ events: [{ name: 'watchlist_add' }] });

    expect(response.status).toBe(403);
    expect(response.body.error?.code).toBe('CSRF_TOKEN_INVALID');
  });

  test('odgovara 400 za nevalidan payload', async () => {
    const app = loadApp();
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ password: TEST_PASSWORD });

    const csrfToken = loginResponse.body.data.csrfToken;

    const response = await agent
      .post('/api/analytics/events')
      .set('Origin', ALLOWED_ORIGIN)
      .set(CSRF_HEADER, csrfToken)
      .send({ events: [] });

    expect(response.status).toBe(400);
    expect(response.body.error?.message || response.body.error).toBe('INVALID_ANALYTICS_PAYLOAD');
    expect(Array.isArray(response.body.error?.details || [])).toBe(true);
  });
});
