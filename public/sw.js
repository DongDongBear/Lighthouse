/* Lighthouse Service Worker
 * Strategy:
 * - HTML/doc pages: network-first (always fresh content)
 * - Static images/assets (esp. /card-bg/): stale-while-revalidate
 */

const CACHE_VERSION = 'lh-static-v1';
const STATIC_CACHE = CACHE_VERSION;

const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|svg|avif)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isImage = IMAGE_EXT_RE.test(url.pathname);
  const isCardBg = url.pathname.includes('/card-bg/');
  const isAstroStatic = url.pathname.includes('/_astro/');

  if (isImage || isCardBg || isAstroStatic) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // documents remain fresh
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || fetch(request);
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Network unavailable and no cache for ' + request.url);
  }
}
