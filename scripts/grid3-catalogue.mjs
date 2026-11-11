// Takes widgets/grid3-catalogue.json: GRID3's gridded 2025 population estimates for sub-Saharan Africa, one GeoTIFF per
// country (TODO 24, 2026-11-11). Reads the directory listing and each file's headers only; downloads nothing.
//
//   node scripts/grid3-catalogue.mjs
import {writeFile} from 'node:fs/promises';
const BASE='https://data.worldpop.org/repo/wopr/_MULT/population/GRID3_SSA2025/GRID3_SSA_pop_estimates_V1_0/';
const listing=await (await fetch(BASE)).text();
const files=[...new Set([...listing.matchAll(/href="([a-z]{3})_SSApopulation_%202025_v1_0_gridded\.tif"/g)].map(m=>m[1]))].sort();
const countries=[];
for(const iso of files){
  const url=`${BASE}${iso}_SSApopulation_%202025_v1_0_gridded.tif`;
  const head=await fetch(url,{method:'HEAD'});
  const bytes=Number(head.headers.get('content-length'));
  countries.push({iso3:iso.toUpperCase(),url,...(Number.isFinite(bytes)&&bytes>0?{bytes}:{})});
}
const catalogue={schema:'fieldwork/grid3-catalogue/1',takenAt:new Date().toISOString().slice(0,10),source:BASE,
  product:'Gridded 2025 population estimates for sub-Saharan Africa constrained to GRID3 settlement extents, version 1.0',
  licence:'GRID3 and WorldPop, University of Southampton. CC BY 4.0.',
  citation:'Gadiaga A., Krishnaveni K.S., Bonnie A., Chamberlain H., Bondarenko M., Lazar A.N., Tatem A.J. 2025. Gridded 2025 population estimates for sub-Saharan Africa constrained to GRID3 settlement extents. WorldPop, University of Southampton, UK. doi:10.5258/SOTON/WP00851',
  readme:`${BASE.replace(/GRID3_SSA_pop_estimates_V1_0\/$/,'')}0_GRID3_SSA_population_v1_0_README.pdf`,
  note:'Top-down: national projections spread by a random-forest model over settled cells, 3 arc-seconds (about 100 m). '
    +'Not official government statistics. No uncertainty layer. Unsettled cells are empty; 0 means an area whose census total was zero. '
    +'For Nigeria and the Democratic Republic of the Congo, GRID3 says its country-specific estimates suit single-country use better.',
  countries};
await writeFile('widgets/grid3-catalogue.json',JSON.stringify(catalogue,null,2)+'\n');
console.log(`${countries.length} countries, ${countries.filter(c=>c.bytes).length} with sizes, taken ${catalogue.takenAt}`);
