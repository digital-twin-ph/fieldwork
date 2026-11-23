import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {clipExercise} from './fixtures/workflows.mjs';

// THE GROUND AROUND THE PIN IS THE POINT. Reported 2026-11-23, siting a pushpin on the Kibali gold mine: *"we have
// to zoom in and zoom out repeatedly to view the surrounding context because of the small view window in the
// dialog... the real estate around the push pin is worth appreciating."*
const openPinEditor=async page=>{
  await page.goto('/?example=blank');
  const w=clipExercise();w.exampleId='blank';
  await page.locator('#workflow-file').setInputFiles({name:'pin-room.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="observations"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#input-dialog')).toBeVisible();
  await page.locator('#input-mode').selectOption('pins');
  await page.locator('#pins-basemap').selectOption('none');
  await expect(page.locator('#pin-map')).toBeVisible();
  // Leaflet sizes itself once the pane is shown.
  await page.waitForTimeout(600);
};

test('the pin map takes the room the dialog has, and full screen gives it the viewport',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await openPinEditor(page);
  const mapBox=async()=>page.locator('#pin-map').boundingBox();
  const before=await mapBox();
  // 400px was the window that made this a sequence of zooms; the map now takes what the dialog can give, and is
  // never smaller than it used to be.
  assert.ok(before.height>=400,`the map is ${before.height.toFixed(0)}px tall`);
  assert.ok(before.width>700,`the map is ${before.width.toFixed(0)}px wide`);
  // AND IT IS ON SCREEN WHEN THE EDITOR OPENS. At 58vh the dialog outgrew the window and the map's top sat 226px
  // above it, so clicks meant for the map landed outside it (gate, 2026-11-23: one pin placed of four). A map you
  // have to scroll to reach is worse than a short one.
  // THE MAP'S TOP IS ON SCREEN. At 58vh the dialog outgrew the window and the map's top sat 226px above it, so
  // clicks meant for the map landed outside it -- one pin placed of four, caught by the gate on 2026-11-23. A map
  // you have to scroll up to reach is worse than a short one.
  const view=page.viewportSize();
  assert.ok(before.y>=0,`the map's top is at ${before.y.toFixed(0)}px, above the window`);
  // How much of it shows without scrolling is decided by everything above it in the dialog, which is a lot: at
  // 1440x900 that leaves about 261px of map, and did so when the map was a fixed 400px too. That is the cramped
  // view this work was asked to fix, and Full screen below is what fixes it -- not a taller box in the same dialog.

  // FULL SCREEN KEEPS THE FORM: the map is where the site is found, the form is where what the pin says is written.
  await page.locator('#pins-fullscreen').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.className||'')).toContain('pin-layout');
  await expect(page.locator('#pins-fullscreen')).toHaveText('Exit full screen');
  await expect(page.locator('#pins-fullscreen')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(500);
  const full=await mapBox();
  assert.ok(full.height>before.height,`full screen ${full.height.toFixed(0)}px against ${before.height.toFixed(0)}px`);
  assert.ok(full.height>600,`full screen map is ${full.height.toFixed(0)}px tall`);
  await expect(page.locator('#pin-form')).toBeVisible();
  // Leaflet draws into the whole element, and was told its size changed: a container that grew while Leaflet still
  // held the old size leaves the new ground blank and unclickable.
  const inner=await page.evaluate(()=>{
    const el=document.querySelector('#pin-map');
    return {leaflet:el.classList.contains('leaflet-container'),height:el.clientHeight,
      panes:document.querySelectorAll('#pin-map .leaflet-pane').length};});
  assert.ok(inner.leaflet&&inner.panes>0,'the map is Leaflet\'s');
  assert.ok(inner.height>600,`the map element is ${inner.height}px tall`);

  await page.locator('#pins-fullscreen').click();
  await expect(page.locator('#pins-fullscreen')).toHaveText('Full screen');
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
});
