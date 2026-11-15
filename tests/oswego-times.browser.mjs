import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** OSWEGO'S FOUR QUESTIONS, as pinned (2026-11-15), each figure computed by hand from the CSV before the run: 44 of the
 *  46 ill with an onset date and time, from 3 PM on 18 April to 10 AM on 19 April, 10 at 1 AM; a median of 4 hours from
 *  the meal for the 21 with both times; vanilla ice cream 43 of 54 against 3 of 21. */
test.use({serviceWorkers:'block'});
const BUNDLE=new URL('../../example-1940-oswego-church-supper/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-1940-oswego-church-supper is not checked out beside this repository.';
const ID='urn:fieldwork:example:oswego-1940';
const open=async page=>{
  const bundle=readFileSync(BUNDLE);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-1940-oswego-church-supper\/[^/]+\/fieldwork-project\.json\.gz/,r=>r.fulfill({status:200,body:bundle}));
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
};
const inspector=page=>page.locator('#inspector-content');

test('Oswego by the hour, the hours from the meal, who fell ill, and the vanilla ice cream',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(300000);
  const errors=collectPageErrors(page);
  await open(page);
  // When did they fall ill?
  await run(page,'When did they fall ill?');
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const idOf=async type=>(await saved()).nodes.find(n=>n.type===type).id;
  await page.locator(`.react-flow__node[data-id="${await idOf('apply_ruleset')}"]`).click();
  await expect(inspector(page)).toContainText('2 records have no date and time');
  await expect(inspector(page)).toContainText('"12:00 AM*" is not a 12-hour time');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Epidemic curve by hour of onset'}).click();
  const main=page.locator('main').first();
  // The first hour and the last, as the line list has them; the cases counted, each ID once.
  await expect(main).toContainText('1940-04-18 15:00');
  await expect(main).toContainText('1940-04-19 10:00');
  await expect(main).not.toContainText('1940-04-19 11:00');
  await page.screenshot({path:'test-results/oswego-curve-by-hour.png',fullPage:true});
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${await idOf('case_series')}"]`).click();
  await expect(inspector(page)).toContainText('each ID once');
  // How long from the meal to illness?
  await run(page,'How long from the meal to illness?');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Median hours from the meal to onset'}).click();
  await expect(main.locator('tr',{hasText:'Y'}).first()).toContainText('4');
  await page.getByRole('tab',{name:'Each case, the meal and onset'}).click();
  await expect(main).toContainText('1940-04-18T20:00');
  // Who fell ill?
  await run(page,'Who fell ill?');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Ill or not, by age band'}).click();
  await expect(main).toContainText('60 and over');
  // Was it the vanilla ice cream?
  await run(page,'Was it the vanilla ice cream?');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Vanilla ice cream and illness'}).click();
  await expect(main).toContainText('5.57');
  await page.getByRole('tab',{name:'The ill who did not eat vanilla ice cream'}).click();
  await expect(main.locator('tbody tr')).toHaveCount(3);
  expect(errors).toEqual([]);
});
