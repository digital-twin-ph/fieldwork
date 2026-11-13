import {test,expect} from './fixtures.mjs';
import {writeArrayBuffer} from 'geotiff';
import {seedWorkflow} from './seed-workflow.mjs';

// WHAT ARRIVED, SAID FIRST (2026-11-13). The practitioner, with WorldPop connected to Sample a raster and nothing to read it
// at: "Shouldn't sample a raster be able to detect what data the raster offers after retrieval ... I feel lost what to do
// next". The same grid as tests/sample-raster-areas.browser.mjs: 10 × 10 cells of 0.01°, the square's sixteen add to 968.
const grid=()=>Buffer.from(writeArrayBuffer(Array.from({length:100},(_,i)=>i+1),{width:10,height:10,ModelPixelScale:[0.01,0.01,0],
  ModelTiepoint:[0,0,0,120.9,14.7,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1}));

test('Configure says what the raster holds, fills its stated units, and offers to read it over the study area',async({page})=>{
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'A square',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.62],[120.97,14.62],[120.97,14.66],[120.93,14.66],[120.93,14.62]]]}}},
    {id:'grid',type:'raster_input',x:320,y:20,params:{label:'People per cell'}},
    {id:'sample',type:'sample_raster',x:620,y:20,params:{label:'Sample a raster',attribute:'',valueUnit:''}},
    {id:'shown',type:'table_output',x:920,y:20,params:{label:'People'}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'},{id:'e2',from:'grid',to:'sample',port:'raster'},{id:'e4',from:'sample',to:'shown',port:'points'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'people.tif',mimeType:'image/tiff',buffer:grid()});
  await page.locator('#raster-source-units').fill('people per pixel');
  await page.locator('#raster-dialog #config-apply').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});

  await page.locator('.react-flow__node[data-id="sample"]').click();
  // ONE NAME FOR EACH PORT, on the node and in the Inspector (2026-11-13: "the port for that widget needs to be standardized").
  const canvasNames=(await page.locator('.react-flow__node[data-id="sample"] .node-port-row').allInnerTexts()).filter(t=>!t.includes('→'));
  // Two, as one raster is read at one kind of place: what it reads, and where; the second waits to be connected.
  expect(canvasNames).toEqual(['Raster','Read at']);
  expect(await page.locator('#inspector-content label[for^="connect-"]').allInnerTexts()).toEqual(canvasNames);
  await page.locator('#configure-step').click();
  const dialog=page.locator('#sample-config');
  const arrivals=dialog.locator('[data-sample-arrivals]');
  await expect(arrivals).toContainText('people.tif');
  await expect(arrivals).toContainText('Its values are in people per pixel, as its source record states.');
  await expect(arrivals).toContainText('Nothing to read it at yet.');
  await expect(dialog.locator('#sample-unit')).toHaveValue('people per pixel');
  await expect(dialog.locator('[data-sample-unit-from]')).toContainText('As its source record states');
  await page.screenshot({path:'test-results/sample-raster-arrivals.png'});

  await dialog.locator('[data-sample-over-area="area"]').click();
  await expect(arrivals).toContainText('Read at: the study area A square.');
  // The second port is named for what now fills it.
  await expect(page.locator('.react-flow__node[data-id="sample"] .node-port-row')).toHaveText(['Raster','Study area','Areas →']);
  await expect(dialog).toContainText('Reading over areas');
  await dialog.locator('#sample-attribute').fill('people');await dialog.locator('#sample-attribute').press('Tab');
  await dialog.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  const row=(await page.locator('#result-rows').innerText()).trim().split('\t').slice(-4);
  expect(row).toEqual(['968','16','0','0']);
});

// "I still have no idea what the raster is giving me" (2026-11-13): a WorldPop window kept before its file was recognised,
// its record without units, is still known by its file's name, and Configure… says what a cell holds and fills the fields.
test('a WorldPop window with no units in its record is known by its file’s name, and says what each cell holds',async({page})=>{
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'A square',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.62],[120.97,14.62],[120.97,14.66],[120.93,14.66],[120.93,14.62]]]}}},
    {id:'grid',type:'raster_input',x:320,y:20,params:{label:'Raster input'}},
    {id:'sample',type:'sample_raster',x:620,y:20,params:{label:'Sample a raster',attribute:'',valueUnit:''}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'},{id:'e2',from:'grid',to:'sample',port:'raster'},{id:'e3',from:'area',to:'sample',port:'area'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'bwa_pop_2026_CN_100m_R2025A_v1.tif',mimeType:'image/tiff',buffer:grid()});
  await page.locator('#raster-source-units').fill('');
  await page.locator('#raster-dialog #config-apply').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#sample-config');
  await expect(dialog.locator('[data-sample-arrivals]')).toContainText('as WorldPop’s record for this file, recognised by its name, states');
  await expect(dialog.locator('[data-sample-arrivals]')).toContainText('Each cell holds an estimated number of people living in it');
  await expect(dialog.locator('#sample-unit')).toHaveValue('people per pixel');
  await expect(dialog.locator('#sample-attribute')).toHaveValue('population');
});
