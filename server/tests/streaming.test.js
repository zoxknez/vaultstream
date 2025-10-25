const request = require('supertest');
const { Readable } = require('stream');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'streaming-password';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

const BASE_ENV = {
  NODE_ENV: 'test',
  SERVER_PORT: '0',
  SERVER_HOST: '127.0.0.1',
  SERVER_PROTOCOL: 'http',
  FRONTEND_URL: 'http://frontend.test',
  CORS_ALLOWED_ORIGINS: 'http://frontend.test',
  CORS_ALLOW_ALL: 'false',
  DISABLE_BACKGROUND_TASKS: 'true',
  LOG_LEVEL: 'warn',
  LOG_REQUESTS: 'false',
  ACCESS_PASSWORD_HASH: TEST_PASSWORD_HASH,
  SESSION_SECRET: 'test-session-secret-1234567890-abcdef',
  METRICS_ENABLED: 'false'
};

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

const createMockTorrent = () => {
  const payload = Buffer.from('Sample streaming payload for integration testing.');

  const file = {
    name: 'sample-video.mkv',
    length: payload.length,
    downloaded: payload.length,
    progress: 1,
    select: jest.fn(),
    createReadStream: jest.fn(({ start = 0, end } = {}) => {
      const safeStart = Math.max(0, start);
      const safeEnd = typeof end === 'number' ? Math.min(end, payload.length - 1) : payload.length - 1;
      const chunk = payload.slice(safeStart, safeEnd + 1);
      return Readable.from([chunk]);
    })
  };

  const torrent = {
    infoHash: 'abcdef1234567890',
    name: 'Sample Video.mkv',
    length: payload.length,
    downloaded: payload.length,
    progress: 1,
    numPeers: 4,
    uploadLimit: 0,
    resume: jest.fn(),
    select: jest.fn(),
    critical: jest.fn(),
    pieceLength: 16384,
    files: [file]
  };

  torrent.__payload = payload;
  return torrent;
};

const loadApp = () => {
  let app;
  const mockTorrent = createMockTorrent();

  withEnv({}, () => {
    jest.isolateModules(() => {
      jest.doMock('../services/webTorrentClient', () => {
        const client = {
          torrents: [mockTorrent],
          add: jest.fn(),
          remove: jest.fn(),
          destroy: jest.fn()
        };
        return { client };
      });

      jest.doMock('../services/torrentService', () => {
        const torrents = { [mockTorrent.infoHash]: mockTorrent };
        return {
          torrents,
          torrentIds: {},
          torrentNames: {},
          hashToName: {},
          nameToHash: {},
          universalTorrentResolver: jest.fn(async () => mockTorrent),
          loadTorrentFromId: jest.fn(),
          setupCacheCleanup: jest.fn(),
          setupSystemMonitoring: jest.fn(),
          disableSeedingForCompletedTorrents: jest.fn(() => 0),
          registerTorrent: jest.fn()
        };
      });

      jest.doMock('../middleware/auth', () => () => (req, res, next) => {
        req.session = req.session || {};
        req.session.isAuthenticated = true;
        req.session.user = { id: 'test-user' };
        next();
      });

      const moduleExports = require('../index');
      app = moduleExports.app;
    });
  });

  return { app, mockTorrent };
};

describe('Streaming endpoints', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('serves partial content when range header is provided', async () => {
    const { app, mockTorrent } = loadApp();
    const response = await request(app)
      .get(`/api/torrents/${mockTorrent.infoHash}/files/0/stream`)
      .set('Range', 'bytes=0-4');

    expect(response.status).toBe(206);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-range']).toBe(`bytes 0-4/${mockTorrent.files[0].length}`);
    expect(response.headers['content-type']).toBe('video/x-matroska');
    expect(response.headers['content-length']).toBe('5');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.toString()).toBe(mockTorrent.__payload.slice(0, 5).toString());

    expect(mockTorrent.resume).toHaveBeenCalled();
    expect(mockTorrent.files[0].createReadStream).toHaveBeenCalledWith({ start: 0, end: 4 });
  });

  test('serves full file when range header is missing', async () => {
    const { app, mockTorrent } = loadApp();
    const response = await request(app)
      .get(`/api/torrents/${mockTorrent.infoHash}/files/0/stream`);

    expect(response.status).toBe(200);
    expect(response.headers['content-length']).toBe(String(mockTorrent.files[0].length));
    expect(response.body.length).toBe(mockTorrent.__payload.length);
    expect(Buffer.compare(response.body, mockTorrent.__payload)).toBe(0);

    expect(mockTorrent.files[0].createReadStream).toHaveBeenCalled();
    const lastCallArgs = mockTorrent.files[0].createReadStream.mock.calls.at(-1) || [];
    expect(lastCallArgs.length).toBe(0);
  });
});
