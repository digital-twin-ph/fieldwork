import {test,expect} from './fixtures.mjs';
import {useClassicBars} from './classic-bars.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/snow-epidemic-curve-2026-10-09.json',import.meta.url),'utf8'));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'curve.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};
/** One Cases by period setting, in its Configure… dialog (experiment 186, 2026-11-12). */
const setSeries=async(page,id,value)=>{await page.locator('#configure-step').click();const d=page.locator('#series-config');
  await d.locator(id).selectOption(value);await d.locator('#config-apply').click();await expect(d).toHaveCount(0);};

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
  await expect(page.locator('#bars-panel')).toContainText('616 cases from 43 records');
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
  await page.locator('.react-flow__node[data-id="series"]').click();
  // The settings are in Configure… since 2026-11-12 (experiment 186); the Inspector says them in one sentence.
  await expect(page.locator('.inspector .standard-sentence')).toContainText('a date of death');
  // The caveat left the Inspector on 2026-11-11 (design explanation belongs in documents, not the UI); the manual says it.
  await expect(page.locator('.inspector')).not.toContainText('not a curve by date of onset');
  assert.match(await readFile('docs/widgets/case_series.md','utf8'),/A curve by date of death is not a curve by date of onset/);
  await setSeries(page,'#series-kind','onset');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of onset');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="series"]').click();
  await setSeries(page,'#series-kind','death');

  // A week is a different series of the same data, and empty periods survive aggregation.
  await setSeries(page,'#series-period','week');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by week of date of death');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(7);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel .bar-column').filter({hasText:'1854-08-28'})).toContainText('279');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="series"]').click();
  await setSeries(page,'#series-period','day');
  await run(page);

  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();
  assert.match(n3,/fw:CaseSeries/);
  assert.match(n3,/fw:eventDateKind "death"/);
  assert.match(n3,/fw:seriesPeriod "day"/);
  assert.match(n3,/fw:undatedRecordCount "0"\^\^xsd:integer/);
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('616 cases from 43 records',{timeout:45000});
  await page.screenshot({path:'test-results/snow-epidemic-curve.png',fullPage:true});
  assert.deepEqual(errors,[]);
});

// WHEN DID PEOPLE DIE? its own workflow from 2026-11-12 (experiment 210): the curve, and no place in it, because a
// dated count has no location and nothing could join it to one.
test('the John Snow curve answers when, on its own, and holds no place to join',async({page})=>{
  await page.goto('/?example=snow-curve');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await useClassicBars(page,'epidemic');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="epidemic"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Cases by day of date of death');
  await expect(page.locator('#bars-panel')).toContainText('616 cases from 43 records');
  await expect(page.locator('#bars-panel .bar-column')).toHaveCount(43);

  // Selecting the curve's source states what was excluded and why.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="dates"]').click();
  await expect(page.locator('.inspector')).toContainText('43 rows');
  await expect(page.locator('.inspector')).toContainText('Snow 1855 Table 1');

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.edges.map(e=>`${e.from}->${e.to}`).sort()).toEqual(['curve->epidemic','dates->curve']);
  expect(saved.nodes.some(n=>['point_input','study_area'].includes(n.type))).toBe(false);
});

// Vertical is a default, not a rule. The same series read the other way is the same series.
test('the epidemic curve can be turned on its side, and reports the same counts',async({page})=>{
  await page.goto('/?example=snow-curve');
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
  await page.locator('#configure-step').click();
  await expect(page.locator('#series-orientation')).toHaveValue('vertical');
  await page.locator('#series-orientation').selectOption('horizontal');
  await page.locator('#config-apply').click();
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
  await expect(page.locator('#bars-panel')).toContainText('616 cases from 43 records');
});

// A MARKED DATE (experiment 210, 2026-11-12): the day the pump handle came off, a line on the curve with its label, in the
// figure the enhanced renderer draws, and set in Configure as a date and the practitioner's own words.
test('Snow\'s curve marks the day the pump handle came off, and the mark is set in Configure',async({page})=>{
  await page.goto('/?example=snow-curve');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="epidemic"]').click();
  await expect(page.locator('#vega-chart svg.marks')).toContainText('Pump handle removed',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="epidemic"]').click();
  await expect(page.locator('.standard-sentence')).toContainText('marking Pump handle removed on 1854-09-08');
  await page.locator('#configure-step').click();
  await expect(page.locator('#chart-mark-date-0')).toHaveValue('1854-09-08');
  await expect(page.locator('#chart-mark-label-0')).toHaveValue('Pump handle removed');
  await page.locator('#chart-mark-add').click();
  await page.locator('#chart-mark-date-1').fill('1854-08-31');
  await page.locator('#chart-mark-date-1').dispatchEvent('change');
  await page.locator('#chart-mark-label-1').fill('Outbreak begins');
  await page.locator('#chart-mark-label-1').dispatchEvent('change');
  await page.locator('#config-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='epidemic').params.markedDates);
  expect(saved).toEqual([{date:'1854-09-08',label:'Pump handle removed'},{date:'1854-08-31',label:'Outbreak begins'}]);
});

/** WHAT CASES BY PERIOD WOULD COUNT, BEFORE ANY RUN (2026-11-25). Its Preview restated the settings until this
 *  release -- a sentence built from the node's params, showing nothing of the records connected -- which the
 *  practitioner met as "Same problem no preview". The numbers below are the same ones the curve draws further up
 *  this file, which is the point: the Preview runs the step's own function, so it cannot show something the run
 *  would not do.
 *
 *  Asserted WITHOUT running the workflow, because that is when a preview is worth having. An outside review noted
 *  that the new previews were nowhere asserted in the browser; this is that assertion for the first of them. */
test('Cases by period previews what it would count, from the records connected, before any run',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page,fixture);
  await page.locator('.react-flow__node[data-id="series"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#series-config [data-config-section="preview"]');
  await expect(preview).toBeVisible();

  // 616 deaths over 43 days, 19 August to 30 September 1854, the most in one day being 127 on 2 September.
  await expect(preview).toContainText('616');
  await expect(preview).toContainText('43 days');
  await expect(preview).toContainText('1854-08-19');
  await expect(preview).toContainText('1854-09-30');
  await expect(preview).toContainText('127');

  // AND IT IS NOT THE SETTINGS SENTENCE. That sentence is the Inspector's, which is where a settings summary
  // belongs; a Preview repeating it is the disguise that kept eleven of these invisible to a search for empty ones.
  await expect(preview).not.toContainText('Counts cases by day of');
  await page.locator('#series-config #config-cancel').click();
  assert.deepEqual(errors,[]);
});
