import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "Map still does not have a basemap also." -- the practitioner on the shipped build,
// 2026-10-15, after the same report the day before. Both were true, and the second one was
// about reach rather than capability: the basemap control appeared only once a map was
// ALREADY in the interactive presentation, which is a selector further down the same panel.
// Five of the ten maps in the worked examples were two clicks from a basemap and nothing
// said so. Choosing a basemap now takes the map to a presentation that can draw it.

test('a basemap can be chosen on a static plot, and the map becomes one that can draw it',async({page})=>{
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
  await expect(page.locator('#inspector-content')).toContainText('This map is a static plot today');
  await expect(page.locator('#polygon-presentation')).toHaveValue('plot');

  await basemap.selectOption('osm');
  // Both halves move together: the choice is recorded and the presentation can honour it.
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const map=(w.nodes||[]).find(n=>n.id==='map');
    return `${map?.params?.basemap}/${map?.params?.presentation}`;
  })).toBe('osm/interactive');
  await expect(page.locator('#polygon-presentation')).toHaveValue('interactive');

  // And back to none leaves the presentation where the practitioner put it, rather than
  // undoing a change they may now want.
  await page.locator('#map-basemap').selectOption('none');
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const map=(w.nodes||[]).find(n=>n.id==='map');
    return `${map?.params?.basemap}/${map?.params?.presentation}`;
  })).toBe('none/interactive');
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
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const map=(w.nodes||[]).find(n=>n.id==='access-map');
    return `${map?.params?.basemap}/${map?.params?.presentation}`;
  })).toBe('osm/interactive');
  expect(errors).toEqual([]);
});
