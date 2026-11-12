import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** COMPARE WITH A TARGET… (2026-11-12): one 7-1-7 interval written by hand in three choices, on four cases worked by
 *  hand: 9 days Not met, 2 Met, no onset No verdict, 7 Met (equality meets the target). */
function workflow(){
  const rows=[['A','2015-05-11','2015-05-20'],['B','2015-05-18','2015-05-20'],['C','','2015-06-01'],['D','2015-05-13','2015-05-20']];
  const data={kind:'data-table',keys:['id','dt_onset','dt_diag'],valueField:'n',
    rows:rows.map(([id,dt_onset,dt_diag])=>({key:{id,dt_onset,dt_diag},value:1})),rowCount:rows.length,missingValueCount:0};
  return {schema:'fieldwork/workflow/1',name:'Detection by hand',nodes:[
    {id:'cases',type:'table_input',x:20,y:20,params:{label:'Cases',keys:data.keys,valueField:'n',data}},
    {id:'rules',type:'apply_ruleset',x:320,y:20,params:{label:'Detected within 7 days',parameters:{},
      ruleset:{id:'urn:fieldwork:ruleset:written-in-this-workflow',version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
      authored:{title:'Detected within 7 days',mustNotBeReadAs:'',parameters:[],fields:[],rules:[]}}},
    {id:'out',type:'table_output',x:620,y:20,params:{label:'Detection'}}],
    edges:[{id:'e1',from:'cases',to:'rules',port:'subjects'},{id:'e2',from:'rules',to:'out',port:'table'}]};
}

test('one interval against a target, in three choices: the rules written, previewed, and each case judged',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'target.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow()))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="rules"]').click();
  await page.locator('#configure-step').click();
  const editor=page.locator('#rule-editor');
  for(const column of ['dt_onset','dt_diag'])await editor.locator(`[aria-label="Kind of ${column}"]`).selectOption('date');
  await editor.locator('#rule-editor-target summary').click();
  await editor.locator('#target-earlier').selectOption({label:'dt_onset'});
  await editor.locator('#target-later').selectOption({label:'dt_diag'});
  await editor.locator('#target-days').fill('days_to_detect');
  await editor.locator('#target-setting').fill('detection_target');
  await editor.locator('#target-verdict').fill('detected_within_target');
  await editor.locator('#target-value').fill('7');
  await expect(editor.locator('#target-preview')).toContainText('days_to_detect is dt_diag minus dt_onset');
  await editor.locator('#target-add').click();
  await expect(editor.locator('.rule-card')).toHaveCount(3);
  await editor.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45_000});
  await page.locator('[data-view="results"]').click();
  const row=id=>page.locator('#table-panel tr',{has:page.locator('th,td',{hasText:new RegExp(`^${id}$`)})}).first();
  await expect(row('A')).toContainText('Not met');
  await expect(row('B')).toContainText('Met');
  await expect(row('C')).toContainText('No verdict');
  await expect(row('D')).toContainText('Met');
  expect(errors).toEqual([]);
});
