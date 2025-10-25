import { isSupabaseConfigured, supabase } from '../config/supabase';
import { LOCAL_EVENTS, emitLocalEvent } from './localEvents';

/**
 * Cloud Sync Service
 * Handles bidirectional synchronization between localStorage and Supabase
 */

// ============================================
// CONSTANTS
// ============================================

const SYNC_TABLES = {
  WATCHLIST: 'watchlist',
  COLLECTIONS: 'collections',
  WATCH_PROGRESS: 'watch_progress',
  USER_PREFERENCES: 'user_preferences'
};

const SYNC_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending'
};

const SYNC_OPERATIONS = {
  PUSH: 'push',
  PULL: 'pull',
  CONFLICT: 'conflict',
  MERGE: 'merge'
};

const isBrowser = typeof window !== 'undefined';
const getIsOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : false);
const SYNC_QUEUE_KEY = 'streamvault_sync_queue_v1';

let syncQueue = restoreQueue();
let initializedRealtime = false;
let flushTimer = null;
let realtimeChannels = [];

let syncStatus = {
  online: getIsOnline(),
  supabaseConfigured: isSupabaseConfigured(),
  connected: false,
  queueSize: syncQueue.length,
  lastSyncedAt: null,
  lastError: null
};

const statusListeners = new Set();

function restoreQueue() {
  if (!isBrowser) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to restore sync queue', error);
    return [];
  }
}

const persistQueue = () => {
  if (!isBrowser) {
    return;
  }

  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  } catch (error) {
    console.warn('Unable to persist sync queue', error);
  }
};

const notifyStatus = () => {
  statusListeners.forEach((listener) => {
    try {
      listener({ ...syncStatus });
    } catch (error) {
      console.error('Sync status listener error', error);
    }
  });
};

const updateStatus = (patch) => {
  syncStatus = {
    ...syncStatus,
    ...patch
  };
  notifyStatus();
};

const scheduleFlush = () => {
  if (!getIsOnline()) {
    return;
  }

  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushQueue('debounce').catch(() => {});
  }, 1200);
};

export const queueMutation = (domain, metadata = {}) => {
  if (!domain) {
    return;
  }

  const entry = {
    id:
      typeof crypto !== 'undefined' && crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    domain,
    metadata,
    timestamp: new Date().toISOString()
  };

  syncQueue.push(entry);

  if (syncQueue.length > 200) {
    syncQueue = syncQueue.slice(syncQueue.length - 200);
  }

  persistQueue();
  updateStatus({ queueSize: syncQueue.length });
  scheduleFlush();
};

export const subscribeToSyncStatus = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  statusListeners.add(listener);
  listener({ ...syncStatus });

  return () => {
    statusListeners.delete(listener);
  };
};

export const getSyncStatus = () => ({ ...syncStatus });

export const clearSyncQueue = () => {
  syncQueue = [];
  persistQueue();
  updateStatus({ queueSize: 0 });
};

export const flushQueue = async (reason = 'manual') => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (syncQueue.length === 0) {
    return {
      success: true,
      reason,
      handledDomains: [],
      queueSize: 0
    };
  }

  if (!getIsOnline()) {
    return {
      success: false,
      reason,
      skipped: 'offline',
      queueSize: syncQueue.length
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      reason,
      skipped: 'supabase_not_configured',
      queueSize: syncQueue.length
    };
  }

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        reason,
        skipped: 'unauthenticated',
        queueSize: syncQueue.length
      };
    }
  } catch (error) {
    updateStatus({ lastError: error.message });
    return {
      success: false,
      reason,
      error: error.message,
      queueSize: syncQueue.length
    };
  }

  const domains = Array.from(new Set(syncQueue.map((entry) => entry.domain)));
  const handledDomains = new Set();
  const results = {};
  let success = true;

  for (const domain of domains) {
    try {
      if (domain === 'watchlist') {
        const result = await syncWatchlist();
        results.watchlist = result;
        if (result?.success) {
          handledDomains.add(domain);
        } else {
          success = false;
        }
      } else if (domain === 'watchProgress') {
        const result = await syncWatchProgress();
        results.watchProgress = result;
        if (result?.success) {
          handledDomains.add(domain);
        } else {
          success = false;
        }
      } else if (domain === 'preferences') {
        const pull = await pullPreferencesFromCloud();
        const push = await pushPreferencesToCloud();
        results.preferences = { pull, push };
        if (pull?.success && push?.success) {
          handledDomains.add(domain);
        } else {
          success = false;
        }
      }
    } catch (error) {
      console.warn('Sync flush error for domain:', domain, error);
      success = false;
      results[domain] = { success: false, error: error.message };
    }
  }

  if (success) {
    const timestamp = new Date().toISOString();
    syncQueue = syncQueue.filter((entry) => !handledDomains.has(entry.domain));
    persistQueue();
    updateStatus({
      queueSize: syncQueue.length,
      lastSyncedAt: timestamp,
      lastError: null
    });
    if (isBrowser) {
      try {
        localStorage.setItem('lastSyncTime', timestamp);
      } catch (error) {
        console.warn('Unable to persist last sync time', error);
      }
    }
  } else {
    updateStatus({ lastError: 'Sync flush failed', queueSize: syncQueue.length });
  }

  return {
    success,
    reason,
    results,
    handledDomains: Array.from(handledDomains),
    queueSize: syncQueue.length
  };
};

