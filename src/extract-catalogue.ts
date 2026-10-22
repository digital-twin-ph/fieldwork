import catalogue from '../widgets/extract-catalogue.json';
import type {Boundary} from './types.js';
import {geometryBounds} from './study-area.js';

/** WHERE TO GET AN EXTRACT, without leaving the application to look for one.
 *
 *  The practitioner, 2026-10-22: *"The download succeeding is very important. As I have been
 *  trying to do for the last few days."* Two different downloads were being conflated. Overpass
 *  serving a province in one response is the hard one. The other is a published file on a host
 *  built to serve it — and all that was missing was knowing which file, which this answers.
 *
 *  Geofabrik serves neither its index nor its files with `Access-Control-Allow-Origin`, so this
 *  application cannot fetch either: the catalogue is a dated build-time snapshot, and the download
 *  is the browser's own, started by a link. Nothing passes through fieldwork, which is also why it
 *  lands on the practitioner's computer and stays there. */
export interface ExtractRegion {
  id:string; name:string; parent:string|null; iso:string[];
  bbox:[number,number,number,number]; pbf:string;
}
const CATALOGUE=catalogue as unknown as {takenAt:string;source:string;regions:ExtractRegion[]};
export const EXTRACT_CATALOGUE_TAKEN=CATALOGUE.takenAt;
export const EXTRACT_CATALOGUE_SOURCE=CATALOGUE.source;
export const EXTRACT_REGIONS=CATALOGUE.regions;

const area=(b:readonly number[]):number=>(b[2]-b[0])*(b[3]-b[1]);

/** The published extracts that cover a study area, smallest first.
 *
 *  Containment of the whole area, not of a point: a point near a border sits inside the
 *  neighbouring country's bounding box, and Ituri would be offered Uganda. And a region whose box
 *  spans the globe is an antimeridian artefact -- Kiribati's outline crosses 180° and its bounding
 *  box therefore covers the Earth -- so it is excluded rather than offered for a province in the
 *  Congo. */
export function extractsFor(boundary:Boundary,limit=3):ExtractRegion[]{
  const bounds=geometryBounds(boundary);
  const [west,south,east,north]=[bounds[0],bounds[1],bounds[2],bounds[3]];
  return EXTRACT_REGIONS
    .filter(region=>{
      const [w,s,e,n]=region.bbox;
      // A region whose outline crosses 180° has a bounding box spanning the Earth: Kiribati's
      // covers both hemispheres, and American Oceania's most of the Pacific. Offering either for a
      // province in the Congo is worse than offering nothing.
      if(e-w>180)return false;
      return w<=west&&s<=south&&e>=east&&n>=north;
    })
    .sort((a,b)=>area(a.bbox)-area(b.bbox))
    .slice(0,limit);
}
