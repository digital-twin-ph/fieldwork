import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** POLYGONS ARE DATA, OR THEY ARE THE GROUND A POINT STANDS ON (2026-11-23). The practitioner, of four provinces drawn
 *  in four colours under one mine pin: *"polygons can be data bearing but the polygon can be just context for the
 *  points. If there are no points then we must be using the polygon data"*, and *"Only for polygons derived from study
 *  areas"*. A layer built from the workflow's own study areas loses its hue per feature where points are drawn over it;
 *  a layer read from a file keeps it (tests/map-layers.test.mjs), and Configure… overrides either way. */
const box=(w,e)=>({type:'Polygon',coordinates:[[[w,2.5],[e,2.5],[e,4.5],[w,4.5],[w,2.5]]]});
const PIN={type:'FeatureCollection',features:[
  {type:'Feature',id:'mine',properties:{name:'Mine'},geometry:{type:'Point',coordinates:[29.5,3.5]}}]};
const workflow=withPin=>({schema:'fieldwork/workflow/1',name:'Context',exampleId:'blank',
  nodes:[
    {id:'west',type:'study_area',x:20,y:20,params:{label:'West province',source:'drawn',selectionMode:'polygon',geometry:box(28.5,30)}},
    {id:'east',type:'study_area',x:20,y:160,params:{label:'East province',source:'drawn',selectionMode:'polygon',geometry:box(30,31.5)}},
    {id:'parts',type:'polygon_input',x:320,y:20,params:{label:'Provinces',data:{features:[]},inputMethod:'areas',areaInputCount:2}},
    ...(withPin?[{id:'pin',type:'point_input',x:320,y:260,params:{label:'Point observations',data:PIN}}]:[]),
    {id:'map',type:'map_output',x:640,y:20,params:{label:'Map',presentation:'plot'}}],
  edges:[{id:'e1',from:'west',to:'parts',port:'area'},{id:'e2',from:'east',to:'parts',port:'area_2'},
    {id:'e3',from:'parts',to:'map',port:'polygons'},
    ...(withPin?[{id:'e4',from:'pin',to:'map',port:'points'}]:[])]});
const open=async(page,withPin)=>{
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow(withPin)))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
};
// The polygons as drawn: one fill each where they are the subject, one between them where they are the ground.
const polygonFills=page=>page.locator('#map path[data-catchment]').evaluateAll(ps=>
  [...new Set(ps.map(p=>p.getAttribute('fill')))]);

test('with no points the study areas are the data, and each gets its own colour',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,false);
  expect(await polygonFills(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('with points over them the study areas are context, in one wash, and Configure… can say otherwise',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,true);
  // ONE FILL BETWEEN THEM, and the key names the layer rather than each province.
  expect(await polygonFills(page)).toHaveLength(1);
  await expect(page.locator('#map').locator('..')).toContainText('2 features');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('dialog[open]');
  await expect(dialog.locator('#polygon-shading')).toHaveValue('');
  await dialog.locator('#polygon-shading').selectOption('each');
  await dialog.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  expect(await polygonFills(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});