const handleRemoteWatchlistChange = async () => {
  const result = await pullWatchlistFromCloud();
  if (result?.success) {
    updateStatus({
      lastSyncedAt: new Date().toISOString(),
      queueSize: syncQueue.length,
      lastError: null
    });
  }
};

const handleRemoteWatchProgressChange = async () => {
  const result = await pullWatchProgressFromCloud();
  if (result?.success) {
    updateStatus({
      lastSyncedAt: new Date().toISOString(),
      queueSize: syncQueue.length,
      lastError: null
    });
  }
};

const cleanupRealtimeChannels = () => {
  realtimeChannels.forEach((channel) => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.warn('Failed to remove realtime channel', error);
    }
  });
  realtimeChannels = [];
  updateStatus({ connected: false });
};

export const initializeRealtimeSync = () => {
  if (initializedRealtime) {
    return;
  }

  initializedRealtime = true;

  if (isBrowser) {
    window.addEventListener('online', () => {
      updateStatus({ online: true });
      scheduleFlush();
    });
    window.addEventListener('offline', () => {
      updateStatus({ online: false });
    });
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  cleanupRealtimeChannels();

  try {
    const watchlistChannel = subscribeToWatchlist(handleRemoteWatchlistChange);
    const progressChannel = subscribeToWatchProgress(handleRemoteWatchProgressChange);

    realtimeChannels.push(watchlistChannel, progressChannel);
    updateStatus({ connected: true });
  } catch (error) {
    console.warn('Failed to initialize realtime sync channels', error);
    updateStatus({ connected: false, lastError: error.message });
  }

  scheduleFlush();
};

// ============================================
// SYNC LOG
// ============================================

/**
 * Log sync operation to database
 */
const logSync = async (
  tableName,
  operation,
  status,
  recordsAffected = 0,
  error = null,
  duration = 0
) => {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('sync_log').insert({
      user_id: user.id,
      table_name: tableName,
      operation,
      status,
      records_affected: recordsAffected,
      error_message: error?.message || null,
      sync_duration_ms: duration
    });
  } catch (err) {
    console.error('Error logging sync:', err);
  }
};

// ============================================
// WATCHLIST SYNC
// ============================================

/**
 * Push local watchlist to cloud
 */
