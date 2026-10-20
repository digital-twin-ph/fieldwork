import type {Boundary,Position} from './types.js';
import type {Network} from './catchments.js';
import {validateNetwork,graphLimits,downloadLimits} from './catchments.js';
import {geometryBounds} from './study-area.js';
import {isRecord} from './guards.js';
import {pacedNetworkDownload,deferNetworkDownload,chargeNetworkDownload} from './network-throttle.js';
/** The Overpass instances this client will ask, in order.
 *
 *  Named by the practitioner on 2026-10-15, after reporting that the download was broken. It was,
 *  and not because of anything in the query: measured that afternoon, overpass-api.de returned
 *  502, 200, 502 to three identical requests, and an hour later timed out entirely while
 *  kumi.systems and private.coffee both returned 500 and overpass.osm.ch answered 200 with an
 *  HTML page. Four public endpoints, none of them healthy at the same moment, and the widget
 *  asked exactly one of them once.
 *
 *  Order is deliberate: FOSSGIS first because it is the reference instance, the two Private.coffee
 *  hosts next, the Swiss association last. A mirror that answers is recorded in the provenance --
 *  WHICH instance served a network is part of where the data came from, and the receipt said
 *  overpass-api.de whatever had actually answered until this was built. */
export interface OverpassEndpoint {url:string; operator:string;
  /** Set when the instance holds one region's data and answers for the whole world anyway. No
   *  shipped instance is regional since 2026-10-19; the empty-answer handling below is general and
   *  names the region when one says it has one. */
  regional?:string}
export const OVERPASS_ENDPOINTS:readonly OverpassEndpoint[]=[
  {url:'https://overpass-api.de/api/interpreter',operator:'FOSSGIS'},
  {url:'https://overpass.kumi.systems/api/interpreter',operator:'Private.coffee'},
  {url:'https://overpass.private.coffee/api/interpreter',operator:'Private.coffee'},
  // The Swiss OpenStreetMap Association's instance was here as a fourth fallback and was removed
  // on 2026-10-19. Measured that day by asking it for a way count in five places: Zurich 1,335 and
  // Geneva 831, against ZERO for Soho in London, Milan and Kampala -- a national extract with a
  // hard edge, about 50 km from the frontier. It could answer for none of this project's study
  // areas, and being asked anyway cost a request on a donated service and produced a message that
  // blamed it for an outage belonging to the other three. The practitioner, on seeing the
  // measurement: *"Let's remove it then from the API endpoint list."*
];
/** Responses already fetched, so a repeated question is not a repeated request.
 *
 *  OSMnx caches by default (`use_cache=True`) and the practitioner asked for the same. It is a
 *  reliability measure and a courtesy at once: the fastest request is the one not made, and these
 *  are free public services.
 *
 *  The Cache API rather than `localStorage`. These responses are megabytes -- Bunia's ways alone
 *  are 2.4 MB -- against a store measured at 5,226,496 bytes that already holds every saved
 *  workspace (experiment 121). The Cache API is built for HTTP responses, has no such ceiling, and
 *  this project already uses it for the offline build.
 *
 *  The key is the QUERY, not the URL: the same bounding box asked of two instances is the same
 *  question, and the answer does not depend on who answered. Keyed through a synthetic URL because
 *  that is what the Cache API takes.
 *
 *  **A cache hit does not claim to be a fresh retrieval.** The provenance carries the original
 *  `retrievedAt` and says the bytes came from this device, because a receipt that reports the
 *  moment of reading as the moment of acquisition is wrong about the one thing it exists to
 *  record. */
const OSM_CACHE='fieldwork-osm-v1';
const cacheKey=(query:string)=>`https://fieldwork.invalid/osm?q=${encodeURIComponent(query)}`;
type CacheLike={match(k:string):Promise<Response|undefined>;put(k:string,r:Response):Promise<void>};
const openOSMCache=async():Promise<CacheLike|null>=>{
  try{return (globalThis as {caches?:{open(n:string):Promise<CacheLike>}}).caches
    ? await (globalThis as unknown as {caches:{open(n:string):Promise<CacheLike>}}).caches.open(OSM_CACHE) : null;}
  catch{return null;}
};
/** The cached body for this query, with when it was first retrieved, or null. */
export async function cachedOSM(query:string,cache?:CacheLike|null):Promise<{text:string;retrievedAt:string}|null>{
  const store=cache===undefined?await openOSMCache():cache;
  if(!store)return null;
  try{
    const hit=await store.match(cacheKey(query));
    if(!hit)return null;
    return {text:await hit.text(),retrievedAt:hit.headers.get('x-fieldwork-retrieved')||'unknown'};
  }catch{return null;}
}
/** Keep a response against its query. Failure is silent and harmless: the next run re-requests. */
export async function keepOSM(query:string,text:string,retrievedAt:string,cache?:CacheLike|null):Promise<void>{
  const store=cache===undefined?await openOSMCache():cache;
  if(!store)return;
  try{await store.put(cacheKey(query),new Response(text,
    {headers:{'content-type':'application/json','x-fieldwork-retrieved':retrievedAt}}));}
  catch{/* a full or unavailable cache costs a request, not a result */}
}

