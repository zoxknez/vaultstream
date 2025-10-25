// 🌐 StreamVault - Offline Mode Hook
// Detects offline status and provides queue helpers

import { useCallback, useEffect, useState } from 'react';
import offlineQueue from '../utils/offlineQueue.js';

export default function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  // Update queue count
  const updateQueueCount = useCallback(async () => {
    const count = await offlineQueue.getCount();
    setQueueCount(count);
  }, []);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOffline] Back online');
      setIsOnline(true);

      // Trigger background sync
      offlineQueue.registerSync();
      updateQueueCount();
    };

    const handleOffline = () => {
      console.log('[useOffline] Went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue count
    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateQueueCount]);

  // Queue an operation if offline
  const queueOperation = useCallback(
    async (operation) => {
      if (isOnline) {
        console.log('[useOffline] Online, executing immediately');
        return false; // Not queued, should execute normally
      }

      console.log('[useOffline] Offline, queueing operation');
      await offlineQueue.addToQueue(operation);
      await updateQueueCount();
      return true; // Queued
    },
    [isOnline, updateQueueCount]
  );

  // Execute or queue a fetch request
  const fetchWithOfflineSupport = useCallback(
    async (url, options = {}) => {
      if (!isOnline) {
        // Queue for later
        await offlineQueue.addToQueue({
          url,
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body
        });

        await updateQueueCount();

        throw new Error('Offline: Operation queued for sync');
      }

      // Execute normally
      return fetch(url, options);
    },
    [isOnline, updateQueueCount]
  );

  return {
    isOnline,
    isOffline: !isOnline,
    queueCount,
    queueOperation,
    fetchWithOfflineSupport,
    offlineQueue
  };
}
