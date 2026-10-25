import {test,expect} from '@playwright/test';

/** SNOW'S OWN MAP, and the encoding its key promises.
 *
 *  Both John Snow workspaces drew a CATCHMENT map -- the Voronoi cells, or the walking-time
 *  bands -- and neither drew the figure the outbreak is remembered for: the deaths where they
 *  fell, and the pumps among them. A catchment is an argument about that map, not that map.
 *  Asked for by the practitioner on 2026-10-25.
 *
 *  Two defects were found building it, and the second is the one worth a test. Wiring the pumps
 *  to the `context` port drew nothing: `contextPoints` is drawn by the polygon renderer and this
 *  map has no polygons. Then, with the pumps wired as a second point layer, the key named them
 *  as orange squares and the plot drew 258 identical green dots -- `oldMap` coloured by status
 *  and ignored the layer symbols the legend, the interactive map and the receipt all use.
 *
 *  A legend that disagrees with its plot is worse than no legend, because the reader trusts it.
 *  The one distinction this figure exists to make is deaths here, pumps there. */
test('the spot map draws deaths and pumps as different marks, as its key says',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('[data-output="spot-map"]').click();

  // Both layers reached the plot. The pumps are a layer of their own, not context.
  const deaths=page.locator('#map .location[data-layer="locations"]');
  const pumps=page.locator('#map .location[data-layer="pumps"]');
  await expect(deaths.first()).toBeVisible({timeout:20000});
  expect(await deaths.count()).toBe(250);
  expect(await pumps.count()).toBe(8);

  // And they are drawn DIFFERENTLY. Marks are paths once a layer symbol is declared, so the two
  // layers must not share a path: identical `d` for a death and a pump is the defect returning.
  const deathMark=await deaths.first().locator('path').getAttribute('d');
  const pumpMark=await pumps.first().locator('path').getAttribute('d');
  expect(deathMark).toBeTruthy();
  expect(pumpMark).toBeTruthy();
  expect(pumpMark).not.toBe(deathMark);
  // Different hues too, which is the other half of what the key claims.
  expect(await pumps.first().locator('path').getAttribute('fill'))
    .not.toBe(await deaths.first().locator('path').getAttribute('fill'));

  // The key names both layers, so no mark on this figure is unexplained.
  const key=page.locator('#map-communication-key');
  await expect(key).toContainText('250 death locations');
  await expect(key).toContainText('pump locations');
  await page.screenshot({path:'test-results/snow-spot-map.png'});
});

/** MARK SIZE IS A SETTING, because density is a property of the data.
 *
 *  The practitioner, 2026-10-25, looking at Snow's 250 death addresses in a few Soho streets:
 *  *"the sizes of the marks should be adjustable so they do not all merge like a blob on the
 *  map"*. They do merge, and no single default can prevent it — the same figure carries eight
 *  pumps spread across the parish, which want a mark a reader can find. */
test('a layer mark can be resized, and the figure redraws where it stands',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="spot-map"]').click();
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="spot-map"]').click();

  const death=page.locator('#map .location[data-layer="locations"] path').first();
  const pump=page.locator('#map .location[data-layer="pumps"] path').first();
  // Measured from the rendered geometry rather than parsed out of the path string: a mark's `d`
  // carries absolute coordinates, so reading numbers out of it measures position, not size.
  const spanOf=mark=>mark.evaluate(el=>el.getBBox().width);
  const deathsBefore=await spanOf(death);
  const pumpsBefore=await spanOf(pump);

  // Shrink the dense layer only. No tab click and no view switch: the figure redraws in place.
  const slider=page.locator('[data-layer-size="locations"]');
  await expect(slider).toBeVisible();
  // Driven as a range input is driven: `fill` does not move a slider, so the value is set and
  // the change announced the way the browser would.
  await slider.evaluate(el=>{el.value='2';el.dispatchEvent(new Event('change',{bubbles:true}));});

  await expect.poll(async()=>await spanOf(death)).toBeLessThan(deathsBefore);
  // The OTHER layer is untouched, which is the whole point of it being per layer.
  expect(await spanOf(pump)).toBeCloseTo(pumpsBefore,5);
  // And a presentation choice does not make the run stale.
  await expect(page.locator('#workflow-state')).toContainText('Run complete');
});
