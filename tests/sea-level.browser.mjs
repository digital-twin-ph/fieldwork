import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

// THE TWO SEA-LEVEL WIDGETS RETIRED (experiment 197), and took effect in 0.71.0. This file tested the workflow they ran,
// from 2026-10-09; what it must test now is what retirement promises: a workflow holding one is refused, by name, with
// where to find what replaced it, and nothing on the canvas changes. Their work is now Measure distance, Relate and the
// published ruleset compare-level-to-elevation, tested in sea-level-from-scratch.browser.mjs.
const fixture=JSON.parse(await readFile(new URL('./fixtures/sea-level-workflow-2026-10-09.json',import.meta.url),'utf8'));

test('a workflow holding a retired sea-level widget is refused by name',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  const before=await page.locator('.react-flow__node').count();

  await page.locator('#workflow-file').setInputFiles({name:'sea-level.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(fixture))});
  const toast=page.locator('#toast');
  await expect(toast).toContainText('Assign projection site, which was retired');
  await expect(toast).toContainText('docs/usage.md');
  await expect(page.locator('.react-flow__node')).toHaveCount(before);

  // Neither is offered for a new step.
  await expect(page.locator('#node-library [data-add="slr_site_assignment"]')).toHaveCount(0);
  await expect(page.locator('#node-library [data-add="slr_threshold_comparison"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
