import {test,expect} from '@playwright/test';
import {useClassicBars} from './classic-bars.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/snow-epidemic-curve-2026-10-09.json',import.meta.url),'utf8'));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'curve.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};

test('Snow’s 1855 table draws an epidemic curve that states which date it is of',async({page,context})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page,fixture);
  await run(page);
  // These checks read the classic bars' markup; Vega-Lite is the default renderer now.
  await useClassicBars(page,'curve');

  // 43 daily bins between 19 August and 30 September 1854, totalling 616 deaths.
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of death');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('616 records');
  // Columns, not rows: an epidemic curve runs vertically by default, with the periods along
  // the bottom, because that is how an outbreak report draws one. The Inspector offers
  // horizontal for anyone who wants it, exercised at the end of this file.
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(43);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column').first()).toContainText('1854-08-19');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column').last()).toContainText('1854-09-30');
  // The peak is 2 September, with 127 deaths.
  await expect(page.locator('#bars-panel .bar-column').filter({hasText:'1854-09-02'})).toContainText('127');

  // Changing the declared kind of date changes what the chart says it is, not just a label.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Deaths by day'}).click();
  await expect(page.locator('#series-kind')).toHaveValue('death');
  await expect(page.locator('.inspector')).toContainText('not a curve by date of onset');
  await page.locator('#series-kind').selectOption('onset');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of onset');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Deaths by day'}).click();
  await page.locator('#series-kind').selectOption('death');

  // A week is a different series of the same data, and empty periods survive aggregation.
  await page.locator('#series-period').selectOption('week');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by week of date of death');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(7);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column').filter({hasText:'1854-08-28'})).toContainText('279');
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
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('616 records',{timeout:45000});
  await page.screenshot({path:'test-results/snow-epidemic-curve.png',fullPage:true});
  assert.deepEqual(errors,[]);
});

test('the John Snow workspace shows place and time together, and refuses to join them',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await useClassicBars(page,'epidemic');

  // The catchment map and the epidemic curve are results of one workspace.
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="map"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="epidemic"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of death');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('616 records');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(43);

  // Selecting the curve's source states what was excluded and why.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="dates"]').click();
  await expect(page.locator('.inspector')).toContainText('616 rows'.replace('616','43'));
  await expect(page.locator('.inspector')).toContainText('Snow 1855 Table 1');

  // The two sources cannot be joined: the death locations carry no date, and the series carries no
  // place, so no connection exists between them in the workflow.
  const linked=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).edges
    .filter(e=>['dates','curve','epidemic'].includes(e.from)||['dates','curve','epidemic'].includes(e.to))
    .map(e=>`${e.from}->${e.to}`));
  expect(linked.sort()).toEqual(['curve->epidemic','dates->curve']);
});

// Vertical is a default, not a rule. The same series read the other way is the same series.
test('the epidemic curve can be turned on its side, and reports the same counts',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="epidemic"]')).toBeVisible({timeout:30000});
  await useClassicBars(page,'epidemic');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="epidemic"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(43);

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="epidemic"]').click();
  await expect(page.locator('#series-orientation')).toHaveValue('vertical');
  await page.locator('#series-orientation').selectOption('horizontal');
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="epidemic"]')).toBeVisible({timeout:30000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="epidemic"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-row')).toHaveCount(43);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(0);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('616 records');
});
