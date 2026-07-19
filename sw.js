const CACHE = 'bench-v16';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './xlsx.full.min.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 讯飞等第三方请求直接走网络
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp && resp.status === 200) {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
  );
});
