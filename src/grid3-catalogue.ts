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
