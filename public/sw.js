/* Only a public offline page and app icons are cached. Never cache authenticated responses. */
const CACHE="fluxo-public-v1";
const ASSETS=["/offline.html","/icons/icon-192.png","/icons/icon-512.png","/icons/apple-touch-icon.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("fluxo-public-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
  if(event.request.mode==="navigate")event.respondWith(fetch(event.request,{cache:"no-store"}).catch(()=>caches.match("/offline.html")));
  else if(ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
