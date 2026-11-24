import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {clipExercise} from './fixtures/workflows.mjs';

// A MAGNIFIER OVER THE GROUND. The practitioner, 2026-11-23: *"The basemap tiles are what's important to zoom in to
// because the purpose of the magnifier is to enhance context perception"*, and *"Perhaps we can offer the magnifier
// only when it's non-vector basemaps"* -- which the pin editor satisfies by offering raster basemaps alone.
const openPins=async(page,basemap)=>{
  await page.goto('/?example=blank');
  const w=clipExercise();w.exampleId='blank';
  await page.locator('#workflow-file').setInputFiles({name:'mag.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="observations"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('pins');
  await page.locator('#pins-basemap').selectOption(basemap);
  await expect(page.locator('#pin-map')).toBeVisible();
  await page.waitForTimeout(600);
};

test('the magnifier enlarges the ground under the cursor, and refuses when there is none',async({page})=>{
  // Tiles are never fetched in the gate; the glass is still a map, and that is what is asserted.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
  await openPins(page,'none');
  // BASEMAP OFF: nothing to magnify, and the control says so rather than showing an empty glass.
  await expect(page.locator('#pins-magnifier')).toBeDisabled();
  await expect(page.locator('#pins-magnifier')).toHaveAttribute('title',/no tiles to magnify/);

  await page.locator('#pins-basemap').selectOption('osm');
  await expect(page.locator('#pins-magnifier')).toBeEnabled();
  await page.locator('#pins-magnifier').click();
  await expect(page.locator('#pins-magnifier')).toHaveAttribute('aria-pressed','true');

  const box=await page.locator('#pin-map').boundingBox();
  await page.mouse.move(box.x+box.width*0.5,box.y+box.height*0.5);
  await page.waitForTimeout(500);
  const loupe=page.locator('#pin-loupe');
  await expect(loupe).toBeVisible();
  const seen=await page.evaluate(()=>{
    const el=document.querySelector('#pin-loupe');
    return {leaflet:el.classList.contains('leaflet-container'),round:getComputedStyle(el).borderRadius,
      clicksThrough:getComputedStyle(el).pointerEvents,w:el.getBoundingClientRect().width};});
  assert.ok(seen.leaflet,'the glass is a map of its own');
  assert.equal(seen.clicksThrough,'none','a click under the glass still reaches the map');
  assert.ok(seen.w>120,`the glass is ${seen.w.toFixed(0)}px across`);

  // DEEPER THAN THE MAP, which is the whole point.
  const zooms=await page.evaluate(()=>{
    const z=[...document.querySelectorAll('.leaflet-container')].map(el=>el.className);
    return z.length;});
  assert.ok(zooms>=2,'two maps: the editor and the glass');

  // LEAVING THE MAP HIDES IT, rather than leaving a glass over nothing.
  await page.mouse.move(box.x-40,box.y-40);
  await page.waitForTimeout(400);
  await expect(loupe).toBeHidden();

  // Switching the basemap off while it is on puts it away.
  await page.mouse.move(box.x+box.width*0.5,box.y+box.height*0.5);
  await page.waitForTimeout(300);
  await page.locator('#pins-basemap').selectOption('none');
  await expect(page.locator('#pins-magnifier')).toHaveAttribute('aria-pressed','false');
  await expect(loupe).toBeHidden();
});