/** What an instance says about itself, read from its own `/api/status`.
 *
 *  Better than a ping, which returns a boolean. This returns the rate limit, how many slots are
 *  free, and when the next one frees -- the server's own answer to "when should I come back",
 *  which is what makes OSMnx reliable where a client-side guess is not. Measured 2026-10-19 while
 *  Fieldwork was reporting the service dead: `2 slots available now`.
 *
 *  The format is plain text and has no version guarantee, so every field is optional and a shape
 *  this cannot read is reported as unknown rather than as unavailable. Not knowing and being down
 *  are different, and only one of them is a reason not to try. */
export interface OverpassStatus {
  url:string; operator:string; reachable:boolean;
  rateLimit?:number; slotsAvailable?:number; waitSeconds?:number; runningQueries?:number;
  announcedEndpoint?:string; raw?:string; error?:string;
}
export function readOverpassStatus(text:string):Omit<OverpassStatus,'url'|'operator'|'reachable'>{
  const out:Omit<OverpassStatus,'url'|'operator'|'reachable'>={raw:text};
  const limit=text.match(/^Rate limit:\s*(\d+)/m);
  if(limit)out.rateLimit=Number(limit[1]);
  const slots=text.match(/^(\d+)\s+slots?\s+available now/m);
  if(slots)out.slotsAvailable=Number(slots[1]);
  // "Slot available after: <iso>, in N seconds." -- several lines when several are queued, and the
  // soonest is the one worth waiting for.
  const waits=[...text.matchAll(/Slot available after:[^,]*,\s*in\s+(-?\d+)\s+seconds/g)]
    .map(m=>Number(m[1])).filter(Number.isFinite);
  if(waits.length)out.waitSeconds=Math.max(0,Math.min(...waits));
  if(out.slotsAvailable===undefined&&waits.length)out.slotsAvailable=0;
  const running=text.match(/^Currently running queries[^\n]*\n([\s\S]*)$/m);
  if(running)out.runningQueries=running[1].split('\n').filter(line=>/^\s*\d+\s/.test(line)).length;
  const announced=text.match(/^Announced endpoint:\s*(\S+)/m);
  if(announced)out.announcedEndpoint=announced[1];
  return out;
}
/** Ask every instance how it is, in parallel. One small GET each, and the answer is the server's
 *  own, so it costs a request to learn what guessing cannot tell you. */
/** How long one status read may take. Twelve seconds, not the six the removed ping used: that was
 *  a healthy service's latency, and the measured one under load was 14 to 27 seconds. A status
 *  that times out costs only that its instance is tried after the ones that answered. */
export const STATUS_MS=12000;
export async function overpassStatuses(fetcher:typeof fetch=fetch,timeoutMs=STATUS_MS):Promise<OverpassStatus[]>{
  return Promise.all(OVERPASS_ENDPOINTS.map(async endpoint=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetcher(endpoint.url.replace(/\/interpreter$/,'/status'),
        {signal:controller.signal,credentials:'omit',referrerPolicy:'origin'});
      if(!response.ok)return {url:endpoint.url,operator:endpoint.operator,reachable:false,error:`HTTP ${response.status}`};
      return {url:endpoint.url,operator:endpoint.operator,reachable:true,...readOverpassStatus(await response.text())};
    }catch(error){return {url:endpoint.url,operator:endpoint.operator,reachable:false,
      error:(error as Error)?.name==='AbortError'?`no answer within ${Math.round(timeoutMs/1000)} s`:'unreachable'};}
    finally{clearTimeout(timer);}
  }));
}


/** `liveEndpoints` and `OVERPASS_PROBE` stood here and were removed on 2026-10-19, replaced by
 *  `overpassStatuses`. The practitioner: *"/api/status is better than ping because it returns
 *  useful information."* It does -- the rate limit, the free slots and when the next one frees --
 *  where the probe returned only that something answered, and answered too slowly to be believed:
 *  a one-line probe to a healthy instance took 14.2 s, 27.3 s and 26.3 s that day against a
 *  six-second budget. A boolean that is wrong under load is worse than no boolean. */

/** The instance that answered last, tried first next time.
 *
 *  Within a session only, and deliberately not persisted: an instance that was healthy
 *  yesterday is no evidence about today, and a stale preference would send every first request
 *  of a session to whichever one happened to work last week. Reset when it stops answering. */
let preferred:string|undefined;
export const preferredEndpoint=()=>preferred;

