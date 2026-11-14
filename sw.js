/* TypeCraft service worker: caches the app's own files so lessons and games work
   offline. Never caches anything under /api. A new version waits until the page
   asks it to take over ("Update ready, reload"). Bump VERSION with each release. */
const VERSION = 'typecraft-next-1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon.svg',
  'css/app.css', 'css/next.css', 'css/games.css', 'css/rewards.css', 'css/typewriter.css',
  'shared/course-meta.js', 'shared/rewards-rules.js', 'js/course.js', 'js/rewards-ui.js', 'js/typewriter.js', 'js/app.js',
  'js/games/core.js', 'js/games/storm.js', 'js/games/beat.js', 'js/games/tug.js', 'js/games/ghost.js', 'js/games/pop.js',
  'js/games/tower.js', 'js/games/safe.js', 'js/games/boss.js', 'js/games/daily.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
  // pages: network first (so signing in and updates show), the cache when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // files: the cache first, refreshed in the background
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
