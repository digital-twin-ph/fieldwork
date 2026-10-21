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
  await expect(page.locator('#result-tabs [data-output]').first()).toBeVisible();

  const ids=await page.locator('.react-flow__node').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  for(const id of ids){
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#delete-node').click();
  }
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  // Nothing to show, and nothing shown.
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(0);
  await expect(page.locator('#map-panel')).toBeHidden();
  await expect(page.locator('#run-summary')).toContainText('Run the workflow to see results');
});

test('deleting one output leaves the others, and a parameter change still keeps the previous run',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  const before=await page.locator('#result-tabs [data-output]').count();
  expect(before).toBeGreaterThan(1);

  const victim=await page.locator('#result-tabs [data-output]').first().getAttribute('data-output');
  await page.locator(`.react-flow__node[data-id="${victim}"]`).click();
  await page.locator('#delete-node').click();
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(before-1);
  await expect(page.locator(`#result-tabs [data-output="${victim}"]`)).toHaveCount(0);

  // The deliberate half: change a setting and the previous run stays, because the node is still
  // there to rerun.
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await page.locator('#catchment-zone').fill('31');
  await page.locator('#catchment-zone').blur();
  await expect(page.locator('#workflow-state')).toContainText('Changed');
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(before-1);
});
