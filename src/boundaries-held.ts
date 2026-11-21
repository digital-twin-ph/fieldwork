/** BOUNDARIES HELD IN digital-twin-ph/boundaries, READ BEFORE geoBoundaries IS ASKED (2026-11-20). The practitioner: *"Should
 *  we offer to save geoboundaries based study areas to be kind to the API?"*, then *"We may have to precalculate or precache
 *  country boundaries the way we do census tables"*. A level held there is geoBoundaries' own description and features,
 *  unchanged, cut into parts of at most 1 MB; the picker reads it at the commit this version pins, each file checked
 *  against its digest and kept on this device, so a second choice of it needs no network. A level not held is asked of
 *  geoBoundaries as before. */
import catalogue from '../examples/boundaries/catalogue.json';
import {fetchOrDeviceCopy} from './remote-table.js';

interface PinnedFile {path:string;bytes:number;sha256:string}
export interface HeldLevel {iso:string;adm:string;boundaryID:string;level:PinnedFile;parts:PinnedFile[]}
export const HELD=catalogue as {repository:string;commit:string;raw:string;levels:HeldLevel[]};

export const heldLevel=(iso:string,adm:string):HeldLevel|undefined=>HELD.levels.find(l=>l.iso===iso&&l.adm===adm);
/** Where the held level's parts are, for the study area's record of where its shapes came from. */
export const heldPartsUrl=(held:HeldLevel)=>`${HELD.raw}${held.iso}/${held.adm}/parts/`;

async function pinned(file:PinnedFile):Promise<string>{
  const got=await fetchOrDeviceCopy(HELD.raw+file.path,{fresh:false});
  if(got.digest!==file.sha256)throw new Error(`${file.path} is not the file Fieldwork pinned: its digest differs.`);
  return new TextDecoder().decode(got.bytes);
}
/** The level's description, as geoBoundaries' API gave it. */
export const heldDescription=async(held:HeldLevel):Promise<unknown>=>JSON.parse(await pinned(held.level));
/** Every part's features in one collection, the parts read in order; `progress` is told the bytes read so far. */
export async function heldShapes(held:HeldLevel,progress:(read:number,total:number)=>void):Promise<string>{
  const total=held.parts.reduce((n,p)=>n+p.bytes,0);let read=0;
  const features:unknown[]=[];
  for(const part of held.parts){
    const collection=JSON.parse(await pinned(part)) as {features?:unknown[]};
    features.push(...(collection.features??[]));
    read+=part.bytes;progress(read,total);
  }
  return JSON.stringify({type:'FeatureCollection',features});
}
