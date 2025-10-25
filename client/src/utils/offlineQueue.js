// 🌐 StreamVault - Offline Queue Helper
// Queues operations when offline and syncs when back online

class OfflineQueue {
  constructor() {
    this.dbName = 'StreamVaultDB';
    this.storeName = 'offline-queue';
    this.dbVersion = 1;
  }

  // Open IndexedDB connection
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };
    });
  }

  // Add operation to queue
  async addToQueue(operation) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const item = {
        ...operation,
        timestamp: Date.now(),
        status: 'pending'
      };

      return new Promise((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => {
          console.log('[OfflineQueue] Added to queue:', request.result);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineQueue] Error adding to queue:', error);
      throw error;
    }
  }

  // Get all queued operations
  async getAll() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineQueue] Error getting queue:', error);
      return [];
    }
  }

  // Get count of queued operations
  async getCount() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineQueue] Error counting queue:', error);
      return 0;
    }
  }

  // Remove operation from queue
  async remove(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          console.log('[OfflineQueue] Removed from queue:', id);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineQueue] Error removing from queue:', error);
      throw error;
    }
  }

  // Clear all queued operations
  async clear() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('[OfflineQueue] Queue cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineQueue] Error clearing queue:', error);
      throw error;
    }
  }

  // Register background sync
  async registerSync() {
    if (!('serviceWorker' in navigator)) {
      console.log('[OfflineQueue] Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if ('sync' in registration) {
        await registration.sync.register('sync-torrents');
        console.log('[OfflineQueue] Background sync registered');
        return true;
      } else {
        console.log('[OfflineQueue] Background sync not supported');
        return false;
      }
    } catch (error) {
      console.error('[OfflineQueue] Error registering sync:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new OfflineQueue();
