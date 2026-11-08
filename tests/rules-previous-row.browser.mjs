/** NEW CASES FROM A CUMULATIVE COUNT, written in the rules dialog (experiment 188, stage 4). The practitioner,
 *  2026-11-07: *"For between rows computation we can prerequisite table sort on a column. In cumulative values a date
 *  time column would be a candidate."* And: *"The preview then can show before, sorted, after."*
 *
 *  The synthetic file of example-workflows-rulesets, out of date order on purpose: a rule that did not sort would give
 *  visibly wrong answers. */
import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

const FILE=new URL('../../example-workflows-rulesets/data/cumulative-cases-by-week.csv',import.meta.url);
const skip=existsSync(FILE)?false:'example-workflows-rulesets is not checked out beside this repository.';
const rowsOf=()=>{const [,...lines]=readFileSync(FILE,'utf8').trim().split('\n');
  return lines.map(l=>{const [place,week_start,c]=l.split(',');return {key:{place,week_start},value:Number(c)};});};

test('a rule reading the previous row waits for a sort, then is previewed before, sorted and after',async({page})=>{
  test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  const rows=rowsOf();
  const data={kind:'data-table',keys:['place','week_start'],valueField:'cumulative_cases',unit:'cases',rows,rowCount:rows.length,missingValueCount:0};
  const workflow={schema:'fieldwork/workflow/1',name:'New cases from a cumulative count',exampleId:'blank',outputId:'shown',
    nodes:[
      {id:'t',type:'table_input',x:40,y:40,params:{label:'Cumulative cases',keys:['place','week_start'],valueField:'cumulative_cases',unit:'cases',data}},
      {id:'r',type:'apply_ruleset',x:320,y:40,params:{label:'New cases',
        ruleset:{id:'urn:fieldwork:ruleset:extract-contract',version:'1.0.0',title:'Rules written in this workflow',
          inputs:[['projections','table']],output:'table'},
        parameters:{},authored:{title:'New cases',mustNotBeReadAs:'',parameters:[],
          fields:[{attribute:'cumulative_cases',predicate:'fwa:cumulative_cases',kind:'number',unit:'unit:NUM',unitLabel:'cases'}],rules:[]}}},
      {id:'shown',type:'table_output',x:600,y:40,params:{label:'With new cases',inputMode:'table'}}],
    edges:[{id:'e1',from:'t',to:'r',port:'projections'},{id:'e2',from:'r',to:'shown',port:'table'}]};
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'c.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('.react-flow__node[data-id="r"]').click();
  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();

  // new cases = cumulative_cases minus cumulative_cases in the previous row, for every record.
  await dialog.locator('#rule-editor-add-every').click();
  const set=async(part,value)=>{const el=dialog.locator(`[data-rule="0"][data-part="${part}"]`);
    if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else{await el.fill(value);await el.press('Tab');}};
  await set('column','new cases');
  await set('left-source','fwa:cumulative_cases');
  await set('operator','minus');
  await set('right-source','previous:fwa:cumulative_cases');
  // NOT UNTIL THE RECORDS HAVE AN ORDER: the file's own order is not a declaration.
  await expect(dialog.locator('[role="alert"]')).toContainText('A rule reads the previous row, so the records need an order');
  await expect(dialog.locator('#rule-editor-keep')).toBeDisabled();

  // Sort by the dates, offered first, within each place, ticked for it.
  await expect(dialog.locator('#rule-order-by option').nth(1)).toHaveText('week_start (dates)');
  await dialog.locator('#rule-order-by').selectOption('week_start');
  await expect(dialog.locator('[data-order-within="place"]')).toBeChecked();
  await expect(dialog.locator('[role="alert"]')).toHaveCount(0);
  await expect(dialog.locator('.rule-live h3')).toHaveText('Before, sorted and after');
  const tables=dialog.locator('.rule-live-table');
  await expect(tables).toHaveCount(3);
  // SORTED: North's first week first, though the file starts with its last.
  await expect(tables.nth(0).locator('tbody tr').first()).toContainText('2025-03-10');
  await expect(tables.nth(1).locator('tbody tr').first()).toContainText('2025-01-06');
  await expect(tables.nth(2).locator('tbody tr').nth(1)).toContainText('4');
  await expect(dialog.locator('.rule-live-summary')).toContainText('12 records have no value, because there is no single previous row.');
  await expect(dialog.locator('.rule-live-summary')).toContainText('1 record fell below the previous row, kept as computed.');
  await expect(tables.nth(2)).toContainText('new cases: fell below the previous row');
  await expect(tables.nth(2)).toContainText('new cases: no previous row, recorded twice');

  // THE PREVIOUS WEEK, not the previous row: East has no row for 3 February, so 10 February gets none.
  await dialog.locator('#rule-order-previous').selectOption('week');
  await expect(dialog.locator('.rule-live-summary')).toContainText('13 records have no value, because there is no single previous row.');
  await expect(tables.nth(2)).toContainText('new cases: no previous row, no row for the period before');

  await dialog.screenshot({path:'test-results/rules-previous-row.png'});
  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#inspector-content [data-rule-order]')).toHaveText(
    "Sorted by week_start within each place; the previous row is the previous week's.");
  await expect(page.locator('#inspector-content')).toContainText('cumulative_cases minus cumulative_cases in the previous row');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.nodes.find(n=>n.id==='r').params.authored.order).toEqual({by:'week_start',within:['place'],previous:'week'});
  expect(errors).toEqual([]);
});
