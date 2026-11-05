import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

/** FIND SATELLITE PRODUCTS, from the palette to a chosen product (experiment 179). Products needing no sign-in come
 *  first; each says what it measures, its licence as read, and whether a browser can read it. Nothing is fetched. */
test.use({serviceWorkers:'block'});

test('a question about NO2 offers the open products first, and choosing one is summarised in the Inspector',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="find_satellite_products"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const id=saved.nodes.find(n=>n.type==='find_satellite_products').id;
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await expect(page.locator('#inspector-content')).toContainText('No product chosen yet');
  await page.locator('#satellite-find').click();
  const dialog=page.locator('#satellite-products-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#sat-question').fill('NO2 air pollution in New York City');
  const cards=dialog.locator('[data-sat-topic="no2"] .satellite-card');
  await expect(cards).toHaveCount(4);
  // The open one first: Planetary Computer's, no account, licence read.
  await expect(cards.first()).toContainText('Sentinel-5P · TROPOMI NO₂ (Planetary Computer)');
  await expect(cards.first()).toContainText('No account (anonymous token)');
  await expect(cards.first()).toContainText('Open: Legal notice on the use of Copernicus Sentinel Data');
  await expect(cards.first()).toContainText('mol m-2');
  await expect(dialog.locator('[data-sat-topic="no2"] .satellite-caution')).toContainText('not ground-level concentrations');
  await page.screenshot({path:'test-results/find-satellite-products.png'});
  await cards.first().locator('[data-sat-choose]').click();
  await expect(cards.first().locator('[data-sat-choose]')).toHaveText('Chosen');
  await dialog.locator('#sat-close').click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(after.nodes.find(n=>n.id===id).params).toMatchObject({topic:'no2',route:'pc-s5p-no2'});
  await expect(page.locator('#inspector-content')).toContainText('Change the product');
  await expect(page.locator('#inspector-content')).toContainText('Sentinel-5P · TROPOMI NO₂ (Planetary Computer)');
  // Ozone is Fieldwork's addition, and says it is a column, not surface ozone.
  await page.locator('#satellite-find').click();
  await dialog.locator('[data-sat-chip="ozone"]').click();
  await expect(dialog.locator('[data-sat-topic="ozone"] .satellite-caution')).toContainText('not surface ozone');
  expect(errors).toEqual([]);
});
