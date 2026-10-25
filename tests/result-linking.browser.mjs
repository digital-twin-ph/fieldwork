import {test,expect} from '@playwright/test';

/** Reaching a node means being on the canvas: results became a tab on 2026-10-21, so selecting
 *  one is part of selecting a node rather than something every call site repeats. */
const node=async(page,id)=>{
  await page.locator('[data-view="workflow"]').click();
  return page.locator(`.react-flow__node[data-id="${id}"]`);
};

test('selecting an output node shows and marks its result',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // Six outputs in this workspace: a map, a table, a chart of the catchments, the epidemic curve
  // from Snow's own daily table, the pump coordinates in EPSG:32630 (2026-10-14) -- the frame the
  // catchments are measured in -- and Snow's own spot map of deaths and pumps (2026-10-25), which
  // neither John Snow workspace had: both drew a catchment map, and a catchment is an argument
  // about Snow's map rather than that map. The catchment map must remain the FIRST tab: result
  // tabs follow node order, the projected table briefly displaced it, and the example opened on a
  // list of eastings instead of the cholera map.
  const tabs=page.locator('#result-tabs [data-output]');
  await expect(tabs).toHaveCount(6);
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
