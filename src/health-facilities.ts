import type {Boundary,PointCollection,Workflow,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import {facilityRecordsIn,parseFacilityRecords} from './facility-records.js';
import type {FacilityDropCounts,ParsedFacilities} from './facility-records.js';
import {pacedNetworkDownload,deferNetworkDownload} from './network-throttle.js';
import {ZipReader,BlobReader,TextWriter} from '@zip.js/zip.js';
import {OVERTURE_ATTRIBUTION,OVERTURE_BUCKET,OVERTURE_LICENCE,OVERTURE_LICENCE_IRI,OVERTURE_LINKS,
        OVERTURE_DEFAULT_CONFIDENCE,readOverturePlaces} from './overture-places.js';
import type {FileEntry} from '@zip.js/zip.js';

/** Finding health facilities inside a study area.
 *
 *  One operation, two sources. The naming convention asks for the operation rather than the
 *  method, and which service a practitioner happens to reach is a method: the question "which
 *  health facilities are in my study area" is the same question whichever answers it. So the
 *  source is a setting, not a separate widget, and a workflow that changes source keeps its shape.
 *
 *  All three sources are reachable from a browser with no account, and that is why these three:
 *  - Overpass answers with `access-control-allow-origin: *`, measured 2026-10-09.
 *  - The HOT country export on HDX is on S3, also `access-control-allow-origin: *`; the whole
 *    Philippine point set is 452 KB compressed and holds 12,776 facilities, 11,877 of them named.
 *
 *  - Overture Maps Places is GeoParquet on S3 with ranged reads; a study area selects a handful of
 *    row groups out of thousands, so 11 GB never has to be downloaded.
 *
 *  The first two are OpenStreetMap-derived and ODbL, which is share-alike. Overture is a Meta and
 *  Microsoft conflation under CDLA Permissive 2.0, which is not, so the licence cannot be assumed
 *  and travels with each retrieval instead.
 *  A third source, healthsites.io, was built and then excluded: it sends no cross-origin header,
 *  so the application cannot read its response at all and acquisition required the practitioner to
 *  download the file themselves and hand it back. The measurements and the reasoning are kept in
 *  docs/experiments/69-healthsites-acquisition.md, because the finding outlived the code. */

export const FACILITY_SOURCES={
  'openstreetmap-live':{
    label:'OpenStreetMap, live query',
    detail:'Queries Overpass for facilities inside the study area. No account needed. Current as of the moment you retrieve.',
    origin:'https://overpass-api.de',
    licence:'ODbL-1.0',
    attribution:'© OpenStreetMap contributors, Open Database License (ODbL) 1.0',
    links:[{label:'Open Database License 1.0',href:'https://opendatacommons.org/licenses/odbl/1-0/'},
           {label:'OpenStreetMap copyright and attribution',href:'https://www.openstreetmap.org/copyright'}],
    licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/', sourceIRI:'https://www.openstreetmap.org/copyright',
    needsCountry:false,paced:true,confidence:false},
  'hdx-hot-export':{
    label:'HDX country export (Humanitarian OpenStreetMap Team)',
    detail:'Downloads the prepared country-wide extract published on the Humanitarian Data Exchange, then keeps the facilities inside the study area. Rebuilt periodically rather than live.',
    origin:'https://s3.dualstack.us-east-1.amazonaws.com',
    licence:'ODbL-1.0',
    attribution:'© OpenStreetMap contributors, prepared by the Humanitarian OpenStreetMap Team, Open Database License (ODbL) 1.0',
    links:[{label:'Open Database License 1.0',href:'https://opendatacommons.org/licenses/odbl/1-0/'},
           {label:'OpenStreetMap copyright and attribution',href:'https://www.openstreetmap.org/copyright'},
           {label:'HDX terms of service',href:'https://data.humdata.org/faqs/terms'}],
    licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/', sourceIRI:'https://www.openstreetmap.org/copyright',
    needsCountry:true,paced:false,confidence:false},
  'overture-places':{
    label:'Overture Maps Places',
    detail:'Reads the Overture Maps places dataset directly from cloud storage, taking only the parts that cover your study area. Independent of OpenStreetMap, and the only source here that states a confidence for each place. Catalogues commercial places, so it is broader than a facility register and needs the confidence threshold.',
    origin:OVERTURE_BUCKET,
    licence:OVERTURE_LICENCE,
    attribution:OVERTURE_ATTRIBUTION,
    links:OVERTURE_LINKS,
    licenceIRI:OVERTURE_LICENCE_IRI,
    sourceIRI:'https://docs.overturemaps.org/attribution/',
    needsCountry:false,paced:false,confidence:true},
} as const;
export type FacilitySource=keyof typeof FACILITY_SOURCES;
export const FACILITY_SOURCE_KEYS=Object.keys(FACILITY_SOURCES) as FacilitySource[];
export function isFacilitySource(value:string):value is FacilitySource{return Object.hasOwn(FACILITY_SOURCES,value);}

/** The kinds offered as tick-boxes. Measured from the HOT Philippine export and an Overpass query
 *  over Metro Manila on 2026-10-09; the counts are why these and not others. A kind not listed
 *  here can still be typed in, because OSM tagging is open and this list is a convenience. */
export const FACILITY_KINDS=['hospital','clinic','doctors','health_post','pharmacy','dentist',
  'laboratory','birthing_centre','nursing_home','physiotherapist','alternative','midwife'] as const;

export const MAX_FACILITY_RECORDS=20_000;

export interface FacilityRetrieval {
  source:FacilitySource; sourceLabel:string; licence:string; licenceIRI:string; sourceIRI:string;
  attribution:string; origin:string;
  kept:number; dropped:FacilityDropCounts; at:string; scope:string;
  filename?:string; sha256?:string; bytes?:number;
  /** Overture only: the release read, and what its own filters removed. */
  release?:string; belowConfidence?:number; unmappedCategory?:number; minConfidence?:number;
}

const text=(value:string|undefined)=>(value||'').trim();

/** A confidence threshold outside 0 to 1 is not a threshold, so it is refused rather than clamped:
 *  clamping would silently answer a different question than the one that was asked. */
export function confidenceOf(value:number|undefined):number{
  if(value===undefined)return OVERTURE_DEFAULT_CONFIDENCE;
  if(!Number.isFinite(value)||value<0||value>1)
    throw new Error('The confidence threshold must be between 0 and 1.');
  return value;
}

/** ISO 3166-1 alpha-3, which is what the HOT export paths are keyed by. Checked rather than
 *  trusted: a wrong code produces a 404 from S3, and a clear refusal here is better than a
 *  network error the practitioner has to interpret. */
export function normalizeCountryCode(value:string):string{
  const code=text(value).toUpperCase();
  if(!/^[A-Z]{3}$/.test(code))throw new Error('Give the country as a three-letter ISO code, such as PHL for the Philippines.');
  return code;
}

export function hotExportURL(iso3:string):string{
  const code=normalizeCountryCode(iso3);
  // Measured path layout, 2026-10-09. HOT publishes per-country extracts under this prefix; if the
  // layout changes the download fails with a stated 404 rather than silently returning nothing.
  return `${FACILITY_SOURCES['hdx-hot-export'].origin}/production-raw-data-api/ISO3/${code}`
    +`/health_facilities/points/hotosm_${code.toLowerCase()}_health_facilities_points_geojson.zip`;
}

/** The bounding box of the study area, as [west, south, east, north].
 *
 *  Computed from the boundary geometry rather than read from a precomputed `bounds` field, because
 *  the retrieve button has the boundary in hand and not an evaluated area value, and because one
 *  derivation cannot disagree with another. */
export function boundsOf(boundary:Boundary):readonly [number,number,number,number]{
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  const rings=boundary.type==='MultiPolygon'?boundary.coordinates.flat():boundary.coordinates;
  for(const ring of rings)for(const position of ring){
    const [x,y]=position;
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(x<west)west=x;if(x>east)east=x;if(y<south)south=y;if(y>north)north=y;
  }
  if(!Number.isFinite(west)||!Number.isFinite(south)||!Number.isFinite(east)||!Number.isFinite(north))
    throw new Error('The connected study area has no usable extent. Draw or import an area first.');
  if(west===east||south===north)
    throw new Error('The connected study area has no width or no height, so it bounds nothing.');
  return [west,south,east,north];
}

/** Overpass asks for a bounding box as south,west,north,east, which is not the order the rest of
 *  this application uses. Getting it wrong returns facilities from somewhere else entirely and no
 *  error, so the conversion lives in one named place. */
export function overpassQuery(bounds:readonly [number,number,number,number],kinds:readonly string[]):string{
  const [west,south,east,north]=bounds;
  const box=`${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`;
  const safe=kinds.map(kind=>kind.trim()).filter(kind=>/^[a-z_]+$/.test(kind));
  const filter=safe.length?`~"^(${safe.join('|')})$"`:'';
  return `[out:json][timeout:90];(nwr["healthcare"${filter}](${box});nwr["amenity"${filter}](${box}););out tags center;`;
}

async function fetchOverpass(bounds:readonly [number,number,number,number],kinds:readonly string[],fetcher:typeof fetch):Promise<unknown>{
  const query=overpassQuery(bounds,kinds);
  return pacedNetworkDownload(async()=>{
    const response=await fetcher(`${FACILITY_SOURCES['openstreetmap-live'].origin}/api/interpreter`,
      {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
       body:new URLSearchParams({data:query}).toString()});
    if(response.status===429||response.status===504){
      deferNetworkDownload(response.headers.get('retry-after'));
      throw new Error(`Overpass is busy (HTTP ${response.status}). It is a free shared service; wait and retry, or use the HDX country export instead.`);
    }
    if(!response.ok)throw new Error(`Overpass refused the request: HTTP ${response.status}.`);
    return await response.json();
  });
}

async function fetchHotExport(iso3:string,fetcher:typeof fetch):Promise<{payload:unknown;filename:string;bytes:number}>{
  const url=hotExportURL(iso3);
  const response=await fetcher(url);
  if(response.status===404)throw new Error(
    `The Humanitarian OpenStreetMap Team publishes no health-facility extract for ${normalizeCountryCode(iso3)}, or the path has changed. Try the live OpenStreetMap query instead.`);
  if(!response.ok)throw new Error(`The HDX export could not be downloaded: HTTP ${response.status}.`);
  const blob=await response.blob();
  const reader=new ZipReader(new BlobReader(blob),{strictness:'strict',checkSignature:true});
  try{
    const entries=await reader.getEntries();
    const entry=entries.find(candidate=>/\.(geojson|json)$/i.test(candidate.filename)&&!candidate.directory) as FileEntry|undefined;
    if(!entry)throw new Error('The HDX export holds no GeoJSON file.');
    const content=await entry.getData(new TextWriter());
    return {payload:JSON.parse(content),filename:entry.filename,bytes:blob.size};
  }finally{await reader.close();}
}

/** Retrieve and parse. Called from the interface, never from the executor.
 *
 *  That separation is the whole of how this application goes from online to offline: a
 *  network-dependent widget retrieves its data once, while there is a network, and stores it in the
 *  workflow. Running the workflow afterwards reads what was stored and makes no request, so the
 *  same workflow produces the same result with the network switched off. `core.ts` imports
 *  `facilitiesValue` and the validators from this module and deliberately not this function, which
 *  is what keeps the executor incapable of a live retrieval rather than merely unlikely to attempt
 *  one. The `fetcher` is injectable for the same reason `requestOSM` makes it injectable: so the
 *  acquisition path can be tested without a network. */
export async function downloadFacilities(
  node:WorkflowNode<'find_health_facilities'>, boundary:Boundary, fetcher:typeof fetch=fetch,
  onProgress?:(message:string)=>void,
):Promise<{parsed:ParsedFacilities;retrieval:FacilityRetrieval}>{
  const source=node.params.source;
  const descriptor=FACILITY_SOURCES[source];
  const bounds=boundsOf(boundary);
  const kinds=[...(node.params.kinds||[])];
  const requireName=node.params.requireName!==false;
  let records:readonly unknown[], filename:string|undefined, bytes:number|undefined, scope:string;
  let extra:Partial<FacilityRetrieval>={};
  if(source==='openstreetmap-live'){
    records=facilityRecordsIn(await fetchOverpass(bounds,kinds,fetcher));
    scope=`study area ${bounds.map(v=>v.toFixed(4)).join(', ')}`;
  }else if(source==='overture-places'){
    // Overture filters before this point, by confidence and by whether its category maps onto a
    // facility kind at all. Those two counts are reported separately from the shared drop counts
    // because they are judgements this application made, not gaps in the source.
    const minConfidence=confidenceOf(node.params.minConfidence);
    const {records:places,scan}=await readOverturePlaces(
      {bounds,minConfidence,fetcher,onProgress});
    records=places;
    scope=`study area ${bounds.map(v=>v.toFixed(4)).join(', ')}, Overture release ${scan.release}`;
    extra={release:scan.release,belowConfidence:scan.belowConfidence,
      unmappedCategory:scan.unmappedCategory,minConfidence};
  }else{
    const got=await fetchHotExport(node.params.country,fetcher);
    records=facilityRecordsIn(got.payload);filename=got.filename;bytes=got.bytes;
    scope=`${normalizeCountryCode(node.params.country)} export, clipped to the study area`;
  }
  if(records.length>MAX_FACILITY_RECORDS)throw new Error(
    `That source returned ${records.length.toLocaleString()} records, over the ${MAX_FACILITY_RECORDS.toLocaleString()} this holds. Narrow the study area or the facility kinds.`);
  // The live query is already bounded by the server, so clipping it again would only hide a bug in
  // the bounding box. The country export is not bounded at all and must be clipped here.
  //
  // AND EVERY SOURCE IS CLIPPED TO THE OUTLINE, which is a different thing from the box. Overpass
  // takes a bounding box, Overture is read by extent, the export is clipped to a box -- and a box
  // is not a jurisdiction. On North Kivu, 526 of 961 facilities the source returned stood in
  // Uganda and Rwanda, because the province is long and curved. This widget's own sentence is
  // "facilities inside the study area", so the outline decides and the number set aside is
  // reported rather than discarded quietly.
  const parsed=parseFacilityRecords(records,
    {kinds,requireName,boundary,...(source==='hdx-hot-export'?{within:bounds}:{})});
  if(!parsed.kept&&parsed.dropped.outside)throw new Error(
    `${records.length.toLocaleString()} facilities were returned for this area and every one of them `
    +`falls outside the study area's outline. The source is bounded by a rectangle around your area, `
    +`and the area itself decides what is kept. Check that the boundary is the one you meant.`);
  if(!parsed.kept)throw new Error(
    `No facilities of the requested kinds were found in the study area. ${records.length.toLocaleString()} records were read and all were dropped: ${parsed.dropped.kind} of another kind, ${parsed.dropped.coordinates} outside the area or without coordinates, ${parsed.dropped.name} unnamed.`);
  return {parsed,retrieval:{source,sourceLabel:descriptor.label,licence:descriptor.licence,
    licenceIRI:descriptor.licenceIRI,sourceIRI:descriptor.sourceIRI,
    attribution:descriptor.attribution,origin:descriptor.origin,kept:parsed.kept,
    dropped:parsed.dropped,at:new Date().toISOString(),scope,...extra,
    ...(filename?{filename}:{}),...(bytes!==undefined?{bytes}:{})}};
}

/** Draft-level checks: what must hold for the node to be saved at all. Kept separate from
 *  requireRunnable so a half-configured node can sit on the canvas, which experiment 48 recorded
 *  as a mistake worth not repeating. */
export function validateFindHealthFacilitiesNode(node:WorkflowNode<'find_health_facilities'>):void{
  const p=node.params;
  // A workflow saved before the confidence threshold existed has none, and an absent number is
  // not a threshold of zero. Filled here, where the other parameter defaults are filled.
  p.minConfidence??=OVERTURE_DEFAULT_CONFIDENCE;
  if(!isFacilitySource(p.source))throw new Error('Choose a source for Find health facilities.');
  if(!Array.isArray(p.kinds))throw new Error('Facility kinds must be a list.');
  for(const kind of p.kinds)if(!/^[a-z_]+$/.test(kind))
    throw new Error(`"${kind}" is not an OpenStreetMap facility kind. Use lower-case words such as hospital or health_post.`);
  if(p.data&&!p.retrieved)throw new Error('Find health facilities holds facilities with no record of where they came from.');
}

export function requireRunnableFindHealthFacilities(node:WorkflowNode<'find_health_facilities'>):void{
  validateFindHealthFacilitiesNode(node);
  const p=node.params, descriptor=FACILITY_SOURCES[p.source];
  if(!p.kinds.length)throw new Error('Choose at least one facility kind to look for.');
  if(descriptor.needsCountry)normalizeCountryCode(p.country);
  if(descriptor.confidence)confidenceOf(p.minConfidence);
}

/** The layer this node emits, once facilities have been retrieved.
 *
 *  The licence is read from what the retrieval recorded, never assumed. Two of the three sources
 *  are ODbL and share-alike; Overture is CDLA Permissive 2.0 and is not. A receipt that stated one
 *  licence for every source would be wrong for whichever source it was not describing, and a
 *  licence claim is exactly the kind of thing a reader will rely on without checking. The IRI is
 *  emitted rather than a label, so it resolves and can be compared. */
export function facilitiesValue(
  node:WorkflowNode<'find_health_facilities'>, runId:string,
):{value:PointCollection&{sourceNodeId:string};receipt:Receipt}{
  const got=node.params.retrieved, data=node.params.data;
  if(!got||!data)throw new Error(
    'Find health facilities has no facilities yet. Open it, choose a source, and press Retrieve.');
  const shareAlike=got.licence.startsWith('ODbL');
  const entity=`<urn:fieldwork:run:${runId}:${node.id}:facilities>`;
  const dataset=`<${got.origin}#health-facilities>`;
  // `outside` is optional on a retrieval stored before the outline clip existed: a workflow saved
  // yesterday has no such count, and an absent count is not zero facilities set aside.
  const outside=got.dropped.outside??0;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix dcat: <http://www.w3.org/ns/dcat#>.\n`
    +`${entity} a fw:PointDataset, prov:Entity; `
    +`fw:recordCount ${data.features.length}; `
    // What the outline set aside, in the receipt as well as in the method sentence. A count that
    // only appears in prose cannot be queried, and "how many did the source return that were not
    // in my area" is exactly the question a reviewer asks of a figure like this.
    +(outside?`fw:outsideStudyAreaCount ${outside}; `:'')
    +`fw:requestOrigin <${got.origin}>; `
    +(got.release?`dcterms:hasVersion ${JSON.stringify(got.release)}; `:'')
    +(got.filename?`fw:filename ${JSON.stringify(got.filename)}; `:'')
    +(got.sha256?`fw:sha256 ${JSON.stringify(got.sha256)}; `:'')
    +(got.bytes!==undefined?`fw:byteSize ${got.bytes}; `:'')
    +`dcterms:license <${got.licenceIRI}>; `
    +`dcterms:source <${got.sourceIRI}>; `
    +`dcterms:rights ${JSON.stringify(got.attribution)}; `
    +`prov:wasDerivedFrom ${dataset}.\n`
    +`${dataset} a dcat:Dataset; `
    +`dcterms:title ${JSON.stringify(got.sourceLabel)}; `
    +`dcterms:license <${got.licenceIRI}>.\n`;
  const lost=got.dropped.kind+got.dropped.coordinates+got.dropped.name+outside;
  const overture=got.source==='overture-places';
  const method=`Retrieved ${got.kept} health facilities from ${got.sourceLabel} on ${got.at.slice(0,10)}, scope: ${got.scope}. `
    +(lost?`Dropped ${lost} records: ${got.dropped.kind} of a kind that was not requested, ${got.dropped.coordinates} without usable coordinates, ${outside} standing outside the study area's outline, ${got.dropped.name} without a name. `:'Dropped no records. ')
    +(overture
      ?`Overture states a confidence for each place and ${got.belowConfidence??0} fell below the ${got.minConfidence??OVERTURE_DEFAULT_CONFIDENCE} threshold set here; a further ${got.unmappedCategory??0} carried a health-related category this does not map to a facility kind. `
        +'Overture catalogues commercial places, which is a broader idea than a health facility: measured in a Manila study area, its categories included individual practitioners, a wellness spa and a training course, and it reported several times as many places under "hospital" as an OpenStreetMap query returned hospitals and clinics together. Its category has been mapped onto this application\u2019s facility kinds as a declared equivalence, not an identity, and each facility carries Overture\u2019s own category and confidence so the mapping can be checked. Counts from this source are not comparable with counts from the OpenStreetMap sources. '
      :'')
    +'These are the facilities the source records, not the facilities that exist: coverage is uneven, no source here states completeness, and an absence is not evidence of absence on the ground. '
    +(shareAlike
      ?`The data is under ${got.licence}, which is share-alike: a database derived from it must be offered under the same licence with attribution intact.`
      :`The data is under ${got.licence}, which requires attribution but is not share-alike, so a derived database carries no obligation to adopt the same licence.`);
  return {value:{...structuredClone(data),sourceNodeId:node.id},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method}};
}

