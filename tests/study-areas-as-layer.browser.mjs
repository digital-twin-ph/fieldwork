import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** STUDY AREAS ACROSS A BORDER (the practitioner, 2026-11-21: South Sudan and DR Congo on one map; "Point data does not take
 *  even 1 study area"; "Can polygon connect 2 study areas? Thinking here of cross country epidemics like Ebola now"). A
 *  Polygon layer made of two study areas' parts, each with its country and level, drawn on Map; Point data generating in
 *  the area connected to it. */
test.use({serviceWorkers:'block'});
const square=(x,y)=>[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]];
const area=(id,label,boundaryID,parts,y)=>({id,type:'study_area',x:20,y,params:{label,source:'drawn',selectionMode:'polygon',
  geometry:{type:'MultiPolygon',coordinates:parts.map((_,i)=>square(28+i,y/100))},
  boundary:{boundaryID,unitID:parts.join(', '),unitName:parts.join(', '),source:'geoBoundaries',licence:'CC BY 4.0',
    units:parts.map((name,i)=>({id:`${boundaryID}-${i}`,name}))}}});
const flow={schema:'fieldwork/workflow/1',exampleId:'blank',name:'Across the border',nodes:[
  area('drc','DRC','COD-ADM1-TEST',['Ituri','Nord-Kivu'],100),
  area('ssd','South Sudan','SSD-ADM2-TEST',['Yei'],400),
  {id:'parts',type:'polygon_input',x:300,y:200,params:{label:'Both countries',inputMethod:'areas',areaInputCount:2,data:{features:[]}}},
  {id:'map',type:'map_output',x:600,y:200,params:{label:'Map',basemap:'none'}},
  {id:'pts',type:'point_input',x:300,y:500,params:{label:'Cases',data:{type:'FeatureCollection',features:[]}}}],
  edges:[{id:'e1',from:'drc',to:'parts',port:'area'},{id:'e2',from:'ssd',to:'parts',port:'area_2'},
    {id:'e3',from:'parts',to:'map',port:'polygons'},{id:'e4',from:'drc',to:'map',port:'area'},{id:'e5',from:'ssd',to:'pts',port:'area'}]};

test("two countries' study areas make one polygon layer, each part with its country and level",async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles/,route=>route.abort('failed'));
  await page.goto('/');await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');
  // BEFORE A RUN, the dialog lists the parts it will make, and says they are at different levels.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="parts"]').click({timeout:45000});
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('The parts of 2 connected study areas');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#polygon-config');
  await expect(dialog.locator('#polygon-input-method')).toHaveValue('areas');
  await expect(dialog.locator('[data-polygon-area]')).toHaveCount(2);
  const after=dialog.locator('.join-after');
  await expect(after).toContainText('3 parts at COD ADM1, SSD ADM2: at different levels');
  await expect(after.locator('tbody tr')).toHaveCount(3);
  await expect(after.locator('tbody tr').nth(2)).toContainText('YeiSSD-ADM2-TEST-0SSDADM2South Sudan');
  await page.keyboard.press('Escape');
  // THE RUN MAKES THE LAYER, and Map draws each part.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map path[data-catchment]')).toHaveCount(3);
  // POINT DATA GENERATES IN THE AREA CONNECTED TO IT, offered first.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="pts"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#synthetic-boundary option').first()).toHaveText('South Sudan');
  expect(errors).toEqual([]);
});
