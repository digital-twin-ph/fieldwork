import type {Boundary,Position} from './types.js';
import type {Network} from './catchments.js';
import {validateNetwork,graphLimits,downloadLimits,BYTES_PER_NODE,BYTES_PER_FEATURE,NETWORK_NODE_LIMIT_MAX} from './catchments.js';
import {geometryBounds} from './study-area.js';
import {isRecord} from './guards.js';
import {pacedNetworkDownload,deferNetworkDownload,chargeNetworkDownload} from './network-throttle.js';
import {NETWORK_TRAVEL_MODES,type NetworkTravelMode} from './catchments.js';
export {NETWORK_TRAVEL_MODES,type NetworkTravelMode};
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
export const ATTEMPT_MS=180000;
export const TOTAL_MS=300000;
/** SILENCE, not duration. The practitioner, 2026-10-22, watching a province download stop at
 *  59.4 MB: *"If the upcoming constraints are response timeouts, why use them to stop ongoing
 *  downloads already, meaning the API already responded?!"*
 *
 *  They had it exactly. ATTEMPT_MS is a RESPONSE timeout, borrowed from OSMnx where it measures
 *  the wait for an answer. Here it was armed before the fetch and never cleared when the response
 *  arrived, so it went on running through the body and aborted a transfer that was working: at
 *  59.4 MB in 180 s, about 0.33 MB/s, against a panel offering 300 MB. The clock forbade roughly
 *  four fifths of what the widget said it accepts, and the toast then reported that the service
 *  "did not answer" -- of a service that had answered and sent 59.4 MB.
 *
 *  So the response timeout ends where the response begins, and nothing replaces it. The
 *  practitioner, when a stall timeout was offered in its place: *"It's not applicable to ongoing
 *  downloads, period."* It is not. The only thing that ends an arriving download is the
 *  practitioner pressing Stop.
 *
 *  Which makes this a different number: when the panel says IN SO MANY WORDS that the service has
 *  gone quiet. It was 180,000 here too, inherited from the budget it replaced. Ninety seconds is
 *  the practitioner's: *"180s may be too long to wait to say it's stalled. 90s, time to give
 *  feedback."* Comfortably past the gaps a working transfer shows, and half the wait it replaces.
 *
 *  It is the slow half of the feedback. The fast half is RATE_WINDOW_MS, which does not wait for
 *  a threshold at all. */
export const STALL_MS=90000;
/** THE SPEED, SAID EVERY SECOND. The practitioner: *"Feedback could also be bytes/sec download
 *  speed. If the user sees it going down, that's immediate feedback."* A rate over the last few
 *  seconds decays on its own the moment chunks stop arriving, so a transfer in trouble looks
 *  different within a second or two rather than at ninety. Five seconds of history: long enough
 *  that the number is not noise between chunks, short enough that it falls while someone watches.
 *  It bounds nothing. */
export const RATE_WINDOW_MS=5000;

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
/** The highway values a DRIVING download accepts. Added 2026-10-20: the practitioner, reading the
 *  manual page, found it spoke only of walking -- *"OSMNx designates a download as walk or drive
 *  ... Do we make that distinction when we download an OSM street network?"* We did not, and the
 *  gap was wider than the wording. The walking list EXCLUDES motorway and trunk, so a driving
 *  question asked of a walking graph was not merely unfiltered: the roads that carry cars were
 *  absent. Measured the same day on the Soho walk graph this repository ships, 56.7% of its edges
 *  and 48.1% of its length are types a driving filter excludes, and 28.1% carry a vehicle one-way
 *  restriction the walking parser ignores because it reads `oneway:foot`.
 *
 *  The exclusions follow OSMnx's `drive` filter rather than being invented here, so a Fieldwork
 *  graph and an OSMnx graph of the same area are comparable: footway, path, steps, pedestrian,
 *  cycleway, track, service, bridleway, busway, corridor and the lifecycle values are out.
 *  `road` -- an unclassified classification, not a road that is unclassified -- is kept, as OSMnx
 *  keeps it. */
export const DRIVABLE_HIGHWAYS=['motorway','motorway_link','trunk','trunk_link','primary',
  'primary_link','secondary','secondary_link','tertiary','tertiary_link','unclassified',
  'residential','living_street','road'] as const;
