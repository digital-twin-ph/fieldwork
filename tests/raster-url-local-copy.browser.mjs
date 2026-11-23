import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** A WINDOW READ AT AN ADDRESS, READ AGAIN FROM A COPY ON THIS DEVICE (2026-11-23). The practitioner holds GHS-POP's
 *  12 GB global grid, and the step offered only the host it first read from, so every re-read sent the study area to
 *  that server. The copy is read where it sits; the window read from it is checked against the window that was kept,
 *  which is what decides it, and a different file is refused by name. */
test.use({serviceWorkers:'block'});
const TIFF=readFileSync(new URL('./fixtures/egm08-manila-cut.tif',import.meta.url));
const URL_AT='https://example.invalid/grid/world.tif';
const workflow={schema:'fieldwork/workflow/1',name:'From an address',
  nodes:[{id:'area',type:'study_area',x:20,y:20,params:{label:'Manila',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[120.9,14.5],[121.1,14.5],[121.1,14.7],[120.9,14.7],[120.9,14.5]]]}}},
    {id:'raster',type:'raster_input',x:300,y:200,params:{label:'Raster input'}}],
  edges:[{id:'e1',from:'area',to:'raster',port:'area'}]};

test('a window read at an address is read again from a copy on this device, and another file is refused',async({page})=>{
  const errors=collectPageErrors(page);
  let served=0;
  await page.route(URL_AT,route=>{
    served++;
    const headers={'access-control-allow-origin':'*','accept-ranges':'bytes','content-type':'image/tiff'};
    if(route.request().method()==='HEAD')return route.fulfill({status:200,headers:{...headers,'content-length':String(TIFF.length)},body:''});
    const m=/bytes=(\d+)-(\d*)/.exec(route.request().headers().range||'');
    if(!m)return route.fulfill({status:200,headers,body:TIFF});
    const start=Number(m[1]),end=Math.min(m[2]?Number(m[2]):TIFF.length-1,TIFF.length-1);
    return route.fulfill({status:206,headers:{...headers,'content-range':`bytes ${start}-${end}/${TIFF.length}`},body:TIFF.subarray(start,end+1)});
  });
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await page.locator('#prepare-raster').click();
  const dialog=page.locator('#raster-dialog');
  await dialog.locator('#raster-url-source summary').click();
  await dialog.locator('#raster-url').fill(URL_AT);
  await dialog.locator('#raster-url-read').click();
  await expect(dialog).toContainText('Source: 24 × 24',{timeout:30000});
  await dialog.locator('#raster-source-title').fill('A grid read at an address');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0,{timeout:60000});

  // THE PROJECT ON ANOTHER DEVICE: it carries where the window came from, not its cells.
  await page.evaluate(()=>new Promise((done,fail)=>{
    const open=indexedDB.open('fieldwork-evidence-v1');
    open.onsuccess=()=>{const db=open.result;const tx=db.transaction('pdfs','readwrite');
      tx.objectStore('pdfs').clear();tx.oncomplete=()=>{db.close();done();};tx.onerror=()=>fail(tx.error);};
    open.onerror=()=>fail(open.error);}));
  await page.reload();
  await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await page.locator('#prepare-raster').click();
  await expect(dialog.locator('[data-raster-missing]')).toBeVisible({timeout:30000});
  await expect(dialog).toContainText('Or the same file on this device');

  // ANOTHER FILE IS REFUSED BY NAME, and nothing is kept. The same grid with every value one higher: a GeoTIFF of the
  // shape this step accepts, so the refusal is the window's own digest rather than the file being the wrong kind.
  const altered=await page.evaluate(async at=>{
    const {inspectRaster,readRasterWindow,encodeRaster}=await import('/build/raster.js');
    const metadata=await inspectRaster(at);
    const grid=await readRasterWindow(at,metadata,[0,0,metadata.width,metadata.height]);
    return [...encodeRaster({...grid,values:grid.values.map(v=>v+1)})];
  },URL_AT);
  await dialog.locator('#raster-reread-file').setInputFiles({name:'another.tif',mimeType:'image/tiff',buffer:Buffer.from(altered)});
  await expect(dialog.locator('#raster-reread-status')).toContainText('another.tif',{timeout:60000});
  await expect(dialog.locator('[data-raster-missing]')).toBeVisible();

  // THE COPY OF THE FILE THE WINDOW CAME FROM is accepted, and the host is not asked for it.
  const asked=served;
  await dialog.locator('#raster-reread-file').setInputFiles({name:'world.tif',mimeType:'image/tiff',buffer:TIFF});
  await expect(dialog.locator('[data-raster-reread-done]')).toBeVisible({timeout:60000});
  expect(served).toBe(asked);
  expect(errors).toEqual([]);
});
