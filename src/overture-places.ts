import {asyncBufferFromUrl,parquetMetadataAsync,parquetReadObjects} from 'hyparquet';
import {compressors} from 'hyparquet-compressors';

/** Reading Overture Maps Places from the browser.
 *
 *  Overture publishes about 81 million places as 11 GB of GeoParquet on S3. None of that can be
 *  downloaded, and none of it has to be: the parts are spatially clustered, so a study area's
 *  bounding box selects a handful of row groups out of thousands. Measured 2026-10-10 against
 *  release 2026-09-23.1 — 16 parts, 4,864 row groups, 81,455,423 rows; a 5 km Manila box matched
 *  3 row groups in 1 part, 55,649 rows, read in about 1.5 seconds. The footers are the slow part
 *  and are read concurrently.
 *
 *  Why this source at all, when two OpenStreetMap sources already exist: Overture Places is a
 *  conflation of Meta and Microsoft data and is **not** OpenStreetMap-derived, so it can
 *  corroborate rather than echo. It is CDLA Permissive 2.0, which is not share-alike. And it
 *  carries a per-place `confidence`, which is the only numeric quality signal any of these
 *  sources offer. */

export const OVERTURE_BUCKET='https://overturemaps-us-west-2.s3.amazonaws.com';
export const OVERTURE_PLACE_PATH='theme=places/type=place/';
export const OVERTURE_LICENCE='CDLA-Permissive-2.0';
export const OVERTURE_LICENCE_IRI='https://cdla.dev/permissive-2-0/';
export const OVERTURE_ATTRIBUTION='© Overture Maps Foundation, Community Data License Agreement – Permissive 2.0';
export const OVERTURE_LINKS=[
  {label:'Community Data License Agreement – Permissive 2.0',href:'https://cdla.dev/permissive-2-0/'},
  {label:'Overture Maps places schema',href:'https://docs.overturemaps.org/schema/reference/places/place/'},
  {label:'Overture Maps attribution and licensing',href:'https://docs.overturemaps.org/attribution/'},
];

/** Overture's category vocabulary mapped onto the facility kinds this application already uses.
 *
 *  This is a **declared equivalence, not an identity**, and the mapping is deliberately
 *  conservative. Measured in a Manila study area on 2026-10-10: Overture reported 207 places under
 *  `hospital` where a live OpenStreetMap query returned 47 hospitals and clinics combined, and the
 *  health categories included a massage spa, a training course and individually named doctors.
 *  Overture catalogues commercial places, which is a looser idea than a health facility.
 *
 *  So the generic buckets — `health_care`, `medical_service`, `specialized_health_care` — are
 *  **not** mapped. They are the categories that carried most of the noise, they name no facility
 *  type a practitioner could act on, and a wrong mapping is worse than a dropped record because it
 *  is invisible. Records in them are dropped and counted. Every kept record carries Overture's own
 *  category and confidence as attributes, so the mapping can be audited rather than trusted. */
export const OVERTURE_CATEGORY_KINDS:Readonly<Record<string,string>>={
  hospital:'hospital', general_hospital:'hospital', specialty_hospital:'hospital',
  specialized_medical_facility:'hospital',
  primary_care_or_general_clinic:'clinic', walk_in_clinic:'clinic', urgent_care_clinic:'clinic',
  pediatric_clinic:'clinic', vision_or_eye_care_clinic:'clinic',
  behavioral_or_mental_health_clinic:'clinic',
  dental_clinic:'dentist',
  pharmacy_and_drug_store:'pharmacy',
  diagnostics_imaging_or_lab_service:'laboratory',
  physical_medicine_and_rehabilitation:'physiotherapist',
  complementary_and_alternative_medicine:'alternative',
};

/** The median confidence of health places measured in a Manila study area was 0.71, and the
 *  obviously unusable entries thinned out above it: 1,120 places unfiltered, 572 at this
 *  threshold. A default that admits everything would hand a practitioner a list it is their job to
 *  clean, without telling them so. */
export const OVERTURE_DEFAULT_CONFIDENCE=0.7;

