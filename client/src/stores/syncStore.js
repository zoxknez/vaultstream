/**
 * 🏪 SYNC STORE - React 19 useSyncExternalStore Pattern
 * Optimized external store for sync state
 * Eliminates unnecessary re-renders with granular selectors
 */

import analyticsService from '../services/analyticsService';
import { getSyncStatus, subscribeToSyncStatus } from '../services/syncService';

// Internal store state
let syncState = {
  ...getSyncStatus(),
  analytics: {
    queueSize: 0,
    lastError: null,
    lastFlush: null,
    lastEvent: null,
    flushHistory: []
  }
};

let listeners = new Set();

// Notify all listeners
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Subscribe to sync service changes
subscribeToSyncStatus((nextStatus) => {
  syncState = {
    ...nextStatus,
    analytics: syncState.analytics
  };
  notifyListeners();
});

// Subscribe to analytics changes
analyticsService.subscribe((snapshot) => {
  syncState = {
    ...syncState,
    analytics: {
      queueSize: snapshot.queueSize,
      lastError: snapshot.lastError,
      lastFlush: snapshot.lastFlush,
      lastEvent: snapshot.type,
      flushHistory: snapshot.flushHistory || []
    }
  };
  notifyListeners();
});

// ✅ Store API
export const syncStore = {
  /**
   * Subscribe to store changes
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get current snapshot
   */
  getSnapshot() {
    return syncState;
  },

  /**
   * Get server snapshot (for SSR - not used in Electron)
   */
  getServerSnapshot() {
    return {
      enabled: false,
      connected: false,
      queueSize: 0,
      lastSync: null,
      error: null,
      analytics: {
        queueSize: 0,
        lastError: null,
        lastFlush: null,
        lastEvent: null,
        flushHistory: []
      }
    };
  },

  /**
   * Update sync state
   */
  updateSyncState(updates) {
    syncState = { ...syncState, ...updates };
    notifyListeners();
  }
};

// ✅ Granular Selectors

/**
 * Select sync enabled status
 */
export function selectSyncEnabled(state) {
  return state.enabled;
}

/**
 * Select connection status
 */
export function selectIsConnected(state) {
  return state.connected;
}

/**
 * Select queue size
 */
export function selectQueueSize(state) {
  return state.queueSize;
}

/**
 * Select last sync timestamp
 */
export function selectLastSync(state) {
  return state.lastSync;
}

/**
 * Select sync error
 */
export function selectSyncError(state) {
  return state.error;
}

/**
 * Select analytics queue size
 */
export function selectAnalyticsQueueSize(state) {
  return state.analytics?.queueSize || 0;
}

/**
 * Select analytics last error
 */
export function selectAnalyticsLastError(state) {
  return state.analytics?.lastError;
}

/**
 * Select full analytics state
 */
export function selectAnalytics(state) {
  return state.analytics;
}

/**
 * Select combined sync health
 */
export function selectSyncHealth(state) {
  return {
    healthy: state.connected && !state.error && state.queueSize < 100,
    connected: state.connected,
    hasError: !!state.error,
    queueBacklog: state.queueSize
  };
}

/**
 * Select full sync state (use sparingly)
 */
export function selectSyncState(state) {
  return state;
}

// Export default store
export default syncStore;
