import {test,expect} from '@playwright/test';

const expanded=page=>page.locator('.work-area').evaluate(el=>el.classList.contains('results-expanded'));

test('selecting a comparison node shows its result without taking over the screen',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // A run that produces a side-by-side comparison may expand the pane once. Put the layout back,
  // which is what a reader does when they want the canvas again.
  if(await expanded(page))await page.locator('#expand-results').click();
  expect(await expanded(page)).toBe(false);

  // Selecting the comparison node must show its result and leave the layout alone: the click was
  // aimed at a node, not at the window.
  await page.locator('.react-flow__node[data-id="comparison-map"]').click();
  await expect(page.locator('#result-tabs [data-output="comparison-map"]')).toHaveAttribute('aria-selected','true');
  expect(await expanded(page)).toBe(false);
  await expect(page.locator('#canvas')).toBeVisible();

  // Selecting away and back must not expand it either.
  await page.locator('.react-flow__node[data-id="before-map"]').click();
  await page.locator('.react-flow__node[data-id="comparison-map"]').click();
  expect(await expanded(page)).toBe(false);

  // Choosing the tab directly behaves the same way.
  await page.locator('#result-tabs [data-output="before-map"]').click();
  await page.locator('#result-tabs [data-output="comparison-map"]').click();
  expect(await expanded(page)).toBe(false);

  // Expanding is still available on purpose.
  await page.locator('#expand-results').click();
  expect(await expanded(page)).toBe(true);
  await expect(page.locator('#expand-results')).toHaveAttribute('aria-expanded','true');
});

test('a fresh run of the comparison still expands the pane once',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  if(await expanded(page))await page.locator('#expand-results').click();
  await page.locator('#result-tabs [data-output="comparison-map"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  expect(await expanded(page)).toBe(true);
});
