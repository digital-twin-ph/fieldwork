import type {Polygon,Boundary} from './types.js';

/** Administrative boundaries from geoBoundaries, chosen by name rather than drawn.
 *
 *  Experiment [14](../docs/experiments/14-gadm-jurisdiction-assets.md) specified this on
 *  2026-10-06 and recorded that "polygon ingestion, jurisdiction selection widgets and GADM
 *  retrieval are not yet implemented". A54 asks to *"select boundary members without forcing a
 *  union"*. This is the acquisition half: which boundaries exist, how large they are, and the
 *  bytes for the ones chosen.
 *
 *  **Everything here follows what the API actually returned**, probed on 2026-10-17 and written
 *  up in [the probe](../docs/research/geoboundaries-probe-2026-10-17.md). Three findings shape
 *  this module:
 *
 *  - **The metadata endpoint carries no geometry.** It returns `admUnitCount`, vertex statistics
 *    and separate download links, so a practitioner can be shown how large a level is BEFORE
 *    anything is fetched. That is what makes "only the boundaries we need" possible.
 *  - **A level may not exist.** `NGA/ADM3` and `BRA/ADM3` return nothing. A picker cannot assume
 *    a hierarchy depth, so an absent level is a normal answer and not an error.
 *  - **The licence is per boundary, not per source.** Six distinct licences across eleven
 *    country-levels, three of them share-alike ODbL. `gbOpen` is a release policy, not a licence,
 *    so each selection carries its own `boundaryLicense` and the receipt can state it.
 *
 *  Nothing here fetches geometry on its own. The caller asks for the levels, shows the cost, and
 *  only then asks for the shapes. */

export const GEOBOUNDARIES_RELEASE='gbOpen';
const API='https://www.geoboundaries.org/api/current';

/** What one administrative level of one country is, before its geometry is downloaded. */
export interface BoundaryLevel {
  iso:string;
  level:string;
  /** Content-keyed by the service: "changes only if the underlying data changes", which is the
   *  anchor A53's versioned jurisdiction identity needs. */
  boundaryID:string;
  name:string;
  units:number;
  meanVertices:number;
  maxVertices:number;
  /** The year the boundary REPRESENTS, which is the frame vintage a rate refuses on when it
   *  disagrees with a numerator period. Levels within one country differ: the DRC is 2017, 2019
   *  and 2010 at ADM1, ADM2 and ADM3. */
  yearRepresented:string;
  licence:string;
  licenceSource:string;
  /** WHO drew the line. For a contested boundary this is the whole question, and a licence names
   *  the terms of reuse, not the authority. geoBoundaries returns it as `boundarySource`. */
  source:string;
  /** What kind of unit this level holds. COD ADM2 answers "territory, city" -- so Bunia (78 km2,
   *  a city) and Irumu (7,986 km2, a territory) are peers in one flat list, two orders of
   *  magnitude apart. The dataset declares the distinction; nothing was reading it. */
  canonical:string;
  geoJsonUrl:string;
}

import countries from '../examples/geoboundaries/countries.json';

/** Every country geoBoundaries publishes, by ISO3 and name.
 *
 *  Bundled rather than fetched: the ALL/ADM0 response is 410 KB and this is the two fields a
 *  practitioner needs, 9 KB, snapshotted 2026-10-18. Only countries the SOURCE has are listed,
 *  so the picker cannot offer one that comes back empty.
 *
 *  The practitioner asked why a code was being typed at all: *"considering low friction, why do
 *  we not use a country dropdown or a predictive entry selector?"* Choosing WHICH country to
 *  study is a judgment; remembering that the DRC is COD is a lookup, and a lookup is friction
 *  with nothing behind it. */
export const COUNTRIES:readonly {iso:string;name:string}[]=countries.countries;

/** The ISO3 a practitioner meant, from a name or a code, or null.
 *
 *  Accepts the code directly, because somebody who knows it should not be made to scroll, and
 *  matches a name case- and space-insensitively. A prefix match is accepted only when it is
 *  unambiguous -- "Congo" matches two countries and must not silently pick one of them. */
export const countryName=(iso:string)=>COUNTRIES.find(c=>c.iso===iso)?.name??iso;

/** Other countries whose name contains what was typed. Empty when the choice is unmistakable.
 *
 *  "Congo" IS the Republic of the Congo's name, so resolving it is correct -- and the
 *  Democratic Republic of the Congo is a different country a thousand kilometres away. Refusing
 *  a correct match would be wrong; resolving it in silence is how experiment 47's warning comes
 *  true, that a name-keyed match "matches the wrong polygon silently". So the near misses are
 *  returned and the dialog names them. */
export function alsoMatching(typed:string,chosen:string):readonly string[]{
  const needle=typed.trim().toLowerCase();
  if(!needle)return [];
  return COUNTRIES.filter(c=>c.iso!==chosen&&c.name.toLowerCase().includes(needle)).map(c=>c.name);
}

