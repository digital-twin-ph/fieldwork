#!/usr/bin/env node
/** Builds the bundled Natural Earth context layer from the published 1:110m data.
 *
 *  WHY IT IS BUNDLED AT ALL. Natural Earth is public domain -- no attribution obligation and, the
 *  part that matters here, no share-alike, unlike the ODbL that follows OpenStreetMap-derived
 *  data. Experiment 52 measured it in 2026-10-08 and concluded "PMTiles for interactive
 *  navigation, Natural Earth for static figures", and it is the only basemap class in that record
 *  that may simply ship with the application. A figure drawn on it carries its own ground and
 *  needs no network at all, which is the offline promise this project is built around.
 *
 *  WHY 1:110m AND WHY THAT IS A LIMIT RATHER THAN A SETTING. The three Natural Earth scales are
 *  intended display scales, not quality tiers, and using the wrong one is experiment 51's
 *  "resolution read as precision" error in cartographic form. 1:110m lines are displaced by
 *  kilometres. Measured against a study area's own breadth, that is 0.2% of southern Africa,
 *  4% of Greater London and 200% of Soho -- so the application offers this basemap only where
 *  the extent is at least about 50 km across, which is where the displacement falls under about
 *  a twentieth of what is drawn. Below that it is not a coarser basemap, it is a wrong one.
 *
 *  COORDINATES ARE ROUNDED TO 2 DECIMAL PLACES, about 1.1 km at the equator. That is finer than
 *  the data's own generalisation and coarser than its stored precision, which is the honest place
 *  to sit: storing six decimals of a line that is accurate to two kilometres is precision the
 *  data does not have, and it triples the bytes to say it.
 *
 *  Usage: node scripts/prepare-natural-earth.mjs <directory of downloaded geojson>
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const SOURCE='https://github.com/nvkelso/natural-earth-vector';
const VERSION='5.1.1';
const LAYERS=[
  {id:'land',file:'ne_110m_land.json',kind:'fill',
    says:'Land, as a filled area. Everything outside it is water.'},
  {id:'lakes',file:'ne_110m_lakes.json',kind:'fill',
    says:'Major lakes, filled as water over the land.'},
  {id:'countries',file:'ne_110m_admin_0_boundary_lines_land.json',kind:'line',
    says:'International boundaries on land. A cartographic rendering of disputed lines, not an adjudication of them.'},
  {id:'provinces',file:'ne_110m_admin_1_states_provinces_lines.json',kind:'line',
    says:'First-level administrative boundaries, where Natural Earth carries them.'},
];

const PLACES=2;
const round=(n)=>Math.round(n*10**PLACES)/10**PLACES;
/** Rounds in place and drops a point that became identical to the one before it. */
function simplify(coords){
  if(typeof coords[0]==='number')return coords.slice(0,2).map(round);
  const out=coords.map(simplify);
  if(typeof coords[0][0]==='number'){
    const kept=out.filter((p,i)=>i===0||p[0]!==out[i-1][0]||p[1]!==out[i-1][1]);
    return kept.length>=2?kept:out;
  }
  return out;
}

const dir=process.argv[2];
if(!dir)throw new Error('Usage: node scripts/prepare-natural-earth.mjs <directory of downloaded geojson>');

const layers=[];
for(const layer of LAYERS){
  const raw=JSON.parse(await readFile(join(dir,layer.file),'utf8'));
  // Geometry only. Natural Earth's attributes carry names, codes and rankings this draws none of,
  // and a context layer that shipped country names would invite reading them as the frame -- the
  // one thing experiment 52 says these boundaries must never be.
  const geometries=raw.features.map(f=>({type:f.geometry.type,coordinates:simplify(f.geometry.coordinates)}));
  layers.push({id:layer.id,kind:layer.kind,says:layer.says,count:geometries.length,geometries});
}

const asset={
  schema:'fieldwork/natural-earth/1',
  scale:'1:110m',
  source:SOURCE,version:VERSION,
  licence:'Public domain. Natural Earth states no restrictions on use.',
  preparedBy:'scripts/prepare-natural-earth.mjs',
  coordinatePrecision:{decimalPlaces:PLACES,approxMetres:1100,
    says:'Rounded to match the data\'s own generalisation, which is kilometres. Not a measurement precision.'},
  notForFraming:'Context only. These boundaries are generalised and disputed lines are a cartographic choice, '
    +'so joining data to them, computing areas from them or reporting results by them produces wrong answers '
    +'that look professional. The frame class is a study area the practitioner supplies.',
  layers};

const json=JSON.stringify(asset);
await writeFile('assets/natural-earth-110m.json',json+'\n');
const digest=createHash('sha256').update(json+'\n').digest('hex');
console.log(`assets/natural-earth-110m.json  ${json.length.toLocaleString()} bytes  sha256 ${digest}`);
for(const l of layers)console.log(`  ${l.id.padEnd(10)} ${l.kind.padEnd(5)} ${String(l.count).padStart(5)} geometries`);
