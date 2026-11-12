import {test,expect} from './fixtures.mjs';

/** Reaching a node means being on the canvas: results became a tab on 2026-10-21, so selecting
 *  one is part of selecting a node rather than something every call site repeats. */
const node=async(page,id)=>{
  await page.locator('[data-view="workflow"]').click();
  return page.locator(`.react-flow__node[data-id="${id}"]`);
};

test('selecting an output node shows and marks its result',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // Three outputs, one question (experiment 210, 2026-11-12): the catchment map, its table and its chart. The curve,
  // the pump coordinates and Snow's spot map have workflows of their own. The catchment map is the FIRST tab.
  const tabs=page.locator('#result-tabs [data-output]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.first()).toContainText('map',{ignoreCase:true});

  // Selecting the chart node opens the chart's own tab and marks it as belonging to the selection.
  await (await node(page,'chart')).click();
  await page.locator('[data-view="results"]').click();
  const chartTab=page.locator('#result-tabs [data-output]').filter({hasText:'Deaths by catchment'}).first();
  await expect(chartTab).toHaveAttribute('aria-selected','true');
  await expect(chartTab).toHaveAttribute('data-linked','true');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toBeVisible();

  // Selecting the table node moves the Results panel with it.
  await (await node(page,'table')).click();
  await page.locator('[data-view="results"]').click();
  const tableTab=page.locator('#result-tabs [data-output]').filter({hasText:'Catchment counts'}).first();
  await expect(tableTab).toHaveAttribute('aria-selected','true');
  await expect(tableTab).toHaveAttribute('data-linked','true');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-linked="true"]')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#table-panel')).toBeVisible();

  // Selecting a node that produces no result leaves the open tab alone rather than blanking it.
  await (await node(page,'catchments')).click();
  await expect(tableTab).toHaveAttribute('aria-selected','true');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-linked="true"]')).toHaveCount(0);

  // Choosing a tab directly still works and does not fight the selection.
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output]').first().click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]').first()).toHaveAttribute('aria-selected','true');
});
