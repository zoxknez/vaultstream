import { createContext } from 'react';

const noop = async () => ({ success: false, reason: 'uninitialized' });

const SyncContext = createContext({
  status: {
    online: true,
    supabaseConfigured: false,
    connected: false,
    queueSize: 0,
    lastSyncedAt: null,
    lastError: null
  },
  flush: noop,
  queueSize: 0,
  analytics: {
    queueSize: 0,
    lastError: null,
    lastFlush: null,
    lastEvent: null,
    flushHistory: []
  },
  flushAnalytics: noop
});

export default SyncContext;
