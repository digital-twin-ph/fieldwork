/** QUICK LOOK AT WHAT A STEP PRODUCED, for every widget that emits a table.
 *
 *  The practitioner, 2026-10-27: *"Any widget that works on a table and outputs a table should
 *  enable Quick Look at the output table."*
 *
 *  THE OBSTACLE WAS NOT THE BUTTON. Only an output widget produces a result tab, so a step in
 *  the middle of a chain had no surface at all -- its table existed for the length of
 *  `executeWorkflow` and was then dropped. `curve` here is exactly that case: a `case_series`
 *  that emits a table, feeds a chart and a map, and owns no tab of its own. On Snow's contingency
 *  workflow it is four of the nine steps.
 *
 *  So the run keeps the tables it passed between steps, and the Inspector offers the one this
 *  node produced. Derived from `TYPES[type].output==='table'`, so relate, group, derive and
 *  select rows are covered without being named.
 */
import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

const openHagelloch=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
};

test('a step with no result tab of its own still offers a look at its table',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);

  // The premise: this step owns no result tab. If that stops being true the test is testing
  // something easier than it means to, so it is asserted rather than assumed.
  const tabs=await page.locator('#result-tabs [data-output]').evaluateAll(bs=>bs.map(b=>b.dataset.output));
  expect(tabs).not.toContain('curve');

  await page.locator('.react-flow__node[data-id="curve"]').click();
  const quickLook=page.locator('#output-quick-look');
  await expect(quickLook).toBeVisible();
  await quickLook.click();

  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();
  // THIS step's table, named for it, and with its own columns: a case series is keyed by period
  // and counts cases, which is what tells it apart from the two tables either side of it.
  await expect(viewer).toContainText('output');
  await expect(viewer).toContainText('period');
  await expect(viewer).toContainText('cases');
  expect(await viewer.locator('table tbody tr').count()).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  expect(errors).toEqual([]);
});

test('a step that emits no table is offered no look at one',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);
  // The study area emits a boundary, not a table.
  await page.locator('.react-flow__node[data-id="village"]').click();
  await expect(page.locator('#inspector-content')).toBeVisible();
  await expect(page.locator('#output-quick-look')).toHaveCount(0);
  await expect(page.locator('#inspector-content')).not.toContainText('This step emits a table');
  expect(errors).toEqual([]);
});

test('the table the viewer shows is the one this step produced, not a neighbour\'s',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);
  await page.locator('.react-flow__node[data-id="curve"]').click();
  await page.locator('#output-quick-look').click();
  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();
  const rows=await viewer.locator('table tbody tr').count();
  // The case series bins 188 cases by day of prodrome, so it has fewer rows than the 188-row
  // case table that sits downstream of it. Reading the wrong table would show that one.
  expect(rows).toBeLessThan(188);
  expect(rows).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a step offers its table at the top, and toggles before and after',async({page})=>{
  const row=(group,outcome,value)=>({key:{group,outcome},value});
  const data={kind:'data-table',keys:['group','outcome'],valueField:'n',rowCount:4,missingValueCount:0,
    rows:[row('e','c',30),row('e','w',70),row('u','c',10),row('u','w',90)]};
  const w={schema:'fieldwork/workflow/1',id:'w',label:'w',nodes:[
    {id:'cells',type:'table_input',x:40,y:240,params:{label:'Cells',keys:['group','outcome'],valueField:'n',data}},
    {id:'t',type:'two_by_two',x:360,y:120,params:{label:'Table',exposureColumn:'group',exposed:'e',unexposed:'u',
      outcomeColumn:'outcome',caseValue:'c',nonCaseValue:'w',level:95}},
    {id:'out',type:'table_output',x:680,y:120,params:{label:'Out',inputMode:'table'}}],
    edges:[{id:'1',from:'cells',to:'t',port:'records'},{id:'2',from:'t',to:'out',port:'table'}]};
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('#run-button').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="t"]').click({force:true});
  const look=page.locator('#output-quick-look');
  await expect(look).toHaveText(/View this table/);
  await expect(look).toBeInViewport();
  await look.click();
  const viewer=page.locator('#table-viewer');
  await expect(viewer.locator('[data-table-step]')).toHaveText(['Before','After']);
  await expect(viewer.locator('[data-table-step="1"]')).toHaveAttribute('aria-pressed','true');
  await expect(viewer).toContainText('Before this step: 2 rows');
  await viewer.locator('[data-table-step="0"]').click();
  await expect(page.locator('#table-viewer [data-table-step="0"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#table-viewer h2')).toContainText('before: Cells');
  await page.locator('#table-viewer [data-table-step="1"]').click();
  await expect(page.locator('#table-viewer [data-table-step="1"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#table-viewer-close').click();
  await expect(page.locator('#table-viewer')).toHaveCount(0);
});
