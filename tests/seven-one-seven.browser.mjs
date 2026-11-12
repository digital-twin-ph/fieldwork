import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** 7-1-7 TIMELINESS ON A LINE LIST (experiment 200, 2026-11-12): a published ruleset whose four dates are read from the
 *  columns chosen in Configure…, here onset, diagnosis and report, as MERS-CoV, South Korea, 2015 holds them. Four cases
 *  worked by hand: A is detected in 9 days and reported a day before diagnosis; C has no onset, so no verdict on
 *  detection; no row has a response date, so none has a verdict on response. */
function workflow(){
  const rows=[['A','2015-05-11','2015-05-20','2015-05-19'],['B','2015-05-18','2015-05-20','2015-05-20'],
    ['C','','2015-06-01','2015-06-02'],['D','2015-05-01','2015-05-12','2015-05-14']];
  const data={kind:'data-table',keys:['id','dt_onset','dt_diag','dt_report'],valueField:'n',
    rows:rows.map(([id,dt_onset,dt_diag,dt_report])=>({key:{id,dt_onset,dt_diag,dt_report},value:1})),rowCount:rows.length,missingValueCount:0};
  return {schema:'fieldwork/workflow/1',name:'7-1-7 on four cases',nodes:[
    {id:'cases',type:'table_input',x:20,y:20,params:{label:'Cases',keys:data.keys,valueField:'n',data}},
    {id:'timely',type:'apply_ruleset',x:320,y:20,params:{label:'7-1-7 timeliness',parameters:{detectionTarget:7,notificationTarget:1,responseTarget:7},
      ruleset:{id:'urn:fieldwork:ruleset:seven-one-seven',version:'1.0.0',title:'7-1-7 timeliness',inputs:[['records','table']],output:'table'}}},
    {id:'out',type:'table_output',x:620,y:20,params:{label:'Timeliness'}}],
    edges:[{id:'e1',from:'cases',to:'timely',port:'records'},{id:'e2',from:'timely',to:'out',port:'table'}]};
}

test('7-1-7: the dates are read from the columns chosen in Configure…, and each interval is judged against its target',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.locator('#workflow-file').setInputFiles({name:'seven.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow()))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="timely"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#ruleset-config');
  await expect(dialog.locator('#ruleset-bindings')).toContainText('Emergence');
  await dialog.locator('[data-ruleset-binding="fw:emergenceDate"]').selectOption('dt_onset');
  await dialog.locator('[data-ruleset-binding="fw:detectionDate"]').selectOption('dt_diag');
  await dialog.locator('[data-ruleset-binding="fw:notificationDate"]').selectOption('dt_report');
  await expect(dialog.locator('[data-ruleset-binding="fw:responseCompleteDate"]')).toHaveValue('');
  await dialog.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45_000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Timeliness'}).click();
  const row=(id)=>page.locator('main').first().locator('tr',{has:page.locator('th,td',{hasText:new RegExp(`^${id}$`)})}).first();
  await expect(row('A')).toContainText('9');
  await expect(row('A')).toContainText('-1');
  await expect(row('A')).toContainText('NotMet');
  await expect(row('C')).toContainText('NoVerdict');
  for(const id of ['A','B','C','D'])await expect(row(id)).toContainText('NoVerdict');
  // The response verdict is a column of its own, though NoVerdict on every row: a conclusion, never a variable's name.
  await expect(page.locator('main').first().locator('thead')).toContainText('responseWithinTarget');
  expect(errors).toEqual([]);
});
