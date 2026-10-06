import type {SpatialReference} from './types.js';
import {isRecord} from './guards.js';
export const defaultSpatialReference=():SpatialReference=>({datum:'WGS84',geodeticCRS:'EPSG:4326',geometryCRS:'OGC:CRS84',axisOrder:'longitude-latitude',units:'degree'});
export function validateSpatialReference(reference:unknown):SpatialReference{
  const expected=defaultSpatialReference();
  if(!isRecord(reference)||Object.keys(reference).length!==Object.keys(expected).length||Object.entries(expected).some(([key,value])=>reference[key]!==value))throw new Error('This prototype requires WGS84 geographic coordinates in longitude/latitude order (OGC:CRS84). Reprojection is not implemented; changing a CRS label does not transform coordinates.');
  return structuredClone(reference) as unknown as SpatialReference;
}