/** Saved workflows that hold the excluded healthsites node.
 *
 *  `healthsites_discovery` existed briefly and is gone: healthsites.io sends no cross-origin
 *  header, so the application could never read its response, and acquisition depended on the
 *  practitioner downloading the file themselves and handing it back. A workflow saved in that
 *  window must still open, so the node becomes this one with the live OpenStreetMap source, which
 *  asks the same question of a service a browser can actually reach.
 *
 *  Any facilities it held are **not** carried over, and that is deliberate rather than lazy. Their
 *  provenance was a hand-back of a file this application never saw the origin of, and relabelling
 *  it as an OpenStreetMap retrieval would be a false provenance record — the one thing a receipt
 *  must never contain. The node arrives needing a retrieval, which is honest and takes one click.
 *  The reasoning is kept in docs/experiments/69-healthsites-acquisition.md. */
export function migrateHealthsitesNodes(workflow:Workflow):void{
  workflow.nodes=workflow.nodes.map(node=>{
    // The type is gone from the union, so a saved node carrying it is only reachable as data.
    if(!node||(node.type as string)!=='healthsites_discovery'||!node.params)return node;
    const previous=node.params as unknown as Record<string,unknown>;
    const kinds=Array.isArray(previous.kinds)
      ?(previous.kinds as unknown[]).filter((k):k is string=>typeof k==='string'&&/^[a-z_]+$/.test(k))
      :[];
    return {...node,type:'find_health_facilities' as const,params:{
      label:typeof previous.label==='string'&&previous.label&&previous.label!=='Find healthsites facilities'
        ?previous.label:'Find health facilities',
      source:'openstreetmap-live' as const,
      kinds:kinds.length?kinds:['hospital','clinic'],
      requireName:true,
      // The old node named a country in words; this one needs an ISO code, and guessing one from
      // a free-text name would be inventing data. The default stands and the practitioner adjusts.
      country:'PHL',
      minConfidence:OVERTURE_DEFAULT_CONFIDENCE,
      data:null,retrieved:null,
    }};
  });
}
