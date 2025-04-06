// src/service-worker.js
const CACHE_NAME = 'squirt-cache-v1';
const OFFLINE_URL = '/index.html';

// Assets to cache immediately on service worker install
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/main.bundle.js',
  '/main.css',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - precache essential assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('squirt-cache-') && 
                 cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fall back to network, cache new requests
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip SPARQL API requests - they should always go to network
  if (event.request.url.includes('/sparql') || 
      event.request.url.includes('/query') || 
      event.request.url.includes('/update')) {
    return;
  }
  
  // For navigation requests (HTML documents), use a network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // For all other requests, use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache responses that aren't successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // For image requests, return a fallback image
            if (event.request.destination === 'image') {
              return caches.match('/icons/icon-192x192.png');
            }
            
            // For other assets, just propagate the error
            throw error;
          });
      })
  );
});

// Handle background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-icon.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        // If a window client is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Synchronize posts that were created while offline
async function syncPosts() {
  try {
    // Open IDB database
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('squirt-offline-db', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offline-posts')) {
          db.createObjectStore('offline-posts', { keyPath: 'timestamp' });
        }
      };
    });
    
    // Get all offline posts
    const offlinePosts = await new Promise((resolve, reject) => {
      const transaction = db.transaction('offline-posts', 'readonly');
      const store = transaction.objectStore('offline-posts');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    // If there are no offline posts, exit
    if (!offlinePosts.length) {
      return;
    }
    
    // Send each post to the server
    for (const post of offlinePosts) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(post.data)
        });
        
        if (response.ok) {
          // Remove from IDB if successful
          const transaction = db.transaction('offline-posts', 'readwrite');
          const store = transaction.objectStore('offline-posts');
          store.delete(post.timestamp);
        }
      } catch (err) {
        console.error('Failed to sync post:', err);
        // Leave in IDB to try again later
      }
    }
  } catch (err) {
    console.error('Error in syncPosts:', err);
  }
}