/** What a mode changes. Every difference between a walking and a driving download is one row
 *  here, so the two cannot drift into two parsers. */
export interface ModeFilter {
  /** The `highway` values admitted, used by the query AND the parser. */
  highways:readonly string[];
  /** The access tags that permit or forbid this mode on a way, most specific first. */
  permitTags:readonly string[];
  /** Values of those tags that forbid the way outright. */
  forbids:readonly string[];
  /** Values that permit it even where a general `access` restriction would not. */
  permits:readonly string[];
  /** The tag carrying one-way direction FOR THIS MODE. A vehicle one-way does not bind a walker,
   *  which is why the walking filter reads `oneway:foot` and not `oneway`. */
  onewayTag:string;
  /** Whether `junction=roundabout|circular` implies one-way with no `oneway` tag, as it does for
   *  vehicles in OSM practice and in OSMnx. */
  roundaboutIsOneWay:boolean;
  /** The sentence saved on the graph. It states the filter and what the graph does NOT model,
   *  because that is what a reader needs before quoting a travel time off it. */
  source:string;
}
export const MODE_FILTERS:Record<NetworkTravelMode,ModeFilter>={
  walking:{highways:WALKABLE_HIGHWAYS,permitTags:['foot'],forbids:['no','private','use_sidepath'],
    permits:['yes','designated','permissive'],onewayTag:'oneway:foot',roundaboutIsOneWay:false,
    source:'OpenStreetMap contributors, ODbL; prototype walking filter v1. Uses explicit foot restrictions; excludes conditional ways and unapproved barriers. No turn restrictions, grade, stairs cost or wheelchair model. Vehicle oneway does not imply foot oneway.'},
  driving:{highways:DRIVABLE_HIGHWAYS,permitTags:['motor_vehicle','motorcar'],forbids:['no','private'],
    permits:['yes','designated','permissive','destination'],onewayTag:'oneway',roundaboutIsOneWay:true,
    source:'OpenStreetMap contributors, ODbL; prototype driving filter v1. Highway exclusions follow OSMnx\u2019s drive filter; uses explicit motor_vehicle and motorcar restrictions; excludes conditional ways and unapproved barriers. Vehicle oneway and roundabouts are honoured as direction. No turn restrictions, no posted speed limits, no junction delay and no congestion: a travel time over this graph is one speed applied to every edge.'},
};
const modeFilter=(mode:NetworkTravelMode):ModeFilter=>{
  const filter=MODE_FILTERS[mode];
  if(!filter)throw new Error(`"${mode}" is not a street network travel mode. This widget downloads ${NETWORK_TRAVEL_MODES.join(' or ')}.`);
  return filter;
};
export function osmQuery(boundary:Boundary,marginM:number,maxNodes?:number,mode:NetworkTravelMode='walking'){
  const filter=modeFilter(mode);
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
      +'Longitude must be within 180 degrees and latitude within 80, which is where these filters have been measured.');
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
  const highways=filter.highways.join('|');
  const query=`[out:json][timeout:25];way["highway"~"^(${highways})$"]`
    +`(${s.toFixed(7)},${w.toFixed(7)},${n.toFixed(7)},${e.toFixed(7)});out body qt;>;out skel qt;`
    +`node._["barrier"];out tags qt;`;
  // The mode is IN the query text, which is the cache key, so a driving download can never be
  // served a walking graph that was cached for the same bounds.
  return {query,bounds,marginM,mode};
}
/** ASK WHAT IT WOULD COST, BEFORE ASKING FOR IT.
 *
 *  The practitioner drew a study area across the DRC-Uganda border and got, after four requests
 *  to three donated services: *"No Overpass instance answered ... the last reporting HTTP 504."*
 *  A 504 there is the service saying it gave up computing the answer -- the box is some 600 km
 *  across and a walking network for it is motorways to footpaths across two countries. Nothing
 *  was wrong with the client; it asked for something no public instance will return, and learned
 *  that by spending six attempts on the question.
 *
 *  Overpass answers `out count;` with the number of elements a query would return. That is the
 *  service's own answer to "how much is there", and it replaces the thing this project removed on
 *  purpose: a client-side span cap, which refused an area for its WIDTH before anything about it
 *  had been measured. A count is measured. It is also one request instead of six, and it is the
 *  same courtesy the status read already follows. */
