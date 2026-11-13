import {test,expect} from './fixtures.mjs';
import {writeArrayBuffer} from 'geotiff';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {seedWorkflow} from './seed-workflow.mjs';

// A WINDOW TRAVELS AS ITS SOURCE, NOT ITS BYTES (experiment 209). Three sources' windows over a country are hundreds of
// megabytes, so a workflow file carries the file's name and digest, the window and the window's digest; on another device
// the window is read again from the same file, checked, and refused if it is not the window kept.
const grid=(offset=0)=>Buffer.from(writeArrayBuffer(Array.from({length:100},(_,i)=>i+1+offset),{width:10,height:10,ModelPixelScale:[0.01,0.01,0],
  ModelTiepoint:[0,0,0,120.9,14.7,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1}));
const tif={name:'people.tif',mimeType:'image/tiff',buffer:grid()};

test('a raster window leaves the device as its source and digest, and is read again and checked on another',async({page})=>{
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'A square',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.62],[120.97,14.62],[120.97,14.66],[120.93,14.66],[120.93,14.62]]]}}},
    {id:'grid',type:'raster_input',x:320,y:20,params:{label:'People per cell'}},
    {id:'sample',type:'sample_raster',x:620,y:20,params:{label:'People',attribute:'people',valueUnit:'people',over:'areas'}},
    {id:'shown',type:'table_output',x:920,y:20,params:{label:'People by area'}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'},{id:'e2',from:'grid',to:'sample',port:'raster'},
      {id:'e3',from:'area',to:'sample',port:'area'},{id:'e4',from:'sample',to:'shown',port:'polygons'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles(tif);
  await page.locator('#raster-dialog #config-apply').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});
  const asset=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='grid').params.asset);
  expect(asset.source.sha256).toMatch(/^[0-9a-f]{64}$/);

  const download=page.waitForEvent('download');
  await page.locator('#backup-button').click();
  await page.locator('#export-button').click();
  const file=await (await download).path(),raw=readFileSync(file);
  let exported;try{exported=JSON.parse(gunzipSync(raw).toString());}catch{exported=JSON.parse(raw.toString());}
  expect(exported.attachments??[],'no window bytes in the workflow file').toEqual([]);

  // ANOTHER DEVICE: no bytes, no workflow.
  await page.evaluate(()=>new Promise(resolve=>{const tx=indexedDB.open('fieldwork-evidence-v1');
    tx.onsuccess=()=>{const db=tx.result,clear=db.transaction('pdfs','readwrite');clear.objectStore('pdfs').clear();
      clear.oncomplete=()=>{db.close();resolve();};};}));
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(file);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await expect(page.locator('[data-raster-missing]')).toContainText('The window is not on this device yet');

  // A DIFFERENT FILE IS REFUSED; the same one is read again and checked.
  await page.locator('#raster-reread-file').setInputFiles({name:'people.tif',mimeType:'image/tiff',buffer:grid(1)});
  await expect(page.locator('#raster-reread-status')).toContainText('That is not the file this window was read from');
  await page.locator('#raster-reread-file').setInputFiles(tif);
  await expect(page.locator('[data-raster-missing]')).toHaveCount(0,{timeout:30000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  expect((await page.locator('#result-rows').innerText()).trim().split('\t').slice(-4)).toEqual(['968','16','0','0']);
});
