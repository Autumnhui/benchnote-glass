const CACHE = 'bench-v19';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './xlsx.full.min.js',
  './manifest.webmanifest',
  './icon.svg',
  './feedback-qrcode.png'
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
        // 只缓存 200 的正常响应；不缓存 opaque/错误响应，避免脏数据
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
        }
        return resp;
      })
      .catch(() => {
        // 兜底：导航请求才回退 index.html；脚本/样式等静态资源绝不能回退成 HTML，
        // 否则浏览器会把 HTML 当 JS 执行导致 SyntaxError，整页白屏且无法交互。
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html').then((c) => c || caches.match('./'));
        }
        return caches.match(e.request);
      })
  );
});
