import {test,expect} from '@playwright/test';

/** GROUND UNDER A STATIC FIGURE. Experiment 137.
 *
 *  The practitioner, 2026-10-25: *"There is no default basemap"*, and after re-importing South
 *  London, *"I still don't see the static map basemap"*. It was not a defect: choosing a basemap
 *  switched the map to the interactive presentation, which `catchment-map.ts` calls "the only one
 *  that draws tiles". So the figure this project most wants to publish was the one that could
 *  never have context under it.
 *
 *  The tiles are stubbed. A test that fetched tile.openstreetmap.org would be measuring somebody
 *  else's uptime, would break their usage policy by running on every gate, and would fail offline
 *  -- which is the condition this application is built for. */
const PNG=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478'
  +'9c6360000002000154a24f7e0000000049454e44ae426082','hex');

test.use({serviceWorkers:'block'});

test('a static map bakes raster tiles in, and credits them in the figure',async({page})=>{
  let requests=0;
  await page.route(/tile\.openstreetmap\.org/,route=>{requests++;
    route.fulfill({status:200,contentType:'image/png',body:PNG});});

  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  // NOTHING IS FETCHED UNTIL A BASEMAP IS CHOSEN, which is the privacy condition: a tile request
  // carries no records, but its z/x/y IS the viewed extent, so it must never happen by default.
  expect(requests).toBe(0);

  const mapNode=page.locator('.react-flow__node[data-id="access-map"]');
  await mapNode.click();
  await page.locator('#map-basemap').selectOption('osm');
  await page.locator('[data-view="results"]').click();

  // The tiles are IN the figure, as data URIs, so the exported SVG carries its own ground.
  const tiles=page.locator('#map [data-basemap="osm"] image');
  await expect(tiles.first()).toBeAttached({timeout:20000});
  expect(await tiles.count()).toBeGreaterThan(0);
  expect(requests).toBeGreaterThan(0);
  expect(await tiles.first().getAttribute('href')).toMatch(/^data:image\/png;base64,/);

  // Drawn UNDER the workflow's own marks: ground is layer 0.
  const firstChild=await page.locator('#map').evaluate(el=>el.firstElementChild?.getAttribute('data-basemap'));
  expect(firstChild).toBe('osm');

  // AND CREDITED. ODbL attaches to the copy, and a figure is exactly the artefact that travels
  // away from the application that drew it.
  await expect(page.locator('#map-note')).toContainText('OpenStreetMap contributors');
  await expect(page.locator('#map-note')).toContainText('ODbL');
});

test('a vector style says why it cannot be baked, rather than drawing nothing',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();
  await page.locator('#map-basemap').selectOption('ofm-positron');
  await page.locator('[data-view="results"]').click();

  // Refused by name. A control that silently does nothing reads as broken.
  await expect(page.locator('#map-note')).toContainText('vector tiles',{timeout:20000});
  await expect(page.locator('#map [data-basemap]')).toHaveCount(0);
});
