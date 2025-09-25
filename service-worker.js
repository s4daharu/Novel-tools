// service-worker.js

const CACHE_NAME = 'novelist-tools-cache-v1.3'; // Increment version to force update
const urlsToCache = [
  './', // Alias for index.html
  './index.html',
  './index.css',
  './index.js', // Assuming index.tsx is compiled to index.js
  './jszip.min.js', // Local copy of JSZip
  // Add paths to your icons here, make sure they match manifest.json and actual file locations
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-167x167.png', // Added this icon
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './manifest.json' // Cache the manifest itself
];

// Install event: cache core assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache, caching files:', urlsToCache);
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))); // Force reload from network for initial cache
      })
      .then(() => {
        console.log('[Service Worker] All files cached successfully.');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed:', error);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients.');
      return self.clients.claim(); // Take control of uncontrolled clients
    })
  );
});

// Fetch event: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // console.log('[Service Worker] Fetching:', event.request.url);

  // For esm.sh URLs (Capacitor dependencies), always go to network first, then cache.
  // This is a common strategy for CDNs or dynamic resources.
  if (event.request.url.startsWith('https://esm.sh/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          return cache.match(event.request); // Fallback to cache if network fails
        });
      })
    );
    return;
  }

  // For other requests (app assets), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // console.log('[Service Worker] Found in cache:', event.request.url);
          return response; // Serve from cache
        }
        // console.log('[Service Worker] Not found in cache, fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Optional: Cache new requests dynamically if needed,
            // but for this app, explicit caching in 'install' is primary.
            // Be careful caching everything, especially POST requests or API calls not meant for caching.
            if (event.request.method === 'GET' && !urlsToCache.includes(new URL(event.request.url).pathname.substring(1))) {
               // Example: Dynamically cache successfully fetched GET requests if desired
               // but be specific about what to cache.
               // For this app, sticking to pre-cached assets is safer.
            }
            return networkResponse;
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed, no cache match, and network error:', error, event.request.url);
          // Optionally, return a custom offline page here if event.request.mode === 'navigate'
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});