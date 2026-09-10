// Combined service worker:
//  1) Injects COOP/COEP headers so SharedArrayBuffer (and the multithreaded
//     Fairy-Stockfish WASM engine) works on hosts that can't set headers
//     themselves (e.g. GitHub Pages). Based on coi-serviceworker (MIT).
//  2) Offline-first runtime caching for the app shell/assets.

const CACHE = 'janggi-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Add cross-origin isolation headers to a response.
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

  // Navigation: network-first, fall back to cache, then add COI headers.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return withCoiHeaders(res);
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match('./index.html'))
            .then((r) => (r ? withCoiHeaders(r) : Response.error()))
        )
    );
    return;
  }

  // Static assets: cache-first, then network; always add COI headers so the
  // engine's scripts/wasm load in a cross-origin-isolated context.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return withCoiHeaders(cached);
      return fetch(req).then((res) => {
        caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return withCoiHeaders(res);
      });
    })
  );
});
