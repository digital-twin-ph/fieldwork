#!/usr/bin/env node
// WHICH POPULATION RASTER COVERS THIS STUDY AREA, snapshotted at build time for the same reason
// the Geofabrik catalogue is: data.worldpop.org and hub.worldpop.org both answer without an
// Access-Control-Allow-Origin header, so this application may neither read the index nor fetch a
// file. The browser can do both, and the download then lands on the practitioner's computer.
//
// The index is one request -- 5,221 datasets across 249 countries -- but it does not carry file
// URLs, so those come from the published path pattern, verified 2026-10-22 against COD (1,184 MB),
// BWA (293 MB), KEN (312 MB) and NGA (495 MB). Sizes are read with HEAD for the most recent year
// only: a practitioner about to spend a gigabyte should be told so, and 249 requests is a
// build-time cost rather than theirs.
import {writeFile} from 'node:fs/promises';

const INDEX='https://hub.worldpop.org/rest/data/pop/wpgp';
const fileFor=(iso3,year)=>
  `https://data.worldpop.org/GIS/Population/Global_2000_2020/${year}/${iso3}/${iso3.toLowerCase()}_ppp_${year}.tif`;

const response=await fetch(INDEX);
if(!response.ok)throw new Error(`WorldPop index: HTTP ${response.status}`);
const rows=(await response.json()).data||[];
const byCountry=new Map();
for(const row of rows){
  const iso3=String(row.iso3||'').toUpperCase(),year=String(row.popyear||'');
  if(!/^[A-Z]{3}$/.test(iso3)||!/^\d{4}$/.test(year))continue;
  if(!byCountry.has(iso3))byCountry.set(iso3,{iso3,years:[]});
  byCountry.get(iso3).years.push(year);
}
for(const country of byCountry.values())country.years=[...new Set(country.years)].sort();

// FOUR AT A TIME, NOT 249. Asking for every size at once got 21 answers out of 249: the host
// is a donated service and a burst of requests is how a client turns politeness into failure,
// which is the same lesson the Overpass pause encodes. Four at a time, one retry each, and a
// size that still will not come is simply not stated.
const latest=[...byCountry.values()];
for(const country of latest)country.latest=country.years[country.years.length-1];
let sized=0;
const queue=[...latest];
const headOnce=async country=>{
  const response=await fetch(fileFor(country.iso3,country.latest),{method:'HEAD'});
  const bytes=Number(response.headers.get('content-length'))||0;
  if(response.ok&&bytes>0){country.bytes=bytes;sized++;return true;}
  return false;
};
await Promise.all(Array.from({length:4},async()=>{
  for(let country=queue.shift();country;country=queue.shift()){
    try{if(await headOnce(country))continue;}catch{/* fall through to one retry */}
    await new Promise(resolve=>setTimeout(resolve,500));
    try{await headOnce(country);}catch{/* a size we could not read is a size we do not state */}
  }
}));

await writeFile('widgets/worldpop-catalogue.json',JSON.stringify({
  schema:'fieldwork/worldpop-catalogue/1',
  takenAt:new Date().toISOString().slice(0,10),
  source:INDEX,
  pathPattern:'https://data.worldpop.org/GIS/Population/Global_2000_2020/{year}/{ISO3}/{iso3}_ppp_{year}.tif',
  licence:'WorldPop, University of Southampton. CC BY 4.0.',
  note:'Unconstrained global population, 100 m. Sizes are for the most recent year only, read with HEAD at snapshot time; a year without a size is offered without one rather than with a guess.',
  countries:[...byCountry.values()].sort((a,b)=>a.iso3.localeCompare(b.iso3)),
},null,2)+'\n');
console.log(`Population rasters: ${byCountry.size} countries, ${rows.length} datasets, `
  +`${sized} sizes measured; snapshot taken from ${INDEX}.`);
