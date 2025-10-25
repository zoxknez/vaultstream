import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/syncService';

/**
 * useCloudSync Hook
 * Main hook for managing cloud synchronization
 */
export const useCloudSync = (options = {}) => {
  const {
    autoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    onSyncComplete = null,
    onSyncError = null
  } = options;

  const { user, configured } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncStats, setSyncStats] = useState({
    watchlistPulled: 0,
    watchlistPushed: 0,
    progressPulled: 0,
    progressPushed: 0
  });
  
  const syncIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const syncingRef = useRef(false); // Track syncing state without causing re-renders
  const onSyncCompleteRef = useRef(onSyncComplete); // Store callback in ref
  const onSyncErrorRef = useRef(onSyncError); // Store callback in ref
  const syncFnRef = useRef(null); // Store sync function in ref

  // Update refs when callbacks change
  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
    onSyncErrorRef.current = onSyncError;
  }, [onSyncComplete, onSyncError]);

  // Manual sync function
  const sync = useCallback(async () => {
    // Check if already syncing using ref (doesn't cause re-render)
    if (!user || !configured) return;
    
    if (syncingRef.current) {
      console.log('⏭️ Sync already in progress, skipping...');
      return;
    }

    console.log('🔄 Starting sync...');
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncService.syncAll();

      if (isMountedRef.current) {
        if (result.success) {
          setLastSyncTime(new Date());
          setSyncStats({
            watchlistPulled: result.results.watchlist.pulled || 0,
            watchlistPushed: result.results.watchlist.pushed || 0,
            progressPulled: result.results.watchProgress.pulled || 0,
            progressPushed: result.results.watchProgress.pushed || 0
          });
          
          console.log('✅ Sync completed successfully');
          onSyncCompleteRef.current?.(result); // Use ref instead of prop
        } else {
          throw new Error('Sync failed');
        }
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      if (isMountedRef.current) {
        setSyncError(error.message);
        onSyncErrorRef.current?.(error); // Use ref instead of prop
      }
    } finally {
      if (isMountedRef.current) {
        syncingRef.current = false;
        setSyncing(false);
        console.log('🏁 Sync finished');
      }
    }
  }, [user, configured]); // Only user and configured in deps!

  // Store sync function in ref
  useEffect(() => {
    syncFnRef.current = sync;
  }, [sync]);

  // Auto sync on mount and interval
  useEffect(() => {
    if (!user || !configured || !autoSync) {
      console.log('🚫 Sync disabled:', { user: !!user, configured, autoSync });
      return;
    }

    console.log('⚙️ Setting up auto-sync with interval:', syncInterval, 'ms');
    
    // Initial sync using ref
    if (syncFnRef.current) {
      syncFnRef.current();
    }

    // Set up interval using ref
    syncIntervalRef.current = setInterval(() => {
      console.log('⏰ Interval triggered, calling sync...');
      if (syncFnRef.current) {
        syncFnRef.current();
      }
    }, syncInterval);

    return () => {
      console.log('🧹 Cleaning up sync interval');
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [user, configured, autoSync, syncInterval]); // Removed 'sync' from deps!

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    syncing,
    lastSyncTime,
    syncError,
    syncStats,
    sync
  };
};

/**
 * useWatchlistSync Hook
 * Specific hook for watchlist synchronization with realtime updates
 */
export const useWatchlistSync = () => {
  const { user, configured } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Load watchlist from localStorage
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setWatchlist(local);
  }, []);

  // Pull from cloud on mount
  useEffect(() => {
    if (!user || !configured) return;

    const pullData = async () => {
      setSyncing(true);
      const result = await syncService.pullWatchlistFromCloud();
      if (result.success) {
        setWatchlist(result.data);
      } else {
        setError(result.error);
      }
      setSyncing(false);
    };

    pullData();
  }, [user, configured]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user || !configured) return;

  channelRef.current = syncService.subscribeToWatchlist(async () => {
      // Re-pull data when remote changes detected
      const result = await syncService.pullWatchlistFromCloud();
      if (result.success) {
        setWatchlist(result.data);
      }
    });

    return () => {
      if (channelRef.current) {
        syncService.unsubscribe(channelRef.current);
      }
    };
  }, [user, configured]);

  // Add to watchlist
  const addToWatchlist = useCallback(async (item) => {
    const newWatchlist = [...watchlist, item];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));

    if (user && configured) {
      await syncService.pushWatchlistToCloud();
    }
  }, [watchlist, user, configured]);

  // Remove from watchlist
  const removeFromWatchlist = useCallback(async (itemId) => {
    const newWatchlist = watchlist.filter(item => item.id !== itemId);
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));

    if (user && configured) {
      await syncService.pushWatchlistToCloud();
    }
  }, [watchlist, user, configured]);

  // Manual sync
  const sync = useCallback(async () => {
    if (!user || !configured) return;
    
    setSyncing(true);
    setError(null);
    
    const result = await syncService.syncWatchlist();
    
    if (result.success) {
      const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
      setWatchlist(local);
    } else {
      setError(result.error);
    }
    
    setSyncing(false);
  }, [user, configured]);

  return {
    watchlist,
    syncing,
    error,
    addToWatchlist,
    removeFromWatchlist,
    sync
  };
};

