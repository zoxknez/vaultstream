import { getCsrfHeader } from './serverSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const QUEUE_KEY = 'seedbox_analytics_queue_v1';
const MAX_QUEUE_SIZE = 250;
const FLUSH_DEBOUNCE_MS = 1500;
const FLUSH_HISTORY_KEY = 'seedbox_analytics_flush_history_v1';

const isBrowser = typeof window !== 'undefined';
const getIsOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : false);

export class AnalyticsService {
  constructor() {
    this.queue = this.#restoreQueue();
    this.initialized = false;
    this.flushTimer = null;
    this.lastError = null;
    this.lastFlushInfo = null;
    this.flushHistory = this.#restoreFlushHistory();
    this.listeners = new Set();
  }

  init() {
    if (this.initialized || !isBrowser) {
      return;
    }

    this.initialized = true;

    window.addEventListener('online', () => {
      this.flush({ reason: 'online' }).catch(() => {});
    });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush({ reason: 'background' }).catch(() => {});
      }
    });

    if (getIsOnline()) {
      this.flush({ reason: 'startup' }).catch(() => {});
    }
  }

  trackEvent(name, payload = {}) {
    if (!name) {
      return;
    }

    if (!this.initialized) {
      this.init();
    }

    const event = {
      id: typeof crypto !== 'undefined' && crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      payload,
      timestamp: new Date().toISOString()
    };

    this.queue.push(event);

    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE_SIZE);
    }

    this.#persistQueue();
    this.#notify('queue_change', { event });
    this.#debouncedFlush();
  }

  async flush({ reason = 'manual' } = {}) {
    if (!getIsOnline()) {
      this.lastError = 'Device offline';
      this.lastFlushInfo = {
        timestamp: new Date().toISOString(),
        reason,
        count: 0,
        error: this.lastError
      };
      this.#notify('flush_skipped', { skipped: 'offline' });
      return { flushed: 0, reason, skipped: 'offline' };
    }

    if (this.queue.length === 0) {
      this.#notify('flush_skipped', { skipped: 'empty' });
      return { flushed: 0, reason, skipped: 'empty' };
    }

    if (!API_BASE_URL) {
      return { flushed: 0, reason, skipped: 'no_api_base' };
    }

    const eventsToSend = [...this.queue];
    const startedAt = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/events`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeader()
        },
        body: JSON.stringify({ events: eventsToSend, reason })
      });

      if (!response.ok) {
        throw new Error(`Analytics flush failed: ${response.status}`);
      }

      this.queue = [];
      this.#persistQueue();
      this.lastError = null;
      this.lastFlushInfo = {
        timestamp: new Date().toISOString(),
        reason,
        count: eventsToSend.length,
        durationMs: Date.now() - startedAt
      };
      this.#appendFlushHistory({
        timestamp: this.lastFlushInfo.timestamp,
        durationMs: this.lastFlushInfo.durationMs,
        count: this.lastFlushInfo.count
      });
      this.#notify('flush_success', { flushed: eventsToSend.length, durationMs: this.lastFlushInfo.durationMs });

      return { flushed: eventsToSend.length, reason };
    } catch (error) {
      this.lastError = error.message;
      this.lastFlushInfo = {
        timestamp: new Date().toISOString(),
        reason,
        count: 0,
        error: error.message
      };
      this.#notify('flush_error', { error: error.message });
      this.#appendFlushHistory({
        timestamp: this.lastFlushInfo?.timestamp || new Date().toISOString(),
        durationMs: 0,
        count: 0,
        error: error.message
      });
      return { flushed: 0, reason, error: error.message };
    }
  }

  async getSummary() {
    if (!getIsOnline()) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/summary`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Analytics summary failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to load analytics summary', error);
      return null;
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  getLastError() {
    return this.lastError;
  }

  getLastFlushInfo() {
    return this.lastFlushInfo;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);

    try {
      listener(this.#snapshot('init'));
    } catch (error) {
      console.warn('Analytics listener failed during init', error);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  #snapshot(type = 'update') {
    return {
      type,
      queueSize: this.queue.length,
      lastError: this.lastError,
      lastFlush: this.lastFlushInfo,
      flushHistory: [...this.flushHistory]
    };
  }

  #appendFlushHistory(entry) {
    this.flushHistory.push(entry);
    if (this.flushHistory.length > 20) {
      this.flushHistory.splice(0, this.flushHistory.length - 20);
    }
    this.#persistFlushHistory();
  }

  #notify(type = 'update', extra = {}) {
    if (this.listeners.size === 0) {
      return;
    }

    const payload = {
      ...this.#snapshot(type),
      ...extra
    };

    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.warn('Analytics listener error', error);
      }
    });
  }

  #debouncedFlush() {
    if (!getIsOnline()) {
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush({ reason: 'debounce' }).catch(() => {});
    }, FLUSH_DEBOUNCE_MS);
  }

  #persistQueue() {
    if (!isBrowser) {
      return;
    }

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Unable to persist analytics queue', error);
    }

    this.#notify('queue_persisted');
  }

  #persistFlushHistory() {
    if (!isBrowser) {
      return;
    }

    try {
      localStorage.setItem(FLUSH_HISTORY_KEY, JSON.stringify(this.flushHistory));
    } catch (error) {
      console.warn('Unable to persist flush history', error);
    }
  }

  #restoreQueue() {
    if (!isBrowser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to restore analytics queue', error);
      return [];
    }
  }

  #restoreFlushHistory() {
    if (!isBrowser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(FLUSH_HISTORY_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to restore flush history', error);
      return [];
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
