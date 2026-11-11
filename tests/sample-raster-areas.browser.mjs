import {test,expect} from './fixtures.mjs';
import {writeArrayBuffer} from 'geotiff';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

// SAMPLE A RASTER OVER AREAS (experiment 205): a Raster input totalled over a study area. The grid is 10 × 10 cells of
// 0.01°, its north-west corner at 120.90 E, 14.70 N, and cell (row r, column c) holds 10r + c + 1. The area runs from
// 120.93 to 120.97 E and 14.62 to 14.66 N, so the cells whose centre is inside are rows 4–7 and columns 3–6: sixteen
// cells, whose values add to 968 by hand (each row gives 40r + 22).
const grid=()=>{
  const values=Array.from({length:100},(_,i)=>i+1);
  return Buffer.from(writeArrayBuffer(values,{width:10,height:10,ModelPixelScale:[0.01,0.01,0],
    ModelTiepoint:[0,0,0,120.9,14.7,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1}));
};

test('a raster is totalled over a study area: the cells whose centre is inside, added, and counted',async({page})=>{
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'A square',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[120.93,14.62],[120.97,14.62],[120.97,14.66],[120.93,14.66],[120.93,14.62]]]}}},
    {id:'grid',type:'raster_input',x:320,y:20,params:{label:'People per cell'}},
    {id:'sample',type:'sample_raster',x:620,y:20,params:{label:'People in the area',attribute:'people',valueUnit:'people',over:'areas'}},
    {id:'shown',type:'table_output',x:920,y:20,params:{label:'People by area'}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'},{id:'e2',from:'grid',to:'sample',port:'raster'},
      {id:'e3',from:'area',to:'sample',port:'area'},{id:'e4',from:'sample',to:'shown',port:'polygons'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="grid"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'people.tif',mimeType:'image/tiff',buffer:grid()});
  await page.locator('#raster-source-sourceURL').fill('https://example.org/people');
  await page.locator('#raster-source-citation').fill('Synthetic grid made by tests/sample-raster-areas.browser.mjs');
  await page.locator('#raster-source-units').fill('people');
  await page.locator('#raster-save').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});

  // The step says what it does over areas, before it runs.
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await expect(page.locator('.standard-sentence')).toContainText('Totals people');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="sample"]').click();
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('people totalled over 1 area: 16 cells whose centre is inside or on an area');
  await expect(inspector).toContainText('not area-weighted');
  // The total itself, as the step hands it on: one polygon carrying 968 people over 16 cells, none missing or outside.
  await page.locator('[data-view="results"]').click();
  // Columns: layer, id, name, two location columns empty for a polygon, kind, then people, cells, no data, outside.
  const row=(await page.locator('#result-rows').innerText()).trim().split('\t').slice(-4);
  expect(row).toEqual(['968','16','0','0']);
  expect(errors).toEqual([]);
});
