import {test,expect} from './fixtures.mjs';
import {existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE RATE RATIO IN THE TWO-BY-TWO, read off the screen (experiment 161, step 6). South London's water-company
 *  workflow reads Table IX as events and units at risk; the Inspector says so, the figure carries a1, n1, a0, n0 and
 *  each company's rate, and the ratio is the 8.40 the retired Rate ratio widget reported. */

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('Table IX is read as events and units at risk, and gives 8.40',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText(/imported with \d+ workflows/,{timeout:30000});

  await page.locator('[data-view="workflow"]').click();
  const water=page.locator('#workflow-select option',{hasText:'Deaths per house, by water company'});
  await page.locator('#workflow-select').selectOption(await water.getAttribute('value'));

  // The Inspector states the layout, and offers the values of the outcome column it reads.
  await page.locator('.react-flow__node[data-id="ratio"]').click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('deaths per houses');
  await page.locator('#configure-step').click();
  await expect(page.locator('#twobytwo-layout')).toHaveValue('rates');
  await expect(page.locator('#twobytwo-case')).toHaveValue('deaths');
  await expect(page.locator('#twobytwo-units')).toHaveValue('houses');
  // The four-cell controls are not offered: this layout has no non-case and no a, b, c, d to map.
  await expect(page.locator('#twobytwo-noncase')).toHaveCount(0);
  await expect(page.locator('#twobytwo-rows')).toHaveCount(0);
  await page.locator('#two-by-two-config #config-cancel').click();

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs').getByText('Cholera deaths and houses supplied, by company').click();

  const statement=page.locator('#result-statement');
  await expect(statement).toContainText('a rate ratio of 8.40 (95% interval 6.84 to 10.32, log-normal)');
  await expect(statement).toContainText('Declared as a cohort study, 1854. The unit of analysis is the house.');
  // The four-cell licence's reason speaks of a/(a+b), which is false of events over houses.
  await expect(statement).not.toContainText('a/(a+b)');
  const figure=statement.locator('table.two-by-two[data-layout="rates"]');
  for(const text of ['a1','n1','a0','n0','1,263','40,046','98','26,107','0.031539','0.0037538'])
    await expect(figure).toContainText(text);
  await expect(statement).toContainText('Rest of London');

  // Snow's own scale, from the Rate beside it.
  await page.locator('#result-tabs').getByText('Cholera deaths per 10,000 houses, by company').click();
  await expect(page.locator('#table-panel')).toContainText('315.38');
  expect(errors).toEqual([]);
});

test('switching the layout back to cases and non-cases restores the four cells',async({page})=>{test.skip(!!skip,skip);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText(/imported with \d+ workflows/,{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  const water=page.locator('#workflow-select option',{hasText:'Deaths per house, by water company'});
  await page.locator('#workflow-select').selectOption(await water.getAttribute('value'));
  await page.locator('.react-flow__node[data-id="ratio"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#twobytwo-layout').selectOption('cases');
  await expect(page.locator('#twobytwo-noncase')).toBeVisible();
  await expect(page.locator('#twobytwo-units')).toHaveCount(0);
  await expect(page.locator('#two-by-two-config .map-cell')).toHaveCount(4);
  await page.locator('#two-by-two-config #config-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.nodes.find(n=>n.id==='ratio').params.unitsAtRiskValue).toBeUndefined();
});