export interface OverturePlaceRecord {
  id:string;
  properties:{name:string; kind:string; confidence:number; sourceCategory:string};
  geometry:{type:'Point'; coordinates:[number,number]};
}

export interface OvertureScan {
  release:string; parts:number; rowGroups:number; rowGroupsRead:number; rowsRead:number;
  belowConfidence:number; unmappedCategory:number;
}

const xmlValues=(xml:string,tag:string)=>
  [...xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`,'g'))].map(match=>match[1]);

/** The newest published release, discovered rather than pinned.
 *
 *  A pinned release goes stale silently and a practitioner would not know their facilities were
 *  from a year ago. The release actually used is recorded in the receipt, so a run stays
 *  reproducible even though the default moves. */
export async function latestOvertureRelease(fetcher:typeof fetch=fetch):Promise<string>{
  const response=await fetcher(`${OVERTURE_BUCKET}/?list-type=2&delimiter=/&prefix=release/`);
  if(!response.ok)throw new Error(`Overture releases could not be listed: HTTP ${response.status}.`);
  const releases=xmlValues(await response.text(),'Prefix')
    .map(prefix=>prefix.replace(/^release\//,'').replace(/\/$/,''))
    .filter(name=>/^\d{4}-\d{2}-\d{2}\.\d+$/.test(name))
    .sort();
  const latest=releases.at(-1);
  if(!latest)throw new Error('Overture published no release this understands. The bucket layout may have changed.');
  return latest;
}

export async function listOverturePlaceParts(release:string,fetcher:typeof fetch=fetch):Promise<string[]>{
  const prefix=`release/${release}/${OVERTURE_PLACE_PATH}`;
  const response=await fetcher(`${OVERTURE_BUCKET}/?list-type=2&prefix=${encodeURIComponent(prefix)}`);
  if(!response.ok)throw new Error(`The Overture ${release} places files could not be listed: HTTP ${response.status}.`);
  const text=await response.text();
  const parts=xmlValues(text,'Key').filter(key=>key.endsWith('.parquet'));
  if(!parts.length)throw new Error(`Overture release ${release} holds no places files at the expected path.`);
  // A truncated listing would silently drop parts, and with them whole regions.
  if(/<IsTruncated>true<\/IsTruncated>/.test(text))
    throw new Error('The Overture places listing was truncated, so some files would be missed. This needs paging support.');
  return parts.map(key=>`${OVERTURE_BUCKET}/${key}`);
}

const statistic=(value:unknown):number|null=>{
  const numeric=typeof value==='bigint'?Number(value):Number(value);
  return Number.isFinite(numeric)?numeric:null;
};

interface RowGroupWindow {file:Awaited<ReturnType<typeof asyncBufferFromUrl>>;
  metadata:Awaited<ReturnType<typeof parquetMetadataAsync>>; start:number; end:number}

/** Which row groups can hold a point inside the box, by their recorded bounding boxes.
 *
 *  Overture's `bbox` columns are 32-bit, so they bracket the true coordinate rather than equal it:
 *  measured, only 0.12% of places have a degenerate bbox. That makes them sound for *selecting*
 *  row groups and unsound for reading coordinates, which come from the geometry. Using bbox as the
 *  coordinate would be wrong by a rounding error everywhere, which is the kind of wrong that never
 *  gets noticed. */
function overlappingWindows(metadata:RowGroupWindow['metadata'],box:readonly [number,number,number,number]){
  const windows:{start:number;end:number}[]=[];
  let offset=0, groups=0;
  for(const group of metadata.row_groups){
    const rows=Number(group.num_rows);
    const bounds:Record<string,{min:number|null;max:number|null}>={};
    for(const column of group.columns){
      const path=(column.meta_data?.path_in_schema||[]).join('.');
      if(!path.startsWith('bbox.'))continue;
      bounds[path.slice(5)]={min:statistic(column.meta_data?.statistics?.min_value),
        max:statistic(column.meta_data?.statistics?.max_value)};
    }
    const {xmin,xmax,ymin,ymax}=bounds;
    const known=xmin?.min!==null&&xmax?.max!==null&&ymin?.min!==null&&ymax?.max!==null;
    // Without statistics the group cannot be excluded, so it is kept: missing a region is worse
    // than reading more than needed.
    if(!known||(xmax!.max!>=box[0]&&xmin!.min!<=box[2]&&ymax!.max!>=box[1]&&ymin!.min!<=box[3]))
      windows.push({start:offset,end:offset+rows});
    offset+=rows;groups++;
  }
  return {windows,groups};
}

export interface OvertureReadOptions {
  bounds:readonly [number,number,number,number];
  minConfidence?:number;
  release?:string;
  fetcher?:typeof fetch;
  onProgress?:(message:string)=>void;
  maxRows?:number;
}

export async function readOverturePlaces(
  options:OvertureReadOptions,
):Promise<{records:OverturePlaceRecord[];scan:OvertureScan}>{
  const fetcher=options.fetcher??fetch;
  const box=options.bounds;
  const minConfidence=options.minConfidence??OVERTURE_DEFAULT_CONFIDENCE;
  const maxRows=options.maxRows??400_000;
  const progress=options.onProgress??(()=>{});
  const release=options.release||await latestOvertureRelease(fetcher);
  progress(`Overture ${release}: listing files…`);
  const parts=await listOverturePlaceParts(release,fetcher);

  // The footers are the slow step and are independent of each other, so they are read at once.
  // Sequentially this took about 22 seconds; there is no reason a practitioner should wait that.
  progress(`Reading ${parts.length} file indexes…`);
  const scanned=await Promise.all(parts.map(async url=>{
    const file=await asyncBufferFromUrl({url,fetch:fetcher});
    const metadata=await parquetMetadataAsync(file);
    const {windows,groups}=overlappingWindows(metadata,box);
    return {file,metadata,windows,groups};
  }));

  const rowGroups=scanned.reduce((total,part)=>total+part.groups,0);
  const rowGroupsRead=scanned.reduce((total,part)=>total+part.windows.length,0);
  const rowsRead=scanned.reduce((total,part)=>
    total+part.windows.reduce((rows,window)=>rows+(window.end-window.start),0),0);
  if(rowsRead>maxRows)throw new Error(
    `That study area covers ${rowsRead.toLocaleString()} Overture records, over the ${maxRows.toLocaleString()} this reads at once. Use a smaller area.`);

  progress(`Reading ${rowsRead.toLocaleString()} places from ${rowGroupsRead} of ${rowGroups} indexes…`);
  const records:OverturePlaceRecord[]=[];
  let belowConfidence=0,unmappedCategory=0;
  for(const part of scanned)for(const window of part.windows){
    const rows=await parquetReadObjects({file:part.file,metadata:part.metadata,compressors,
      columns:['id','names','basic_category','confidence','geometry'],
      rowStart:window.start,rowEnd:window.end}) as Record<string,unknown>[];
    for(const row of rows){
      const geometry=row.geometry as {type?:string;coordinates?:unknown}|undefined;
      if(geometry?.type!=='Point'||!Array.isArray(geometry.coordinates))continue;
      const [x,y]=geometry.coordinates as number[];
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      // The row group only brackets the area; each point is still checked against it.
      if(x<box[0]||x>box[2]||y<box[1]||y>box[3])continue;
      const category=typeof row.basic_category==='string'?row.basic_category:'';
      const kind=OVERTURE_CATEGORY_KINDS[category];
      if(!kind){if(/health|clinic|hospital|medic|pharmac|dental|nurs/.test(category))unmappedCategory++;continue;}
      const confidence=Number(row.confidence);
      if(!Number.isFinite(confidence)||confidence<minConfidence){belowConfidence++;continue;}
      const names=row.names as {primary?:unknown}|undefined;
      const name=typeof names?.primary==='string'?names.primary.trim():'';
      records.push({id:String(row.id||`overture-${records.length+1}`),
        properties:{name,kind,confidence:Math.round(confidence*100)/100,sourceCategory:category},
        geometry:{type:'Point',coordinates:[x,y]}});
    }
  }
  return {records,scan:{release,parts:parts.length,rowGroups,rowGroupsRead,rowsRead,
    belowConfidence,unmappedCategory}};
}
