const CACHE_NAME="nabagagem-shell-v1";
const SHELL=["/","/login","/cadastro","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim())});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||caches.match("/"))));
});