/** What a public Overpass instance returns when its own gateway gives up. Shared by the count
 *  probe and the download loop, because "the server could not finish" means the same thing to
 *  both. */
const SERVER_ERRORS=[500,502,503,504];
/** One count request. Three answers, and they are not the same: a number, a refusal the service
 *  made deliberately (its gateway gave up), or nothing usable -- an unreachable instance, a
 *  non-JSON body, an engine that does not implement `out count;`. Only the first two decide
 *  anything; the third carries on to the download, because a probe that could not be taken is not
 *  evidence about the area. */
export async function countWays(url:string,query:string,fetcher:typeof fetch,signal?:AbortSignal):
  Promise<{kind:'counted';ways:number;elements:number}|{kind:'refused';status:number}|{kind:'unknown'}>{
  try{
    const response=await fetcher(url,{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({data:query}),signal});
    // ONLY A GATEWAY TIMEOUT is evidence about the AREA. 500, 502 and 503 are an instance having
    // a bad moment -- the download loop already retries across instances for exactly that -- and
    // treating them as "too large" would refuse a perfectly ordinary area because one server
    // hiccuped. 504 is the gateway saying the query ran past its time, which is what an area
    // beyond the service's reach produces.
    if(!response.ok)return response.status===504?{kind:'refused',status:504}:{kind:'unknown'};
    const counted=readOverpassCounts(await response.json().catch(()=>null));
    return counted===null?{kind:'unknown'}:{kind:'counted',...counted};
  }catch{return {kind:'unknown'};}
}
export function countQuery(boundary:Boundary,marginM:number,maxNodes?:number,mode:NetworkTravelMode='walking'){
  const request=osmQuery(boundary,marginM,maxNodes,mode);
  const [w,s,e,n]=request.bounds,filter=modeFilter(mode).highways.join('|');
  // `>;` BEFORE THE COUNT, so what is counted is what would be SENT. The count asked for ways
  // alone, and a download returns the ways plus every node they reference -- which is most of the
  // bytes. A ways-only count could therefore sit well inside every limit for an area whose
  // response is 60 MB, which is exactly what happened on 2026-10-21. Recursing costs the service
  // more than counting ways and far less than serializing the result, and the count still returns
  // in one request whose timeout is its own.
  return {...request,query:`[out:json][timeout:25];way["highway"~"^(${filter})$"]`
    +`(${s.toFixed(7)},${w.toFixed(7)},${n.toFixed(7)},${e.toFixed(7)});>;out count;`};
}
/** The number of ways the query would return, or null when the answer is not a count. */
export function readOverpassCount(raw:unknown):number|null{
  return readOverpassCounts(raw)?.ways??null;
}
/** What the service says it would send: the ways, and every element including the nodes they
 *  reference. The second is the one that predicts a response size; the first is still read
 *  because a ways figure is what a practitioner recognises as "streets". */
