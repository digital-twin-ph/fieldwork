import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "I cannot make sense of the green error dialog because I cannot see the columns against which
// rules are made." -- the practitioner, 2026-10-15. An input's Inspector listed twelve record
// NAMES and nothing else, while the ruleset next door asked which column meant which field.
test('an input shows its records as columns and rows, and as the JSON they are',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});

  await page.locator('.react-flow__node[data-id="sites"]').click();
  const table=page.locator('.record-table');
  await expect(table).toBeVisible();
  // Every column a rule could read, named as the records name it.
  await expect(table.locator('th')).toHaveText(['#','name','category','wait_minutes','open_today']);
  await expect(table.locator('tbody tr')).toHaveCount(10);

  // "Show me all of them" is reachable: 13 records offer 10 and 25.
  await page.selectOption('[data-records-rows]','25');
  await expect(table.locator('tbody tr')).toHaveCount(13);

  // A value nobody recorded reads as missing rather than as a tidy blank -- it is the case the
  // rules have to handle, and step 1 of this example concludes Unrecorded for it.
  await expect(page.locator('.record-missing').first()).toHaveText('not recorded');

  // And the JSON, because a rule reads what is actually there: a null, a number written as
  // text, a key nobody expected.
  await page.locator('[data-records-view="json"]').click();
  await expect(page.locator('.record-json')).toContainText('"wait_minutes"');
  await expect(page.locator('.record-table')).toHaveCount(0);

  // None of this is part of the workflow: it is how somebody is looking, not what is computed.
  const saved=await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
  expect(saved).not.toContain('records-view');
  expect(errors).toEqual([]);
});

// A stopped run used to arrive in the same green as "Complete in 280 ms", and faded after five
// seconds whether or not it had been read.
test('a stopped run is reported as a failure, and stays until it is closed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});
  const toast=page.locator('#toast');
  await expect(toast).not.toHaveClass(/failure/);

  // Take the unit off a field the rules compare, which the run refuses by name.
  await page.locator('.react-flow__node[data-id="wait"]').click();
  await page.locator('[data-field-unit]').first().fill('');
  await page.locator('[data-field-unit]').first().press('Tab');
  await page.locator('#run-button').click();
  await expect(toast).toHaveClass(/failure/,{timeout:20000});
  await expect(toast).toContainText('states no unit');
  await expect(page.locator('#workflow-state')).toHaveText('Run failed');

  // Still there well after a success would have gone.
  await page.waitForTimeout(6000);
  await expect(toast).toHaveClass(/visible/);
  await toast.locator('button').click();
  await expect(toast).not.toHaveClass(/visible/);
  expect(errors).toEqual([]);
});
