import catalogue from '../widgets/grid3-catalogue.json';

/** GRID3'S POPULATION ESTIMATES, BESIDE WORLDPOP (TODO 24; the practitioner, 2026-11-10: "For raster input I thought we
 *  included GRID3, GHSL, etc. for population rasters"). One 2025 file per country of sub-Saharan Africa, about 100 m,
 *  served like WorldPop's with no CORS header: this application names the file and the browser downloads it.
 *  Taken by scripts/grid3-catalogue.mjs from the directory listing and each file's headers. */
interface Grid3Country {iso3:string; url:string; bytes?:number}
const CATALOGUE=catalogue as unknown as {takenAt:string; product:string; licence:string; citation:string; readme:string; note:string; countries:Grid3Country[]};

export const GRID3_TAKEN=CATALOGUE.takenAt;
export const GRID3_PRODUCT=CATALOGUE.product;
export const GRID3_LICENCE=CATALOGUE.licence;
export const GRID3_CITATION=CATALOGUE.citation;
export const GRID3_NOTE=CATALOGUE.note;
export const GRID3_README=CATALOGUE.readme;
/** The country's file, or null where GRID3 publishes none: outside sub-Saharan Africa, which is said, not guessed round. */
export const grid3RasterFor=(iso3:string|null):Grid3Country|null=>iso3?CATALOGUE.countries.find(c=>c.iso3===iso3)??null:null;
export const GRID3_COUNTRIES=CATALOGUE.countries.length;
/** WHICH GRID3 FILE THIS IS, from its name as the catalogue gives it (2026-11-13), and its source record: as for WorldPop's,
 *  the file Fieldwork pointed to, chosen from disk under that name, has its record filled in for the practitioner to keep or
 *  change. Its URL writes a space as %20; the file on disk has the space. */
export function grid3RecordFor(filename:string,countryName:(iso3:string)=>string=iso3=>iso3):import('./raster-provenance.js').RasterProvenance|undefined{
  const name=filename.split('/').pop()!.toLowerCase();
  const found=CATALOGUE.countries.find(c=>decodeURIComponent(c.url.split('/').pop()!).toLowerCase()===name);
  return found?{title:`${countryName(found.iso3)} population, 2025, ${CATALOGUE.product}`,provider:'GRID3 and WorldPop, University of Southampton',
    downloadURL:found.url,license:CATALOGUE.licence,citation:CATALOGUE.citation,temporalCoverage:'2025',units:'people per pixel'}:undefined;
}
