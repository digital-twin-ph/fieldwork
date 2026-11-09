import {test,expect} from '@playwright/test';
import {readFileSync,statSync} from 'node:fs';
import {fromArrayBuffer} from 'geotiff';
// The bytes of a file, alone: a Node Buffer can be a view on a shared pool, and its .buffer then holds other bytes too.
const bytesOf=path=>{const b=readFileSync(path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

// THE FILE NETCDF READING WAS BUILT FOR (experiment 198, step 2): DTU25MSS_WGS84.nc, 2,947,503,242 bytes, kept on this
// laptop and chosen as a local file. Run only where it is: DTU25MSS=/path/to/DTU25MSS_WGS84.nc. The window kept around
// Manila is compared, node by node, with data/dtu25mss-manila.tif in the sea-level example, which
// scripts/make_grid_subsets.py cut from the same file with h5py.
const FILE=process.env.DTU25MSS;
const EXAMPLE=new URL('../../example-2026-sea-level-rise-philippines/data/dtu25mss-manila.tif',import.meta.url);

test('DTU25MSS, 2.9 GB on this laptop, is read in parts and agrees with the subset cut by h5py',async({page})=>{
  test.skip(!FILE,'Set DTU25MSS to a local copy of DTU25MSS_WGS84.nc');
  test.setTimeout(600_000);
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'Manila',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.52],[121.05,14.52],[121.05,14.68],[120.93,14.68],[120.93,14.52]]]}}},
    {id:'mss',type:'raster_input',x:320,y:20,params:{label:'DTU25MSS'}}],
    edges:[{id:'e1',from:'area',to:'mss',port:'area'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="mss"]').click();
  await page.locator('#prepare-raster').click();
  const started=Date.now();
  await page.locator('#raster-file').setInputFiles(FILE);
  await expect(page.locator('#raster-status')).toContainText('values at grid nodes',{timeout:300_000});
  const inspected=Date.now()-started;
  await expect(page.locator('#raster-variable')).toHaveValue('mss');
  await page.locator('#raster-source-sourceURL').fill('https://doi.org/10.11583/DTU.29412275');
  await page.locator('#raster-source-citation').fill('Andersen, O. B. and Nilsson, B. DTU25MSS. DTU Space. doi:10.11583/DTU.29412275');
  await page.locator('#raster-source-units').fill('m');
  const saving=Date.now();
  await page.locator('#raster-save').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:300_000});
  const read=Date.now()-saving;

  await page.locator('.react-flow__node[data-id="mss"]').click();
  const wait=page.waitForEvent('download');
  await page.locator('#download-node-raster').click();
  const mine=await (await fromArrayBuffer(bytesOf(await (await wait).path()))).getImage();
  const theirs=await (await fromArrayBuffer(bytesOf(EXAMPLE))).getImage();
  const [a]=await mine.readRasters(),[b]=await theirs.readRasters();
  const [ax,ay]=mine.getOrigin(),[bx,by]=theirs.getOrigin(),[dx,dy]=mine.getResolution();
  // The example's subset is written point-registered; its first node is its tie point. Ours are cells around nodes.
  const nodeOf=(x0,y0,c,r,half)=>[x0+(c+half)*dx,y0+(r+half)*dy];
  let compared=0,worst=0;
  for(let r=0;r<mine.getHeight();r++)for(let c=0;c<mine.getWidth();c++){
    const [lon,lat]=nodeOf(ax,ay,c,r,0.5);
    const bc=Math.round((lon-bx)/dx-0.5),br=Math.round((lat-by)/dy-0.5);
    const there=b[br*theirs.getWidth()+bc];
    worst=Math.max(worst,Math.abs(a[r*mine.getWidth()+c]-there));compared++;
  }
  console.log(`DTU25MSS ${statSync(FILE).size} bytes: header and variables in ${(inspected/1000).toFixed(1)} s, window of ${mine.getWidth()} x ${mine.getHeight()} read and kept in ${(read/1000).toFixed(1)} s; ${compared} nodes, largest difference from the h5py subset ${worst} m`);
  expect(worst).toBe(0);
  expect(errors).toEqual([]);
});