export function readOverpassCounts(raw:unknown):{ways:number;elements:number}|null{
  if(!isRecord(raw)||!Array.isArray(raw.elements))return null;
  const first=raw.elements[0];
  if(!isRecord(first)||first.type!=='count'||!isRecord(first.tags))return null;
  const total=Number(first.tags.total),ways=Number(first.tags.ways);
  const elements=Number.isFinite(total)?total:ways;
  if(!Number.isFinite(elements))return null;
  return {ways:Number.isFinite(ways)?ways:elements,elements};
}
function metres(a:Position,b:Position){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,h=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 12742017.6*Math.asin(Math.sqrt(Math.min(1,h)));}
export function networkFromOSM(raw:unknown,maxNodes?:number,mode:NetworkTravelMode='walking'):Network{
  const filter=modeFilter(mode);
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
    // A barrier blocks unless this mode is explicitly let through it. The tag consulted is the
    // mode's own: a bollard stops a car and not a walker, and `foot=yes` on a gate says nothing
    // about a vehicle.
    if(t.barrier&&!['no','entrance'].includes(String(t.barrier))
      &&!filter.permitTags.some(tag=>filter.permits.includes(String(t[tag]))))blocked.add(id);
  }
  const edges:Network['edges']=[],used=new Set<string>();
  const allowed=new Set<string>(filter.highways);
  for(const item of raw.elements){if(!isRecord(item)||item.type!=='way'||!Array.isArray(item.nodes))continue;const t=isRecord(item.tags)?item.tags:{};
    const forbidden=filter.permitTags.some(tag=>filter.forbids.includes(String(t[tag])));
    const permitted=filter.permitTags.some(tag=>filter.permits.includes(String(t[tag])));
    if(!allowed.has(String(t.highway))||forbidden||(['no','private'].includes(String(t.access))&&!permitted)||Object.keys(t).some(k=>k.endsWith(':conditional')))continue;
    // `reverse` is a legal spelling of -1 and appears in the database. An unrecognised value --
    // `alternating`, `reversible` -- drops the way rather than guessing a direction for it, which
    // is the convention the walking filter already set and is the conservative one: a missing
    // street understates reach, an invented direction misstates it.
    const roundabout=filter.roundaboutIsOneWay&&['roundabout','circular'].includes(String(t.junction));
    const tagged=String(t[filter.onewayTag]??(roundabout?'yes':'no'));
    const direction=tagged==='reverse'?'-1':tagged;
    if(!['yes','1','true','-1','no','0','false'].includes(direction))continue;
    for(let i=1;i<item.nodes.length;i++){const from=String(item.nodes[i-1]),to=String(item.nodes[i]);if(!positions.has(from)||!positions.has(to))throw new Error('OSM way references missing nodes; retry the download.');if(blocked.has(from)||blocked.has(to))continue;const lengthM=metres(positions.get(from)!,positions.get(to)!);if(!Number.isFinite(lengthM)||lengthM<=0)continue;
      const edge={from:'osm-'+from,to:'osm-'+to,lengthM};if(direction!=='-1')edges.push(edge);if(!['yes','1','true'].includes(direction))edges.push({...edge,from:edge.to,to:edge.from});used.add(from);used.add(to);
    }
  }
  const network:Network={nodes:[...used].map(id=>({id:'osm-'+id,coordinates:positions.get(id)!})),edges,source:filter.source,limits:graphLimits(maxNodes)};validateNetwork(network,maxNodes);return network;
}
/** `refresh` is what the button means when the node already holds a network: fetch it again. The
 *  cache exists to spare a request nobody needs -- a node with nothing in it, a workflow reopened,
 *  the same area asked for twice -- and not to answer a practitioner who pressed Download BECAUSE
 *  what they have is wrong or stale. Serving that from cache would make the button look broken in
 *  the one case where it has to work. */
export function downloadOSM(boundary:Boundary,marginM:number,maxNodes?:number,pauseMs?:number,refresh=false,onPhase?:(message:string,fraction?:number)=>void,mode:NetworkTravelMode='walking',stopSignal?:AbortSignal):Promise<Network>{
  osmQuery(boundary,marginM,maxNodes,mode); // Invalid local input must not consume the public-service pause.
  // The abort is translated HERE, at the edge a widget calls, so every caller gets this client's
  // sentence rather than the browser's.
  return pacedNetworkDownload(()=>requestOSM(boundary,marginM,fetch,maxNodes,pauseMs,undefined,undefined,undefined,refresh,onPhase,mode,stopSignal)
    .catch(error=>{throw new Error(abortMessage(error));}));
}
/** Request/normalization boundary exposed for fixture tests; UI must use paced downloadOSM. */
/** `exclude` carries the instances this request has already learned cannot serve this area, so a
 *  regional mirror that answers with nothing hands the attempt on to the next instance instead of
 *  ending it. Internal: callers pass nothing. */
/** WHOSE WORDS THE PRACTITIONER READS. An attempt that runs past its budget aborts its fetch, and
 *  the browser rejects with "signal is aborted without reason" -- which reached a practitioner as
 *  a toast on 2026-10-22. The budget is this client's, so the sentence should be too. */
