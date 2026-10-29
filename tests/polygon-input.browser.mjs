import {test,expect} from '@playwright/test';
import {blankWorkflow,newStudyArea,bboxPolygon} from '../build/study-area.js';

/** THE WIDGET HAD NO INSPECTOR, which is why these tests exist at all.
 *
 *  `polygon_input` was addable, implemented and covered by unit tests, and every parameter it
 *  declares could be set only by editing a workflow file: its features reached the canvas because
 *  the worked example's own file carried them. `input-stage-palette.browser.mjs` asserted the
 *  widget was in the palette the whole time, and it was -- addable is not configurable, the same
 *  gap `reachable_nodes` had.
 *
 *  A .osm.pbf is 124 MB and belongs on a practitioner's computer rather than in this repository,
 *  so the acquisition path is tested as far as the browser can go without one: the controls, the
 *  box the read will use, and which extract is offered for it. The read itself is
 *  `osm-areas.test.mjs`, against a .pbf that test writes. */

const place=async(page,type,name)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
  await page.locator('.node').filter({hasText:name}).first().click();
};
const blank=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
};
/** A study area already connected, imported as a workflow file.
 *
 *  Writing the geometry straight into localStorage and reloading does NOT work: the application
 *  rewrites that key from its own workspace on load, so the injected geometry is gone by the time
 *  the panel renders -- and the panel then says, correctly, that no area is connected. Importing
 *  the workflow is the device `area-measurement.browser.mjs` already uses.
 *
 *  Soho's box, because its covering extract is the one `street-engine.browser.mjs` pins. */
