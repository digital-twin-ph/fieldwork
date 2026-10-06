export {};
declare const self:ServiceWorkerGlobalScope;
// Build-generated manifest includes every emitted JS/CSS chunk and local WASM asset.
declare const __PRECACHE_ASSETS__:string[];
declare const __CACHE_VERSION__:string;
const CACHE=__CACHE_VERSION__;
const ASSETS=__PRECACHE_ASSETS__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fieldwork-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'}).then(hit=>hit||fetch(event.request)));
});