/** How long one attempt may take, as opposed to all of them.
 *
 *  These were a single 35-second budget covering the probe and every failover attempt, which
 *  meant an instance that hung for thirty seconds left five seconds for the other three -- the
 *  failover added on 2026-10-15 was being cut short by a timeout written before it existed. A
 *  practitioner saw that as "the download is flaky", and it was, partly on our side. */
// Raised 2026-10-19 from 20,000 and 75,000. Those were measured against a responsive service; a
// one-line PROBE to overpass-api.de took 14.2 s, 27.3 s and 26.3 s that afternoon while answering
// 200 every time, so a 2 MB query had no chance inside twenty seconds. OSMnx, which the
// practitioner reports as reliable, uses a 180-second request timeout -- matched here, because
// being slow is how Overpass expresses load and giving up is how a client turns load into failure.
const ATTEMPT_MS=180000;
const TOTAL_MS=300000;

/** The reference instance. Kept as a name because receipts and tests cite it. */
export const OVERPASS=OVERPASS_ENDPOINTS[0].url;
/** The highway values this walking filter accepts. One list, used twice: Overpass filters on it
 *  so the service does not send what we would discard, and `networkFromOSM` filters on it again
 *  because a response can be a fixture or a cached file that never went through that request.
 *  Measured 2026-10-13: filtering server-side saves about 8% of the payload -- 1.52 to 1.42 MB on
 *  the Snow rectangle, 8.15 to 7.39 MB on the isochrone extent. The expectation was a large
 *  reduction and it is not one, because the payload is node coordinates and way node references
 *  rather than tags. It is kept for the service's sake, not to fit the cap. */
export const WALKABLE_HIGHWAYS=['residential','living_street','pedestrian','footway','path','steps',
  'service','unclassified','tertiary','tertiary_link','secondary','secondary_link','primary',
  'primary_link','track'] as const;
