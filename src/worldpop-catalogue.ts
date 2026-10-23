import catalogue from '../widgets/worldpop-catalogue.json';
import type {Boundary,BoundaryProvenance} from './types.js';
import {iso3Of} from './boundary-source.js';

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
  takenAt:string; source:string; licence:string; observedBytesPerSecond:number;
  countries:CatalogueCountry[]};

export const WORLDPOP_TAKEN=CATALOGUE.takenAt;
export const WORLDPOP_LICENCE=CATALOGUE.licence;
export const WORLDPOP_BYTES_PER_SECOND=CATALOGUE.observedBytesPerSecond;

/** HOW LONG THE PRACTITIONER IS COMMITTING TO, before they commit to it.
 *
 *  The practitioner, 2026-10-23: *"The Worldpop raster download is quite slow, e.g., more than 1
 *  hour for Botswana. We should warn the user to make sure not to shut down or reboot the laptop
 *  during that period."* A warning that says "this is slow" tells them nothing they cannot already
 *  see; the catalogue holds every file's size, so it can say how long THIS one takes. Botswana is
 *  293 MB and an hour. The Democratic Republic of the Congo, which is the country being asked
 *  about this month, is 1.18 GB -- about four hours, and nothing in the panel said so.
 *
 *  Rounded coarsely on purpose. The rate is one observation on one link, so minutes of precision
 *  would be false precision about a number that could be out by a factor of two. */
export const downloadWait=(bytes:number):string=>{
  const minutes=bytes/WORLDPOP_BYTES_PER_SECOND/60;
  if(minutes<90)return `${Math.max(5,Math.round(minutes/5)*5)} minutes`;
  const hours=minutes/60;
  return `${hours<3?hours.toFixed(1):Math.round(hours)} hours`;
};

export const fileFor=(iso3:string,year:string):string=>
  `https://data.worldpop.org/GIS/Population/Global_2000_2020/${year}/${iso3}/${iso3.toLowerCase()}_ppp_${year}.tif`;

export {iso3Of} from './boundary-source.js';

/** Every year published for a country, newest first. */
export function populationRastersForCountry(iso3:string|null):PopulationRaster[]{
  if(!iso3)return [];
  const country=CATALOGUE.countries.find(c=>c.iso3===iso3);
  if(!country)return [];
  return [...country.years].reverse().map(year=>({
    iso3,year,url:fileFor(iso3,year),
    ...(year===country.latest&&country.bytes?{bytes:country.bytes}:{}),
  }));
}

/** The same, for a study area that states which country it is in. */
export const populationRastersFor=(provenance?:BoundaryProvenance|null):PopulationRaster[]=>
  populationRastersForCountry(iso3Of(provenance));

/** Unused for now, kept so the module never tempts anyone to guess a country from a polygon. */
export const neverGuessCountryFrom=(_boundary:Boundary):null=>null;
