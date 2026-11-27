import {test,expect} from './fixtures.mjs';
import {writeArrayBuffer} from 'geotiff';
import {allRows} from './table-rows-local.mjs';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** TRAVEL TIME OVER GROUND (experiment 231), on the canvas: a friction surface read by Raster input, a facility to
 *  start from, two settlements to answer for, and a wall of unusable friction between the walk and one of them.
 *
 *  THE GRID, so the answer is checkable by hand. 10 columns by 3 rows of 0.01°, north-west corner at 0 E, 0.03 N, so
 *  cell (row r, column c) has its centre at longitude 0.005 + 0.01c and latitude 0.025 − 0.01r. Every cell costs
 *  0.001 minutes a metre except column 6, which is −1 in all three rows: a negative cost is not usable friction, so
 *  the walk cannot cross it and there is no way round inside the grid.
 *
 *  A step east or west crosses 0.01° of longitude, which at this latitude is 1113.2 m to within a centimetre
 *  (cos 0.015° = 0.99999997). So three cells east of the facility costs 3 × 1113.2 × 0.001 = 3.34 minutes. */
const FRICTION=0.001,WALL_COLUMN=6;
const grid=()=>{
  // A Float32Array, NOT a plain array: geotiff writes a plain array of these values as Uint8, where 0.001 becomes 0
  // and -1 becomes 255 -- a surface that costs nothing to cross except at a wall that costs everything. The test
  // passed its port assertions and reported 0.00 minutes before this was found (2026-11-24).
  const values=new Float32Array(Array.from({length:30},(_,i)=>i%10===WALL_COLUMN?-1:FRICTION));
  return Buffer.from(writeArrayBuffer(values,{width:10,height:3,ModelPixelScale:[0.01,0.01,0],
    ModelTiepoint:[0,0,0,0,0.03,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1}));
};
const at=(column,row=1)=>[0.005+0.01*column,0.025-0.01*row];
const point=(id,name,column)=>({type:'Feature',id,properties:{name},geometry:{type:'Point',coordinates:at(column)}});

const seed=page=>seedWorkflow(page,{nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'A strip',source:'drawn',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[[[0,0],[0.1,0],[0.1,0.03],[0,0.03],[0,0]]]}}},
  {id:'surface',type:'raster_input',x:320,y:20,params:{label:'Walking friction'}},
  {id:'posts',type:'point_input',x:320,y:200,params:{label:'Vaccination posts',fields:[],
    data:{type:'FeatureCollection',features:[point('post-1','Dawaki post',1)]}}},
  {id:'villages',type:'point_input',x:320,y:360,params:{label:'Settlements',fields:[],
    data:{type:'FeatureCollection',features:[point('v-1','Near village',4),point('v-2','Far village',8)]}}},
  {id:'walk',type:'travel_over_ground',x:640,y:200,params:{label:'Walk to the post',attribute:'minutes'}},
  {id:'shown',type:'table_output',x:940,y:200,params:{label:'Settlements by walking time'}}],
  edges:[{id:'e1',from:'area',to:'surface',port:'area'},{id:'e2',from:'surface',to:'walk',port:'friction'},
    {id:'e3',from:'posts',to:'walk',port:'origins'},{id:'e4',from:'villages',to:'walk',port:'places'},
    {id:'e5',from:'walk',to:'shown',port:'points'}]});

const prepare=async page=>{
  await seed(page);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="surface"]').click();
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'friction.tif',mimeType:'image/tiff',buffer:grid()});
  await page.locator('#raster-source-sourceURL').fill('https://example.org/friction');
  await page.locator('#raster-source-citation').fill('Synthetic friction surface made by tests/travel-over-ground.browser.mjs');
  await page.locator('#raster-source-units').fill('minutes per metre');
  await page.locator('#raster-dialog #config-apply').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0,{timeout:30000});
};

test('each port says which end of the walk it is, and the step says what it will write before it runs',async({page})=>{
  const errors=collectPageErrors(page);
  await prepare(page);
  // Two of the three ports take points, so each says which end of the walk it is (port-names.ts, 2026-11-24), before the
  // name of what came in (0.204.0).
  await expect(page.locator('.react-flow__node[data-id="walk"] .node-port-row'))
    .toHaveText(['Walking friction','From Vaccination posts','To Settlements']);
  await expect(page.locator('.react-flow__node[data-id="walk"] .node-output-tip')).toHaveText('Points');
  await page.locator('.react-flow__node[data-id="walk"]').click();
  await expect(page.locator('.standard-sentence')).toContainText('Writes minutes onto each place');
  await expect(page.locator('.standard-sentence')).toContainText('with no ceiling');
  expect(errors).toEqual([]);
});

test('the walk answers at the settlement it reaches and says why it cannot reach the other',async({page})=>{
  const errors=collectPageErrors(page);
  await prepare(page);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // THE NUMBER, by hand: three cells east at 0.001 minutes a metre over 1113.2 m a cell.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#table-panel table').first()).toBeVisible();
  const rows=await allRows(page);
  const near=rows.find(r=>r.Name==='Near village'),far=rows.find(r=>r.Name==='Far village');
  expect(near.minutes).toBe('3.34');
  // CARRIED, NOT DROPPED: the far village keeps its row, with no time and the reason beside it. The table draws an
  // absent value as an em dash, read aloud as "no value".
  expect(far.minutes).toBe('\u2014');
  expect(far.minutes_why).toBe('no path within the surface');

  // AND SAID IN THE RECEIPT'S METHOD, which is what the Inspector shows of the last run.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="walk"]').click();
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('1 place was NOT reached');
  await expect(inspector).toContainText('Far village');
  await expect(inspector).toContainText('THE NUMBER IS NOT A ROUTE');
  expect(errors).toEqual([]);
});

test('Configure… says what is connected and what it would cost, and a ceiling leaves a place unreached',async({page})=>{
  const errors=collectPageErrors(page);
  await prepare(page);
  await page.locator('.react-flow__node[data-id="walk"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#travel-ground-config');
  await expect(dialog).toBeVisible();
  // THE CELL COUNT, SAID BEFORE A RUN: it is the one quantity this step refuses on.
  await expect(dialog.locator('[data-travel-arrivals]')).toContainText('30 in all');
  await expect(dialog.locator('[data-travel-arrivals]')).toContainText('Starting from: Vaccination posts');
  await expect(dialog.locator('[data-travel-arrivals]')).toContainText('Answering for: Settlements');
  // A ceiling below the near village's 3.34 minutes leaves it unreached HERE, which is not unreachable.
  await dialog.locator('#travel-ceiling').fill('2');
  await dialog.locator('#travel-ceiling').dispatchEvent('change');
  await expect(dialog).toContainText('stopping at 2 minutes');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="walk"]').click();
  await expect(page.locator('#inspector-content')).toContainText('2 places were NOT reached');
  await expect(page.locator('#inspector-content')).toContainText('The walk stopped at 2 minutes');
  expect(errors).toEqual([]);
});
