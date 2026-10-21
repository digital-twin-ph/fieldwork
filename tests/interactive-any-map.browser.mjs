import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "It seems the Interactive Map option does not work" -- the practitioner, 2026-10-17, the
// FOURTH report of this. The inner condition was widened on 2026-10-15 with a comment saying
// "a study area with points on it is a map like any other ... Reported three times before the
// cause turned out to be here", and the enclosing `if(result?.polygons)` was left in place. The
// fix was written and then fenced off by the guard above it.
//
// Worked example 11 is points and a study area and no polygons at all, so it is the case the
// guard excluded.
test('a points-only map can be interactive, and draw tiles',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // No polygons anywhere in this example: that is the point of using it here.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.nodes.some(n=>n.type==='voronoi'||n.type==='isochrone')).toBe(false);

  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // The interactive map mounts and the static SVG steps aside.
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.locator('.leaflet-marker-icon, .leaflet-interactive')).toHaveCount(188);

  // And the basemap is reachable, which it was not before: only the interactive presentation
  // draws tiles, so a map that could not be interactive could not have one.
  const basemap=page.locator('[data-basemap]');
  await expect(basemap).toHaveCount(1);
  // The offline default and at least one raster source. The full list is the OpenFreeMap test's
  // business; this one is about the interactive presentation being reachable at all.
  await expect(basemap.locator('option')).toContainText(['None · works offline']);
  await basemap.selectOption('osm');
  await expect.poll(()=>page.locator('.leaflet-tile').count(),{timeout:20000}).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});
