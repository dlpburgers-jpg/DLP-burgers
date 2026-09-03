const CACHE = 'dlp-v5-2483fda4258c';
const FILES = ["./index.html","./manifest.webmanifest","./favicon.svg","./icon-192.png","./icon-512.png","./assets/index-BYChdS8-.js","./assets/index-DmgGA1_Q.css","./assets/preview-disabled-CwRR3fzr.js"];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dlp-v5-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 if (event.request.mode === 'navigate') {
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
 } else if (FILES.some(path => new URL(path, self.location.href).href === url.href)) {
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(hit => hit || fetch(event.request)));
 }
});