const SOHO=[-0.155,51.502,-0.119,51.525];
const withStudyArea=async page=>{
  const w=blankWorkflow();
  w.nodes=[{...newStudyArea(),id:'area-test',x:50,y:70},
    {id:'layer-test',type:'polygon_input',x:260,y:70,
     params:{label:'Water',data:{features:[]},inputMethod:'extract',kinds:['water']}}];
  w.nodes[0].params={...w.nodes[0].params,label:'Soho',selectionMode:'bbox',
    geometry:bboxPolygon(...SOHO)};
  w.edges=[{id:'area-edge',from:'area-test',to:'layer-test',port:'area'}];
  await blank(page);
  await page.locator('#workflow-file').setInputFiles(
    {name:'layer.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="layer-test"]').click();
};
test('the widget has a panel, and offers both ways in',async({page})=>{
  await blank(page);
  await place(page,'polygon_input','Polygon layer');
  // A file layer is the default, because it is every layer that existed before acquisition did.
  await expect(page.locator('#polygon-input-method')).toHaveValue('file');
  await expect(page.locator('#polygon-file')).toBeVisible();
  await expect(page.locator('#inspector-content')).toContainText('Read as published');
  // The naming property is asked for and never guessed, which is the layer's own rule.
  await expect(page.locator('#inspector-content')).toContainText('Nothing is guessed from a property name');
  await expect(page.locator('#polygon-extract')).toHaveCount(0);
});

test('a file layer is kept in the payload store, not in the workflow',async({page})=>{
  await blank(page);
  await place(page,'polygon_input','Polygon layer');
  const layer={type:'FeatureCollection',features:[
    {type:'Feature',properties:{name:'First parish'},
     geometry:{type:'Polygon',coordinates:[[[-0.15,51.51],[-0.14,51.51],[-0.14,51.52],[-0.15,51.51]]]}},
    {type:'Feature',properties:{name:'Second parish'},
     geometry:{type:'Polygon',coordinates:[[[-0.13,51.51],[-0.12,51.51],[-0.12,51.52],[-0.13,51.51]]]}},
  ]};
  await page.locator('#polygon-file').setInputFiles(
    {name:'parishes.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(layer))});
  // WHAT LANDED, shown in the panel: an import a practitioner cannot see is an import they
  // cannot check.
  await expect(page.locator('#inspector-content')).toContainText('parishes.geojson');
  await expect(page.locator('#inspector-content')).toContainText('2 features');
  await expect(page.locator('#inspector-content')).toContainText('On this device by digest');

  // WHAT localStorage HOLDS IS A WORKFLOW, not a polygon layer. South London's water at 45
  // vertices minimum is 788 kB of params against a 5,226,496-byte store written twice per save.
  const stored=await page.evaluate(()=>{
    const raw=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const node=raw.nodes.find(n=>n.type==='polygon_input');
    return {ref:typeof node.params.dataRef,inline:node.params.data!==undefined,
      filename:node.params.source?.filename,features:node.params.source?.features};
  });
  expect(stored.ref).toBe('string');
  expect(stored.inline).toBe(false);
  expect(stored.filename).toBe('parishes.geojson');
  expect(stored.features).toBe(2);

  // And the reference resolves: a payload the store does not hold would reload into a refusal,
  // which is the failure `hydrateWorkflow` records for an imported project.
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  const back=await page.evaluate(()=>{
    const node=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
      .nodes.find(n=>n.type==='polygon_input');
    return node.params.source.features;
  });
  expect(back).toBe(2);
  await expect(page.locator('.node').filter({hasText:'Polygon layer'})).toBeVisible();
});

test('the extract path states its box, and offers the extract that covers it',async({page})=>{
  await withStudyArea(page);
  await expect(page.locator('#polygon-extract')).toBeVisible();
  // The kinds are a closed set, because each is a claim about which tags mean an area.
  await expect(page.locator('[data-area-kind="water"]')).toBeVisible();
  await expect(page.locator('[data-area-kind="building"]')).toBeVisible();
  await expect(page.locator('#polygon-min-vertices')).toHaveValue('');
  await expect(page.locator('#polygon-margin')).toBeVisible();
  // The box is shown BEFORE the read: a margin only means something as the box it makes.
  await expect(page.locator('#inspector-content')).toContainText('-0.1550, 51.5020, -0.1190, 51.5250');
  await expect(page.locator('.extract-links')).toContainText('Greater London');
  // The margin has no ceiling. 2,000 m is where the Overpass path caps its own and where the
  // network extract's control stops; South London needs 5,000, and Teddington Lock is why.
  await page.locator('#polygon-margin').fill('5000');
  await page.locator('#polygon-margin').dispatchEvent('change');
  await expect(page.locator('#inspector-content')).toContainText('widened by 5,000 m');
});

test('the extract offered is the one covering the READ box, not the boundary',async({page})=>{
  await withStudyArea(page);
  await expect(page.locator('.extract-links a').first()).toContainText('Greater London');
  // A margin that reaches past the region is a margin whose extract must cover it. At 60 km the
  // box leaves Greater London, and the panel stops offering a file that would not hold the read.
  await page.locator('#polygon-margin').fill('60000');
  await page.locator('#polygon-margin').dispatchEvent('change');
  await expect(page.locator('.extract-links a').first()).not.toContainText('Greater London');
  await expect(page.locator('.extract-links')).toContainText('England');
});

test('without a study area the panel says the box cannot be worked out',async({page})=>{
  await blank(page);
  await place(page,'polygon_input','Polygon layer');
  await page.locator('#polygon-input-method').selectOption('extract');
  await expect(page.locator('#inspector-content')).toContainText('Connect a Study area');
  // Offering a download with no box to cover would be a guess, so nothing is offered.
  await expect(page.locator('.extract-links')).toHaveCount(0);
});

test('the panel can connect a study area, which nothing could before',async({page})=>{
  const w=blankWorkflow();
  w.nodes=[{...newStudyArea(),id:'area-test',x:50,y:70},
    {id:'layer-test',type:'polygon_input',x:260,y:70,params:{label:'Water',data:{features:[]}}}];
  w.nodes[0].params={...w.nodes[0].params,label:'Soho',selectionMode:'bbox',
    geometry:bboxPolygon(-0.155,51.502,-0.119,51.525)};
  await blank(page);
  await page.locator('#workflow-file').setInputFiles(
    {name:'unconnected.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="layer-test"]').click();
  // The port was declared, optional and unreachable: two widgets on a canvas and no control that
  // could join them.
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await page.locator('#polygon-area').selectOption('area-test');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});
