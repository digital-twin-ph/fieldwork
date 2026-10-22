/** The published-extract catalogue, taken once and shipped.
 *
 *  Geofabrik publishes a machine-readable index of every region it serves, and serves neither the
 *  index nor the files with an `Access-Control-Allow-Origin` header — so this application cannot
 *  read either at run time, and a practitioner was left to find a URL by hand. The index is read
 *  HERE, at build time, and reduced to what the widget needs: a region's name, its ISO codes and
 *  the URL of its `.osm.pbf`.
 *
 *  What is shipped is therefore a DATED SNAPSHOT of somebody else's catalogue. Regions are added
 *  and renamed; the file sizes change daily. The widget says so rather than implying this is live.
 *
 *  Usage: node scripts/geofabrik-catalogue.mjs            (check it is current)
 *         node scripts/geofabrik-catalogue.mjs --write    (take a new snapshot)
 */
import {readFileSync,writeFileSync} from 'node:fs';

const INDEX='https://download.geofabrik.de/index-v1.json';
const OUT=new URL('../widgets/extract-catalogue.json',import.meta.url).pathname;
const write=process.argv.includes('--write');

const existing=(()=>{try{return JSON.parse(readFileSync(OUT,'utf8'));}catch{return null;}})();
if(!write){
  if(!existing){console.error('widgets/extract-catalogue.json is missing. Run with --write.');process.exit(1);}
  console.log(`Published extracts: ${existing.regions.length} regions, snapshot taken ${existing.takenAt} from ${existing.source}.`);
  process.exit(0);
}

const response=await fetch(INDEX);
if(!response.ok)throw new Error(`Geofabrik's index answered HTTP ${response.status}.`);
const index=await response.json();
// The index is GeoJSON, so each region carries its own outline. Keeping the BOUNDING BOX of that
// outline is what lets the widget offer the extracts that cover a study area without knowing any
// country codes -- and it finds the SMALLER ones first where a country publishes them, which is
// the difference between a 400 MB file and a 40 MB one.
const bboxOf=geometry=>{
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  const walk=coordinates=>{
    if(typeof coordinates[0]==='number'){
      const [lon,lat]=coordinates;
      if(lon<west)west=lon;if(lon>east)east=lon;
      if(lat<south)south=lat;if(lat>north)north=lat;
      return;
    }
    for(const part of coordinates)walk(part);
  };
  if(!geometry)return null;
  walk(geometry.coordinates);
  return Number.isFinite(west)?[+west.toFixed(4),+south.toFixed(4),+east.toFixed(4),+north.toFixed(4)]:null;
};
const regions=index.features
  .filter(feature=>feature.properties?.urls?.pbf)
  .map(feature=>({
    id:feature.properties.id,
    name:feature.properties.name,
    parent:feature.properties.parent??null,
    // A region may cover several countries, or none (a continent).
    iso:(feature.properties['iso3166-1:alpha2']??[]).concat(feature.properties['iso3166-2']??[]),
    bbox:bboxOf(feature.geometry),
    pbf:feature.properties.urls.pbf,
  }))
  .filter(region=>region.bbox)
  .sort((a,b)=>a.id.localeCompare(b.id));

writeFileSync(OUT,JSON.stringify({
  schema:'fieldwork/extract-catalogue/1',
  note:'A dated snapshot of Geofabrik\'s own index of published OpenStreetMap extracts, taken at '
    +'build time because the index is not served with CORS and this application cannot read it at '
    +'run time. Regions are added and renamed and the files change daily: this says which extracts '
    +'exist and where, not what is in them or how large they are today. The data is OpenStreetMap, '
    +'ODbL 1.0, processed and published by Geofabrik GmbH.',
  source:INDEX,
  takenAt:new Date().toISOString().slice(0,10),
  regions,
},null,1)+'\n');
console.log(`Published extracts: wrote ${regions.length} regions from ${INDEX}, each with the `
  +`bounding box of its own outline so a study area can be matched to it without a country code.`);
