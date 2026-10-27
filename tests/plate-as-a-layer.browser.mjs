/** A plate comes out of map_image_input and becomes a LAYER on the map, with a checkbox.
 *
 *  The practitioner, 2026-10-27: *"I meant for the water supply map to be a layer, so checkbox
 *  can show and hide it."* That is the point of it for a learner: flipping 1855 on and off under
 *  a modern result is the comparison. A backdrop nobody can remove is a picture, not evidence.
 */
import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// A 2x2 red PNG. Small enough to inline, real enough for Leaflet to place.
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8z4'
  +'AAjAwMDAwMDAwMDAwMDAwAFmgBAs1FcxkAAAAASUVORK5CYII=';

/** A canvas with a plate wired to a map, built through the UI the way a practitioner would. */
const buildPlateWorkflow=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();

  // Give the existing map a plate, over the Soho extent the example already uses.
  await page.evaluate(image=>{
    const stored=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const map=stored.nodes.find(n=>n.type==='map_output');
    map.params.presentation='interactive';
    stored.nodes.push({id:'plate',type:'map_image_input',x:40,y:420,params:{
      label:"Snow's Map 2 (test plate)",data:image,
      image:{width:2,height:2,bytes:70,sha256:'0'.repeat(64),filename:'plate.png'},
      bounds:[-0.141,51.509,-0.131,51.517],opacity:0.8,
      source:{title:"Snow's Map 2, 1855",licence:'Public domain'}}});
    stored.edges.push({id:'plate-edge',from:'plate',to:map.id,port:'ground'});
    // THE PROJECT MANIFEST RECORDS AN INVENTORY OF WHAT THE WORKFLOW CONTAINS, and a saved
    // workflow whose manifest disagrees is refused on open -- which silently reset this edit to
    // the published template. Dropped so the app re-derives it, as it does for a workflow that
    // has none.
    delete stored.manifest;
    // BOTH KEYS: the single workspace the app boots from and the per-example map a reload with
    // `?example=` reads. Writing only the first is silently discarded on reload.
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(stored));
    const workspaces=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    workspaces['snow-voronoi']=stored;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(workspaces));
  },PNG);
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
};

test('a plate connected to a map becomes a layer with a checkbox that hides it',async({page})=>{
  const errors=collectPageErrors(page);
  await buildPlateWorkflow(page);
  await page.locator('[data-view="results"]').click();

  // Drawn, and underneath: Leaflet's overlay pane holds it, not the marker pane.
  const plate=page.locator('.map-plate-image');
  await expect(plate).toBeVisible({timeout:30000});

  // AND IT IS IN THE LAYER CONTROL, by the name the plate declares, with a checkbox.
  const control=page.locator('.leaflet-control-layers');
  await expect(control).toContainText("Snow's Map 2, 1855");
  const box=control.locator('label',{hasText:"Snow's Map 2, 1855"}).locator('input[type=checkbox]');
  await expect(box).toBeChecked();

  // Unchecking removes it from the map; checking puts it back. That is the comparison a learner
  // makes, and it is the whole request.
  await box.uncheck();
  await expect(plate).toHaveCount(0);
  await box.check();
  await expect(page.locator('.map-plate-image')).toBeVisible();

  expect(errors).toEqual([]);
});

test('the plate is a layer of the map, not of the canvas: disconnecting removes it',async({page})=>{
  const errors=collectPageErrors(page);
  await buildPlateWorkflow(page);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.map-plate-image')).toBeVisible({timeout:30000});

  // The connection is what puts it there. Remove the edge and the layer goes with it, which is
  // what makes this a port rather than a setting on the map.
  await page.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    stored.edges=stored.edges.filter(e=>e.port!=='ground');
    // Both keys and no manifest, for the same reasons as the setup above. Written to the one key
    // alone, this edit was discarded on reload and the plate stayed on the map -- so the test
    // read a still-connected plate as a disconnection that had failed to remove it.
    delete stored.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(stored));
    const workspaces=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    workspaces['snow-voronoi']=stored;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(workspaces));
  });
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.map-plate-image')).toHaveCount(0);
  await expect(page.locator('.leaflet-control-layers')).not.toContainText("Snow's Map 2, 1855");
  expect(errors).toEqual([]);
});