export function osmQuery(boundary:Boundary,marginM:number,maxNodes?:number){
  if(!Number.isFinite(marginM)||marginM<0||marginM>2000)throw new Error('Download margin must be 0–2,000 metres.');
  const b=geometryBounds(boundary),dy=marginM/111195,dx=dy/Math.cos((b[1]+b[3])/2*Math.PI/180);
  const bounds=[b[0]-dx,b[1]-dy,b[2]+dx,b[3]+dy];
  // **No span cap.** A fixed 6 km envelope stood here and refused a study area for its EXTENT,
  // before anything about the download had been measured. It was the last of the four numbers the
  // 2026-10-13 measurement set out to reconcile: `maxBytes` and `maxFeatures` were derived from the
  // graph knob that day and this one was left behind, underived and unread by it, so raising the
  // knob could not raise the envelope.
  //
  // It contradicted the principle written beside those caps -- *"a sparse area yields fewer
  // junctions per byte and must not be refused for it"* -- because extent is a proxy for size and a
  // poor one: the same box is a dense city or an empty lake. The practitioner reported it on
  // 2026-10-19 trying to download Buvuma Island, whose bounding box is mostly Lake Victoria and
  // whose roads are sparse: *"It just so happens that that kind of cap will stop practical work
  // being done."*
  //
  // What remains is what the module already argued was right when it removed `maxsize` for the same
  // reason: the service's own timeout is the service's budget, and the streaming byte cap below is
  // a real limit on a real quantity. A large area is now attempted and refused on what it actually
  // costs -- bytes, features, or the service's own partial answer -- rather than on its width.
  //
  // The coordinate checks stay. They catch a boundary that is not on Earth, which is a different
  // thing from one that is large.
  const span=(bounds[2]-bounds[0])*111195*Math.cos((b[1]+b[3])/2*Math.PI/180),height=(bounds[3]-bounds[1])*111195;
  if(bounds.some(v=>!Number.isFinite(v))||bounds[0]<-180||bounds[2]>180||Math.abs(bounds[1])>80||Math.abs(bounds[3])>80)
    throw new Error('The study area\'s bounds are not usable coordinates, so no request was made. '
      +'Longitude must be within 180 degrees and latitude within 80, which is where this walking filter has been measured.');
  if(!(span>0)||!(height>0))throw new Error('The study area has no width or no height, so there is nothing to download.');
  const [w,s,e,n]=bounds;
  // Complete ways and referenced nodes preserve edge topology at the envelope. `>;` recurses to
  // every node of the selected ways, so topology survives at the boundary.
  //
  // Output is split by what is read downstream: ways with tags and node references, their nodes as
  // skeletons (id and coordinates only), and tags for barrier nodes alone. `qt` orders by quadtile,
  // which is the cheaper ordering for the service. Named-set output -- `.ways out body;` -- parses
  // on some Overpass versions and not on overpass-api.de 0.7.62, which refuses it, so the default
  // set is used throughout.
  //
  // **No `maxsize`.** It was set to this client's byte cap on 2026-10-13, on the reasoning that the
  // service should refuse early rather than build a result that would be discarded. That reasoning
  // rested on a mistake: Overpass's `maxsize` is the MEMORY BUDGET FOR EXECUTING THE QUERY on the
  // server, not the size of the response. Setting it to 2 MB made the Soho isochrone example fail
  // with "Query ran out of memory in 'query' at line 1. It would need at least 3 MB of RAM to
  // continue" -- a query whose answer is well inside 2 MB still needs more than that to compute.
  // The service's own default is the right budget; what protects this client is the streaming byte
  // cap below, which is a real limit on a real quantity.
  const highways=WALKABLE_HIGHWAYS.join('|');
  const query=`[out:json][timeout:25];way["highway"~"^(${highways})$"]`
    +`(${s.toFixed(7)},${w.toFixed(7)},${n.toFixed(7)},${e.toFixed(7)});out body qt;>;out skel qt;`
    +`node._["barrier"];out tags qt;`;
  return {query,bounds,marginM};
}
function metres(a:Position,b:Position){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,h=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 12742017.6*Math.asin(Math.sqrt(Math.min(1,h)));}
export function networkFromOSM(raw:unknown,maxNodes?:number):Network{
  // `raw` is unknown until the guard passes, so the count is read after narrowing rather than
  // inside the condition, where it would be reported as `unknown`.
  // Three different failures used to share one sentence -- "incomplete, too large, or contains a
  // server warning" -- so a reader could not tell which had happened. A first draft of the split
  // was worse: it reported the feature count against the 15,000 cap even when the cause was a
  // server remark, which told a reader that 5 features exceeded 15,000.
  if(!isRecord(raw)||!Array.isArray(raw.elements))
    throw new Error('The street data for this area was not in the expected form, so nothing was '
      +'changed. Retry the download; if it persists, the service is returning something this '
      +'widget cannot read.');
  if(raw.remark)
    throw new Error(`The street service reported a partial answer and the previous graph is `
      +`unchanged: ${String(raw.remark).slice(0,200)}. This usually means the request was too `
      +`large or the service was busy; retry, or draw a smaller study area.`);
  const {maxFeatures}=downloadLimits(maxNodes);
  if(raw.elements.length>maxFeatures)
    throw new Error(`The street data for this area came back with ${raw.elements.length} features, `
      +`more than the ${maxFeatures} this widget normalizes, and the previous graph is unchanged. `
      +`This is a limit on street detail, not on area: raise the graph limit on the Street network `
      +`widget, draw a smaller study area, or upload a network file prepared outside the browser.`);
  const positions=new Map<string,Position>();const blocked=new Set<string>();
  // A node may now arrive twice: once as a skeleton with coordinates and no tags, once as tags with
  // no coordinates. So coordinates are only recorded when they are actually present -- writing
  // `[undefined,undefined]` for a tags-only node would put a hole in the geometry that later
  // surfaces as a NaN length.
  for(const e of raw.elements)if(isRecord(e)&&e.type==='node'){
    const id=String(e.id);
    if(Number.isFinite(e.lon)&&Number.isFinite(e.lat))positions.set(id,[e.lon as number,e.lat as number]);
    const t=isRecord(e.tags)?e.tags:{};
    if(t.barrier&&!['no','entrance'].includes(String(t.barrier))&&!['yes','designated','permissive'].includes(String(t.foot)))blocked.add(id);
  }
  const edges:Network['edges']=[],used=new Set<string>();
  const allowed=new Set<string>(WALKABLE_HIGHWAYS);
  for(const item of raw.elements){if(!isRecord(item)||item.type!=='way'||!Array.isArray(item.nodes))continue;const t=isRecord(item.tags)?item.tags:{};
    if(!allowed.has(String(t.highway))||['no','private','use_sidepath'].includes(String(t.foot))||(['no','private'].includes(String(t.access))&&!['yes','designated','permissive'].includes(String(t.foot)))||Object.keys(t).some(k=>k.endsWith(':conditional')))continue;
    const direction=String(t['oneway:foot']||'no');if(!['yes','1','true','-1','no','0','false'].includes(direction))continue;
    for(let i=1;i<item.nodes.length;i++){const from=String(item.nodes[i-1]),to=String(item.nodes[i]);if(!positions.has(from)||!positions.has(to))throw new Error('OSM way references missing nodes; retry the download.');if(blocked.has(from)||blocked.has(to))continue;const lengthM=metres(positions.get(from)!,positions.get(to)!);if(!Number.isFinite(lengthM)||lengthM<=0)continue;
      const edge={from:'osm-'+from,to:'osm-'+to,lengthM};if(direction!=='-1')edges.push(edge);if(!['yes','1','true'].includes(direction))edges.push({...edge,from:edge.to,to:edge.from});used.add(from);used.add(to);
    }
  }
  const network:Network={nodes:[...used].map(id=>({id:'osm-'+id,coordinates:positions.get(id)!})),edges,source:'OpenStreetMap contributors, ODbL; prototype walking filter v1. Uses explicit foot restrictions; excludes conditional ways and unapproved barriers. No turn restrictions, grade, stairs cost or wheelchair model. Vehicle oneway does not imply foot oneway.',limits:graphLimits(maxNodes)};validateNetwork(network,maxNodes);return network;
}
/** `refresh` is what the button means when the node already holds a network: fetch it again. The
 *  cache exists to spare a request nobody needs -- a node with nothing in it, a workflow reopened,
 *  the same area asked for twice -- and not to answer a practitioner who pressed Download BECAUSE
 *  what they have is wrong or stale. Serving that from cache would make the button look broken in
 *  the one case where it has to work. */
