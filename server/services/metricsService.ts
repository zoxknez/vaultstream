/**
 * Metrics Service - TypeScript Migration (Sprint 2.1)
 * Prometheus metrics collection (HTTP, auth, cache, torrents, streaming)
 */

const promClient = require('prom-client');

const registry = new promClient.Registry();

promClient.collectDefaultMetrics({ register: registry });

const activeConnections = new promClient.Gauge({
  name: 'seedbox_active_connections',
  help: 'Number of active HTTP connections.'
});

const httpRequestDuration = new promClient.Histogram({
  name: 'seedbox_http_request_duration_ms',
  help: 'HTTP request latency in milliseconds.',
  labelNames: ['method', 'route', 'status'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

const authLoginAttempts = new promClient.Counter({
  name: 'seedbox_auth_login_attempts_total',
  help: 'Number of login attempts.',
  labelNames: ['result']
});

const rateLimitHits = new promClient.Counter({
  name: 'seedbox_http_rate_limited_total',
  help: 'Number of HTTP requests blocked by rate limiting.'
});

const activeTorrentsGauge = new promClient.Gauge({
  name: 'seedbox_active_torrents',
  help: 'Number of torrents currently active.'
});

const cacheHits = new promClient.Counter({
  name: 'seedbox_cache_hits_total',
  help: 'Number of cache hits.',
  labelNames: ['cache']
});

const cacheMisses = new promClient.Counter({
  name: 'seedbox_cache_misses_total',
  help: 'Number of cache misses.',
  labelNames: ['cache']
});

const streamThroughput = new promClient.Gauge({
  name: 'seedbox_stream_throughput_bytes_per_second',
  help: 'Approximate streaming throughput in bytes per second.'
});

const cacheItemsGauge = new promClient.Gauge({
  name: 'seedbox_cache_items',
  help: 'Number of items stored in caches.',
  labelNames: ['cache']
});

const frontendEventsCounter = new promClient.Counter({
  name: 'seedbox_frontend_events_total',
  help: 'Number of analytics events received from the frontend.',
  labelNames: ['event', 'source']
});

registry.registerMetric(activeConnections);
registry.registerMetric(httpRequestDuration);
registry.registerMetric(authLoginAttempts);
registry.registerMetric(rateLimitHits);
registry.registerMetric(activeTorrentsGauge);
registry.registerMetric(cacheHits);
registry.registerMetric(cacheMisses);
registry.registerMetric(streamThroughput);
registry.registerMetric(cacheItemsGauge);
registry.registerMetric(frontendEventsCounter);

export function trackRequestDuration(req: any, res: any, route: string): void {
  const end = httpRequestDuration.startTimer({ method: req.method, route });
  res.on('finish', () => {
    end({ status: res.statusCode });
  });
}

let activeConnectionsValue = 0;

export function setActiveConnections(value: number): void {
  activeConnectionsValue = value;
  activeConnections.set(value);
}

export function incrementActiveConnections(): void {
  setActiveConnections(activeConnectionsValue + 1);
}

export function decrementActiveConnections(): void {
  setActiveConnections(Math.max(0, activeConnectionsValue - 1));
}

export function getActiveConnections(): number {
  return activeConnectionsValue;
}

export function incLoginAttempt(result: string): void {
  authLoginAttempts.inc({ result });
}

export function incRateLimit(): void {
  rateLimitHits.inc();
}

export function setActiveTorrents(value: number): void {
  activeTorrentsGauge.set(value);
}

export function incCacheHit(cacheName: string): void {
  cacheHits.inc({ cache: cacheName });
}

export function incCacheMiss(cacheName: string): void {
  cacheMisses.inc({ cache: cacheName });
}

export function setStreamThroughput(value: number): void {
  streamThroughput.set(value);
}

export function setCacheItems(cacheName: string, value: number): void {
  cacheItemsGauge.set({ cache: cacheName }, value);
}

export function incFrontendEvent(event: string, source: string = 'frontend'): void {
  frontendEventsCounter.inc({ event, source });
}

// CommonJS compatibility
module.exports = {
  registry,
  trackRequestDuration,
  setActiveConnections,
  incrementActiveConnections,
  decrementActiveConnections,
  getActiveConnections,
  incLoginAttempt,
  incRateLimit,
  setActiveTorrents,
  incCacheHit,
  incCacheMiss,
  setStreamThroughput,
  setCacheItems,
  incFrontendEvent
};
