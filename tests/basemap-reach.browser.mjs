import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "Map still does not have a basemap also." -- the practitioner on the shipped build,
// 2026-10-15, after the same report the day before. Both were true, and the second one was
// about reach rather than capability: the basemap control appeared only once a map was
// ALREADY in the interactive presentation, which is a selector further down the same panel.
// Five of the ten maps in the worked examples were two clicks from a basemap and nothing
// said so. Choosing a basemap now takes the map to a presentation that can draw it.
//
// REVISED 2026-10-25, when the static plot learned to draw tiles itself (experiment 137). This
// asserted that ANY basemap moved the map to the interactive presentation, which was right while
// MapLibre was the only renderer that could draw one. A raster style is now baked into the static
// figure, so only the vector styles still move it -- and the practitioner met the old rule as a
// defect: *"I still don't see the static map basemap"*, after choosing one had quietly taken the
// map away from the presentation they wanted.

test('a raster basemap is drawn into the static plot, and a vector one is not offered there',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();

  // Offered on a static plot, which is how every shipped map starts.
  const basemap=page.locator('#map-basemap');
  await expect(basemap).toBeVisible();
  await expect(basemap).toHaveValue('none');
  await expect(page.locator('#inspector-content')).toContainText('drawn into the figure itself');
  await expect(page.locator('#polygon-presentation')).toHaveValue('plot');

  const recorded=async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const map=(w.nodes||[]).find(n=>n.id==='map');
    return `${map?.params?.basemap}/${map?.params?.presentation}`;
  });

  // A RASTER STYLE LEAVES THE PRESENTATION ALONE, because the static plot bakes the tiles in.
  // Moving the map here is what made the control look broken: the practitioner chose a basemap
  // and the figure they were looking at was replaced by a different renderer.
  await basemap.selectOption('osm');
  await expect.poll(recorded).toBe('osm/plot');
  await expect(page.locator('#polygon-presentation')).toHaveValue('plot');

  // A VECTOR STYLE IS NOT OFFERED HERE AT ALL, from 2026-10-27. It used to be, and choosing one
  // moved the map to the interactive presentation so it could be drawn. The practitioner's rule
  // reversed that: *"if I change the map type to static, it should show only which basemaps are
  // available for that type"* -- so the map type is chosen first and the list follows it, and a
  // basemap that silently changed the map type would invert the rule.
  await expect(basemap.locator('option[value="ofm-positron"]')).toHaveCount(0);
  await expect(basemap.locator('option[value="ofm-liberty"]')).toHaveCount(0);

  // Changing the map type is what reaches them, and the list follows immediately.
  await page.locator('#polygon-presentation').selectOption('interactive');
  await expect(basemap.locator('option[value="ofm-positron"]')).toHaveCount(1);
  await basemap.selectOption('ofm-positron');
  await expect.poll(recorded).toBe('ofm-positron/interactive');

  // And back to none leaves the presentation where the practitioner put it, rather than
  // undoing a change they may now want.
  await page.locator('#map-basemap').selectOption('none');
  await expect.poll(recorded).toBe('none/interactive');
  expect(errors).toEqual([]);
});

// "The map output widget on 0.8.1 has no basemap. We talked about basemap as Layer 0 in
// docs/widgets!" -- the practitioner, 2026-10-15, the third report of the same thing. The first
// two were about reach; this one was a regression I introduced removing input mode, which left
// the basemap control gated on `inputMode==='polygons'` -- a parameter that no longer means
// anything. Underneath it was the deeper cause: only the interactive presentation can draw tiles,
// and the interactive renderer REQUIRED polygons, so a map of a study area and points could not
// have a basemap however the control was gated.
test('a map with no polygons can still take a basemap',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=old-naledi');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();

  // Offered. It was absent entirely on this map before: decisions, not polygons.
  await expect(page.locator('#map-basemap')).toBeVisible();
  await expect(page.locator('#inspector-content')).toContainText('A basemap is layer 0');
  await page.locator('#map-basemap').selectOption('osm');
  // Recorded, and the map stays the static plot it was: the tiles come to the figure.
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const map=(w.nodes||[]).find(n=>n.id==='access-map');
    return `${map?.params?.basemap}/${map?.params?.presentation??'plot'}`;
  })).toBe('osm/plot');
  expect(errors).toEqual([]);
});
