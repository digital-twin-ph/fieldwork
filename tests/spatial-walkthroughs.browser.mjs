import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** EVERY SPATIAL STEP'S SHOW ME HOW (TODO 6; 2026-11-20 for the first four, 2026-11-22 for Sample a raster, Keep points
 *  inside the area and Summarize points to polygons, 2026-11-23 for the six put on the standard in 0.169.0): opened from the step's Configure…, stepped to the end, and ending
 *  on what the step's own function makes of the made-up shapes. */
test.use({serviceWorkers:'block'});
const square=[[[30,-1],[30.04,-1],[30.04,-1.03],[30,-1.03],[30,-1]]];
const nodes=[{id:'area',type:'study_area',x:20,y:20,params:{label:'Area',source:'drawn',selectionMode:'polygon',geometry:{type:'Polygon',coordinates:square}}},
  {id:'pts',type:'point_input',x:20,y:200,params:{label:'Households',data:{type:'FeatureCollection',features:[{type:'Feature',properties:{name:'A',deaths:3},geometry:{type:'Point',coordinates:[30.01,-1.01]}}]}}},
  {id:'buffer_point',type:'buffer_point',x:320,y:20,params:{label:'Around',pointId:'A',distanceM:500}},
  {id:'measure_area',type:'measure_area',x:320,y:120,params:{label:'Size',unit:'km2'}},
  {id:'clip_polygons',type:'clip_polygons',x:320,y:220,params:{label:'Clipped'}},
  {id:'clip_points_to_area',type:'clip_points_to_area',x:320,y:320,params:{label:'Inside',keepBoundary:true,showExcluded:true}},
  {id:'summarize_points_to_polygon',type:'summarize_points_to_polygon',x:320,y:420,params:{label:'Counted',boundary:'include',valueField:''}},
  {id:'sample_points',type:'sample_raster',x:640,y:20,params:{label:'Sampled',attribute:'people'}},
  {id:'sample_areas',type:'sample_raster',x:640,y:300,params:{label:'Over areas',attribute:'people',over:'areas'}},
  // The six put on the standard in 0.169.0, given Show me how 2026-11-23.
  {id:'summarize_hull',type:'summarize_hull',x:960,y:20,params:{label:'Hull',zone:36,hemisphere:'south'}},
  {id:'voronoi',type:'voronoi',x:960,y:120,params:{label:'Cells',zone:36,hemisphere:'south'}},
  {id:'isochrone',type:'isochrone',x:960,y:220,params:{label:'Reach',zone:36,hemisphere:'south',minutes:10,speedMPerMin:80,bufferM:25,maxSnapM:150,direction:'outbound'}},
  {id:'mean_center',type:'mean_center',x:960,y:320,params:{label:'Centre',zone:36,hemisphere:'south',weightField:'deaths'}},
  {id:'donut_geomask',type:'donut_geomask',x:1280,y:20,params:{label:'Moved',innerM:50,outerM:125,seed:42}},
  {id:'aggregate_points_to_h3_cell',type:'aggregate_points_to_h3_cell',x:1280,y:120,params:{label:'Cells',resolution:9,minOccupancy:2}}];
const CASES=[
  ['buffer_point',3,'it becomes the study area'],
  ['measure_area',3,'passes the same area on'],
  ['clip_polygons',5,'2 of 3 units, each cut to the area'],
  ['clip_points_to_area',5,'2 of 4 points. Inside 1, on the outline 1, outside 1, no location 1.'],
  ['summarize_points_to_polygon',6,'North: 3 houses, deaths 8; South: 3 houses, deaths 6'],
  ['sample_points',5,'A 40, B no value, C no value. 1 read, 1 with no data, 1 outside.'],
  ['sample_areas',4,'its total, 273, from 7 cells; the cell with no data inside it adds nothing and is counted apart, never as 0.'],
  ['summarize_hull',4,'the outline, 8.61 km² and 4,093 m at its widest, measured in UTM zone 36S'],
  ['voronoi',4,'3 cells, each the ground nearer its pump than any other'],
  ['isochrone',4,'where the clinic can reach in 10 minutes, 0.31 km²'],
  ['mean_center',4,'one point, each house counted by its deaths'],
  ['donut_geomask',4,'the point moved 57 m, in the direction and by the distance seed 42 picks inside the ring'],
  ['aggregate_points_to_h3_cell',4,'2 cells, each with its count of homes']];
for(const [id,steps,last] of CASES)test(`${id}: Show me how ends on what the step makes`,async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(
    {schema:'fieldwork/workflow/1',exampleId:'blank',name:'Walks',nodes,edges:[]}))});
  await page.locator('[data-view="workflow"]').click();
  // The run notice sits over the lower part of the canvas; closed first, so it cannot take the click.
  await page.locator('#toast button').click().catch(()=>{});
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator('dialog[open] [data-show-me]').click();
  const walk=page.locator('#table-walkthrough');
  await expect(walk.locator('.walk-made-up')).toHaveText('Made-up example');
  await expect(walk.locator('.walk-say')).toContainText(`Step 1 of ${steps}.`);
  await expect(walk.locator('svg.walk-drawing')).toBeVisible();
  for(let i=1;i<steps;i++)await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('.walk-say')).toContainText(last);
  expect(errors).toEqual([]);
});
