import type {Boundary,Position} from './types.js';
import type {Network} from './catchments.js';
import {validateNetwork} from './catchments.js';
import {geometryBounds} from './study-area.js';
import {isRecord} from './guards.js';
import {pacedNetworkDownload,deferNetworkDownload} from './network-throttle.js';
export const OVERPASS='https://overpass-api.de/api/interpreter';
export const NETWORK_BYTES=2_000_000;
export function osmQuery(boundary:Boundary,marginM:number){
  if(!Number.isFinite(marginM)||marginM<0||marginM>2000)throw new Error('Download margin must be 0–2,000 metres.');
  const b=geometryBounds(boundary),dy=marginM/111195,dx=dy/Math.cos((b[1]+b[3])/2*Math.PI/180);
  const bounds=[b[0]-dx,b[1]-dy,b[2]+dx,b[3]+dy];
  if(bounds.some(v=>!Number.isFinite(v))||bounds[0]<-180||bounds[2]>180||Math.abs(bounds[1])>80||Math.abs(bounds[3])>80||(bounds[2]-bounds[0])*111195*Math.cos((b[1]+b[3])/2*Math.PI/180)>6000||(bounds[3]-bounds[1])*111195>6000)throw new Error('Use a local study area with download bounds at most 6 km across.');
  const [w,s,e,n]=bounds;
  // Complete ways and referenced nodes preserve edge topology at the envelope.
  const query=`[out:json][timeout:25][maxsize:16777216];way["highway"](${s.toFixed(7)},${w.toFixed(7)},${n.toFixed(7)},${e.toFixed(7)});(._;>;);out body;`;
  return {query,bounds,marginM};
}
function metres(a:Position,b:Position){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,h=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 12742017.6*Math.asin(Math.sqrt(Math.min(1,h)));}
export function networkFromOSM(raw:unknown):Network{
  if(!isRecord(raw)||!Array.isArray(raw.elements)||raw.elements.length>15000||raw.remark)throw new Error('OSM response is incomplete, too large, or contains a server warning.');
  const positions=new Map<string,Position>();const blocked=new Set<string>();
  for(const e of raw.elements)if(isRecord(e)&&e.type==='node'){const id=String(e.id);positions.set(id,[e.lon as number,e.lat as number]);const t=isRecord(e.tags)?e.tags:{};if(t.barrier&&!['no','entrance'].includes(String(t.barrier))&&!['yes','designated','permissive'].includes(String(t.foot)))blocked.add(id);}
  const edges:Network['edges']=[],used=new Set<string>();
  const allowed=new Set(['residential','living_street','pedestrian','footway','path','steps','service','unclassified','tertiary','tertiary_link','secondary','secondary_link','primary','primary_link','track']);
  for(const item of raw.elements){if(!isRecord(item)||item.type!=='way'||!Array.isArray(item.nodes))continue;const t=isRecord(item.tags)?item.tags:{};
    if(!allowed.has(String(t.highway))||['no','private','use_sidepath'].includes(String(t.foot))||(['no','private'].includes(String(t.access))&&!['yes','designated','permissive'].includes(String(t.foot)))||Object.keys(t).some(k=>k.endsWith(':conditional')))continue;
    const direction=String(t['oneway:foot']||'no');if(!['yes','1','true','-1','no','0','false'].includes(direction))continue;
    for(let i=1;i<item.nodes.length;i++){const from=String(item.nodes[i-1]),to=String(item.nodes[i]);if(!positions.has(from)||!positions.has(to))throw new Error('OSM way references missing nodes; retry the download.');if(blocked.has(from)||blocked.has(to))continue;const lengthM=metres(positions.get(from)!,positions.get(to)!);if(!Number.isFinite(lengthM)||lengthM<=0)continue;
      const edge={from:'osm-'+from,to:'osm-'+to,lengthM};if(direction!=='-1')edges.push(edge);if(!['yes','1','true'].includes(direction))edges.push({...edge,from:edge.to,to:edge.from});used.add(from);used.add(to);
    }
  }
  const network:Network={nodes:[...used].map(id=>({id:'osm-'+id,coordinates:positions.get(id)!})),edges,source:'OpenStreetMap contributors, ODbL; prototype walking filter v1. Uses explicit foot restrictions; excludes conditional ways and unapproved barriers. No turn restrictions, grade, stairs cost or wheelchair model. Vehicle oneway does not imply foot oneway.'};validateNetwork(network);return network;
}
export function downloadOSM(boundary:Boundary,marginM:number):Promise<Network>{
  osmQuery(boundary,marginM); // Invalid local input must not consume the public-service pause.
  return pacedNetworkDownload(()=>requestOSM(boundary,marginM));
}
/** Request/normalization boundary exposed for fixture tests; UI must use paced downloadOSM. */
export async function requestOSM(boundary:Boundary,marginM:number,fetcher:typeof fetch=fetch):Promise<Network>{
  const request=osmQuery(boundary,marginM),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
  try{
    let response:Response;
    try{response=await fetcher(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:request.query}),signal:controller.signal,credentials:'omit',referrerPolicy:'origin'});}catch{throw new Error('OSM could not be reached or the browser blocked the response. Wait before retrying, or upload a saved network file.');}
    if(!response.ok){if([429,503,406].includes(response.status))deferNetworkDownload(response.headers.get('retry-after'));throw new Error(`OSM download failed (HTTP ${response.status}); wait before retrying or upload a network file.`);}
    if(Number(response.headers.get('content-length'))>NETWORK_BYTES)throw new Error('Network response exceeds 2 MB; reduce the area or margin.');
    if(!response.body)throw new Error('OSM response has no readable body.');const reader=response.body.getReader(),chunks:Uint8Array[]= [];let bytes=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>NETWORK_BYTES){controller.abort();throw new Error('Network response exceeds 2 MB; reduce the area or margin.');}chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}const raw=JSON.parse(new TextDecoder().decode(joined)),network=networkFromOSM(raw);
    network.provenance={provider:'OpenStreetMap',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',url:OVERPASS,retrievedAt:new Date().toISOString(),query:request.query,bounds:request.bounds,marginM,boundary:structuredClone(boundary),osmTimestamp:raw.osm3s?.timestamp_osm_base||'unknown',sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',joined))].map(b=>b.toString(16).padStart(2,'0')).join('')};return network;
  }finally{clearTimeout(timer);}
}
export function parseGraphML(text:string,filename:string):Network{
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('GraphML external entities and document types are unsupported.');
  const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid GraphML XML.');
  const keys=new Map([...doc.getElementsByTagName('key')].map(k=>[k.getAttribute('id'),k.getAttribute('attr.name')]));
  const values=(e:Element)=>Object.fromEntries([...e.children].filter(c=>c.localName==='data').map(c=>[keys.get(c.getAttribute('key'))||'',c.textContent||'']));
  const graph=doc.getElementsByTagName('graph')[0];if(!graph||graph.getAttribute('edgedefault')!=='directed')throw new Error('Upload a directed OSMnx GraphML graph.');
  const crs=values(graph).crs||'';if(!/EPSG:4326|(?:longlat.*WGS84)/i.test(crs))throw new Error('GraphML must explicitly use WGS84 longitude/latitude (EPSG:4326). Reproject before upload.');
  const nodes=[...graph.getElementsByTagName('node')].map(e=>{const d=values(e);if(!d.x?.trim()||!d.y?.trim())throw new Error('GraphML nodes need x and y coordinates.');return {id:e.getAttribute('id')||'',coordinates:[Number(d.x),Number(d.y)]};});
  const edges=[...graph.getElementsByTagName('edge')].map(e=>{if(e.getAttribute('directed')==='false')throw new Error('Undirected edge overrides are unsupported.');const d=values(e),edge:Network['edges'][number]={from:e.getAttribute('source')||'',to:e.getAttribute('target')||'',lengthM:Number(d.length)};if(d.geometry){if(!/^LINESTRING\s*\([^()]+\)$/i.test(d.geometry))throw new Error('Use 2D LINESTRING edge geometry.');edge.geometry=d.geometry.replace(/^LINESTRING\s*\(|\)$/gi,'').split(',').map(p=>p.trim().split(/\s+/).map(Number));}return edge;});
  const result={nodes,edges,source:`Uploaded ${filename}; directed GraphML, WGS84; edge length interpreted as metres. Verify the source, acquisition date and travel mode. Original tags and restrictions are not reinterpreted.`};validateNetwork(result);return result;
}
export async function importNetwork(file:File):Promise<Network>{
  if(file.size>NETWORK_BYTES)throw new Error('Upload network files up to 2 MB.');const text=await file.text();let result:Network;
  if(/\.graphml$/i.test(file.name))result=parseGraphML(text,file.name);else{const raw=JSON.parse(text);result=isRecord(raw)&&Array.isArray(raw.elements)?networkFromOSM(raw):raw;validateNetwork(result);}
  result.provenance={...result.provenance,filename:file.name,importedAt:new Date().toISOString(),sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('')};return result;
}
