import catalogue from '../widgets/worldpop-catalogue.json';
import type {Boundary,BoundaryProvenance} from './types.js';

/** WHICH POPULATION RASTER COVERS THIS STUDY AREA.
 *
 *  The same shape as the Geofabrik extract catalogue, and for the same reason: WorldPop serves
 *  neither its index nor its files with an Access-Control-Allow-Origin header, so this
 *  application works out WHICH file and the browser fetches it. Measured 2026-10-22: the server
 *  also ignores a Range request and begins sending the whole file, so partial reads over the
 *  network are not available even in principle -- downloading to this device is the only route,
 *  which is what the raster widget already reads from.
 *
 *  The country comes from the study area's own provenance. A boundary acquired from
 *  geoBoundaries carries `boundaryID` of the form COD-ADM2-63176286, whose first three
 *  characters are the ISO3 WorldPop is keyed by. A polygon somebody drew carries no such claim,
 *  and this returns nothing rather than guessing a country from coordinates: a population
 *  denominator attributed to the wrong country is worse than no denominator. */
export interface PopulationRaster {iso3:string; year:string; url:string; bytes?:number}
interface CatalogueCountry {iso3:string; years:string[]; latest:string; bytes?:number}
const CATALOGUE=catalogue as unknown as {
  takenAt:string; source:string; licence:string; countries:CatalogueCountry[]};

export const WORLDPOP_TAKEN=CATALOGUE.takenAt;
export const WORLDPOP_LICENCE=CATALOGUE.licence;

export const fileFor=(iso3:string,year:string):string=>
  `https://data.worldpop.org/GIS/Population/Global_2000_2020/${year}/${iso3}/${iso3.toLowerCase()}_ppp_${year}.tif`;

/** The ISO3 a study area states it belongs to, or null if it does not state one. */
export function iso3Of(provenance?:BoundaryProvenance|null):string|null{
  // THE WHOLE SHAPE, not the first three characters. Taking a prefix turned "drawn-by-hand"
  // into the country "DRA" -- a denominator attributed to a country that does not exist, and
  // nothing downstream would have shown it. geoBoundaries identifiers are ISO3-ADM<level>-<id>,
  // so that is what is required before a country is claimed.
  const match=/^([A-Za-z]{3})-ADM\d/.exec(provenance?.boundaryID||'');
  return match?match[1].toUpperCase():null;
}

/** Every year published for that country, newest first. */
export function populationRastersFor(provenance?:BoundaryProvenance|null):PopulationRaster[]{
  const iso3=iso3Of(provenance);
  if(!iso3)return [];
  const country=CATALOGUE.countries.find(c=>c.iso3===iso3);
  if(!country)return [];
  return [...country.years].reverse().map(year=>({
    iso3,year,url:fileFor(iso3,year),
    ...(year===country.latest&&country.bytes?{bytes:country.bytes}:{}),
  }));
}

/** Unused for now, kept so the module never tempts anyone to guess a country from a polygon. */
export const neverGuessCountryFrom=(_boundary:Boundary):null=>null;
