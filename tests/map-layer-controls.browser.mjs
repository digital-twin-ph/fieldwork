import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// THE DIALOG'S LAYERS ARE THE MAP'S LAYERS. Reported 2026-11-23, with bats clipped to an area and a mine beside
// them: *"the mark scaling is inverted the circle scale actually does not do anything to the circle but the square
// scale increases the diameter of the circle"*, and the Pin class picker offered nothing for the clipped layer.
// Every control was keyed by the node WIRED to the map; the drawing keys its symbols by the identity the data
// carries, which a clip passes through from the input behind it.
const point=(id,name,x,y,props={})=>({type:'Feature',id,properties:{name,...props},geometry:{type:'Point',coordinates:[x,y]}});
const ring=[[0,0],[10,0],[10,10],[0,10],[0,0]];
const workflow=()=>({schema:'fieldwork/workflow/1',id:'m',label:'Layers',exampleId:'blank',nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'Area',source:'drawn',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[ring]}}},
  {id:'bats',type:'point_input',x:20,y:160,params:{label:'Bats',fields:[],
    data:{type:'FeatureCollection',features:[point('b1','Record 1',2,2,{Species:'Eidolon helvum'}),
      point('b2','Record 2',3,3,{Species:'Mops condylurus'})]}}},
  {id:'mines',type:'point_input',x:20,y:300,params:{label:'Mines',fields:[],
    data:{type:'FeatureCollection',features:[point('m1','Kibali Mining Site',5,5)]}}},
  {id:'clip',type:'clip_points_to_area',x:300,y:160,params:{label:'Points inside the area',keepBoundary:true,showExcluded:true}},
  {id:'map',type:'map_output',x:600,y:120,params:{label:'Map',pointInputCount:2}},
],edges:[
  {id:'e1',from:'area',to:'clip',port:'area'},{id:'e2',from:'bats',to:'clip',port:'points'},
  {id:'e3',from:'area',to:'map',port:'area'},
  {id:'e4',from:'mines',to:'map',port:'points'},{id:'e5',from:'clip',to:'map',port:'points_2'},
]});

test('the map dialog names and keys its controls by the layers drawn',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'m.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow()))});
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Ready to run/,{timeout:60000});
  await page.locator('#run-button').click().catch(()=>{});
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-config');
  await expect(dialog).toBeVisible();

  // NAMED FOR THE DATA, not for the clip it passed through.
  const names=await dialog.locator('#map-config-settings .field-label, .field-label').allInnerTexts();
  const text=names.join(' | ');
  assert.ok(/Bats/.test(text),`the clipped layer is named Bats: ${text.slice(0,300)}`);
  assert.ok(!/Points inside the area/.test(text),`and not for the clip: ${text.slice(0,300)}`);

  // KEYED BY THE DATA: the slider for the clipped layer writes the key the drawing reads.
  const sizeIds=await dialog.locator('[data-layer-size-by], [id^="layer-size-"]').evaluateAll(
    els=>els.map(e=>e.id.replace('layer-size-','')));
  assert.ok(sizeIds.includes('bats'),`a control is keyed by the bats input: ${sizeIds.join(', ')}`);
  assert.ok(!sizeIds.includes('clip'),`and none by the clip: ${sizeIds.join(', ')}`);

  // THE PIN CLASS IS OFFERED for the clipped layer, from the records the input behind it holds.
  const pinClass=dialog.locator('#pin-class-bats');
  await expect(pinClass).toHaveCount(1);
  const options=await pinClass.locator('option').allInnerTexts();
  assert.ok(options.some(o=>o.trim()==='Species'),`Species is offered: ${options.join(', ')}`);
});
