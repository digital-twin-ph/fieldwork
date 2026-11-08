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
    // A REJECTED PROMISE HANDED TO `respondWith` IS AN ERROR THE WORKER RAISES, and it surfaces
    // on the controlled PAGE -- which is how a fetch the page catches correctly still produced
    // two page errors. Offline, anything not precached misses the cache, `fetch` rejects, and
    // this handed that rejection straight to `respondWith`.
    //
    // `build/asset-manifest.json` is the one that found it: deliberately NOT precached, so it
    // reports the build on disk rather than the one the worker serves, and therefore the one
    // request guaranteed to miss. Twelve WebKit tests failed on it -- every test that takes the
    // application offline to prove it recomputes there, none of which opens the write-up at all.
    // But the defect was never about that file: EVERY uncached request offline raised this.
    //
    // THE SIBLING BRANCH BELOW ALREADY LEARNED THIS, which is the part worth noticing. Its
    // comment records the same symptom -- "three 'Load failed' page errors in CI WebKit" -- and
    // the fix went to one of the two branches that needed it. The seventh instance today of a
    // repair applied to one of the places it belonged.
    //
    // A 504 AND NOT `Response.error()`, which was the first fix and was still wrong: WebKit
    // raises "Response served by service worker is an error" for a network-error response just
    // as it raises one for a rejection, so that traded two page errors for one. A worker cannot
    // decline after the fact either -- `respondWith` must be called during dispatch, before the
    // cache has been consulted.
    //
    // So the worker answers honestly instead: offline with nothing cached IS a gateway failure,
    // and 504 says so in the one vocabulary a caller already has to handle. The page's fetch
    // RESOLVES with a response whose `ok` is false, which every caller here already branches on
    // -- `app.ts` reads the manifest as `r=>r.ok?r.json():null` and was always prepared for it.
    event.respondWith(caches.match(event.request)
      .then(hit=>hit||fetch(event.request))
      .catch(()=>new Response('',{status:504,statusText:'Offline, and not in the cache'})));
    return;
  }
  // Network first, but never worse than the cache. The first version of this returned
  // `Response.error()` when the network failed and nothing was cached, which turns a transient
  // local failure into a hard load error -- cache-first had been quietly serving the cache
  // through exactly those. It showed up as three "Load failed" page errors in CI WebKit and in
  // no local run, which is the signature of a flaky server rather than a defect.
  //
  // So: race the network against a short timer. Whichever is ready first wins, the cache is
  // updated from any successful fetch, and a failure falls back to the cache before it falls
  // back to failing.
  const fromCache=()=>caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'});
  event.respondWith((async()=>{
    const network=fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    });
    // THE SAME TWO LESSONS AS THE BRANCH ABOVE, applied here too (2026-11-08). A fetch left to finish in the background
    // after the cache answered had no handler: when it failed -- WebKit cancels it when the page navigates away, as
    // every test does on its way in -- the rejection was unhandled, and surfaced on the page as "…/sw.js due to access
    // control checks", failing ten to fifteen WebKit tests a run in CI, never the same ten. And with nothing cached, a
    // failed fetch was still handed to `respondWith` as a rejection; it is a 504 here as it is above.
    network.catch(()=>{/* handled where it is awaited; this only marks it as seen */});
    const offline=()=>new Response('',{status:504,statusText:'Offline, and not in the cache'});
    try{
      const slow=new Promise<undefined>(resolve=>setTimeout(()=>resolve(undefined),2000));
      const first=await Promise.race([network,slow]);
      if(first)return first;
      // The network is being slow. Serve what is cached if anything is, and let the fetch finish
      // in the background so the next load has it.
      return (await fromCache())??await network.catch(offline);
    }catch{
      return (await fromCache())??offline();
    }
  })());
});
