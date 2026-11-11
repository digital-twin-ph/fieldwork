import {test,expect} from './fixtures.mjs';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {readFileSync} from 'node:fs';

// WHO INFECTED WHOM, IN HAGELLOCH, by hand (experiment 200). The cases, a point layer, go into both of Relate's ports;
// Relate brings each case's infector's prodrome date under a name of its own; the unmatched (no infector recorded) are
// kept under a category, decided; then a rule takes one date from the other, giving the serial interval in days.
const data=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
const cases={id:'cases',type:'point_input',params:{label:'188 measles cases, one per child',data,
  sourceInfo:{format:'R outbreaks 1.9.0 · measles_hagelloch_1861',url:'https://archive.org/details/beitrgezurpatho00pfeigoog'}}};

test('Hagelloch\'s cases related to themselves on infector, and the serial interval in days',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {...cases,x:20,y:60},
    {id:'relate',type:'relate_table',x:380,y:60,params:{label:'Each case\'s infector',on:'',bring:''}},
    {id:'rules',type:'apply_ruleset',x:740,y:60,params:{label:'Serial interval',parameters:{},
      ruleset:{id:'urn:fieldwork:ruleset:outreach-criteria',version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
      authored:{title:'Serial interval',mustNotBeReadAs:'',fields:[],parameters:[],rules:[]}}},
    {id:'table',type:'table_output',x:1100,y:60,params:{label:'Serial intervals',inputMode:'table'}}],
    edges:[{id:'e1',from:'cases',to:'relate',port:'records'},{id:'e2',from:'cases',to:'relate',port:'related'},
      {id:'e3',from:'relate',to:'rules',port:'subjects'},{id:'e4',from:'rules',to:'table',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).not.toContainText('Running',{timeout:60_000});

  // Relate, configured in its dialog: a point layer's columns are offered as a table's.
  await page.locator('.react-flow__node[data-id="relate"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#relate-on').selectOption('infector');
  await page.locator('#relate-right-on').selectOption('case_ID');
  await page.locator('#relate-bring').selectOption('date_of_prodrome');
  await page.locator('#relate-bring-as').fill('infector_prodrome');
  await page.locator('#relate-bring-as').press('Tab');
  // Four cases name no infector: kept, under a category, because dropping them would change the counts.
  await page.locator('[name="relate-decision"][value="keep"]').check();
  await page.locator('#relate-join-label').fill('no infector recorded');
  await page.locator('#relate-join-label').press('Tab');
  await page.locator('#config-apply').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes
    .find(n=>n.id==='relate').params.bringAs)).toBe('infector_prodrome');

  // The rules read both columns as dates, and one minus the other is the serial interval.
  await page.evaluate(()=>{
    const key='fieldwork-workflow-v1',w=JSON.parse(localStorage.getItem(key));
    w.nodes.find(n=>n.id==='rules').params.authored={title:'Serial interval',mustNotBeReadAs:'',parameters:[],
      fields:[{attribute:'date_of_prodrome',predicate:'fwa:prodrome',kind:'date',label:'date_of_prodrome'},
        {attribute:'infector_prodrome',predicate:'fwa:infectorProdrome',kind:'date',label:'infector_prodrome'}],
      rules:[{any:[{all:[]}],then:[{predicate:'fwa:serial',column:'serial_interval_days',
        compute:{left:{field:'fwa:prodrome'},operator:'minus',right:{field:'fwa:infectorProdrome'}}}]}]};
    localStorage.setItem(key,JSON.stringify(w));
  });
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  // The editor offers "date" as a kind for a column the rules read.
  await page.locator('.react-flow__node[data-id="rules"]').click();
  await page.locator('#configure-step').click();
  const editor=page.locator('#rule-editor');
  await expect(editor.locator('[data-field-kind] option[value="date"]').first()).toHaveText('date, year-month-day');
  await editor.locator('#config-cancel').click();

  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('main').first()).toContainText('serial_interval_days',{timeout:30_000});
  await expect(page.locator('main').first()).toContainText('188');
  expect(errors).toEqual([]);
});
