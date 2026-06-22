// Service worker — NETWORK-FIRST (siempre intenta la última versión; usa el caché solo sin conexión)
// Así nunca queda "pegada" una versión vieja, y la app funciona offline una vez visitada.
const CACHE = 'gastos-cache-v10';
const ASSETS = [
  './', './index.html', './data.js',
  './icon-192.png', './icon-512.png', './manifest.webmanifest',
  './vendor/alpine.min.js', './vendor/chart.umd.min.js', './vendor/dexie.min.js', './vendor/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Las llamadas de sincronización (Supabase) nunca se cachean: siempre van a la red.
  if (url.hostname.indexOf('supabase') !== -1) return;
  // Network-first: intenta la red; si falla (offline), responde desde el caché.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
