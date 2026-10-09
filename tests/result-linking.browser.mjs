import {test,expect} from '@playwright/test';

const node=(page,id)=>page.locator(`.react-flow__node[data-id="${id}"]`);

test('selecting an output node shows and marks its result',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // Four outputs in this workspace: a map, a table, a chart of the catchments, and the epidemic
  // curve from Snow's own daily table.
  const tabs=page.locator('#result-tabs [data-output]');
  await expect(tabs).toHaveCount(4);

  // Selecting the chart node opens the chart's own tab and marks it as belonging to the selection.
  await node(page,'chart').click();
  const chartTab=page.locator('#result-tabs [data-output]').filter({hasText:'Deaths by catchment'}).first();
  await expect(chartTab).toHaveAttribute('aria-selected','true');
  await expect(chartTab).toHaveAttribute('data-linked','true');
  await expect(page.locator('#bars-panel')).toBeVisible();

  // Selecting the table node moves the Results panel with it.
  await node(page,'table').click();
  const tableTab=page.locator('#result-tabs [data-output]').filter({hasText:'Catchment counts'}).first();
  await expect(tableTab).toHaveAttribute('aria-selected','true');
  await expect(tableTab).toHaveAttribute('data-linked','true');
  await expect(page.locator('#result-tabs [data-linked="true"]')).toHaveCount(1);
  await expect(page.locator('#table-panel')).toBeVisible();

  // Selecting a node that produces no result leaves the open tab alone rather than blanking it.
  await node(page,'catchments').click();
  await expect(tableTab).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#result-tabs [data-linked="true"]')).toHaveCount(0);

  // Choosing a tab directly still works and does not fight the selection.
  await page.locator('#result-tabs [data-output]').first().click();
  await expect(page.locator('#result-tabs [data-output]').first()).toHaveAttribute('aria-selected','true');
});