/**
 * useWatchProgressSync Hook
 * Specific hook for watch progress synchronization
 */
export const useWatchProgressSync = () => {
  const { user, configured } = useAuth();
  const [continueWatching, setContinueWatching] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem('continueWatching') || '[]');
    setContinueWatching(local);
  }, []);

  // Pull from cloud on mount
  useEffect(() => {
    if (!user || !configured) return;

    const pullData = async () => {
      setSyncing(true);
      const result = await syncService.pullWatchProgressFromCloud();
      if (result.success) {
        setContinueWatching(result.data);
      } else {
        setError(result.error);
      }
      setSyncing(false);
    };

    pullData();
  }, [user, configured]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user || !configured) return;

  channelRef.current = syncService.subscribeToWatchProgress(async () => {
      const result = await syncService.pullWatchProgressFromCloud();
      if (result.success) {
        setContinueWatching(result.data);
      }
    });

    return () => {
      if (channelRef.current) {
        syncService.unsubscribe(channelRef.current);
      }
    };
  }, [user, configured]);

  // Update progress
  const updateProgress = useCallback(async (itemId, progressData) => {
    const existing = continueWatching.find(item => item.id === itemId);
    let newContinueWatching;

    if (existing) {
      newContinueWatching = continueWatching.map(item =>
        item.id === itemId ? { ...item, ...progressData, lastWatched: new Date().toISOString() } : item
      );
    } else {
      newContinueWatching = [{ id: itemId, ...progressData, lastWatched: new Date().toISOString() }, ...continueWatching];
    }

    setContinueWatching(newContinueWatching);
    localStorage.setItem('continueWatching', JSON.stringify(newContinueWatching));

    if (user && configured) {
      await syncService.pushWatchProgressToCloud();
    }
  }, [continueWatching, user, configured]);

  // Remove progress
  const removeProgress = useCallback(async (itemId) => {
    const newContinueWatching = continueWatching.filter(item => item.id !== itemId);
    setContinueWatching(newContinueWatching);
    localStorage.setItem('continueWatching', JSON.stringify(newContinueWatching));

    if (user && configured) {
      await syncService.pushWatchProgressToCloud();
    }
  }, [continueWatching, user, configured]);

  // Manual sync
  const sync = useCallback(async () => {
    if (!user || !configured) return;
    
    setSyncing(true);
    setError(null);
    
    const result = await syncService.syncWatchProgress();
    
    if (result.success) {
      const local = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      setContinueWatching(local);
    } else {
      setError(result.error);
    }
    
    setSyncing(false);
  }, [user, configured]);

  return {
    continueWatching,
    syncing,
    error,
    updateProgress,
    removeProgress,
    sync
  };
};

/**
 * useSyncStatus Hook
 * Monitor overall sync status
 */
export const useSyncStatus = () => {
  const { user, configured } = useAuth();
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    canSync: false,
    lastSync: null,
    pendingChanges: 0
  });

  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      canSync: !!user && !!configured && navigator.onLine
    }));
  }, [user, configured]);

  // Load last sync time from localStorage
  useEffect(() => {
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setStatus(prev => ({ ...prev, lastSync: new Date(lastSync) }));
    }
  }, []);

  return status;
};

/**
 * useAutoSync Hook
 * Automatically sync when user logs in and on interval
 */
export const useAutoSync = (intervalMinutes = 5) => {
  const { user, configured } = useAuth();
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user || !configured) return;

    let interval;

    const doSync = async () => {
      setSyncing(true);
      await syncService.syncAll();
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('lastSyncTime', now.toISOString());
      setSyncing(false);
    };

    // Initial sync
    doSync();

    // Set up interval
    interval = setInterval(doSync, intervalMinutes * 60 * 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, configured, intervalMinutes]);

  return { lastSync, syncing };
};

export default {
  useCloudSync,
  useWatchlistSync,
  useWatchProgressSync,
  useSyncStatus,
  useAutoSync
};
