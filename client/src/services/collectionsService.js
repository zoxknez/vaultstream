import analyticsService from './analyticsService';
import { LOCAL_EVENTS, emitLocalEvent } from './localEvents';
import syncService from './syncService';

/**
 * Collections Service
 *
 * Manages user collections, watchlist, and watch history
 * Uses localStorage for persistence (can be upgraded to Supabase later)
 *
 * Features:
 * - Create/delete custom collections
 * - Add/remove items from collections
 * - Watchlist management
 * - Watch history tracking
 * - Continue watching (resume points)
 * - TMDB metadata integration
 */

const STORAGE_KEYS = {
  COLLECTIONS: 'streamvault_collections',
  WATCHLIST: 'streamvault_watchlist',
  WATCH_HISTORY: 'streamvault_watch_history',
  CONTINUE_WATCHING: 'streamvault_continue_watching'
};

class CollectionsService {
  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize storage with default data
   */
  initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.COLLECTIONS)) {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WATCHLIST)) {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING)) {
      localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify([]));
    }
  }

  /* ==================== COLLECTIONS ==================== */

  /**
   * Get all collections
   */
  getCollections() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error getting collections:', error);
      return [];
    }
  }

  /**
   * Get collection by ID
   */
  getCollection(id) {
    const collections = this.getCollections();
    return collections.find((c) => c.id === id);
  }

  /**
   * Create new collection
   */
  createCollection(name, description = '') {
    const collections = this.getCollections();

    const newCollection = {
      id: Date.now().toString(),
      name,
      description,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    collections.push(newCollection);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

    emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
      type: 'collection:create',
      collection: newCollection,
      stats: this.getStats()
    });

    return newCollection;
  }

  /**
   * Update collection metadata
   */
  updateCollection(id, updates) {
    const collections = this.getCollections();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) return null;

    collections[index] = {
      ...collections[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
      type: 'collection:update',
      collection: collections[index],
      stats: this.getStats()
    });
    return collections[index];
  }

  /**
   * Delete collection
   */
  deleteCollection(id) {
    const collections = this.getCollections();
    const filtered = collections.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(filtered));
    emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
      type: 'collection:delete',
      collectionId: id,
      stats: this.getStats()
    });
    return true;
  }

  /**
   * Add item to collection
   */
  addToCollection(collectionId, item) {
    const collections = this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) return null;

    // Check if already exists
    const exists = collection.items.some((i) => i.torrentHash === item.torrentHash);
    if (exists) {
      console.warn('Item already in collection');
      return collection;
    }

    // Add item with metadata
    const collectionItem = {
      id: Date.now().toString(),
      torrentHash: item.torrentHash,
      torrentName: item.torrentName,
      tmdbData: item.tmdbData || null,
      addedAt: new Date().toISOString()
    };

    collection.items.push(collectionItem);
    collection.updatedAt = new Date().toISOString();

    const index = collections.findIndex((c) => c.id === collectionId);
    collections[index] = collection;
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

    emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
      type: 'collection:item:add',
      collectionId,
      item: collectionItem,
      stats: this.getStats()
    });

    return collection;
  }

  /**
   * Remove item from collection
   */
  removeFromCollection(collectionId, itemId) {
    const collections = this.getCollections();
    const collection = collections.find((c) => c.id === collectionId);

    if (!collection) return null;

    collection.items = collection.items.filter((i) => i.id !== itemId);
    collection.updatedAt = new Date().toISOString();

    const index = collections.findIndex((c) => c.id === collectionId);
    collections[index] = collection;
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

    emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
      type: 'collection:item:remove',
      collectionId,
      itemId,
      stats: this.getStats()
    });

    return collection;
  }

  /* ==================== WATCHLIST ==================== */

  /**
   * Get watchlist items
   */
  getWatchlist() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return [];
    }
  }

  /**
   * Add to watchlist
   */
  addToWatchlist(item) {
    const watchlist = this.getWatchlist();

    // Check if already exists
    const exists = watchlist.some((i) => i.torrentHash === item.torrentHash);
    if (exists) {
      console.warn('Item already in watchlist');
      return watchlist;
    }

    const watchlistItem = {
      id: Date.now().toString(),
      torrentHash: item.torrentHash,
      torrentName: item.torrentName,
      tmdbData: item.tmdbData || null,
      addedAt: new Date().toISOString(),
      watched: false
    };

    watchlist.unshift(watchlistItem); // Add to beginning
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));

    emitLocalEvent(LOCAL_EVENTS.WATCHLIST, {
      type: 'watchlist:add',
      item: watchlistItem,
      stats: this.getStats()
    });

    syncService.queueMutation('watchlist', {
      action: 'add',
      torrentHash: watchlistItem.torrentHash
    });

    analyticsService.trackEvent('watchlist_add', {
      torrentHash: watchlistItem.torrentHash,
      title: watchlistItem.torrentName,
      tmdbId: item.tmdbData?.id || item.tmdbData?.tmdbId || null,
      mediaType: item.tmdbData?.media_type || item.tmdbData?.type || 'unknown'
    });

    return watchlist;
  }

  /**
   * Remove from watchlist
   */
  removeFromWatchlist(itemId) {
    const watchlist = this.getWatchlist();
    const removedItem = watchlist.find((i) => i.id === itemId) || null;
    const filtered = watchlist.filter((i) => i.id !== itemId);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));

    emitLocalEvent(LOCAL_EVENTS.WATCHLIST, {
      type: 'watchlist:remove',
      itemId,
      stats: this.getStats()
    });

    if (removedItem) {
      syncService.queueMutation('watchlist', {
        action: 'remove',
        torrentHash: removedItem.torrentHash
      });

      analyticsService.trackEvent('watchlist_remove', {
        torrentHash: removedItem.torrentHash,
        title: removedItem.torrentName,
        tmdbId: removedItem.tmdbData?.id || removedItem.tmdbData?.tmdbId || null,
        mediaType: removedItem.tmdbData?.media_type || removedItem.tmdbData?.type || 'unknown'
      });
    }
    return filtered;
  }

  /**
   * Check if item is in watchlist
   */
  isInWatchlist(torrentHash) {
    const watchlist = this.getWatchlist();
    return watchlist.some((i) => i.torrentHash === torrentHash);
  }

  /**
   * Mark as watched
   */
  markAsWatched(itemId) {
    const watchlist = this.getWatchlist();
    const item = watchlist.find((i) => i.id === itemId);

    if (item) {
      item.watched = true;
      item.watchedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));

      syncService.queueMutation('watchlist', {
        action: 'update',
        torrentHash: item.torrentHash
      });

      analyticsService.trackEvent('watchlist_mark_watched', {
        torrentHash: item.torrentHash,
        title: item.torrentName,
        tmdbId: item.tmdbData?.id || item.tmdbData?.tmdbId || null,
        mediaType: item.tmdbData?.media_type || item.tmdbData?.type || 'unknown'
      });
    }

    emitLocalEvent(LOCAL_EVENTS.WATCHLIST, {
      type: 'watchlist:markWatched',
      itemId,
      stats: this.getStats()
    });

    return watchlist;
  }

  /* ==================== WATCH HISTORY ==================== */

  /**
   * Get watch history
   */
  getWatchHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error getting watch history:', error);
      return [];
    }
  }

  /**
   * Add to watch history
   */
  addToHistory(item) {
    let history = this.getWatchHistory();

    // Remove if already exists (to move to top)
    history = history.filter((i) => i.torrentHash !== item.torrentHash);

    const historyItem = {
      id: Date.now().toString(),
      torrentHash: item.torrentHash,
      torrentName: item.torrentName,
      tmdbData: item.tmdbData || null,
      watchedAt: new Date().toISOString(),
      duration: item.duration || 0,
      position: item.position || 0
    };

    history.unshift(historyItem); // Add to beginning

    // Keep only last 100 items
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));
    emitLocalEvent(LOCAL_EVENTS.HISTORY, {
      type: 'history:add',
      item: historyItem,
      stats: this.getStats()
    });
    return history;
  }

  /**
   * Add to watch history (alternative name for video player)
   */
  addToWatchHistory(item) {
    let history = this.getWatchHistory();

    // Remove if already exists (to move to top)
    history = history.filter((i) => i.id !== item.id);

    const historyItem = {
      id: item.id,
      title: item.title,
      poster: item.poster || '',
      year: item.year || '',
      watchedAt: item.watchedAt || new Date().toISOString()
    };

    history.unshift(historyItem); // Add to beginning

    // Keep only last 100 items
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history));
    emitLocalEvent(LOCAL_EVENTS.HISTORY, {
      type: 'history:addLegacy',
      item: historyItem,
      stats: this.getStats()
    });
    return history;
  }

  /**
   * Clear watch history
   */
  clearHistory() {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
    emitLocalEvent(LOCAL_EVENTS.HISTORY, {
      type: 'history:clear',
      stats: this.getStats()
    });
    return [];
  }

  /* ==================== CONTINUE WATCHING ==================== */

  /**
   * Get continue watching items
   */
  getContinueWatching() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
      const items = JSON.parse(data) || [];

      // Filter items with >5% and <95% progress
      return items.filter((item) => {
        const progress = (item.position / item.duration) * 100;
        return progress > 5 && progress < 95;
      });
    } catch (error) {
      console.error('Error getting continue watching:', error);
      return [];
    }
  }

  /**
   * Update continue watching
   */
  updateContinueWatching(item) {
    const existingList = this.getContinueWatching();
    const previousEntry = existingList.find((i) => i.torrentHash === item.torrentHash) || null;
    let continueWatching = existingList.filter((i) => i.torrentHash !== item.torrentHash);

    const duration = item.duration || 0;
    const position = Math.min(item.position || 0, duration);
    const progress = duration > 0 ? (position / duration) * 100 : 0;
    const nowIso = new Date().toISOString();

    let action = 'remove';

    if (progress > 5 && progress < 95) {
      const cwItem = {
        id: previousEntry?.id || Date.now().toString(),
        torrentHash: item.torrentHash,
        torrentName: item.torrentName,
        tmdbData: item.tmdbData || previousEntry?.tmdbData || null,
        position,
        duration,
        updatedAt: nowIso
      };

      continueWatching.unshift(cwItem);

      if (continueWatching.length > 20) {
        continueWatching = continueWatching.slice(0, 20);
      }

      action = 'upsert';
    }

    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(continueWatching));
    emitLocalEvent(LOCAL_EVENTS.CONTINUE_WATCHING, {
      type: 'continueWatching:update',
      item: {
        torrentHash: item.torrentHash,
        position,
        duration
      },
      stats: this.getStats()
    });

    syncService.queueMutation('watchProgress', {
      action,
      torrentHash: item.torrentHash
    });

    analyticsService.trackEvent('watch_progress', {
      torrentHash: item.torrentHash,
      title: item.torrentName || previousEntry?.torrentName,
      tmdbId: item.tmdbData?.id || item.tmdbData?.tmdbId || previousEntry?.tmdbData?.id || null,
      mediaType:
        item.tmdbData?.media_type ||
        item.tmdbData?.type ||
        previousEntry?.tmdbData?.media_type ||
        'unknown',
      progress: Number.isFinite(progress) ? Math.round(progress) : 0,
      duration,
      position,
      status: action === 'upsert' ? 'in-progress' : 'completed'
    });

    return continueWatching;
  }

  /**
   * Remove from continue watching
   */
  removeFromContinueWatching(torrentHash) {
    const continueWatching = this.getContinueWatching();
    const removedItem = continueWatching.find((i) => i.torrentHash === torrentHash) || null;
    const filtered = continueWatching.filter((i) => i.torrentHash !== torrentHash);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(filtered));
    emitLocalEvent(LOCAL_EVENTS.CONTINUE_WATCHING, {
      type: 'continueWatching:remove',
      torrentHash,
      stats: this.getStats()
    });

    if (removedItem) {
      syncService.queueMutation('watchProgress', {
        action: 'remove',
        torrentHash
      });

      analyticsService.trackEvent('watch_progress_remove', {
        torrentHash,
        title: removedItem.torrentName,
        tmdbId: removedItem.tmdbData?.id || removedItem.tmdbData?.tmdbId || null,
        mediaType: removedItem.tmdbData?.media_type || removedItem.tmdbData?.type || 'unknown'
      });
    }
    return filtered;
  }

  /* ==================== STATS ==================== */

  /**
   * Get statistics
   */
  getStats() {
    const collections = this.getCollections();
    const watchlist = this.getWatchlist();
    const history = this.getWatchHistory();
    const continueWatching = this.getContinueWatching();

    return {
      totalCollections: collections.length,
      totalCollectionItems: collections.reduce((sum, c) => sum + c.items.length, 0),
      watchlistItems: watchlist.length,
      watchedItems: watchlist.filter((i) => i.watched).length,
      historyItems: history.length,
      continueWatchingItems: continueWatching.length,
      lastUpdated: new Date().toISOString()
    };
  }

  /* ==================== EXPORT/IMPORT ==================== */

  /**
   * Export all data as JSON
   */
  exportData() {
    return {
      collections: this.getCollections(),
      watchlist: this.getWatchlist(),
      history: this.getWatchHistory(),
      continueWatching: this.getContinueWatching(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from JSON
   */
  importData(data) {
    try {
      if (data.collections) {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(data.collections));
        emitLocalEvent(LOCAL_EVENTS.COLLECTIONS, {
          type: 'collection:import',
          count: data.collections.length,
          stats: this.getStats()
        });
      }
      if (data.watchlist) {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(data.watchlist));
        emitLocalEvent(LOCAL_EVENTS.WATCHLIST, {
          type: 'watchlist:import',
          count: data.watchlist.length,
          stats: this.getStats()
        });
      }
      if (data.history) {
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(data.history));
        emitLocalEvent(LOCAL_EVENTS.HISTORY, {
          type: 'history:import',
          count: data.history.length,
          stats: this.getStats()
        });
      }
      if (data.continueWatching) {
        localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(data.continueWatching));
        emitLocalEvent(LOCAL_EVENTS.CONTINUE_WATCHING, {
          type: 'continueWatching:import',
          count: data.continueWatching.length,
          stats: this.getStats()
        });
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Export singleton instance
const collectionsService = new CollectionsService();
export default collectionsService;
