import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// Experiment 117 — data quality. The practitioner, 2026-10-16: "If we have situation (c) how
// will the user resolve it in the widget UI modal dialog? Where the opportunity exists to
// address the gap?" There was none: the alert's advice sent them out of the application, or
// silently gutted the rules, or told them to publish with a quarter of the records unclassified.
test('a column profile names the problem, and the repair is offered where the values are',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The run reports 66 records it could not read, across C and D.
  await expect(page.locator('#toast')).toContainText('66 records could not be read as declared');
  await page.locator('#toast button').last().click();

  // D · the damaged copy. Open the rows, where the offending values are.
  await page.locator('.react-flow__node[data-id="texty"]').click();
  await page.locator('[data-records-quicklook]').click();
  const dialog=page.locator('#table-viewer');
  await expect(dialog).toBeVisible();

  // The column says what it is and what is wrong with it, above the values it says it about.
  const header=dialog.locator('th').filter({hasText:'DEATHS'});
  await expect(header).toContainText('declared number');
  await expect(header).toContainText('63 not numbers');
  // And its shape, which is awareness rather than a finding: a rank-based fence, counted and
  // never called an outlier, because whether a value is one is a judgement about what was
  // measured.
  await expect(header).toContainText('median');
  await expect(header).toContainText('beyond 1.5×IQR');
  // The offending cells are marked where they are, so it is visible WHICH rows are the problem.
  expect(await dialog.locator('.cell-mismatch').count()).toBeGreaterThan(0);

  // The repair states its count before it is pressed, not after.
  const repair=dialog.locator('[data-repair]');
  await expect(repair).toHaveText('Read 63 values as numbers');
  await repair.click();
  await expect(dialog).toBeHidden();

  // It reports what it did and how to undo it, and waits to be read.
  const toast=page.locator('#toast');
  await expect(toast).toContainText('63 values now read as numbers');
  await expect(toast).toContainText('Undo reverses this; the file itself is untouched');
  await expect(toast).toHaveClass(/notice/);
  await page.waitForTimeout(6000);
  await expect(toast).toHaveClass(/visible/,{timeout:1000});
  await toast.locator('button').last().click();

  // And the run proves it: the 63 are gone, and C's three genuine gaps remain, because no
  // repair is offered for a missing value — filling one would be imputation, which is a
  // modelling decision and not a widget's to make.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(toast).toContainText('3 records could not be read as declared');
  await expect(toast).not.toContainText('counts it cannot read');
  await expect(page.locator('.react-flow__node[data-id="text-building"] .node')).not.toHaveClass(/alerting/);
  expect(errors).toEqual([]);
});

// A repair alters the records a workflow emits, so the run has to say so. A workflow whose data
// has been changed and does not state it is what this application exists not to produce.
test('a repair is stated in the run evidence',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('#toast button').last().click();
  await page.locator('.react-flow__node[data-id="texty"]').click();
  await page.locator('[data-records-quicklook]').click();
  await page.locator('#table-viewer [data-repair]').click();
  await page.locator('#toast button').last().click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  await page.locator('[data-view="rules"]').click();
  const n3=page.locator('#n3-preview');
  await expect(n3).toContainText('fw:ColumnRepair');
  await expect(n3).toContainText('fw:boundAttribute "DEATHS"');
  await expect(n3).toContainText('fw:repairedRecordCount "63"');
  await expect(n3).toContainText('fw:unrepairedRecordCount "0"');
  expect(errors).toEqual([]);
});
