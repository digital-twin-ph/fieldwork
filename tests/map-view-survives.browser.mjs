import {test,expect} from '@playwright/test';

/** The practitioner, 2026-10-26: *"On the interactive map, the radius adjustment still rezooms out
 *  the map canvas."*
 *
 *  Mark radius is presentation, so its handler calls `renderResults` -- which DISPOSES the Leaflet
 *  map, removes its host and mounts a new one, and the new map fitted all layers on arrival. So
 *  every nudge of the slider threw away wherever the practitioner had panned and zoomed to, which
 *  is precisely the detail they were adjusting the mark radius in order to see. The same path is
 *  taken by the basemap selector and the legend and halo toggles.
 *
 *  Asserted on the ZOOM AND CENTRE rather than on a screenshot, because the bug is about view
 *  state and a screenshot would also pass if the marks happened to look similar. */
const mountInteractive=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-leaflet')).toBeVisible();
};

test('the map keeps its view when a presentation setting changes',async({page})=>{
  await mountInteractive(page);

  // Zoom in twice, away from the fitted extent. Two clicks so the result cannot be confused with
  // the fit having landed on this zoom by coincidence.
  const view=async()=>{const el=page.locator('.catchment-leaflet');
    return {zoom:Number(await el.getAttribute('data-view-zoom')),
      lat:Number(await el.getAttribute('data-view-lat')),
      lng:Number(await el.getAttribute('data-view-lng'))};};
  const fitted=(await view()).zoom;
  await page.locator('.leaflet-control-zoom-in').click();
  await page.locator('.leaflet-control-zoom-in').click();
  const chosen=await view();
  expect(chosen.zoom).toBeGreaterThan(fitted);

  // THE REPORTED ACTION. Mark radius lives in the Inspector, so the slider is reached from the
  // workflow view and the map is remounted when Results is reopened.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  const slider=page.locator('[data-layer-size]').first();
  await slider.fill('7');
  await slider.dispatchEvent('change');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-leaflet')).toBeVisible();

  const after=await view();
  expect(after.zoom).toBe(chosen.zoom);
  // Centre to within a metre or so of a degree: panning is not asserted exactly because Leaflet
  // recomputes the centre from the container size, which a remount can change by a pixel.
  expect(Math.abs(after.lat-chosen.lat)).toBeLessThan(1e-4);
  expect(Math.abs(after.lng-chosen.lng)).toBeLessThan(1e-4);
});

test('a different map does not inherit this one\'s view',async({page})=>{
  const view=async()=>{const el=page.locator('.catchment-leaflet');
    return {zoom:Number(await el.getAttribute('data-view-zoom')),
      lat:Number(await el.getAttribute('data-view-lat')),
      lng:Number(await el.getAttribute('data-view-lng'))};};

  // THE OPPOSITE BUG, which the bounds half of the key exists to prevent. Remembering a view
  // unconditionally would leave a practitioner looking at the wrong extent whenever the data moved
  // -- worse than refitting, because nothing on screen would say so. Hagelloch is in Germany and
  // Snow's map is in London, so inheritance here would be unmistakable.
  await mountInteractive(page);
  await page.locator('.leaflet-control-zoom-in').click();
  await page.locator('.leaflet-control-zoom-in').click();
  const hagelloch=await view();

  await page.goto('/?example=snow-voronoi');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-leaflet')).toBeVisible();

  const snow=await view();
  // Fitted to its own layers rather than restored from the other map's key.
  expect(Math.abs(snow.lat-hagelloch.lat)).toBeGreaterThan(1);
  expect(Math.abs(snow.lng-hagelloch.lng)).toBeGreaterThan(1);
});
