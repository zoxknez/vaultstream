// 🌐 StreamVault - Offline Mode Indicator
// Shows connection status and syncs queued operations when online

import { useCallback, useEffect, useState } from 'react';
import './OfflineIndicator.css';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [queuedOperations, setQueuedOperations] = useState(0);
  const [justCameOnline, setJustCameOnline] = useState(false);

  // Get count of queued operations from IndexedDB
  const getQueuedCount = useCallback(async () => {
    return new Promise((resolve) => {
      const request = indexedDB.open('StreamVaultDB', 1);

      request.onerror = () => resolve(0);

      request.onsuccess = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('offline-queue')) {
          resolve(0);
          return;
        }

        const transaction = db.transaction(['offline-queue'], 'readonly');
        const store = transaction.objectStore('offline-queue');
        const countRequest = store.count();

        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offline-queue')) {
          db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }, []);

  // Sync queued operations when coming back online
  const syncQueuedOperations = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Trigger background sync for torrents
      if ('sync' in registration) {
        await registration.sync.register('sync-torrents');
        console.log('[Offline] Background sync registered');
      }

      // Get queued operations count from IndexedDB
      const count = await getQueuedCount();
      setQueuedOperations(count);
    } catch (error) {
      console.error('[Offline] Sync failed:', error);
    }
  }, [getQueuedCount]);

  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      console.log('[Offline] Connection restored');
      setIsOnline(true);
      setJustCameOnline(true);

      // Hide "online" message after 3s
      setTimeout(() => {
        setJustCameOnline(false);
        setShowIndicator(false);
      }, 3000);

      // Sync queued operations
      syncQueuedOperations();
    };

    const handleOffline = () => {
      console.log('[Offline] Connection lost');
      setIsOnline(false);
      setShowIndicator(true);
    };

    // Check initial state
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [getQueuedCount, syncQueuedOperations]);

  if (!showIndicator && !justCameOnline) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="offline-indicator-content">
        {isOnline ? (
          <>
            <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="status-text">
              <strong>Back online</strong>
              {queuedOperations > 0 && (
                <span className="queued-count">
                  Syncing {queuedOperations} operation{queuedOperations !== 1 ? 's' : ''}...
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <div className="status-text">
              <strong>Offline mode</strong>
              <span className="status-desc">Using cached content</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
