/** RULES THAT COMPUTE, PREVIEWED LIVE (experiment 188). The practitioner, 2026-11-07: *"I find the rule set editor a
 *  little bit dry, maybe the preview would help, like the before and after of table processing."* And: *"the surface
 *  assumes a wide table so the user (an epidemiologist) can recognize what the rule does to his wide tables."*
 *
 *  The synthetic districts of example-workflows-rulesets, imported wide: one row per district, houses and deaths. */
import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

const districts=[['Northgate',4200,61],['Eastmarsh',3150,12],['Southfield',5020,118],['Westbury',2875,0],['Harbour',0,0]];
const rows=districts.flatMap(([district,houses,deaths])=>[
  {key:{district,measure:'houses'},value:houses},{key:{district,measure:'deaths'},value:deaths}]);
const data={kind:'data-table',keys:['district','measure'],valueField:'count',rows,rowCount:rows.length,missingValueCount:0};
const workflow={schema:'fieldwork/workflow/1',name:'Deaths per house, by district',exampleId:'blank',outputId:'shown',
  nodes:[
    {id:'t',type:'table_input',x:40,y:40,params:{label:'Districts',keys:['district','measure'],valueField:'count',data,
      wide:{keys:['district'],valueFields:['houses','deaths'],measureKey:'measure'}}},
    {id:'r',type:'apply_ruleset',x:320,y:40,params:{label:'Computed per district',
      ruleset:{id:'urn:fieldwork:ruleset:extract-contract',version:'1.0.0',title:'Rules written in this workflow',
        inputs:[['projections','table']],output:'table'},
      parameters:{},authored:{title:'Computed per district',mustNotBeReadAs:'',parameters:[],
        fields:[{attribute:'houses',predicate:'fwa:houses',kind:'number',unit:'unit:NUM',unitLabel:'houses'},
          {attribute:'deaths',predicate:'fwa:deaths',kind:'number',unit:'unit:NUM',unitLabel:'deaths'}],rules:[]}}},
    {id:'shown',type:'table_output',x:600,y:40,params:{label:'Districts with the new columns',inputMode:'table'}}],
  edges:[{id:'e1',from:'t',to:'r',port:'projections'},{id:'e2',from:'r',to:'shown',port:'table'}]};

test('a value computed for every record is previewed before and after, and a division by zero is said in words',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'d.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('.react-flow__node[data-id="r"]').click();
  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  // BEFORE IS THE WIDE TABLE: one row per district, houses and deaths as columns, and no "measure".
  const before=dialog.locator('.rule-live-table').first();
  await expect(before.locator('thead')).toContainText('houses');
  await expect(before.locator('thead')).toContainText('deaths');
  await expect(before.locator('thead')).not.toContainText('measure');
  await expect(before.locator('tbody tr')).toHaveCount(5);

  // houses without a death = houses minus deaths, for every record.
  await dialog.locator('#rule-editor-add-every').click();
  const set=async(part,value,rule=0)=>{const el=dialog.locator(`[data-rule="${rule}"][data-part="${part}"]`);
    if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else{await el.fill(value);await el.press('Tab');}};
  await set('column','houses without a death');
  await set('left-source','fwa:houses');
  await set('operator','minus');
  await set('right-source','fwa:deaths');
  await expect(dialog.locator('.rule-card h3').first()).toHaveText('Rule 1 · 5 records');
  const after=dialog.locator('.rule-live-table').nth(1);
  await expect(after.locator('thead')).toContainText('houses without a death');
  await expect(after.locator('tbody tr').first()).toContainText('4139');

  // deaths per house = deaths divided by houses: Harbour has no houses.
  await dialog.locator('#rule-editor-add-every').click();
  await set('column','deaths per house',1);
  await set('left-source','fwa:deaths',1);
  await set('operator','dividedBy',1);
  await set('right-source','fwa:houses',1);
  // A NEW COLUMN WITH NO UNIT is said, not refused: describing it is the practitioner's step.
  await expect(dialog.locator('.rule-live-summary')).toHaveText('5 records. Every record matched a rule. 1 record has an empty value, from a division by zero. The new columns houses without a death, deaths per house state no unit.');
  await set('unit','houses');
  await set('unit','deaths per house',1);
  await expect(dialog.locator('.rule-live-summary')).toHaveText('5 records. Every record matched a rule. 1 record has an empty value, from a division by zero.');
  await expect(after.locator('tbody tr').last()).toContainText('deaths per house: divided by zero');

  await dialog.screenshot({path:'test-results/rules-compute-preview.png'});
  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  // The Inspector reads the rule as its sum.
  await expect(page.locator('#inspector-content')).toContainText('houses without a death');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('houses without a death');
  expect(errors).toEqual([]);
});
