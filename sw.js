/* Wspolnota PP 72-82 — minimal service worker
 * Strategy:
 *  - HTML pages: network-first (so fresh content wins), fall back to cache.
 *  - JSON (news/i18n): network-first with short cache fallback.
 *  - Static assets (CSS/JS/img/font): stale-while-revalidate from cache.
 * No precaching — keeps the worker safe even if file list changes.
 */
const VERSION = 'v23';
const RUNTIME = 'wp-runtime-' + VERSION;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isHtml(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isJson(url) {
  return url.pathname.endsWith('.json');
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.status === 200 && request.method === 'GET') cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isHtml(request)) {
      const offline = await cache.match('./404.html');
      if (offline) return offline;
    }
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok && res.status === 200 && request.method === 'GET') cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // skip cross-origin (fonts, etc.)
  // Video uses Range requests / partial responses — let the browser handle it directly.
  if (request.destination === 'video' || request.headers.has('range') || /\.(mp4|webm|ogv|m4v)$/i.test(url.pathname)) return;

  if (isHtml(request) || isJson(url)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
