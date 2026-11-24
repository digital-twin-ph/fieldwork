import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// AN INSET ON A MAP THAT CARRIES POLYGONS. The practitioner, 2026-11-23: *"Inset does not work"*, and *"But the
// inset never appeared"*, on a map of DRC provinces with bat records and a mine. A polygon figure is drawn by
// polygonSvg and returned before the inset composition ever runs, so the setting was kept, offered in Configure…
// and silently never drawn. Measured before the fix: 85 paths with an inset on a plain map, 43 with a polygon layer.
const ring=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const build=inset=>({schema:'fieldwork/workflow/1',id:'i',label:'Inset',exampleId:'blank',nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'Area',source:'drawn',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[ring(28,2,32,6)]}}},
  {id:'layer',type:'polygon_input',x:20,y:200,params:{label:'Polygon layer',
    data:{features:[{id:'p1',name:'Haut-Uele',geometry:{type:'Polygon',coordinates:[ring(28,2,30,4)]},properties:{}},
      {id:'p2',name:'Ituri',geometry:{type:'Polygon',coordinates:[ring(30,4,32,6)]},properties:{}}]}}},
  {id:'map',type:'map_output',x:400,y:60,params:{label:'Map',...(inset?{inset}:{})}},
],edges:[{id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'layer',to:'map',port:'polygons'}]});
const draw=async(page,inset)=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'i.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(build(inset)))});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Ready to run|Not ready/,{timeout:60000});
  await page.locator('#run-button').click().catch(()=>{});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Run failed/,{timeout:180000});
  await page.locator('[data-view="results"]').click();
  await page.waitForTimeout(2000);
  return page.evaluate(()=>{const s=document.querySelector('#map');
    return {paths:s?s.querySelectorAll('path').length:0,
      keys:s?s.querySelectorAll('[data-plot-key-band]').length:0,
      catchments:s?s.querySelectorAll('[data-catchment]').length:0};});
};

test('a map carrying polygons draws its inset, with one key',async({page})=>{
  const plain=await draw(page,undefined);
  assert.ok(plain.paths>0,'the polygon figure draws');
  assert.equal(plain.keys,1,'one key without an inset');

  // THE SAME LAYERS DRAWN TWICE: each polygon appears in the map and again in the enlarged part.
  const withInset=await draw(page,{arrange:'locator',size:'third',box:[28.2,2.2,29.8,3.8]});
  assert.ok(withInset.catchments>plain.catchments,
    `the polygons are drawn twice: ${withInset.catchments} against ${plain.catchments}`);
  // ONE KEY PER FIGURE: two would invite reading them as two scales.
  assert.equal(withInset.keys,1,`one key with an inset, not ${withInset.keys}`);

  // A FOCUS INSET composes too, and the same way.
  const focus=await draw(page,{arrange:'inset',size:'third',box:[28.2,2.2,29.8,3.8]});
  assert.ok(focus.catchments>plain.catchments,`a focus inset draws the polygons twice: ${focus.catchments}`);
  assert.equal(focus.keys,1);

  // A BOX OUTSIDE THE MAP IS NOT DRAWN, and the figure is what it was.
  const outside=await draw(page,{arrange:'locator',size:'third',box:[100,80,101,81]});
  assert.equal(outside.catchments,plain.catchments,'a box outside the map leaves the figure alone');
});
