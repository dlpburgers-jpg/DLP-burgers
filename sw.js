/* global __ASSETS__, __GOOGLE_REVIEW_URL__ */
const CACHE = 'dlp-v5-8efdfea7868e';
const FILES = ["./index.html","./manifest.webmanifest","./favicon.svg","./icon-192.png","./icon-512.png","./dlp-circular.svg","./dlp-circular-48.png","./apple-touch-icon-circular.png","./dlp-circular-192.png","./dlp-circular-512.png","./dlp-circular-maskable-512.png","./assets/app-guest-tables-8b7048d8e6dc.js","./assets/app-TrvkmhTv.css","./assets/BrandLogo-BiGP6jCE.js","./assets/dlp-admin-logo-C93FT983.webp","./assets/dlp-burgers-banner-DeM66YSH.webp","./assets/dlp-campaign-DJF9PhSl.webp","./assets/dlp-stamp-mascot-CGmmHtWY.webp","./assets/menu-BFyh3faN.css","./assets/menu-BvF_PrzL.js","./assets/preview-disabled-CwRR3fzr.js","./assets/web-CRHRPrmL.js","./assets/web-CZQ9MO4J.js"];
const GOOGLE_REVIEW_URL = "https://g.page/r/CZvwQlkxICVdEAE/review";
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dlp-v5-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message',event=>{
 if(event.data?.type==='DLP_ACTIVATE_PUSH')event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 // The independent QR menu must not fall back to the ordering app when offline.
 if (url.pathname.startsWith(new URL('./menu/', self.location.href).pathname)) return;
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
  data:{target,...(data.reviewUrl===GOOGLE_REVIEW_URL?{reviewUrl:GOOGLE_REVIEW_URL}:{})}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 if(event.notification.data?.reviewUrl===GOOGLE_REVIEW_URL){
  event.waitUntil(self.clients.openWindow(GOOGLE_REVIEW_URL));
  return;
 }
 const view=['shop','account','orders'].includes(event.notification.data?.target)?event.notification.data.target:'shop';
 const url=new URL('./',self.location.href);url.searchParams.set('screen',view);
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(client=>{const u=new URL(client.url);return u.origin===url.origin&&u.pathname.startsWith(new URL('./',self.location.href).pathname);});
  if(existing){existing.postMessage({type:'DLP_PUSH_OPEN',view});return existing.focus();}
  return self.clients.openWindow(url.href);
 }));
});
