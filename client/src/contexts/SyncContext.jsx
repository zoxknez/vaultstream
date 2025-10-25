import { useEffect, useMemo, useState } from 'react';
import {
  initializeRealtimeSync,
  subscribeToSyncStatus,
  getSyncStatus,
  flushQueue
} from '../services/syncService';
import analyticsService from '../services/analyticsService';
import SyncContext from './SyncContextStore';

export const SyncProvider = ({ children }) => {
  const [status, setStatus] = useState(() => getSyncStatus());
  const [analyticsState, setAnalyticsState] = useState(() => ({
    queueSize: analyticsService.getQueueSize(),
    lastError: analyticsService.getLastError(),
    lastFlush: analyticsService.getLastFlushInfo(),
    lastEvent: null,
    flushHistory: [],
    details: null
  }));

  useEffect(() => {
    initializeRealtimeSync();
    analyticsService.init();

    const unsubscribe = subscribeToSyncStatus((nextStatus) => {
      setStatus(nextStatus);
    });

    const unsubscribeAnalytics = analyticsService.subscribe((snapshot) => {
      setAnalyticsState({
        queueSize: snapshot.queueSize,
        lastError: snapshot.lastError,
        lastFlush: snapshot.lastFlush,
        lastEvent: snapshot.type,
        flushHistory: snapshot.flushHistory || [],
        details: snapshot
      });
    });

    return () => {
      unsubscribe?.();
      unsubscribeAnalytics?.();
    };
  }, []);

  const value = useMemo(() => ({
    status,
    queueSize: status.queueSize,
    flush: (reason = 'manual') => flushQueue(reason),
    analytics: analyticsState,
    flushAnalytics: (reason = 'manual') => analyticsService.flush({ reason })
  }), [status, analyticsState]);

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export default SyncProvider;
