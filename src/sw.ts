export {};
declare const self:ServiceWorkerGlobalScope;
// Build-generated manifest includes every emitted JS/CSS chunk and local WASM asset.
declare const __PRECACHE_ASSETS__:string[];
declare const __CACHE_VERSION__:string;
declare const __APP_VERSION__:string;
const CACHE=__CACHE_VERSION__;
const ASSETS=__PRECACHE_ASSETS__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fieldwork-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// The page asks which build is serving it. Answered by the controlling worker, so the answer is
// the build actually in use rather than the build the page was compiled from — which is the whole
// point when a stale cache is the thing under suspicion.
self.addEventListener('message',event=>{
  if((event.data as {type?:string}|null)?.type!=='fieldwork-build')return;
  // The application VERSION as well as the cache id. A content hash tells a reader nothing about
  // whether they are looking at last week's build; a version number does, and the number that
  // matters is the one the SERVING worker was compiled from, not the one the page believes.
  (event.source as Client|null)?.postMessage({type:'fieldwork-build',build:CACHE,version:__APP_VERSION__});
});
/** Cache-first served a stale build forever, and said nothing.
 *
 *  `caches.match(...).then(hit=>hit||fetch(...))` never revalidated anything, so once a build was
 *  in the cache it was the build, and a reload could not replace it. The practitioner reported it
 *  twice -- "The local browser still shows the 0.70 version", then "The local fieldwork is still
 *  0.7.0" -- while the repository was at 0.8.1 and every deploy had succeeded. Nothing was broken
 *  except that what they were looking at was months of work out of date, with no way to tell.
 *
 *  Navigations and the documents that decide which build runs are **network-first** now, falling
 *  back to the cache when the network is unavailable, so a reload with a connection always gets
 *  the current build. Everything else stays cache-first, which is what makes this application work
 *  offline, and those assets are content-addressed anyway: a new build gives them new names.
 */
const ALWAYS_FRESH=/\/(index\.html|sw\.js)$|\/build\/app\.js$|\/styles\.css$|\/$/;

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url);
  const fresh=event.request.mode==='navigate'||ALWAYS_FRESH.test(url.pathname);
  if(!fresh){
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    // Keep the cache current so the offline fallback is the build they last had online, not the
    // one they first installed.
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'})
    .then(hit=>hit??Response.error())));
});
