/**
 * 🎣 SYNC HOOKS - useSyncExternalStore Pattern
 * Optimized hooks with granular selectors
 * Eliminates unnecessary re-renders
 */

import { useCallback, useSyncExternalStore } from 'react';
import analyticsService from '../services/analyticsService';
import { flushQueue } from '../services/syncService';
import syncStore, {
  selectAnalytics,
  selectAnalyticsLastError,
  selectAnalyticsQueueSize,
  selectIsConnected,
  selectLastSync,
  selectQueueSize,
  selectSyncEnabled,
  selectSyncError,
  selectSyncHealth,
  selectSyncState
} from '../stores/syncStore';

// ✅ Granular Hooks - Use these instead of full context

/**
 * Use sync enabled status only
 */
export function useSyncEnabled() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectSyncEnabled(syncStore.getSnapshot()),
    () => false
  );
}

/**
 * Use connection status only
 */
export function useSyncConnected() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectIsConnected(syncStore.getSnapshot()),
    () => false
  );
}

/**
 * Use queue size only
 */
export function useSyncQueueSize() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectQueueSize(syncStore.getSnapshot()),
    () => 0
  );
}

/**
 * Use last sync timestamp only
 */
export function useSyncTimestamp() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectLastSync(syncStore.getSnapshot()),
    () => null
  );
}

/**
 * Use sync error only
 */
export function useSyncError() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectSyncError(syncStore.getSnapshot()),
    () => null
  );
}

/**
 * Use analytics queue size only
 */
export function useAnalyticsQueueSize() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectAnalyticsQueueSize(syncStore.getSnapshot()),
    () => 0
  );
}

/**
 * Use analytics last error only
 */
export function useAnalyticsError() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectAnalyticsLastError(syncStore.getSnapshot()),
    () => null
  );
}

/**
 * Use full analytics state
 */
export function useAnalytics() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectAnalytics(syncStore.getSnapshot()),
    () => ({
      queueSize: 0,
      lastError: null,
      lastFlush: null,
      lastEvent: null,
      flushHistory: []
    })
  );
}

/**
 * Use sync health metrics
 */
export function useSyncHealth() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectSyncHealth(syncStore.getSnapshot()),
    () => ({
      healthy: false,
      connected: false,
      hasError: false,
      queueBacklog: 0
    })
  );
}

/**
 * Use full sync state
 * ⚠️ Use sparingly - causes re-render on any sync change
 */
export function useSyncState() {
  return useSyncExternalStore(
    syncStore.subscribe,
    () => selectSyncState(syncStore.getSnapshot()),
    syncStore.getServerSnapshot
  );
}

/**
 * Use sync actions (flush, etc.)
 * These don't cause re-renders as they're stable callbacks
 */
export function useSyncActions() {
  const flush = useCallback((reason = 'manual') => {
    return flushQueue(reason);
  }, []);

  const flushAnalytics = useCallback((reason = 'manual') => {
    return analyticsService.flush({ reason });
  }, []);

  return {
    flush,
    flushAnalytics
  };
}

/**
 * Combined hook for components that need everything
 * ⚠️ Use granular hooks when possible for better performance
 */
export function useSync() {
  const status = useSyncState();
  const actions = useSyncActions();

  return {
    status,
    queueSize: status.queueSize,
    ...actions,
    analytics: status.analytics
  };
}
