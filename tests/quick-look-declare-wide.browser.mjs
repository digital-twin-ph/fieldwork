import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** KEEPING A WIDE READING, AFTER FILTERING (2026-11-25, review of 0.196.0).
 *
 *  Quick Look offers "Always show this table wide" for a table stored long. Its click handler was attached once,
 *  after the first render, while filtering rebuilds the dialog's markup on every keystroke: the button stayed on the
 *  screen, looking exactly as before, and did nothing. Filtering is the natural thing to do in a long table before
 *  deciding how to read it, so the path that broke is the path a reader takes.
 *
 *  AND WHAT IS KEPT IS A DISPLAY CHOICE. It is written as `shownWide`, never as `wide`: the second is provenance
 *  that Apply ruleset computes from, and a preference written there changed what was evaluated. */
const row=(district,measure,value)=>({key:{district,measure},value});
const longTable={kind:'data-table',keys:['district','measure'],valueField:'value',rowCount:6,missingValueCount:0,
  rows:[row('Kumbotso','eligible',120),row('Kumbotso','vaccinated',90),row('Kumbotso','missed',30),
    row('Kunchi','eligible',80),row('Kunchi','vaccinated',55),row('Kunchi','missed',25)]};
const flow={schema:'fieldwork/workflow/1',exampleId:'blank',name:'Long',nodes:[
  {id:'counts',type:'table_input',x:20,y:20,params:{label:'Vaccination counts',keys:['district','measure'],
    valueField:'value',data:longTable}}],edges:[]};

test('the offer to keep a wide reading still works after filtering, and keeps a display choice',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="counts"]').click();
  await page.locator('#quick-look').click();

  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();
  // The hint says the shape is not the table's own, and the offer sits with it.
  await expect(viewer).toContainText('This table is stored long');
  await expect(viewer.locator('[data-declare-wide]')).toBeVisible();

  // FILTERED FIRST, which rebuilds the dialog and replaced the button.
  await page.locator('#table-viewer-filter').fill('Kumbotso');
  await expect(viewer.locator('[data-declare-wide]')).toBeVisible();
  await viewer.locator('[data-declare-wide]').click();
  await expect(viewer).toHaveCount(0);

  // KEPT: reopened, the table is wide and the offer is gone. Read through the dialog rather than from storage,
  // because a table is persisted by its digest and its rows are not in the saved workflow at all.
  await page.locator('#quick-look').click();
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('thead')).toContainText('eligible');
  await expect(viewer.locator('thead')).toContainText('vaccinated');
  await expect(viewer).not.toContainText('This table is stored long');
  await expect(viewer.locator('[data-declare-wide]')).toHaveCount(0);
  await page.locator('#table-viewer-close').click();
  expect(errors).toEqual([]);
});
