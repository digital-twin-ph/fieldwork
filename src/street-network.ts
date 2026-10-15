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
  /** Set when the instance holds one region's data and answers for the whole world anyway. */
  regional?:string}
export const OVERPASS_ENDPOINTS:readonly OverpassEndpoint[]=[
  {url:'https://overpass-api.de/api/interpreter',operator:'FOSSGIS'},
  {url:'https://overpass.kumi.systems/api/interpreter',operator:'Private.coffee'},
  {url:'https://overpass.private.coffee/api/interpreter',operator:'Private.coffee'},
  // Regional. Measured 2026-10-15: it answers 200 with valid, EMPTY JSON for a bbox in
  // Botswana, which is the most dangerous shape of failure here -- a mirror that says yes and
  // means "not my region". Last in the list, and an empty result from it is reported as a
  // coverage problem rather than as a study area with no streets in it.
  {url:'https://overpass.osm.ch/api/interpreter',operator:'Swiss OpenStreetMap Association',regional:'Switzerland'},
];
/** The cheapest question an Overpass instance can be asked: one node, by id, identifiers only.
 *
 *  The practitioner, 2026-10-15: *"So the important first step for a street network download is
 *  to check if the API is alive, like a heartbeat ping."* Right, and the obvious candidate --
 *  `/api/status` -- is not usable: measured the same afternoon it timed out on overpass-api.de,
 *  returned 500 on kumi.systems and 400 on overpass.osm.ch, which does not appear to serve it at
 *  all. A probe has to exercise the path that matters, so it is a real query, just the smallest
 *  one. It answered in under half a second on every instance that was answering at all. */
export const OVERPASS_PROBE='[out:json][timeout:5];node(1);out ids;';

/** Which instances are answering right now, in the order they are preferred.
 *
 *  Asked of all of them at once, because the point is to spend one short wait rather than four
 *  long ones: a dead instance otherwise costs the full download timeout before the next is
 *  tried. An instance that answers anything other than JSON is not answering. */
export async function liveEndpoints(fetcher:typeof fetch=fetch,timeoutMs=6000):Promise<OverpassEndpoint[]>{
  const ordered=preferred
    ?[...OVERPASS_ENDPOINTS].sort((a,b)=>(b.url===preferred?1:0)-(a.url===preferred?1:0))
    :OVERPASS_ENDPOINTS;
  const results=await Promise.all(ordered.map(async endpoint=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetcher(endpoint.url,{method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({data:OVERPASS_PROBE}),signal:controller.signal,
        credentials:'omit',referrerPolicy:'origin'});
      if(!response.ok)return null;
      const kind=response.headers.get('content-type')??'';
      if(!kind.includes('json')&&!kind.includes('text/plain'))return null;
      return endpoint;
    }catch{return null;}
    finally{clearTimeout(timer);}
  }));
  return results.filter((endpoint):endpoint is OverpassEndpoint=>!!endpoint);
}

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
const ATTEMPT_MS=20000;
const TOTAL_MS=75000;

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
  if(bounds.some(v=>!Number.isFinite(v))||bounds[0]<-180||bounds[2]>180||Math.abs(bounds[1])>80||Math.abs(bounds[3])>80||(bounds[2]-bounds[0])*111195*Math.cos((b[1]+b[3])/2*Math.PI/180)>6000||(bounds[3]-bounds[1])*111195>6000)throw new Error('Use a local study area with download bounds at most 6 km across.');
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
export function downloadOSM(boundary:Boundary,marginM:number,maxNodes?:number,pauseMs?:number):Promise<Network>{
  osmQuery(boundary,marginM,maxNodes); // Invalid local input must not consume the public-service pause.
  return pacedNetworkDownload(()=>requestOSM(boundary,marginM,fetch,maxNodes,pauseMs));
}
/** Request/normalization boundary exposed for fixture tests; UI must use paced downloadOSM. */
export async function requestOSM(boundary:Boundary,marginM:number,fetcher:typeof fetch=fetch,maxNodes?:number,pauseMs?:number):Promise<Network>{
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
    const live=await liveEndpoints(fetcher);
    if(!live.length){
      deferNetworkDownload(null);
      throw new Error(`No Overpass instance is answering. All ${OVERPASS_ENDPOINTS.length} were asked a `
        +`one-line question first and none replied, so nothing was downloaded and nothing was changed. `
        +`These are free public services and they do go down together; wait and retry, or upload a `
        +`saved network file.`);
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
      throw new Error(`No Overpass instance answered. ${live.length} were answering a moment ago and were tried twice each`
        +`${lastStatus?`, the last reporting HTTP ${lastStatus}`:''}${unreachable?`, ${unreachable} unreachable or not serving the API`:''}. `
        +`These are free public services and they do go down together; wait and retry, or upload a saved network file.`);
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
    try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>maxBytes){controller.abort();throw tooLarge(bytes);}chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    // Charged once the size is known: a larger request earns a longer pause.
    chargeNetworkDownload(bytes,pauseMs);
    const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}const raw=JSON.parse(new TextDecoder().decode(joined));
    // A regional instance answers for the whole world and has data for part of it. Measured
    // 2026-10-15: overpass.osm.ch returns 200 with an empty `elements` array for a bbox in
    // Botswana, which `validateNetwork` would then refuse as an invalid network -- true, and
    // about the wrong thing. An empty result from a regional mirror is a coverage problem, and
    // saying so is the difference between a practitioner retrying and a practitioner concluding
    // their study area has no streets in it.
    if(reached.regional&&!(raw.elements??[]).length)
      throw new Error(`${reached.operator}'s Overpass instance answered, and it holds `
        +`${reached.regional} only — it reported no streets for this area, which is a limit of that `
        +`instance rather than a fact about your study area. It was asked because the others were `
        +`not answering. Retry in a few minutes, or upload a saved network file.`);
    const network=networkFromOSM(raw,maxNodes);
    network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',
      attribution:`© OpenStreetMap contributors, via ${reached.operator}`,url:reached.url,retrievedAt:new Date().toISOString(),query:request.query,bounds:request.bounds,marginM,boundary:structuredClone(boundary),osmTimestamp:raw.osm3s?.timestamp_osm_base||'unknown',sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',joined))].map(b=>b.toString(16).padStart(2,'0')).join('')};return network;
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
