const CACHE_NAME = 'fuelfinder-v1.4.2';
const TILE_CACHE_NAME = 'fuelfinder-tiles-v1';
const API_CACHE_NAME = 'fuelfinder-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/leaflet.css'
];

// Max map tiles to store in CacheStorage
const MAX_TILES = 500;

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const excess = keys.length - maxItems;
    if (excess > 0) {
      const keysToDelete = keys.slice(0, excess);
      await Promise.all(keysToDelete.map((key) => cache.delete(key)));
    }
  } catch {
    // Ignore cache trimming errors in background
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, TILE_CACHE_NAME, API_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!allowedCaches.has(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Map Tiles (OpenStreetMap) -> Cache-First Strategy
  if (url.hostname === 'tile.openstreetmap.org' || url.hostname.endsWith('.tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimCache(TILE_CACHE_NAME, MAX_TILES);
          }
          return networkResponse;
        } catch {
          return cachedResponse || new Response('', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })
    );
    return;
  }

  // 2. External Routing & Geocoding (OSRM & Nominatim) -> Network-First with Cache Fallback
  if (url.hostname === 'router.project-osrm.org' || url.hostname === 'nominatim.openstreetmap.org') {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;

          // Graceful fallback (empty array for search, empty address for reverse)
          const isReverse = url.pathname.includes('/reverse');
          const fallbackBody = isReverse ? { address: {} } : [];

          return new Response(JSON.stringify(fallbackBody), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      })
    );
    return;
  }

  // 3. Same-origin Requests
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) {
      // Direct pass-through for dynamic backend API queries
      return;
    }

    // 3a. Navigation & HTML Document Requests (SSR / Dynamic Routes / Direct visits) -> Network-First with Cache/SPA Fallback
    const isNavigation =
      request.mode === 'navigate' ||
      request.destination === 'document' ||
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

    if (isNavigation) {
      event.respondWith(
        fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaqueredirect')) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedMatch =
              (await cache.match(request)) ||
              (await cache.match('/index.html')) ||
              (await cache.match('/'));

            return (
              cachedMatch ||
              new Response(
                '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Offline - FuelFinder</title></head><body><p>Applicazione offline. Riconnettiti per visualizzare i prezzi aggiornati.</p></body></html>',
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
              )
            );
          })
      );
      return;
    }

    // 3b. Static Assets (CSS, JS, WebP, SVG, WOFF2) -> Stale-While-Revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            return (
              cachedResponse ||
              new Response('', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              })
            );
          });

        return cachedResponse || networkFetch;
      })
    );
  }
});


