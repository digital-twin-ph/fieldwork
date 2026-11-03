import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';
import {serveArchive,smallArchive} from './small-pmtiles.mjs';

// THE PRACTITIONER'S CASE, 2026-11-02: a study area wired straight to an interactive map, and Import
// tiles did nothing, because the boundary was read from polygon layers only. The archive is the
// one-tile local file, so this checks the import and the drawing, not the network.
const workflow={schema:'fieldwork/workflow/1',name:'Tiles under a study area',
  nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'My study area',source:'drawn',selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[25.8,-24.7],[26.0,-24.7],[26.0,-24.5],[25.8,-24.5],[25.8,-24.7]]]}}},
    {id:'map',type:'map_output',x:340,y:20,params:{label:'Map',presentation:'interactive'}}],
  edges:[{id:'e1',from:'area',to:'map',port:'area'}]};

test('a map of a study area imports the tiles under it, and draws over them',async({page})=>{
  const errors=collectPageErrors(page);
  await serveArchive(page,smallArchive());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'tiles.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-import-tiles').click();
  await expect(page.locator('#map-tile-status')).toContainText('Run the workflow first');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-import-tiles').click();
  await expect(page.locator('#map-tile-status')).toContainText('The project keeps this description',{timeout:60000});
  const spec=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.id==='map').params.tileExtract);
  expect(spec.bounds).toEqual([25.8,-24.7,26,-24.5]);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('[data-tile-status]')).toContainText('tiles held on this device',{timeout:30000});
  expect(errors).toEqual([]);
});
