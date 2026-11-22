import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** DETECT UNUSUAL COUNTS (2026-11-21; the practitioner: "let's do CUSUM, EWMA and syndromic surveillance"). Forty days of
 *  counts with five days of excess, as in the unit test checked against R's surveillance package: the run hands on each
 *  period's measures, the dialog draws the counts and the threshold, and Show me how walks EARS C1 on ten days. */
test.use({serviceWorkers:'block'});
const COUNTS=[4,4,6,2,3,5,3,4,4,2,5,5,2,3,6,6,3,5,3,5,6,2,4,3,5,9,12,15,11,8,2,5,2,5,4,3,6,4,5,3];
const day=i=>new Date(Date.UTC(2026,9,1)+i*864e5).toISOString().slice(0,10);
const flow={schema:'fieldwork/workflow/1',exampleId:'blank',name:'Unusual counts',nodes:[
  {id:'counts',type:'table_input',x:20,y:100,params:{label:'Visits by day',keys:['date'],valueField:'visits',
    data:{kind:'data-table',keys:['date'],valueField:'visits',rowCount:40,missingValueCount:0,rows:COUNTS.map((v,i)=>({key:{date:day(i)},value:v}))}}},
  {id:'detect',type:'detect_unusual_counts',x:320,y:100,params:{label:'Unusual days',timeField:'date',method:'ears-c1'}},
  {id:'out',type:'table_output',x:620,y:100,params:{label:'Signals'}}],
  edges:[{id:'e1',from:'counts',to:'detect',port:'records'},{id:'e2',from:'detect',to:'out',port:'table'}]};

test('the run hands on each period’s measures; the dialog draws the counts and the threshold; Show me how walks EARS C1',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'counts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(flow))});
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="detect"]')).toBeVisible({timeout:45000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="detect"]').click({timeout:45000});
  // THE SENTENCE, THEN WHAT THE RUN FOUND: days 26 and 27 of the series, 2026-10-26 and 2026-10-27.
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('EARS C1: each period against the 7 before it, signal at α 0.001, by "date"');
  await expect(page.locator('#inspector-content .standard-result')).toContainText('2 of 33 periods signal (2026-10-26, 2026-10-27)');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#detect-config');
  await expect(dialog.locator('[data-detect-sentence]')).toContainText('EARS C1 over 40 periods: 2 of 33 periods signal');
  await expect(dialog.locator('.detect-chart rect.detect-bar-signal')).toHaveCount(2);
  await expect(dialog.locator('.detect-chart:not(.detect-computation) rect')).toHaveCount(40);
  // THE METHOD'S OWN COMPUTATION: its statistic against z(1−α), the two signalling days marked by triangles.
  await expect(dialog.locator('.detect-computation .detect-signal-mark')).toHaveCount(2);
  await expect(dialog.locator('.detect-computation figcaption')).toContainText('z(1−α), the line a day must pass');
  // ANOTHER METHOD, SEEN BEFORE APPLY: CUSUM on the first 7 days signals from the second day of the excess on.
  await dialog.locator('#detect-method').selectOption('cusum');
  await expect(dialog.locator('[data-detect-sentence]')).toContainText('CUSUM over 40 periods: 14 of 33 periods signal');
  await dialog.locator('#detect-reset').check();
  await expect(dialog.locator('[data-detect-sentence]')).not.toContainText('14 of 33');
  await expect(dialog.locator('.detect-computation figcaption')).toContainText('h, the decision interval');
  // SHOW ME HOW FOLLOWS THE METHOD: CUSUM's running sum on the made-up days.
  await dialog.locator('#detect-show-me').click();
  await expect(page.locator('#table-walkthrough')).toContainText('CUSUM, on a made-up example');
  await page.locator('#table-walkthrough [data-walk-close]').click();
  await dialog.locator('#detect-method').selectOption('ears-c1');
  // SHOW ME HOW: ten made-up days, the baseline marked, day 8 signalling.
  await dialog.locator('#detect-show-me').click();
  const walk=page.locator('#table-walkthrough');
  await expect(walk).toBeVisible();
  for(let i=0;i<5;i++)await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('.walk-say')).toContainText('day 8');
  await expect(walk.locator('tr[data-walk-state="matched"] .walk-word')).toHaveText([/signals/]);
  await walk.locator('[data-walk-close]').click();
  expect(errors).toEqual([]);
});
