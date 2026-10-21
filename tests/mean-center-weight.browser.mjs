import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// Stage two of experiment 122's weighted mean centre: until this control existed, `weightField`
// could only arrive in an imported workflow, so no practitioner could reach it.
test('a mean centre can be weighted by a record attribute, and the receipt says which',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The original branch carries Snow's DEATHS attribute: 250 addresses holding 489 deaths.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();
  await expect(page.locator('#mean-center-weight')).toHaveValue('');
  await expect(page.locator('.inspector')).toContainText('Unweighted mean of projected point locations');
  await expect(page.locator('.inspector')).toContainText('250 addresses carrying 489 deaths have two different centres');

  await page.locator('#mean-center-weight').fill('DEATHS');
  await page.locator('#mean-center-weight').press('Tab');
  await expect(page.locator('.inspector')).toContainText('Weighted by');
  await expect(page.locator('.inspector')).toContainText('DEATHS');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The receipt asserts the field and the weight total BESIDE the point count, never instead of it.
  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('fw:weightField "DEATHS"');
  await expect(page.locator('#n3-preview')).toContainText('fw:weightTotal 489');
  await expect(page.locator('#n3-preview')).toContainText('fw:inputCount 250');

  // It survives a reload, because it is a saved parameter and not a session choice.
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();
  await expect(page.locator('#mean-center-weight')).toHaveValue('DEATHS');

  // Emptying it returns an unweighted run rather than leaving a stale weight behind.
  await page.locator('#mean-center-weight').fill('');
  await page.locator('#mean-center-weight').press('Tab');
  await expect(page.locator('.inspector')).toContainText('Unweighted mean of projected point locations');
  expect(errors).toEqual([]);
});

// The geomask rebuilds every feature with only a name, so the masked layer cannot be weighted at
// all. That is defensible for a privacy method and it is not obvious, so it is asserted here:
// the refusal names how many records lack the attribute rather than silently reading them as zero.
test('weighting the masked branch is refused with a count, because geomasking drops attributes',async({page})=>{
  collectPageErrors(page);
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="moved-center"]').click();
  await page.locator('#mean-center-weight').fill('DEATHS');
  await page.locator('#mean-center-weight').press('Tab');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('failed',{timeout:45000});
  await expect(page.locator('body')).toContainText('250 of 250 records hold no usable number');
});
