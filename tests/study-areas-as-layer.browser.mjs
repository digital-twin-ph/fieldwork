import {test,expect} from './fixtures.mjs';
import {dragConnection} from './canvas-drag.mjs';
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
  // READY BEFORE AND AFTER THE RELOAD: once on CI (0.161.0, Chromium) the node was never drawn, the page read before it started.
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
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

// DROPPED, NOT CONFIGURED (2026-11-22; the practitioner: "The polygon input port also does not automatically take in more
// than one study area, but it does from the configuration dialog, which adds friction"). A study area dropped on the input
// another holds goes to the next one, and a new input is added when all are held.
test('study areas dropped on a polygon layer each take an input of their own',async({page})=>{
  const errors=collectPageErrors(page);
  // All in view, the layer to the right of the three areas, so each drag is a short one across open canvas.
  const at=(n,y)=>({...n,x:20,y});
  const three={...flow,nodes:[at(area('drc','DRC','COD-ADM1-TEST',['Ituri','Nord-Kivu'],100),20),at(area('ssd','South Sudan','SSD-ADM2-TEST',['Yei'],400),170),
    at(area('uga','Uganda','UGA-ADM0-TEST',['Uganda'],700),320),
    {id:'parts',type:'polygon_input',x:380,y:170,params:{label:'Across the border',data:{features:[]}}}],edges:[]};
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},three);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="parts"]')).toBeVisible({timeout:45000});
  await page.locator('#toast button').click().catch(()=>{});
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const drag=from=>dragConnection(page,page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`),
    page.locator('.react-flow__node[data-id="parts"] [data-handleid="area"]'),async()=>(await saved()).edges.some(e=>e.from===from&&e.to==='parts'));
  // Each drop lands before the next starts: the canvas redraws the node's inputs after a connection.
  for(const [i,id] of ['drc','ssd','uga'].entries()){await drag(id);
    await expect.poll(async()=>(await saved()).edges.filter(e=>e.to==='parts').length).toBe(i+1);}
  await expect.poll(async()=>(await saved()).edges.filter(e=>e.to==='parts').map(e=>`${e.from}:${e.port}`).sort())
    .toEqual(['drc:area','ssd:area_2','uga:area_3']);
  const node=(await saved()).nodes.find(n=>n.id==='parts');
  expect(node.params.inputMethod).toBe('areas');expect(node.params.areaInputCount).toBe(3);
  // The same area dropped again is not added twice.
  await drag('ssd');
  await expect.poll(async()=>(await saved()).edges.filter(e=>e.to==='parts').length).toBe(3);
  await page.locator('.react-flow__node[data-id="parts"]').click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('The parts of 3 connected study areas');
  expect(errors).toEqual([]);
});

// A CHECKBOX FOR EACH STUDY AREA (the practitioner, 2026-11-22: "there is no way to filter which study area is being used",
// and, asked, "Leave it out of the map"). In Map's settings, unchecked, a study area is left out of the map in Results and
// the preview, and the map says so; the layer keeps it. In Point data's pin editor, each study area's outline can be hidden.
test('a study area unchecked in Map is left out of the map; in the pin editor its outline is hidden',async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles/,route=>route.abort('failed'));
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click({timeout:45000});
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-config');
  await expect(dialog.locator('[data-map-area]')).toHaveCount(2);
  await dialog.locator('[data-map-area="DRC"]').uncheck();
  // Both unchecked is refused, in words, and the last one stays.
  await dialog.locator('[data-map-area="South Sudan"]').click();
  await expect(dialog).toContainText('Keep at least one study area on the map.');
  await expect(dialog.locator('[data-map-area="South Sudan"]')).toBeChecked();
  await dialog.locator('#config-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='map').params.leftOutAreas);
  expect(saved).toEqual(['DRC']);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map path[data-catchment]')).toHaveCount(1);
  // The pin editor: an outline per study area, each with a checkbox.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="pts"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('pins');await page.locator('#pins-basemap').selectOption('none');
  await expect(page.locator('#pin-areas [data-pin-area]')).toHaveCount(2);
  const outlines=page.locator('#pin-map path.leaflet-interactive, #pin-map svg path');
  const before=await outlines.count();
  await page.locator('#pin-areas [data-pin-area]').first().uncheck();
  await expect(outlines).toHaveCount(before-1);
  expect(errors).toEqual([]);
});
