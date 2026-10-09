import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const fixture=JSON.parse(await readFile(new URL('./fixtures/snow-epidemic-curve-2026-10-09.json',import.meta.url),'utf8'));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'curve.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};

test('Snow’s 1855 table draws an epidemic curve that states which date it is of',async({page,context})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page,fixture);
  await run(page);

  // 43 daily bins between 19 August and 30 September 1854, totalling 616 deaths.
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of death');
  await expect(page.locator('#bars-panel')).toContainText('616 records');
  await expect(page.locator('#bars-panel .bar-row')).toHaveCount(43);
  await expect(page.locator('#bars-panel .bar-row').first()).toContainText('1854-08-19');
  await expect(page.locator('#bars-panel .bar-row').last()).toContainText('1854-09-30');
  // The peak is 2 September, with 127 deaths.
  await expect(page.locator('#bars-panel .bar-row').filter({hasText:'1854-09-02'})).toContainText('127');

  // Changing the declared kind of date changes what the chart says it is, not just a label.
  await page.locator('.react-flow__node').filter({hasText:'Deaths by day'}).click();
  await expect(page.locator('#series-kind')).toHaveValue('death');
  await expect(page.locator('.inspector')).toContainText('not a curve by date of onset');
  await page.locator('#series-kind').selectOption('onset');
  await run(page);
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of onset');
  await page.locator('.react-flow__node').filter({hasText:'Deaths by day'}).click();
  await page.locator('#series-kind').selectOption('death');

  // A week is a different series of the same data, and empty periods survive aggregation.
  await page.locator('#series-period').selectOption('week');
  await run(page);
  await expect(page.locator('#bars-panel')).toContainText('Cases by week of date of death');
  await expect(page.locator('#bars-panel .bar-row')).toHaveCount(7);
  await expect(page.locator('#bars-panel .bar-row').filter({hasText:'1854-08-28'})).toContainText('279');
  await page.locator('#series-period').selectOption('day');
  await run(page);

  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();
  assert.match(n3,/fw:CaseSeries/);
  assert.match(n3,/fw:eventDateKind "death"/);
  assert.match(n3,/fw:seriesPeriod "day"/);
  assert.match(n3,/fw:undatedRecordCount "0"\^\^xsd:integer/);
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#bars-panel')).toContainText('616 records',{timeout:45000});
  await page.screenshot({path:'test-results/snow-epidemic-curve.png',fullPage:true});
  assert.deepEqual(errors,[]);
});
