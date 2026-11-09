import {test,expect} from '@playwright/test';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {readFileSync} from 'node:fs';

// SECONDARY CASES PER CHILD, IN HAGELLOCH, by hand (experiment 200). The cases are counted by infector, and the counts
// related back to the cases on case_ID. 126 children are named by no one; kept as 0, typed, because a child nobody
// names as infector infected no one recorded. The column stays a number, so 188 rows add up to 184.
const data=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));

test('Hagelloch\'s secondary cases per child, with the zeros kept as a number the practitioner names',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'cases',type:'point_input',x:20,y:60,params:{label:'188 measles cases, one per child',data,
      sourceInfo:{format:'R outbreaks 1.9.0 · measles_hagelloch_1861',url:'https://archive.org/details/beitrgezurpatho00pfeigoog'}}},
    {id:'count',type:'group_table',x:380,y:200,params:{label:'Cases each child infected',by:['infector'],aggregate:'count'}},
    {id:'relate',type:'relate_table',x:740,y:60,params:{label:'Secondary cases',on:'',bring:''}},
    {id:'table',type:'table_output',x:1100,y:60,params:{label:'Secondary cases per child',inputMode:'table'}}],
    edges:[{id:'e1',from:'cases',to:'count',port:'records'},{id:'e2',from:'count',to:'table',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  // The counts are run first, as a practitioner would, so Relate's dialog has both tables to show.
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});

  // Relate connected in its Inspector: the cases are the table added to, the counts the table read from.
  await page.locator('.react-flow__node[data-id="relate"]').click();
  await page.locator('#connect-records').selectOption('cases');
  await page.locator('#connect-related').selectOption('count');
  await page.locator('#configure-step').click();
  await page.locator('#relate-on').selectOption('case_ID');
  await page.locator('#relate-right-on').selectOption('infector');
  await page.locator('#relate-bring').selectOption('rows');
  await page.locator('#relate-bring-as').fill('secondary_cases');
  await page.locator('#relate-bring-as').press('Tab');
  await expect(page.locator('dialog[open]').first()).toContainText('126');
  await page.locator('[name="relate-decision"][value="keep"]').check();
  await page.locator('#relate-join-label').fill('0');
  await page.locator('#relate-join-label').press('Tab');
  await expect(page.locator('dialog[open]').first()).toContainText('A number is written as that number, and counted.');
  await page.locator('#relate-join-reason').fill('a child nobody names as infector infected no one recorded');
  await page.locator('#relate-join-reason').press('Tab');
  await page.locator('#config-apply').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes
    .find(n=>n.id==='relate').params.unmatched?.label)).toBe('0');

  await page.locator('.react-flow__node[data-id="table"]').click();
  await page.getByRole('combobox',{name:'Tabular data',exact:true}).selectOption('relate');
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('main').first()).toContainText('secondary_cases',{timeout:30_000});
  await expect(page.locator('main').first()).toContainText('188');
  expect(errors).toEqual([]);
});
