// Service worker:
//  1) Injects COOP/COEP headers so SharedArrayBuffer works on hosts that can't
//     set headers (GitHub Pages). On hosts that already send them (Cloudflare
//     Pages) this is simply redundant and harmless.
//  2) Offline caching. NETWORK-FIRST so a new deploy is always picked up and we
//     never get stuck serving a stale (possibly broken) old build.

const CACHE = 'janggi-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withCoiHeaders(response) {
  if (!response || response.status === 0) return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;

  // Network-first for everything: always try the latest from the network,
  // update the cache, and only fall back to cache when offline. This prevents
  // stale index.html / JS / wasm from a previous build being served forever.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return withCoiHeaders(res);
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return withCoiHeaders(cached);
          if (req.mode === 'navigate') {
            return caches.match('./index.html').then((h) =>
              h ? withCoiHeaders(h) : Response.error()
            );
          }
          return Response.error();
        })
      )
  );
});
