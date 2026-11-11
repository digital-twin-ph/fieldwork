// Prepares assets/natural-earth-110m-countries.json from Natural Earth's 1:110m country polygons (experiment 204).
//
//   node scripts/prepare-natural-earth-countries.mjs <ne_110m_admin_0_countries.geojson> [out]
//
// Kept: an ISO3 code (ISO_A3, else ISO_A3_EH, else ADM0_A3: France, Norway, Kosovo, Northern Cyprus and Somaliland carry
// -99 in ISO_A3), the name, and the outline to 0.001 degree. Used ONLY to propose which countries a study area may touch;
// the share is measured on geoBoundaries' outlines and the person confirms.
import {readFileSync,writeFileSync} from 'node:fs';
const [source,out='assets/natural-earth-110m-countries.json']=process.argv.slice(2);
if(!source)throw new Error('Give the path of ne_110m_admin_0_countries.geojson.');
const ne=JSON.parse(readFileSync(source,'utf8'));
const r=c=>[Math.round(c[0]*1000)/1000,Math.round(c[1]*1000)/1000];
const code=p=>[p.ISO_A3,p.ISO_A3_EH,p.ADM0_A3].find(c=>c&&c!=='-99');
const countries=ne.features.map(f=>{
  const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  return {iso:code(f.properties),name:f.properties.NAME,polygons:polys.map(poly=>poly.map(ring=>ring.map(r)))};
}).sort((a,b)=>a.iso.localeCompare(b.iso));
writeFileSync(out,JSON.stringify({schema:'fieldwork/natural-earth-countries/1',scale:'1:110m',source:'https://github.com/nvkelso/natural-earth-vector',
  version:'5.1.2',file:'geojson/ne_110m_admin_0_countries.geojson',licence:'Public domain. Natural Earth states no restrictions on use.',
  notForFraming:'Generalised to about 10 km, and disputed lines are a cartographic choice. Used only to suggest which countries a study area may touch; never to measure, join or report.',
  kept:'ISO3 (ISO_A3, else ISO_A3_EH, else ADM0_A3), NAME, and the outline to 0.001 degree.',countries}));
console.log(`${countries.length} countries written to ${out}`);
