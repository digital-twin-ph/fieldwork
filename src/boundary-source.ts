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
  geoJsonUrl:string;
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