export function resolveCountry(typed:string):string|null{
  const needle=typed.trim().toLowerCase().replace(/\s+/g,' ');
  if(!needle)return null;
  const byCode=COUNTRIES.find(c=>c.iso.toLowerCase()===needle);
  if(byCode)return byCode.iso;
  const exact=COUNTRIES.filter(c=>c.name.toLowerCase()===needle);
  if(exact.length===1)return exact[0].iso;
  const prefix=COUNTRIES.filter(c=>c.name.toLowerCase().startsWith(needle));
  return prefix.length===1?prefix[0].iso:null;
}

export const ADM_LEVELS=['ADM0','ADM1','ADM2','ADM3','ADM4','ADM5'] as const;

const text=(v:unknown)=>typeof v==='string'?v.trim():typeof v==='number'?String(v):'';
const count=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0;};

/** One level's metadata, or null when the country does not publish that level.
 *
 *  Null is an ANSWER. Nigeria has no ADM3; a picker that treated that as a failure would make a
 *  normal fact look like a broken request. */
export function readLevel(iso:string,level:string,payload:unknown):BoundaryLevel|null{
  const record=Array.isArray(payload)?payload[0]:payload;
  if(!record||typeof record!=='object')return null;
  const r=record as Record<string,unknown>;
  const url=text(r.gjDownloadURL);
  if(!url||!text(r.boundaryID))return null;
  return {
    iso:text(r.boundaryISO)||iso,
    level:text(r.boundaryType)||level,
    boundaryID:text(r.boundaryID),
    name:text(r.boundaryName)||`${iso} ${level}`,
    units:count(r.admUnitCount),
    meanVertices:count(r.meanVertices),
    maxVertices:count(r.maxVertices),
    // "2010.0" is what COD/ADM3 returns: a year arriving as a float, which would reach a receipt
    // as a vintage and fail a string comparison against "2010" in silence.
    yearRepresented:text(r.boundaryYearRepresented).replace(/\.0+$/,''),
    licence:text(r.boundaryLicense)||'not stated',
    licenceSource:text(r.licenseSource),
    source:text(r.boundarySource)||'not stated',
    canonical:text(r.boundaryCanonical),
    geoJsonUrl:browserFetchableUrl(url),
  };
}

/** True when a licence obliges anything derived from this boundary to carry the same terms.
 *
 *  Recorded per boundary because the project's own records said geoBoundaries was "CC BY 4.0 …
 *  attribution obligation only" and the service returns ODbL on the DRC and Uganda levels. A
 *  practitioner redistributing a pack needs to be told, not to find out. */
export const isShareAlike=(licence:string)=>/odbl|open database|share.?alike|cc.?by.?sa/i.test(licence);

export const levelUrl=(iso:string,level:string)=>
  `${API}/${GEOBOUNDARIES_RELEASE}/${encodeURIComponent(iso.toUpperCase())}/${encodeURIComponent(level)}/`;

/** The documented download URL is not fetchable from a browser; this is the one that is.
 *
 *  `gjDownloadURL` points at `github.com/<owner>/<repo>/raw/<ref>/<path>`, which answers a 302
 *  carrying an EMPTY `access-control-allow-origin`. A browser is blocked there and never follows
 *  the redirect: "Access to fetch at 'https://github.com/wmgeolab/geoBoundaries/raw/…' has been
 *  blocked by CORS policy." Measured 2026-10-17.
 *
 *  The files are Git LFS -- the raw host returns a 131-byte pointer, not the data -- and the
 *  redirect target is `media.githubusercontent.com/media/<owner>/<repo>/<ref>/<path>`, which
 *  serves the real 550 KB and sends `access-control-allow-origin: *`. The short ref in the
 *  documented URL works there unchanged.
 *
 *  Rewritten rather than proxied, because a proxy would put this project between a practitioner
 *  and their data for no reason other than a redirect's missing header. A URL that is not a
 *  github.com/raw link is returned untouched, so if the service moves its hosting this stops
 *  applying rather than corrupting the new one. */
export function browserFetchableUrl(url:string):string{
  const match=/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/.exec(url);
  return match?`https://media.githubusercontent.com/media/${match[1]}/${match[2]}/${match[3]}`:url;
}

/** The named units inside a downloaded level, each kept whole.
 *
 *  A54: members are NOT dissolved into one MultiPolygon. "Appending polygons into a MultiPolygon"
 *  loses which unit is which, and a joint investigation across a border is exactly the case where
 *  that matters. */
export interface BoundaryUnit {id:string; name:string; geometry:Polygon|Boundary}

export function readUnits(level:BoundaryLevel,geojson:unknown):BoundaryUnit[]{
  const features=(geojson as {features?:unknown[]})?.features;
  if(!Array.isArray(features))return [];
  return features.flatMap((f,index)=>{
    const feature=f as {properties?:Record<string,unknown>; geometry?:Boundary};
    if(!feature?.geometry)return [];
    const p=feature.properties??{};
    // shapeName and shapeID are geoBoundaries' own fields. Falling back to a positional id keeps
    // a unit addressable when a file omits them rather than dropping it silently.
    const name=text(p.shapeName)||text(p.shapeGroup)||`${level.level} ${index+1}`;
    return [{id:text(p.shapeID)||`${level.boundaryID}-${index}`,name,geometry:feature.geometry}];
  });
}

