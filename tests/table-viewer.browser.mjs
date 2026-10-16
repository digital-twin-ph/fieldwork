import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "For tabular data, I should have a quick look button to browse the table as a modal. The
// Inspector panel is too narrow to display potentially wider tables." -- the practitioner,
// 2026-10-16. What a tabular input offered in that 292px panel was a filename, a row count and a
// <details> block of JSON describing the table's SHAPE: everything about the table except the
// table.
test('a tabular input opens its rows in a dialog, and changes nothing',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const saved=()=>page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
  const before=await saved();

  // The SIMULATED copy, so the gaps are visible in the rows themselves.
  await page.locator('.react-flow__node[data-id="gapped"]').click();
  await page.locator('#quick-look').click();
  const dialog=page.locator('#table-viewer');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('SIMULATED: three dates with no count recorded');

  // The table's own columns: what it is keyed by, then the one thing it measures.
  await expect(dialog.locator('th')).toHaveText(['#','date','deaths']);
  await expect(dialog.locator('tbody tr')).toHaveCount(43);
  await expect(dialog.locator('.records-rows')).toHaveText('43 of 43 rows');
  // A value nobody recorded reads as missing, not as a tidy blank: the difference is what a
  // rule over this column turns on.
  await expect(dialog.locator('.record-missing')).toHaveCount(3);
  // And the unit, stated rather than inferred.
  await expect(dialog).toContainText('One value column, deaths, in deaths');

  // Filtering narrows the rows and says how many of how many.
  await page.locator('#table-viewer-filter').fill('1854-09-0');
  await expect(dialog.locator('.records-rows')).toHaveText('9 of 43 rows');

  // It is a reader. Closing it leaves the workflow byte for byte as it was.
  await dialog.locator('#table-viewer-close').click();
  await expect(dialog).toBeHidden();
  expect(await saved()).toBe(before);
  expect(errors).toEqual([]);
});

// Point records are read in the same panel for the same reason.
test('a point input opens its records in the same dialog',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  await page.locator('.react-flow__node[data-id="locations"]').click();
  await page.locator('[data-records-quicklook]').click();
  const dialog=page.locator('#table-viewer');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('th')).toHaveText(['#','name','DEATHS','FID']);
  await expect(dialog).toContainText('250 records, 3 columns');
  await dialog.locator('#table-viewer-close').click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});
