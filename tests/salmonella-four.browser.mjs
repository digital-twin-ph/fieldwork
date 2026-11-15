import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** SALMONELLA'S FOUR LATER QUESTIONS, as pinned (2026-11-15), each figure counted from the published CSV before the run:
 *  19 of 32 cases female (59.4%) against 70 of 110 classical controls (63.6%); Galia melon 12/3 against 20/107, odds
 *  ratio 21.4; 23 of the 32 cases never shop at an organic shop (bioladen 4); 11 cases in Baden-Württemberg, 0 in
 *  Bremen, 16 of 16 Länder carrying a value. */
test.use({serviceWorkers:'block'});
const BUNDLE=new URL('../../example-2021-salmonella-germany/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-2021-salmonella-germany is not checked out beside this repository.';
const ID='urn:fieldwork:example:salmonella-germany-2021';
const open=async page=>{
  const bundle=readFileSync(BUNDLE);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2021-salmonella-germany\/[^/]+\/fieldwork-project\.json\.gz/,r=>r.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator(`[data-open-example="${ID}"]`).click();
  await expect(page.locator(`[data-example-status="${ID}"]`)).toContainText('digest matched',{timeout:60000});
};
const run=async(page,named)=>{
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:named});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
};
const tab=(page,name)=>page.getByRole('tab',{name}).click();

test('Salmonella: who the cases were, every food, where the cases shopped and where they lived',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(300000);
  const errors=collectPageErrors(page);
  await open(page);
  const main=page.locator('main').first();

  await run(page,'Who were the cases?');
  await tab(page,'Sex, cases and classical controls');
  await expect(main).toContainText('59.4');
  await expect(main).toContainText('63.6');

  await run(page,'Which foods did cases eat more often than classical controls?');
  await expect(main).toContainText('galiamelo2');
  await expect(main).toContainText('21.4');
  await expect(main).toContainText('trockenobst2');
  // The four cells in words beside their letters; controls, because the design is declared case-control.
  for(const said of ['a: exposed cases','b: exposed controls','c: unexposed cases','d: unexposed controls'])
    await expect(main.locator('th',{hasText:said}).first()).toBeVisible();

  await run(page,'Where did the cases shop?');
  await tab(page,'How often the cases shop at an organic shop');
  await expect(main).toContainText('never');
  await expect(main).toContainText('23');

  await run(page,'Where did the cases live?');
  await tab(page,'Cases in each Land');
  await expect(main).toContainText('DE-BW');
  await expect(main).toContainText('11');
  await tab(page,'Cases by federal state');
  // Nine Länder at 0 put two quantile breaks on 0; merged, the key has four classes and none is empty.
  await expect(main).toContainText('16 polygons');
  for(const said of ['cases: 0','1','2 to 5','6 to 11'])await expect(main.getByText(said,{exact:true}).first()).toBeVisible();
  await expect(main).not.toContainText('0.00 to 0.00');
  await expect(main).toContainText('4 quantile classes, tied values kept in one class');
  // The key has its own band under the map, so a basemap never runs under its labels (2026-11-15).
  await expect(page.locator('#map [data-plot-key-band]')).toHaveCount(1);
  // The authored notes on the melons, under Results and Discussion.
  await page.locator('[data-view="notes"]').click();
  await expect(page.locator('main').first()).toContainText('Galia melon eaten in the week after Easter has an odds ratio of 15.6');
  await expect(page.locator('main').first()).toContainText('6 of the 10 who ate watermelon also ate Galia melon');
  expect(errors).toEqual([]);
});
