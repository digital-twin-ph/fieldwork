// EXPERIMENT 227'S CHECK (2026-11-21). node scripts/zarr-point-spike-check.mjs <a Planetary Computer STAC search for the same scene, saved as JSON>
// THE CHECK: the same five pixels from Planetary Computer's Cloud-Optimised GeoTIFFs of the same scene (baseline 05.13).
import {fromUrl} from 'geotiff';
import proj4 from 'proj4';
import {readFileSync} from 'node:fs';
const item=JSON.parse(readFileSync(process.argv[2],'utf8')).features[0];
const {token}=await (await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a')).json();
const to=proj4('EPSG:4326','+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs');
const PLACES=[['Müggelberge (forest)',13.630,52.415],['Köpenick old town',13.577,52.445],['Farmland near Strausberg',13.950,52.590],
  ['Strausberg town centre',13.880,52.578],['Müggelsee (lake)',13.645,52.437]];
const img={};for(const b of ['B04','B08'])img[b]=await (await fromUrl(`${item.assets[b].href}?${token}`)).getImage();
const read=async(b,lon,lat)=>{const im=img[b],[x,y]=to.forward([lon,lat]),[ox,oy]=im.getOrigin(),[rx,ry]=im.getResolution();
  const c=Math.floor((x-ox)/rx),r=Math.floor((y-oy)/ry);const [v]=await im.readRasters({window:[c,r,c+1,r+1]});return v[0]/10000-0.1;};
for(const [name,lon,lat] of PLACES){const red=await read('B04',lon,lat),nir=await read('B08',lon,lat);
  console.log(`${name}: red ${red.toFixed(4)}, near-infrared ${nir.toFixed(4)}, NDVI ${((nir-red)/(nir+red)).toFixed(3)}`);}
