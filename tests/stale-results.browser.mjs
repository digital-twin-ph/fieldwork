import {test,expect} from '@playwright/test';

// "And a bug - when I deleted the Map, Street Network and Study Area, Result Map was still there."
//
// It was. The canvas read "Workflow 0" and the Results panel went on drawing a map of a study
// area that no longer existed. Keeping a result while a PARAMETER changes is deliberate --
// "Previous run · settings have changed" is how you compare before and after, and the node is
// still there to rerun. A result whose node is gone cannot be rerun to check it.
test('deleting the nodes that produced a result removes the result',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]').first()).toBeVisible();

  const ids=await page.locator('.react-flow__node').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  for(const id of ids){
  await page.locator('[data-view="workflow"]').click();
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#delete-node').click();
  }
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  // Nothing to show, and nothing shown.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(0);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-panel')).toBeHidden();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#run-summary')).toContainText('Run the workflow to see results');
});

test('deleting one output leaves the others, and a parameter change still keeps the previous run',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  const before=await page.locator('#result-tabs [data-output]').count();
  expect(before).toBeGreaterThan(1);

  await page.locator('[data-view="results"]').click();
  const victim=await page.locator('#result-tabs [data-output]').first().getAttribute('data-output');
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${victim}"]`).click();
  await page.locator('#delete-node').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(before-1);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator(`#result-tabs [data-output="${victim}"]`)).toHaveCount(0);

  // The deliberate half: change a setting and the previous run stays, because the node is still
  // there to rerun.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await page.locator('#catchment-zone').fill('31');
  await page.locator('#catchment-zone').blur();
  await expect(page.locator('#workflow-state')).toContainText('Changed');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(before-1);
});

/** AN OUTPUT IS ORPHANED BY ITS NODE GOING, NOT BY WHAT ITS NODE IS CALLED.
 *
 *  The prune stripped a trailing `-map` or `-table` from an output's node id before asking
 *  whether that node still existed. Nothing produces an id needing that — every output sets
 *  `nodeId: node.id` — so it only ever mis-fired, and it mis-fired on authored ids that happen to
 *  end that way.
 *
 *  `geoprivacy-example` has seven: before-map, before-table, after-move-map, after-move-table,
 *  comparison-map, after-group-map and after-group-table. None of the stems it strips to exists
 *  as a node, so deleting ANY node in that workspace dropped all seven at once, and the branch
 *  below that discards a result with nothing left in it then threw the whole run away.
 *
 *  Found 2026-10-25 by naming a node `spot-map` in the John Snow example: deleting the catchment
 *  map took Snow's own map with it, purely because of how it had been named. This is the
 *  workspace where it would have cost most, so it is the one that holds the line. */
test('outputs whose ids end in -map or -table survive a delete elsewhere',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  const ids=()=>page.locator('#result-tabs [data-output]').evaluateAll(els=>els.map(e=>e.dataset.output));
  const before=await ids();
  // The workspace is worth the test only if it actually carries the dangerous ids.
  expect(before.filter(id=>/-(map|table)$/.test(id)).length).toBeGreaterThan(1);

  // Delete a node that produced NO output, so nothing here should change at all.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();
  await page.locator('#delete-node').click();
  await page.locator('[data-view="results"]').click();

  const after=await ids();
  for(const id of before.filter(id=>/-(map|table)$/.test(id)))
    expect(after,`${id} was orphaned by its name, not by its node`).toContain(id);
});