export const abortMessage=(error:unknown,attemptSeconds=ATTEMPT_MS/1000):string=>{
  const text=error instanceof Error?error.message:String(error);
  // Only ever said of a request that never began to answer. Nothing ends an arriving download
  // but the practitioner, and that has its own sentence where the byte count is known.
  return /abort/i.test(text)
    ?`The street service did not answer within ${attemptSeconds} seconds, so this attempt was `
      +`stopped and nothing was changed. Overpass expresses load by being slow: wait and try again, `
      +`draw a smaller study area, or read a published .osm.pbf extract on this device, which asks `
      +`no service at all.`
    :text;
};
export async function requestOSM(boundary:Boundary,marginM:number,fetcher:typeof fetch=fetch,maxNodes?:number,pauseMs?:number,exclude:ReadonlySet<string>=new Set(),onWait?:(w:{operator:string;seconds:number})=>void,cacheStore?:CacheLike|null,refresh=false,onPhase?:(message:string,fraction?:number)=>void,mode:NetworkTravelMode='walking',stopSignal?:AbortSignal):Promise<Network>{
  const request=osmQuery(boundary,marginM,maxNodes,mode);
  // One budget per attempt, and one for the whole thing. See ATTEMPT_MS.
  const startedAt=Date.now();
  let controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ATTEMPT_MS);
  const freshAttempt=()=>{clearTimeout(timer);controller=new AbortController();
    timer=setTimeout(()=>controller.abort(),ATTEMPT_MS);return controller.signal;};
  // Called when the response arrives and again on every chunk of it. From here NO clock can end
  // this download: the response budget is cleared and nothing takes its place. See STALL_MS.
  let receiving=false,lastByteAt=Date.now(),receivedSoFar=0,declaredBytes=0,
    silenceWatch:ReturnType<typeof setInterval>|undefined;
  const rateSamples:{at:number;bytes:number}[]=[];
  const megabytesPerSecond=()=>{
    const now=Date.now();
    while(rateSamples.length>1&&now-rateSamples[0].at>RATE_WINDOW_MS)rateSamples.shift();
    const first=rateSamples[0];if(!first)return 0;
    const seconds=(now-first.at)/1000;
    // Measured against NOW, not against the last chunk: a transfer that stops shows a falling
    // number every second it stays stopped, which is the feedback asked for.
    return seconds>0?(receivedSoFar-first.bytes)/1e6/seconds:0;
  };
  const progress=()=>{
    const quiet=Date.now()-lastByteAt;
    const got=`${(receivedSoFar/1e6).toFixed(1)}${declaredBytes?` of ${(declaredBytes/1e6).toFixed(1)}`:''} MB`;
    return quiet>=STALL_MS
      ? `No data for ${Math.round(quiet/1000)} s · ${got} received — still waiting. `
        +`Press Stop to give up on it.`
      : `Receiving — ${got} · ${megabytesPerSecond().toFixed(2)} MB/s`;
  };
  const say=()=>onPhase?.(progress(),declaredBytes?receivedSoFar/declaredBytes:undefined);
  const stillAlive=()=>{
    clearTimeout(timer);lastByteAt=Date.now();
    rateSamples.push({at:lastByteAt,bytes:receivedSoFar});
    // Every second, whether or not a chunk arrived. A line that only updates on arrival cannot
    // show an absence of arrivals.
    silenceWatch??=setInterval(say,1000);
  };
  // THE ONLY THING THAT ENDS AN ARRIVING DOWNLOAD. A practitioner's decision, not a number.
  stopSignal?.addEventListener('abort',()=>controller.abort(),{once:true});
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
      const network=networkFromOSM(JSON.parse(hit.text),maxNodes,mode);
      network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',
        attribution:'\u00a9 OpenStreetMap contributors',fromCache:true,travelMode:mode,
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
    // THE COUNT, before the download. One request to the instance most likely to serve the real
    // one; an unreachable probe is not an answer and does not stop anything.
    onPhase?.('Asking the service how much street data is there\u2026');
    const {maxFeatures}=downloadLimits(maxNodes);
    // Two instances at most, and a refusal needs BOTH of them: one timeout is a server, two are
    // the area. Still two cheap requests against six expensive failures.
    const countText=countQuery(boundary,marginM,maxNodes,mode).query;
    const probes:Awaited<ReturnType<typeof countWays>>[]=[];
    for(const endpoint of live.slice(0,2)){
      const outcome=await countWays(endpoint.url,countText,fetcher,freshAttempt());
      probes.push(outcome);
      if(outcome.kind==='counted')break;
      if(outcome.kind==='unknown')break;
    }
    const counted=probes.find(outcome=>outcome.kind==='counted')??probes[probes.length-1]??{kind:'unknown' as const};
    const refusedByAll=probes.length>1&&probes.every(outcome=>outcome.kind==='refused');
    if(counted.kind==='counted'){
      // WHAT IT WOULD COST, from the service's own count, before a byte of it is sent. Raising the
      // knob and downloading again until it fits spends the whole response each time -- 60 MB of a
      // donated service, twice, on 2026-10-21 -- and never says how much would be enough. The
      // count does, within the accuracy of a measured 150 bytes per element.
      const predicted=counted.elements*BYTES_PER_FEATURE;
      const needed=Math.ceil(Math.ceil(predicted/BYTES_PER_NODE)/1000)*1000;
      const {maxBytes}=downloadLimits(maxNodes);
      if(counted.elements>maxFeatures||predicted>maxBytes){
        // THE OTHER MODE, counted, because at this scale it is usually the question. The
        // practitioner, 2026-10-21, on a province that will not fit: *"At the province level we are
        // not even looking at walking mode. It will be driving mode."* Walking keeps footways,
        // paths and steps; driving drops all three. Saying "too large" without saying what the
        // mode costs leaves the practitioner to discover by downloading, which is what this whole
        // change exists to stop. One more COUNT, only when the answer is already a refusal.
        const other:NetworkTravelMode=mode==='driving'?'walking':'driving';
        let alternative='';
        const otherCount=await countWays(live[0].url,countQuery(boundary,marginM,maxNodes,other).query,fetcher,freshAttempt());
        if(otherCount.kind==='counted'){
          const otherBytes=otherCount.elements*BYTES_PER_FEATURE;
          alternative=` The same area in ${other} mode holds ${otherCount.ways.toLocaleString()} ways `
            +`and ${otherCount.elements.toLocaleString()} elements, about ${(otherBytes/1e6).toFixed(1)} MB`
            +(otherBytes<=maxBytes&&otherCount.elements<=maxFeatures
              ?`, which this download accepts at the current setting \u2014 change Travel mode to `
                +`${other[0].toUpperCase()}${other.slice(1)} and download again.`
              :`, which is also past what this download accepts.`);
        }
        throw new Error(`This area holds ${counted.ways.toLocaleString()} street ways and `
          +`${counted.elements.toLocaleString()} elements in all, which is about `
          +`${(predicted/1e6).toFixed(1)} MB at the measured ${BYTES_PER_FEATURE} bytes each. This `
          +`download accepts ${(maxBytes/1e6).toFixed(1)} MB and normalizes `
          +`${maxFeatures.toLocaleString()} features. ${live[0].operator} was asked to COUNT them `
          +`rather than to send them, so nothing was downloaded and nothing was spent. `
          +`${needed<=NETWORK_NODE_LIMIT_MAX
            ?`Set the graph limit to ${needed.toLocaleString()} junctions to accept it`
            :`A graph limit of about ${needed.toLocaleString()} junctions would be needed, which is past the `
              +`${NETWORK_NODE_LIMIT_MAX.toLocaleString()} this widget allows`}, `
          +`or draw a smaller study area.${alternative} A prediction is not a measurement: the rate `
          +`comes from two extents of a few megabytes, and this area is larger than both.`);
      }
      onPhase?.(`${counted.ways.toLocaleString()} ways, about ${(predicted/1e6).toFixed(1)} MB\u2026`);
    }
    if(refusedByAll)
      throw new Error(`Two instances could not even COUNT the streets in this area within their `
        +`own time limits, which is what they say when an area is beyond what they will process. `
        +`Nothing was downloaded. Draw a smaller study area \u2014 a border region several hundred `
        +`kilometres across is more than a public Overpass instance will answer for.`);

    let reached:OverpassEndpoint|undefined,lastStatus=0,unreachable=0;
    outer: for(let round=1;round<=2;round++){
      for(const endpoint of live){
        if(outOfTime())break outer;
        try{response=await fetcher(endpoint.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:request.query}),signal:freshAttempt(),credentials:'omit',referrerPolicy:'origin'});stillAlive();}
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
    /** `declaredSize` is what the service said it would send; a STREAM that was cut at the cap has
     *  no size, only a floor, and saying "is 30.0 MB" of an answer nobody read to the end states a
     *  measurement that was not made. Reported 2026-10-21 on Ituri Province, which stopped at the
     *  cap with no content-length: the message named a number to raise and left the practitioner
     *  to guess what to raise it to. */
    const tooLarge=(size:number,measured:boolean)=>{
      const [got,limit]=sizes(size);
      // What the knob would have to say to accept it. Known only when the service declared a
      // length: for a cut stream the whole size is unknown, so the advice is to raise it and
      // try again rather than a number with nothing behind it.
      const needed=Math.ceil(size/BYTES_PER_NODE);
      const setting=measured
        ? `Raise the graph limit on this widget to about ${(Math.ceil(needed/1000)*1000).toLocaleString('en')} junctions to accept it, `
        : `The download was stopped at the limit, so how much more there is was never read -- `
          +`raising the graph limit roughly doubles what the next attempt accepts for each doubling of the knob, `;
      return new Error(`The street data for this area is ${measured?got:`over ${limit}`}, `
        +`${measured?`over the ${limit} this download accepts`:'which is what this download accepts'}, `
        +`so nothing was changed and nothing was saved. ${setting}or draw a smaller study area. `
        +`Street density matters more than extent here -- a dense city block can exceed this while `
        +`a sparse district many times the size does not. A whole province is usually past what one `
        +`request can carry.`);
    };
    if(Number(response.headers.get('content-length'))>maxBytes)throw tooLarge(Number(response.headers.get('content-length')),true);
    if(!response.body)throw new Error('OSM response has no readable body.');const reader=response.body.getReader(),chunks:Uint8Array[]= [];let bytes=0;
    const declared=Number(response.headers.get('content-length'))||0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;receiving=true;bytes+=value.length;receivedSoFar=bytes;stillAlive();if(bytes>maxBytes){controller.abort();
      // CHARGED FOR WHAT WAS RECEIVED, although none of it is kept. The service did the work and
      // sent the bytes; a refusal here used to charge nothing, so the next attempt was available
      // at once and the failing request could be repeated without pause.
      chargeNetworkDownload(bytes,pauseMs);
      throw tooLarge(bytes,declared>0);}chunks.push(value);declaredBytes=declared;say();}}
    // A STREAM THAT WENT QUIET, said as that and not as "did not answer". The byte count only
    // exists here, so the sentence is built here rather than at downloadOSM's generic edge.
    catch(error){
      if(receiving&&/abort/i.test(error instanceof Error?error.message:String(error))){
        chargeNetworkDownload(bytes,pauseMs);
        throw new Error(`Stopped at ${(bytes/1e6).toFixed(1)} MB. Nothing was changed and what `
          +`arrived was not kept. The same request can be made again, after the pause this one `
          +`earned.`);
      }
      throw error;
    }
    finally{clearInterval(silenceWatch);await reader.cancel().catch(()=>{});}
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
        return requestOSM(boundary,marginM,fetcher,maxNodes,pauseMs,remaining,onWait,cacheStore,refresh,onPhase,mode,stopSignal);
      throw new Error(`${reached.operator}'s Overpass instance answered and reported no walkable `
        +`streets for this area`+(reached.regional?`, and it holds ${reached.regional} only`:'')
        +`. Nothing was changed. Either it does not hold data for this part of the world, or the `
        +`area genuinely has no streets this walking filter accepts \u2014 a lake, a reserve, or a `
        +`boundary drawn over open ground. `
        +(live.length>1?`The other instances that were answering reported the same.`
          :`It was the only one answering, so there is nothing else to ask until another recovers.`)
        +` Check the study area on the map, or upload a saved network file.`);
    }
    const network=networkFromOSM(raw,maxNodes,mode);
    const retrievedAt=new Date().toISOString();
    await keepOSM(request.query,body,retrievedAt,cacheStore);
    network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',
      attribution:`© OpenStreetMap contributors, via ${reached.operator}`,url:reached.url,retrievedAt,travelMode:mode,query:request.query,bounds:request.bounds,marginM,boundary:structuredClone(boundary),osmTimestamp:raw.osm3s?.timestamp_osm_base||'unknown',sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',joined))].map(b=>b.toString(16).padStart(2,'0')).join('')};return network;
  }finally{clearTimeout(timer);clearInterval(silenceWatch);}
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