export function downloadOSM(boundary:Boundary,marginM:number,maxNodes?:number,pauseMs?:number,refresh=false,onPhase?:(message:string,fraction?:number)=>void):Promise<Network>{
  osmQuery(boundary,marginM,maxNodes); // Invalid local input must not consume the public-service pause.
  return pacedNetworkDownload(()=>requestOSM(boundary,marginM,fetch,maxNodes,pauseMs,undefined,undefined,undefined,refresh,onPhase));
}
/** Request/normalization boundary exposed for fixture tests; UI must use paced downloadOSM. */
/** `exclude` carries the instances this request has already learned cannot serve this area, so a
 *  regional mirror that answers with nothing hands the attempt on to the next instance instead of
 *  ending it. Internal: callers pass nothing. */
export async function requestOSM(boundary:Boundary,marginM:number,fetcher:typeof fetch=fetch,maxNodes?:number,pauseMs?:number,exclude:ReadonlySet<string>=new Set(),onWait?:(w:{operator:string;seconds:number})=>void,cacheStore?:CacheLike|null,refresh=false,onPhase?:(message:string,fraction?:number)=>void):Promise<Network>{
  const request=osmQuery(boundary,marginM,maxNodes);
  // One budget per attempt, and one for the whole thing. See ATTEMPT_MS.
  const startedAt=Date.now();
  let controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ATTEMPT_MS);
  const freshAttempt=()=>{clearTimeout(timer);controller=new AbortController();
    timer=setTimeout(()=>controller.abort(),ATTEMPT_MS);return controller.signal;};
  const outOfTime=()=>Date.now()-startedAt>TOTAL_MS;
  try{
    let response!:Response;
    // Overpass fails on its own account, and one attempt treats that as the practitioner's
    // problem. Measured against overpass-api.de on 2026-10-15, after a report that the download
    // was broken: three identical requests returned 502, 200, 502. The query was fine; the public
    // instance is intermittent, and a single attempt meets it two times in three.
    //
    // So a SERVER error is retried twice with a short backoff. 429 is not retried -- that one
    // means this client is asking too often, and waiting is the answer, which
    // deferNetworkDownload already enforces. Nor is any other 4xx: a refused query is refused
    // however many times it is sent.
    // Each endpoint once, in order, then the whole list a second time with a backoff. A server
    // error, a connection failure and an HTML body are all the same thing from here -- this
    // instance is not serving the API now -- so all three move to the next instance rather than
    // being reported to a practitioner who cannot act on any of them.
    //
    // 429 stops everything: it means this client is asking too often, and asking a DIFFERENT
    // public instance instead would be discourteous rather than clever.
    const SERVER_ERRORS=[500,502,503,504];
    // The heartbeat. One short wait asked of every instance at once, so a download is not spent
    // discovering that the first three are down -- which on 2026-10-15 they were.
    // Regional instances last: one answers for the whole world and holds part of it, so it is a
    // fallback and never a first choice, whatever the probe says about its health.
    // The probe ORDERS the attempts; it does not veto them. It used to: an empty probe result threw
    // "No Overpass instance is answering" and the download never started. Measured 2026-10-19,
    // three one-line probes to overpass-api.de answered 200 in 14.2 s, 27.3 s and 26.3 s against a
    // 6-second probe budget -- so a service that was up, and that curl and OSMnx both reached from
    // this machine, was declared dead for being slow. The practitioner: *"It cannot be it works
    // with hand surgery but FW does not."*
    //
    // Overpass is slow exactly when it is queuing, which is exactly when waiting is the right
    // move, so a budget tuned for a healthy service rejects the case the failover exists for. The
    // probe keeps its purpose -- spend one short wait to try a responsive instance first -- and
    // loses the power to refuse. A download attempt already has its own 20-second budget and the
    // whole thing has 75 seconds; nothing is unbounded.
    // The cheapest request is the one not made. Checked before the status read, because a hit
    // means no service is touched at all.
    const hit=refresh?null:await cachedOSM(request.query,cacheStore);
    if(hit){
      const network=networkFromOSM(JSON.parse(hit.text),maxNodes);
      network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',
        attribution:'\u00a9 OpenStreetMap contributors',fromCache:true,
        retrievedAt:hit.retrievedAt,query:request.query,bounds:request.bounds,marginM:request.marginM};
      return network;
    }

    // Ask each instance how it is, rather than whether it answers. `/api/status` reports the rate
    // limit, the free slots and when the next one frees, which is the server's own answer to the
    // only question worth asking -- and it is what OSMnx reads to be reliable where a client-side
    // guess is not. An instance with a free slot is tried first; one with none is tried after,
    // not refused, because the status is advice and the attempt is the test.
    // Read in full, and waited for. A first version capped this at three seconds so a download
    // would start sooner, which quietly abandoned the only thing that makes the client courteous:
    // if the read times out, the pause the service asked for is never learned and the request goes
    // anyway. The practitioner: *"If we are going to be respectful of the API we should follow
    // what it says."* A pause this client invents is not the service's pause, and a status it
    // declined to wait for might as well not have been read.
    //
    // The cost is seconds before a download on a loaded service, and the answer to that is to SAY
    // so -- `onPhase` reports what is being waited on -- not to stop asking.
    onPhase?.('Asking each instance how busy it is\u2026');
    const statuses=await overpassStatuses(fetcher);
    const rank=(url:string)=>{
      const status=statuses.find(entry=>entry.url===url);
      if(!status||!status.reachable)return 2;
      return (status.slotsAvailable??1)>0?0:1;
    };
    const live=OVERPASS_ENDPOINTS
      .filter(endpoint=>!exclude.has(endpoint.url))
      .sort((a,b)=>(a.regional?1:0)-(b.regional?1:0)||rank(a.url)-rank(b.url));

    // WAIT for the slot the server named, rather than refusing because it is busy. This is what
    // OSMnx does -- `_get_overpass_pause` reads /api/status and sleeps until a slot frees, falling
    // back to 60 s only on a fatal error -- and the practitioner's reason for pointing at it:
    // "I have known OSMNx to work reliably most of the time." Being busy is a schedule, not a
    // refusal, and a client that treats the two alike turns a queue into a failure.
    //
    // Bounded by the total budget and taken only when EVERY instance is busy: if one has a slot,
    // it is first in `live` already and there is nothing to wait for.
    const soonest=live.map(endpoint=>statuses.find(entry=>entry.url===endpoint.url))
      .filter(entry=>entry?.reachable&&typeof entry.waitSeconds==='number')
      .sort((a,b)=>a!.waitSeconds!-b!.waitSeconds!)[0];
    const anyFree=live.some(endpoint=>(statuses.find(entry=>entry.url===endpoint.url)?.slotsAvailable??1)>0);
    if(!anyFree&&soonest){
      const waitMs=Math.min(soonest.waitSeconds!*1000+1000,Math.max(0,TOTAL_MS-(Date.now()-startedAt)));
      if(waitMs>0){
        onWait?.({operator:soonest.operator,seconds:Math.round(waitMs/1000)});
        onPhase?.(`${soonest.operator} has no free slot; waiting the ${soonest.waitSeconds} s it asked for\u2026`);
        await new Promise(resolve=>setTimeout(resolve,waitMs));
      }
    }
    if(!live.length){
      deferNetworkDownload(null);
      // NOT "retry". Every instance has just been asked a one-line question and none replied, so a
      // retry now repeats a measurement taken a second ago. The practitioner, 2026-10-19: *"if API
      // is down, why should the user retry, instead advise the user to wait till the API comes back
      // on."* What a practitioner can act on is the saved file; what they cannot act on is the
      // health of four public services.
      throw new Error(`Every Overpass instance has already been tried for this area and none could `
        +`serve it, so nothing was downloaded and nothing was changed. Upload a saved network file, `
        +`which needs no service at all.`);
    }
    let reached:OverpassEndpoint|undefined,lastStatus=0,unreachable=0;
    outer: for(let round=1;round<=2;round++){
      for(const endpoint of live){
        if(outOfTime())break outer;
        try{response=await fetcher(endpoint.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:request.query}),signal:freshAttempt(),credentials:'omit',referrerPolicy:'origin'});}
        catch{unreachable++;continue;}
        if(response.ok){
          // A 200 carrying HTML is an error page, and parsing it as a network would fail far from
          // here. overpass.osm.ch returned exactly that on 2026-10-15.
          const kind=response.headers.get('content-type')??'';
          if(kind.includes('json')||kind.includes('text/plain')){
            reached=endpoint;preferred=endpoint.url;break outer;}
          unreachable++;continue;
        }
        lastStatus=response.status;
        if(response.status===429){deferNetworkDownload(response.headers.get('retry-after'));
          throw new Error(`OSM download failed (HTTP 429); wait before retrying.`);}
        if(!SERVER_ERRORS.includes(response.status))break outer;
      }
      if(round===1)await new Promise(resolve=>setTimeout(resolve,2000));
    }
    if(!reached){
      preferred=undefined;
      deferNetworkDownload(null);
      // The server's own wait, where it gave one. "Come back in 42 seconds" is a fact from the
      // service; "wait a few minutes" was this client's guess.
      const soonest=statuses.filter(entry=>entry.reachable&&typeof entry.waitSeconds==='number')
        .sort((a,b)=>a.waitSeconds!-b.waitSeconds!)[0];
      if(soonest)throw new Error(`Every Overpass instance is busy. ${soonest.operator} reports no free slot `
        +`and the next one in ${soonest.waitSeconds} seconds, out of ${soonest.rateLimit??'its'} `
        +`concurrent queries. Nothing was downloaded and nothing was changed. That is the service's own `
        +`answer, so waiting for it is the whole remedy \u2014 or upload a saved network file.`);
      throw new Error(`No Overpass instance answered. ${live.length} ${live.length===1?'was':'were'} answering a moment ago and `
        +`${live.length===1?'was':'were'} tried twice`
        +`${lastStatus?`, the last reporting HTTP ${lastStatus}`:''}${unreachable?`, ${unreachable} unreachable or not serving the API`:''}. `
        +`Nothing was downloaded and nothing was changed. An instance that fails a download twice in a `
        +`row is not about to succeed on a third, so wait for one to come back rather than downloading `
        +`again \u2014 or upload a saved network file, which needs no service at all.`);
    }
    // Reaching here means one instance answered with a usable body; failures are handled above.
    const {maxBytes}=downloadLimits(maxNodes),asMB=(n:number)=>(n/1e6).toFixed(1);
    // Megabytes to one decimal read best, but a response one byte over the limit rounded to the
    // same number on both sides -- "is 2.0 MB, over the 2.0 MB this download accepts", which reads
    // as a contradiction. When the two would print alike, exact bytes are used instead.
    const sizes=(size:number)=>asMB(size)===asMB(maxBytes)
      ?[`${size.toLocaleString('en')} bytes`,`${maxBytes.toLocaleString('en')} bytes`]
      :[`${asMB(size)} MB`,`${asMB(maxBytes)} MB`];
    const tooLarge=(size:number)=>{
      const [got,limit]=sizes(size);
      return new Error(`The street data for this area is ${got}, over the ${limit} this download `
        +`accepts, so nothing was changed. The limit follows the graph limit on the Street network `
        +`widget: raise it to pull more, or draw a smaller study area. Street density matters more `
        +`than extent here -- a dense city block can exceed this while a sparse district many `
        +`times the size does not.`);
    };
    if(Number(response.headers.get('content-length'))>maxBytes)throw tooLarge(Number(response.headers.get('content-length')));
    if(!response.body)throw new Error('OSM response has no readable body.');const reader=response.body.getReader(),chunks:Uint8Array[]= [];let bytes=0;
    const declared=Number(response.headers.get('content-length'))||0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>maxBytes){controller.abort();throw tooLarge(bytes);}chunks.push(value);onPhase?.(declared?`Receiving \u2014 ${(bytes/1e6).toFixed(1)} of ${(declared/1e6).toFixed(1)} MB`:`Receiving \u2014 ${(bytes/1e6).toFixed(1)} MB`,declared?bytes/declared:undefined);}}finally{await reader.cancel().catch(()=>{});}
    // Charged once the size is known: a larger request earns a longer pause.
    chargeNetworkDownload(bytes,pauseMs);
    const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}const body=new TextDecoder().decode(joined);const raw=JSON.parse(body);
    // An instance that answers 200 with an empty `elements` array has told you something, and
    // `validateNetwork` would reject it as "a street network needs at least one junction" -- true,
    // and about the wrong thing. It is either an instance that does not hold data for this area or
    // a study area with no walkable streets in it, and those need different answers from a
    // practitioner.
    //
    // Measured twice: overpass.osm.ch returned empty for a bbox in Botswana on 2026-10-15 and for
    // Buvuma Island on 2026-10-19, which is what got it removed from the list. The handling stays
    // and is now general, because the next mirror to do this will not be labelled in advance.
    //
    // The attempt does not end here. It ended until 2026-10-19, and the empty answer also set
    // `preferred` -- assigned the moment an instance returns usable JSON, before anything reads
    // what is in it -- so that instance became first choice for the rest of the session and every
    // retry met the same well-formed nothing. The practitioner, redownloading and seeing no
    // change: *"the hard reload should not be a requirement for shifting API endpoint for street
    // network. If Swiss API fails, it should retry the others."*
    if(!(raw.elements??[]).length){
      if(preferred===reached.url)preferred=undefined;
      const remaining=new Set([...exclude,reached.url]);
      if(live.some(endpoint=>!remaining.has(endpoint.url)))
        return requestOSM(boundary,marginM,fetcher,maxNodes,pauseMs,remaining,onWait,cacheStore,refresh,onPhase);
      throw new Error(`${reached.operator}'s Overpass instance answered and reported no walkable `
        +`streets for this area`+(reached.regional?`, and it holds ${reached.regional} only`:'')
        +`. Nothing was changed. Either it does not hold data for this part of the world, or the `
        +`area genuinely has no streets this walking filter accepts \u2014 a lake, a reserve, or a `
        +`boundary drawn over open ground. `
        +(live.length>1?`The other instances that were answering reported the same.`
          :`It was the only one answering, so there is nothing else to ask until another recovers.`)
        +` Check the study area on the map, or upload a saved network file.`);
    }
    const network=networkFromOSM(raw,maxNodes);
    const retrievedAt=new Date().toISOString();
    await keepOSM(request.query,body,retrievedAt,cacheStore);
    network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',
      attribution:`© OpenStreetMap contributors, via ${reached.operator}`,url:reached.url,retrievedAt,query:request.query,bounds:request.bounds,marginM,boundary:structuredClone(boundary),osmTimestamp:raw.osm3s?.timestamp_osm_base||'unknown',sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',joined))].map(b=>b.toString(16).padStart(2,'0')).join('')};return network;
  }finally{clearTimeout(timer);}
}
export function parseGraphML(text:string,filename:string,maxNodes?:number):Network{
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('GraphML external entities and document types are unsupported.');
  const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid GraphML XML.');
  const keys=new Map([...doc.getElementsByTagName('key')].map(k=>[k.getAttribute('id'),k.getAttribute('attr.name')]));
  const values=(e:Element)=>Object.fromEntries([...e.children].filter(c=>c.localName==='data').map(c=>[keys.get(c.getAttribute('key'))||'',c.textContent||'']));
  const graph=doc.getElementsByTagName('graph')[0];if(!graph||graph.getAttribute('edgedefault')!=='directed')throw new Error('Upload a directed OSMnx GraphML graph.');
  const crs=values(graph).crs||'';if(!/EPSG:4326|(?:longlat.*WGS84)/i.test(crs))throw new Error('GraphML must explicitly use WGS84 longitude/latitude (EPSG:4326). Reproject before upload.');
  const nodes=[...graph.getElementsByTagName('node')].map(e=>{const d=values(e);if(!d.x?.trim()||!d.y?.trim())throw new Error('GraphML nodes need x and y coordinates.');return {id:e.getAttribute('id')||'',coordinates:[Number(d.x),Number(d.y)]};});
  const edges=[...graph.getElementsByTagName('edge')].map(e=>{if(e.getAttribute('directed')==='false')throw new Error('Undirected edge overrides are unsupported.');const d=values(e),edge:Network['edges'][number]={from:e.getAttribute('source')||'',to:e.getAttribute('target')||'',lengthM:Number(d.length)};if(d.geometry){if(!/^LINESTRING\s*\([^()]+\)$/i.test(d.geometry))throw new Error('Use 2D LINESTRING edge geometry.');edge.geometry=d.geometry.replace(/^LINESTRING\s*\(|\)$/gi,'').split(',').map(p=>p.trim().split(/\s+/).map(Number));}return edge;});
  const result={nodes,edges,source:`Uploaded ${filename}; directed GraphML, WGS84; edge length interpreted as metres. Verify the source, acquisition date and travel mode. Original tags and restrictions are not reinterpreted.`,limits:graphLimits(maxNodes)};validateNetwork(result,maxNodes);return result;
}
export async function importNetwork(file:File,maxNodes?:number):Promise<Network>{
  const {maxBytes}=downloadLimits(maxNodes);
  if(file.size>maxBytes)throw new Error(`This network file is ${(file.size/1e6).toFixed(1)} MB, over `
    +`the ${(maxBytes/1e6).toFixed(1)} MB this upload accepts. Raise the graph limit on the Street `
    +`network widget, or simplify the graph before uploading.`);const text=await file.text();let result:Network;
  if(/\.graphml$/i.test(file.name))result=parseGraphML(text,file.name,maxNodes);
  else{const raw=JSON.parse(text);
    if(isRecord(raw)&&Array.isArray(raw.elements))result=networkFromOSM(raw,maxNodes);
    // A hand-written or previously exported graph carries no accepted ceiling, so one is recorded
    // here; without it a later step would re-validate against the default and refuse a file the
    // practitioner had just been allowed to upload.
    else{result=raw as Network;result.limits=graphLimits(maxNodes);validateNetwork(result,maxNodes);}}
  result.provenance={...result.provenance,filename:file.name,importedAt:new Date().toISOString(),sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('')};return result;
}
