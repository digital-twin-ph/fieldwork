import {test,expect} from './fixtures.mjs';
import {inMapSettings} from './map-settings.mjs';
import assert from 'node:assert/strict';

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
  await page.goto('/?example=snow-deaths');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('[data-output="spot-map"]').click();
  // Each address's mark in proportion to its deaths, and the key says so (experiment 210, 2026-11-12).
  await expect(page.locator('main').first()).toContainText('the area of each mark shows DEATHS, 1 to 15');

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
  await page.goto('/?example=snow-deaths');
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

  // Shrink the dense layer only, in Configure… (experiment 186). No tab click and no view switch: Apply redraws in place.
  await inMapSettings(page,async d=>{
    const slider=d.locator('[data-layer-size="locations"]');
    await expect(slider).toBeVisible();
    // Driven as a range input is driven: `fill` does not move a slider, so the value is set and
    // the change announced the way the browser would.
    await slider.evaluate(el=>{el.value='2';el.dispatchEvent(new Event('change',{bubbles:true}));});
  });

  await expect.poll(async()=>await spanOf(death)).toBeLessThan(deathsBefore);
  // The OTHER layer is untouched, which is the whole point of it being per layer.
  expect(await spanOf(pump)).toBeCloseTo(pumpsBefore,5);
  // And a presentation choice does not make the run stale.
  await expect(page.locator('#workflow-state')).toContainText('Run complete');
});

// MANAGE LAYERS ORDERS THE MARKS (the practitioner, 2026-11-12: the pumps would not come to the top). The order set in
// the dialog is drawn at once, without a run: the layer last in the stack is drawn last, over the others.
test('moving a layer in Manage layers redraws the marks in that order, at once',async({page})=>{
  await page.goto('/?example=snow-deaths');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  const topLayer=()=>page.locator('#map g.location').last().getAttribute('data-layer');
  const open=async()=>{await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="spot-map"]').click();
    await page.locator('[data-manage-layers]').first().click();await expect(page.locator('#layer-dialog')).toBeVisible();};
  const show=async()=>{await page.locator('#layer-dialog-close, #layer-dialog [data-close]').first().click().catch(()=>{});
    await page.keyboard.press('Escape').catch(()=>{});await page.locator('[data-view="results"]').click();await page.locator('[data-output="spot-map"]').click();};
  await page.locator('[data-view="results"]').click();await page.locator('[data-output="spot-map"]').click();
  await expect.poll(topLayer).toBe('pumps');
  await open();
  // Pumps down one: the deaths now over them.
  await page.locator('[data-layer-move="points_2"][data-direction="up"]').click();
  await show();
  await expect.poll(topLayer).toBe('locations');
  await open();
  await page.locator('[data-layer-move="points_2"][data-direction="down"]').click();
  await show();
  await expect.poll(topLayer).toBe('pumps');
});

// A PANE PER LAYER, so the stack is structural. The practitioner, 2026-11-23, reading z-indices of 10,000 and
// 100,000,000 on the interactive map: *"Why do we have 10,000 layers when the points really are a layer group?"*
// They are a group, and the groups were already built -- for switching on and off, which reserves no z of its own.
// Order was arithmetic, visibility was structural, and the two knew nothing about each other: a layer the list
// could not name took the fallback rank, x 10,000, and sat above everything no matter where it was put.
test('each point layer draws in its own pane, and Manage layers moves the pane',async({page})=>{
  await page.goto('/?example=snow-deaths');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  // The spot map is a figure; the panes are the interactive map's, so it is drawn as one here.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="spot-map"]').click();
  await inMapSettings(page,d=>d.locator('#polygon-presentation').selectOption('interactive'));
  await page.locator('[data-view="results"]').click();await page.locator('[data-output="spot-map"]').click();
  await expect(page.locator('.catchment-leaflet')).toBeVisible({timeout:30000});
  /** EACH LAYER'S PANE AND ITS DEPTH, told apart by how many marks are in it: eight pumps and 250 deaths. A mark's
   *  own z within a pane is Leaflet's latitude ordering, which is what the stride used to reserve room for; it is
   *  not read here, because that is the ordering panes exist to leave alone. */
  const panes=async()=>page.evaluate(()=>{
    const out={};
    for(const mark of document.querySelectorAll('.catchment-point-mark')){
      const pane=mark.closest('.leaflet-pane');
      const name=pane&&[...pane.classList].find(c=>/^leaflet-fw-marks-\d+-pane$/.test(c));
      if(!name)continue;
      const held=out[name]??(out[name]={z:Number(getComputedStyle(pane).zIndex),marks:0});
      held.marks++;
    }
    return out;});
  const depthOf=async()=>{
    const found=Object.entries(await panes()).map(([pane,v])=>({pane,...v}));
    return {pumps:found.find(p=>p.marks<50),deaths:found.find(p=>p.marks>=50),count:found.length};
  };
  const first=await depthOf();
  assert.equal(first.count,2,'one pane per point layer, and no layer sharing');
  assert.ok(first.pumps&&first.deaths,'both layers are in a layer pane of their own');
  // Eight pumps over 250 deaths without anybody asking: the smaller layer is the one a swarm can hide.
  assert.ok(first.pumps.z>first.deaths.z,`pumps ${first.pumps.z} over deaths ${first.deaths.z}`);
  // AND NO ARITHMETIC: every pane sits between Leaflet's marker pane and its tooltips, so a tooltip and a popup
  // are still over every mark however many layers there are.
  for(const entry of [first.pumps,first.deaths])assert.ok(entry.z>600&&entry.z<650,`${entry.pane} at ${entry.z}`);
  // Moved in Manage layers, the marks change pane -- the position IS the pane.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="spot-map"]').click();
  await page.locator('[data-manage-layers]').first().click();
  await page.locator('[data-layer-move="points_2"][data-direction="up"]').click();
  await page.keyboard.press('Escape').catch(()=>{});
  await page.locator('[data-view="results"]').click();await page.locator('[data-output="spot-map"]').click();
  await expect(page.locator('.catchment-leaflet')).toBeVisible({timeout:30000});
  await expect.poll(async()=>{const now=await depthOf();return !!now.deaths&&!!now.pumps&&now.deaths.z>now.pumps.z;}).toBe(true);
});
