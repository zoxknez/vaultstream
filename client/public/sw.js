// StreamVault - Service Worker
// PWA support for offline mode and advanced caching

const CACHE_NAME = 'streamvault-v1.0.0';
const RUNTIME_CACHE = 'streamvault-runtime';
const IMAGE_CACHE = 'streamvault-images';
const API_CACHE = 'streamvault-api';

// Static files for caching
const STATIC_CACHE_URLS = ['/', '/index.html', '/leaf.svg', '/manifest.json'];

// Cache size limits
const CACHE_LIMITS = {
  [IMAGE_CACHE]: 100, // 100 images max
  [API_CACHE]: 50, // 50 API responses max
  [RUNTIME_CACHE]: 100 // 100 runtime files max
};

// Limit cache size helper
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip Supabase auth requests
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Skip WebTorrent/streaming requests
  if (url.pathname.includes('/stream') || url.pathname.includes('/torrent')) {
    return;
  }

  // 🚀 OPTIMIZATION: Stale-While-Revalidate strategy for API calls
  // Returns cached response immediately while updating in background
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Fetch from network and update cache in background
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              limitCacheSize(API_CACHE, CACHE_LIMITS[API_CACHE]);
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached response immediately if available, otherwise wait for network
        return (
          cachedResponse ||
          fetchPromise ||
          new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        );
      })
    );
    return;
  }

  // 🖼️ OPTIMIZATION: Cache images separately with size limit
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, response.clone());
              limitCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response (can only be used once)
          const responseToCache = response.clone();

          // Cache the fetched response
          caches.open(RUNTIME_CACHE).then((cache) => {
            console.log('[SW] Caching new resource:', request.url);
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
      .catch((error) => {
        console.error('[SW] Fetch error:', error);

        // Return offline page if available
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'StreamVault';
  const options = {
    body: data.body || 'New notification',
    icon: '/leaf.svg',
    badge: '/leaf.svg',
    vibrate: [200, 100, 200],
    tag: 'streamvault-notification',
    data: data.url
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// 🔄 Background Sync - Sync offline torrent additions when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-torrents') {
    event.waitUntil(syncTorrents());
  }
});

async function syncTorrents() {
  console.log('[SW] Background sync: syncing offline torrent additions');

  try {
    // Open IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['offline-queue'], 'readwrite');
    const store = transaction.objectStore('offline-queue');

    // Get all queued operations
    const queue = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[SW] Found ${queue.length} queued operations`);

    // Process each queued operation
    for (const item of queue) {
      try {
        // Send queued torrent add request
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: item.headers || { 'Content-Type': 'application/json' },
          body: item.body ? JSON.stringify(item.body) : undefined
        });

        if (response.ok) {
          console.log('[SW] Synced operation:', item.id);

          // Remove from queue
          await new Promise((resolve, reject) => {
            const deleteRequest = store.delete(item.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        } else {
          console.error('[SW] Sync failed for operation:', item.id, response.statusText);
        }
      } catch (error) {
        console.error('[SW] Error syncing operation:', item.id, error);
      }
    }

    // Show notification when sync complete
    if (queue.length > 0) {
      await self.registration.showNotification('StreamVault', {
        body: `Synced ${queue.length} offline operation${queue.length !== 1 ? 's' : ''}`,
        icon: '/leaf.svg',
        tag: 'sync-complete'
      });
    }
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StreamVaultDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Message handler (communication with main app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }
});

console.log('[SW] Service Worker loaded! 🇷🇸 PUMPAJ');