export const pushWatchlistToCloud = async () => {
  const startTime = Date.now();

  try {
    // Get current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Get local watchlist
    const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

    if (localWatchlist.length === 0) {
      await logSync(
        SYNC_TABLES.WATCHLIST,
        SYNC_OPERATIONS.PUSH,
        SYNC_STATUS.SUCCESS,
        0,
        null,
        Date.now() - startTime
      );
      return { success: true, pushed: 0 };
    }

    // Transform local data to match cloud schema
    const cloudData = localWatchlist.map((item) => ({
      user_id: user.id,
      tmdb_id: item.id,
      title: item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview,
      release_date: item.release_date,
      vote_average: item.vote_average,
      media_type: item.media_type || 'movie',
      genres: item.genres || [],
      metadata: {
        original_language: item.original_language,
        popularity: item.popularity,
        local_added_at: item.added_at || new Date().toISOString()
      }
    }));

    // Upsert to cloud (insert or update if exists)
    const { error } = await supabase.from(SYNC_TABLES.WATCHLIST).upsert(cloudData, {
      onConflict: 'user_id,tmdb_id',
      ignoreDuplicates: false
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.WATCHLIST,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.SUCCESS,
      cloudData.length,
      null,
      duration
    );

    return { success: true, pushed: cloudData.length };
  } catch (error) {
    console.error('Error pushing watchlist to cloud:', error);
    await logSync(
      SYNC_TABLES.WATCHLIST,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

/**
 * Pull cloud watchlist to local
 */
export const pullWatchlistFromCloud = async () => {
  const startTime = Date.now();

  try {
    // Get current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch from cloud
    const { data: cloudWatchlist, error } = await supabase
      .from(SYNC_TABLES.WATCHLIST)
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Transform cloud data to match local schema
    const localData = cloudWatchlist.map((item) => ({
      id: item.tmdb_id,
      title: item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview,
      release_date: item.release_date,
      vote_average: item.vote_average,
      media_type: item.media_type,
      genres: item.genres || [],
      added_at: item.added_at,
      original_language: item.metadata?.original_language,
      popularity: item.metadata?.popularity
    }));

    // Save to localStorage
    localStorage.setItem('watchlist', JSON.stringify(localData));

    emitLocalEvent(LOCAL_EVENTS.WATCHLIST, {
      type: 'watchlist:sync',
      count: localData.length
    });

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.WATCHLIST,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.SUCCESS,
      localData.length,
      null,
      duration
    );

    return { success: true, pulled: localData.length, data: localData };
  } catch (error) {
    console.error('Error pulling watchlist from cloud:', error);
    await logSync(
      SYNC_TABLES.WATCHLIST,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

/**
 * Sync watchlist (bidirectional)
 */
export const syncWatchlist = async () => {
  try {
    // First pull from cloud
    const pullResult = await pullWatchlistFromCloud();

    // Then push any local changes
    const pushResult = await pushWatchlistToCloud();

    return {
      success: pullResult.success && pushResult.success,
      pulled: pullResult.pulled || 0,
      pushed: pushResult.pushed || 0
    };
  } catch (error) {
    console.error('Error syncing watchlist:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// WATCH PROGRESS SYNC
// ============================================

/**
 * Push local watch progress to cloud
 */
export const pushWatchProgressToCloud = async () => {
  const startTime = Date.now();

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const localProgress = JSON.parse(localStorage.getItem('continueWatching') || '[]');

    if (localProgress.length === 0) {
      await logSync(
        SYNC_TABLES.WATCH_PROGRESS,
        SYNC_OPERATIONS.PUSH,
        SYNC_STATUS.SUCCESS,
        0,
        null,
        Date.now() - startTime
      );
      return { success: true, pushed: 0 };
    }

    const cloudData = localProgress.map((item) => ({
      user_id: user.id,
      tmdb_id: item.id,
      title: item.title,
      poster_path: item.poster_path,
      media_type: item.media_type || 'movie',
      current_time: item.currentTime || 0,
      duration: item.duration || 0,
      progress_percentage: item.progress || 0,
      season_number: item.season,
      episode_number: item.episode,
      last_watched_at: item.lastWatched || new Date().toISOString(),
      completed: item.progress >= 95,
      metadata: {
        torrent_hash: item.torrentHash,
        file_path: item.filePath
      }
    }));

    const { error } = await supabase.from(SYNC_TABLES.WATCH_PROGRESS).upsert(cloudData, {
      onConflict: 'user_id,tmdb_id,season_number,episode_number',
      ignoreDuplicates: false
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.WATCH_PROGRESS,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.SUCCESS,
      cloudData.length,
      null,
      duration
    );

    return { success: true, pushed: cloudData.length };
  } catch (error) {
    console.error('Error pushing watch progress to cloud:', error);
    await logSync(
      SYNC_TABLES.WATCH_PROGRESS,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

/**
 * Pull cloud watch progress to local
 */
export const pullWatchProgressFromCloud = async () => {
  const startTime = Date.now();

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: cloudProgress, error } = await supabase
      .from(SYNC_TABLES.WATCH_PROGRESS)
      .select('*')
      .eq('user_id', user.id)
      .order('last_watched_at', { ascending: false });

    if (error) throw error;

    const localData = cloudProgress.map((item) => ({
      id: item.tmdb_id,
      title: item.title,
      poster_path: item.poster_path,
      media_type: item.media_type,
      currentTime: item.current_time,
      duration: item.duration,
      progress: item.progress_percentage,
      season: item.season_number,
      episode: item.episode_number,
      lastWatched: item.last_watched_at,
      torrentHash: item.metadata?.torrent_hash,
      filePath: item.metadata?.file_path
    }));

    localStorage.setItem('continueWatching', JSON.stringify(localData));

    emitLocalEvent(LOCAL_EVENTS.CONTINUE_WATCHING, {
      type: 'continueWatching:sync',
      count: localData.length
    });

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.WATCH_PROGRESS,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.SUCCESS,
      localData.length,
      null,
      duration
    );

    return { success: true, pulled: localData.length, data: localData };
  } catch (error) {
    console.error('Error pulling watch progress from cloud:', error);
    await logSync(
      SYNC_TABLES.WATCH_PROGRESS,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

/**
 * Sync watch progress (bidirectional)
 */
export const syncWatchProgress = async () => {
  try {
    const pullResult = await pullWatchProgressFromCloud();
    const pushResult = await pushWatchProgressToCloud();

    return {
      success: pullResult.success && pushResult.success,
      pulled: pullResult.pulled || 0,
      pushed: pushResult.pushed || 0
    };
  } catch (error) {
    console.error('Error syncing watch progress:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// USER PREFERENCES SYNC
// ============================================

/**
 * Push user preferences to cloud
 */
export const pushPreferencesToCloud = async () => {
  const startTime = Date.now();

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const localPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');

    const { error } = await supabase.from(SYNC_TABLES.USER_PREFERENCES).upsert(
      {
        user_id: user.id,
        theme: localPrefs.theme || 'dark',
        language: localPrefs.language || 'en',
        autoplay: localPrefs.autoplay !== false,
        subtitle_language: localPrefs.subtitleLanguage || 'en',
        video_quality: localPrefs.videoQuality || 'auto',
        notifications_enabled: localPrefs.notificationsEnabled !== false,
        preferences: localPrefs
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.USER_PREFERENCES,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.SUCCESS,
      1,
      null,
      duration
    );

    return { success: true };
  } catch (error) {
    console.error('Error pushing preferences to cloud:', error);
    await logSync(
      SYNC_TABLES.USER_PREFERENCES,
      SYNC_OPERATIONS.PUSH,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

/**
 * Pull user preferences from cloud
 */
export const pullPreferencesFromCloud = async () => {
  const startTime = Date.now();

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: cloudPrefs, error } = await supabase
      .from(SYNC_TABLES.USER_PREFERENCES)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

    if (cloudPrefs) {
      const localPrefs = {
        theme: cloudPrefs.theme,
        language: cloudPrefs.language,
        autoplay: cloudPrefs.autoplay,
        subtitleLanguage: cloudPrefs.subtitle_language,
        videoQuality: cloudPrefs.video_quality,
        notificationsEnabled: cloudPrefs.notifications_enabled,
        ...cloudPrefs.preferences
      };

      localStorage.setItem('userPreferences', JSON.stringify(localPrefs));
    }

    const duration = Date.now() - startTime;
    await logSync(
      SYNC_TABLES.USER_PREFERENCES,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.SUCCESS,
      1,
      null,
      duration
    );

    return { success: true, data: cloudPrefs };
  } catch (error) {
    console.error('Error pulling preferences from cloud:', error);
    await logSync(
      SYNC_TABLES.USER_PREFERENCES,
      SYNC_OPERATIONS.PULL,
      SYNC_STATUS.ERROR,
      0,
      error,
      Date.now() - startTime
    );
    return { success: false, error: error.message };
  }
};

// ============================================
// FULL SYNC
// ============================================

/**
 * Sync all data (watchlist, progress, preferences)
 */
export const syncAll = async () => {
  console.log('🔄 Starting full sync...');

  const results = {
    watchlist: await syncWatchlist(),
    watchProgress: await syncWatchProgress(),
    preferences: {
      pull: await pullPreferencesFromCloud(),
      push: await pushPreferencesToCloud()
    }
  };

  const allSuccess =
    results.watchlist.success &&
    results.watchProgress.success &&
    results.preferences.pull.success &&
    results.preferences.push.success;

  console.log('✅ Full sync complete:', results);

  return {
    success: allSuccess,
    results
  };
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to watchlist changes
 */
export const subscribeToWatchlist = (callback) => {
  return supabase
    .channel('watchlist-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SYNC_TABLES.WATCHLIST
      },
      (payload) => {
        console.log('Watchlist change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to watch progress changes
 */
export const subscribeToWatchProgress = (callback) => {
  return supabase
    .channel('progress-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SYNC_TABLES.WATCH_PROGRESS
      },
      (payload) => {
        console.log('Watch progress change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Unsubscribe from channel
 */
export const unsubscribe = (channel) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Watchlist
  pushWatchlistToCloud,
  pullWatchlistFromCloud,
  syncWatchlist,

  // Watch Progress
  pushWatchProgressToCloud,
  pullWatchProgressFromCloud,
  syncWatchProgress,

  // Preferences
  pushPreferencesToCloud,
  pullPreferencesFromCloud,

  // Full Sync
  syncAll,

  // Realtime
  subscribeToWatchlist,
  subscribeToWatchProgress,
  unsubscribe,
  initializeRealtimeSync,
  queueMutation,
  flushQueue,
  subscribeToSyncStatus,
  getSyncStatus,
  clearSyncQueue,

  // Constants
  SYNC_TABLES,
  SYNC_STATUS,
  SYNC_OPERATIONS
};
