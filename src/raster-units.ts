import type {RasterAsset} from './raster.js';
import {worldPopRecordFor} from './worldpop-catalogue.js';
import {grid3RecordFor} from './grid3-catalogue.js';
import {ghsRecordFor} from './ghs-pop.js';

/** A RASTER'S UNIT, AND WHERE IT WAS FOUND: one rule for the Inspector and for Map (2026-11-17), in this order. The source
 *  record, as the person wrote it or a catalogue filled it; then the publisher's record for a file recognised by its name,
 *  for a raster kept before Fieldwork recognised WorldPop's, GRID3's and GHS-POP's files (2026-11-13: "no idea what the
 *  raster is giving me"); then the file's own band tag. None: undefined, and the unit is said not to be stated. */
export function rasterUnitsOf(asset:RasterAsset):{units:string;from:string}|undefined{
  const stated=asset.provenance?.units?.trim();if(stated)return {units:stated,from:'its source record'};
  const known=worldPopRecordFor(asset.source.filename)??grid3RecordFor(asset.source.filename)??ghsRecordFor(asset.source.filename);
  if(known?.units)return {units:known.units,from:`${known.provider?.split(' - ')[0]??'its publisher'}’s record for this file, recognised by its name,`};
  const tags={...(asset.source.metadata.gdal??{}),...(asset.source.metadata.band??{})} as Record<string,unknown>;
  const key=Object.keys(tags).find(k=>/^units?$/i.test(k));
  const tagged=key?String(tags[key]??'').trim():'';
  return tagged?{units:tagged,from:'the file’s band tag'}:undefined;
}
