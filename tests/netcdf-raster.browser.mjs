import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {fromArrayBuffer} from 'geotiff';
// The bytes of a file, alone: a Node Buffer can be a view on a shared pool, and its .buffer then holds other bytes too.
const bytesOf=path=>{const b=readFileSync(path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

// "Can NetCDF be an input for raster input?" -- the practitioner, 2026-11-09 (experiment 198, step 2). A NetCDF-4 grid
// chosen from this device, read in parts, and kept as the window around the study area, as a GeoTIFF is. The grid is
// tests/fixtures/netcdf-grid.nc, made by tests/fixtures/make-netcdf-grid.py the way DTU25MSS is stored: latitude south
// first, values at nodes, gzip chunks, packed integers with a scale factor and a fill value, and a second variable.
// Its value at a node is 40 + 1.5 (lat - 14) + 0.25 (lon - 120.5) metres, so every cell kept can be checked.
const expected=(lon,lat)=>40+(lat-14)*1.5+(lon-120.5)*0.25;

test('a NetCDF grid on this device is read in parts and kept as the window around the study area',async({page})=>{
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'Manila',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.52],[121.05,14.52],[121.05,14.68],[120.93,14.68],[120.93,14.52]]]}}},
    {id:'grid',type:'raster_input',x:320,y:20,params:{label:'Mean sea surface'}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'netcdf-grid.nc',mimeType:'application/x-netcdf',
    buffer:readFileSync(new URL('./fixtures/netcdf-grid.nc',import.meta.url))});

  // Two grids in the file, so it asks which; the first is offered.
  await expect(page.locator('#raster-variable-row')).toBeVisible({timeout:30000});
  await expect(page.locator('#raster-variable option')).toHaveText(['mss','sigma']);
  await expect(page.locator('#raster-status')).toContainText('values at grid nodes');
  await expect(page.locator('#raster-status')).toContainText('Source: 101 × 121');
  await page.locator('#raster-source-sourceURL').fill('https://example.org/grid');
  await page.locator('#raster-source-citation').fill('Synthetic grid made by tests/fixtures/make-netcdf-grid.py');
  await page.locator('#raster-source-units').fill('m');
  await page.locator('#raster-save').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});

  const asset=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'))).nodes.find(n=>n.id==='grid').params.asset;
  expect(asset.source.filename).toBe('netcdf-grid.nc');
  expect(asset.source.metadata.sourceRegistration).toBe('PixelIsPoint');
  expect(asset.source.metadata.band.netcdfVariable).toBe('mss');

  // The window, downloaded, checked cell by cell against the formula, north first and the fill value missing.
  await page.locator('.react-flow__node[data-id="grid"]').click();
  const wait=page.waitForEvent('download');
  await page.locator('#download-node-raster').click();
  const tiff=await fromArrayBuffer(bytesOf(await (await wait).path()));
  const image=await tiff.getImage(),[values]=await image.readRasters(),[x0,y0]=image.getOrigin(),[dx,dy]=image.getResolution();
  const width=image.getWidth(),height=image.getHeight();
  let checked=0,missing=[],worst=0;
  for(let r=0;r<height;r++)for(let c=0;c<width;c++){
    const lon=x0+(c+0.5)*dx,lat=y0+(r+0.5)*dy,v=values[r*width+c];
    if(Number.isNaN(v)){missing.push([+lon.toFixed(3),+lat.toFixed(3)]);continue;}
    worst=Math.max(worst,Math.abs(v-expected(lon,lat)));checked++;
  }
  expect(missing).toEqual([[121,14.6]]);
  expect(worst).toBeLessThan(0.0006);  // packed to a millimetre
  expect(checked).toBe(width*height-1);
  expect(lonLat(x0,y0)).toEqual([120.925,14.685]);
  expect(errors).toEqual([]);
});
const lonLat=(x,y)=>[+x.toFixed(3),+y.toFixed(3)];
