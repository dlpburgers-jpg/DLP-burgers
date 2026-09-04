/* global __ASSETS__ */
const CACHE = 'dlp-v5-bf1162c84fc9';
const FILES = ["./index.html","./manifest.webmanifest","./favicon.svg","./icon-192.png","./icon-512.png","./dlp-circular.svg","./dlp-circular-48.png","./apple-touch-icon-circular.png","./dlp-circular-192.png","./dlp-circular-512.png","./dlp-circular-maskable-512.png","./assets/dlp-admin-logo-CKBb41bS.jpeg","./assets/dlp-burgers-banner-D8DG3Hn2.png","./assets/dlp-campaign-S8xeskhn.jpeg","./assets/index-DXvvUfLP.js","./assets/index-_2T81t30.css","./assets/preview-disabled-CwRR3fzr.js"];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dlp-v5-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message',event=>{
 if(event.data?.type==='DLP_ACTIVATE_PUSH')event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 if (event.request.mode === 'navigate') {
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
 } else if (FILES.some(path => new URL(path, self.location.href).href === url.href)) {
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(hit => hit || fetch(event.request)));
 }
});

// Web Push usa el mismo worker que conserva la app instalada.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{/* Mostrar un aviso genérico si el mensaje no tiene JSON. */}
 const target=['shop','account','orders'].includes(data.target)?data.target:'shop';
 event.waitUntil(self.registration.showNotification(String(data.title||'DLP Burgers').slice(0,60),{
  body:String(data.body||'Tenés una novedad de DLP.').slice(0,240),
  icon:new URL('./dlp-circular-192.png',self.location.href).href,
  tag:data.campaignId?`dlp-${data.campaignId}`:undefined,
  data:{target}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const view=['shop','account','orders'].includes(event.notification.data?.target)?event.notification.data.target:'shop';
 const url=new URL('./',self.location.href);url.searchParams.set('screen',view);
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(client=>{const u=new URL(client.url);return u.origin===url.origin&&u.pathname.startsWith(new URL('./',self.location.href).pathname);});
  if(existing){existing.postMessage({type:'DLP_PUSH_OPEN',view});return existing.focus();}
  return self.clients.openWindow(url.href);
 }));
});