/** What choosing these units costs and obliges, for the practitioner to see before downloading. */
export function selectionSummary(level:BoundaryLevel,chosen:readonly BoundaryUnit[]):string{
  const vintage=level.yearRepresented?`represents ${level.yearRepresented}`:'states no year';
  const terms=isShareAlike(level.licence)
    ? `${level.licence} — SHARE-ALIKE: anything derived from this and redistributed carries the same terms`
    : level.licence;
  return `${chosen.length} of ${level.units} ${level.level} units · ${vintage} · ${terms}`;
}

/** The jurisdiction's own outline, exactly as its source published it.
 *
 *  The practitioner, 2026-10-18: *"selecting Bunia gave me a square not the jurisdictional
 *  polygon."* It did, and that was a shortcut I documented instead of fixing. A bounding box
 *  includes ground that is not in the jurisdiction at all, which for an outbreak investigation
 *  is the difference between a district and the land around it.
 *
 *  **It is used as it arrives.** `validateDrawnGeometry` once accepted one exterior ring of 3 to
 *  200 vertices and no holes -- decision A03 in [01](../docs/experiments/01-study-area.md),
 *  explicitly a DRAWING contract: "holes, antimeridian crossings, and polar latitudes ... are
 *  explicitly outside this drawing contract". Measured against real jurisdictions that ceiling
 *  rejected 147 of 189 DRC ADM2 units, and 22 more carried enclaves no vertex budget reaches
 *  (docs/research/vertex-contract-probe-2026-10-18.md).
 *
 *  The practitioner, 2026-10-18: *"we want to admit polygons as long as they do not overrun
 *  memory."* So the ceiling is a measured byte budget and an outline is admitted whole. What was
 *  admitted is still reported -- vertices, size, enclaves kept -- because the size of what a
 *  study area now holds is a number a practitioner should see, the standard
 *  `fw:circleAreaFraction` sets where "the approximation is a number rather than a footnote".
 *
 *  A MultiPolygon still keeps its largest part and says so. An island or an exclave is not
 *  carried, because one study area holds one outline, and losing it silently would be worse. */
export interface PublishedBoundary {
  /** Every ring as published: the exterior first, then any interior rings. */
  rings:[number,number][][];
  vertices:number;
  /** Interior rings -- enclaves. 22 of 189 DRC ADM2 units carry one. */
  holes:number;
  /** Parts not carried, because one study area holds one outline. */
  partsDropped:number;
  bytes:number;
}

/** A published outline, admitted whole. Nothing is thinned to meet a vertex count.
 *
 *  The practitioner, 2026-10-18: *"we want to admit polygons as long as they do not overrun
 *  memory."* Simplifying to 200 vertices preserved area to within 0.05% while moving up to 0.82%
 *  of a unit across its own edge, and the edge is where a cross-border question lives, so the
 *  thinning was not a cheaper version of the boundary but a different one. The size limit now
 *  lives in validateDrawnGeometry as a byte budget, which refuses an outline it cannot store
 *  rather than quietly reshaping it.
 */
export function publishedRings(geometry:unknown):PublishedBoundary|null{
  const g=geometry as {type?:string;coordinates?:unknown};
  const polygons:[number,number][][][]=g?.type==='MultiPolygon'
    ?(g.coordinates as [number,number][][][])
    :g?.type==='Polygon'?[g.coordinates as [number,number][][]]:[];
  if(!polygons.length)return null;
  const usable=polygons.filter(poly=>Array.isArray(poly[0])&&poly[0].length>=4);
  if(!usable.length)return null;
  // The largest part by vertex count stands for the whole, which is the usual case: a mainland
  // with islands. Measured, no DRC ADM2 unit is multi-part at all, so this is the rarer branch.
  const chosen=usable.reduce((a,b)=>b[0].length>a[0].length?b:a);
  const rings=chosen.filter(r=>Array.isArray(r)&&r.length>=4);
  const vertices=rings.reduce((sum,r)=>sum+r.length-1,0);
  return {rings,vertices,holes:rings.length-1,partsDropped:usable.length-1,
    bytes:JSON.stringify(rings).length};
}

/** What was admitted, for the practitioner to read before applying it. */
export function publishedNote(unit:string,b:PublishedBoundary):string{
  const parts=b.partsDropped?` ${b.partsDropped} separate part${b.partsDropped===1?'':'s'} not carried: one outline is what a study area holds.`:'';
  const holes=b.holes?` ${b.holes} interior ring${b.holes===1?'':'s'} kept, so enclaves stay outside the area.`:'';
  return `${unit}: the boundary as published, ${b.vertices} vertices, ${Math.round(b.bytes/1024)} KB.`
    +`${holes}${parts}`;
}

