import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../analyticsService';

const buildService = () => {
  const service = new AnalyticsService();
  service.init = () => {};
  return service;
};

describe('AnalyticsService', () => {
  let originalFetch;
  let originalLocalStorage;
  let originalNavigator;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalLocalStorage = global.localStorage;
    originalNavigator = global.navigator;

    global.fetch = vi.fn();
    const store = {};
    global.localStorage = {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      })
    };
    global.navigator = { onLine: true };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    global.navigator = originalNavigator;
    vi.restoreAllMocks();
  });

  it('queues events and notifies subscribers', () => {
    const service = buildService();
    const listener = vi.fn();

    const unsubscribe = service.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ queueSize: 0 }));

    service.trackEvent('watchlist_add', { tmdbId: '123' });

    expect(service.getQueueSize()).toBe(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ queueSize: 1 }));

    const eventTypes = listener.mock.calls.map(([payload]) => payload.type);
    expect(eventTypes).toContain('queue_change');
    expect(eventTypes).toContain('queue_persisted');

    unsubscribe();
  });

  it('skips flush while offline', async () => {
    global.navigator = { onLine: false };
    const service = buildService();

    service.trackEvent('watchlist_add');
    const result = await service.flush({ reason: 'test_offline' });

    expect(result).toEqual({ flushed: 0, reason: 'test_offline', skipped: 'offline' });
    expect(service.getLastError()).toBe('Device offline');
    expect(service.getQueueSize()).toBe(1);
  });

  it('flushes events successfully', async () => {
    const service = buildService();

    service.trackEvent('watchlist_add', { tmdbId: '42' });
    service.trackEvent('search_performed', { query: 'matrix' });

    global.fetch.mockResolvedValue({ ok: true, status: 204 });

    const result = await service.flush({ reason: 'unit' });

    expect(result).toEqual({ flushed: 2, reason: 'unit' });
    expect(service.getQueueSize()).toBe(0);
    expect(service.getLastError()).toBeNull();
    expect(service.getLastFlushInfo()).toEqual(expect.objectContaining({ count: 2, reason: 'unit' }));
  });

  it('propagates fetch errors', async () => {
    const service = buildService();

    service.trackEvent('watchlist_add');

    global.fetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await service.flush({ reason: 'failure' });

    expect(result.flushed).toBe(0);
    expect(result.error).toBe('Analytics flush failed: 500');
    expect(service.getLastError()).toBe('Analytics flush failed: 500');
    expect(service.getQueueSize()).toBe(1);
  });
});
