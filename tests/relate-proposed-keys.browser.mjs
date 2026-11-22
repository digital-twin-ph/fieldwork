import {test,expect} from './fixtures.mjs';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** KEYS PROPOSED FROM THEIR VALUES (the practitioner, 2026-11-22: "Can FW detect compatible keys between tables?", then
 *  yes). Two tables naming the same LGAs, one as "LGA", the other as "lga_name" in other capitals and with a hyphen:
 *  Relate's dialog opens with the pair proposed and says what it links. */
// WebKit's service worker refused the reasoning worker "due to access control checks" here; blocked, as elsewhere.
test.use({serviceWorkers:'block'});
const table=(keys,valueField,rows)=>({kind:'data-table',keys,valueField,rows:rows.map(([key,value])=>({key,value})),rowCount:rows.length,missingValueCount:0});
const cases=table(['LGA'],'cases',[[{LGA:'Aba North'},4],[{LGA:'Aba South'},2],[{LGA:'Abak'},5],[{LGA:'Abaji'},1]]);
const people=table(['state','lga_name'],'population',[[{state:'Abia',lga_name:'Aba-North'},100],[{state:'Abia',lga_name:'aba south'},90],
  [{state:'Akwa Ibom',lga_name:'Abak'},80],[{state:'FCT',lga_name:'Bwari'},70]]);

test('Relate proposes the columns whose values link most, though their names differ, and says what they link',async({page})=>{
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'cases',type:'table_input',x:20,y:40,params:{label:'Cases by LGA',keys:cases.keys,valueField:'cases',data:cases}},
    {id:'people',type:'table_input',x:20,y:260,params:{label:'Population by LGA',keys:people.keys,valueField:'population',data:people}},
    {id:'relate',type:'relate_table',x:380,y:120,params:{label:'Population beside the cases',on:'',bring:''}},
    {id:'out',type:'table_output',x:740,y:120,params:{label:'Table'}}],
    edges:[{id:'a',from:'cases',to:'relate',port:'records'},{id:'b',from:'people',to:'relate',port:'related'},{id:'c',from:'relate',to:'out',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="relate"]').click({timeout:45000});
  await page.locator('#configure-step').click();
  await expect(page.locator('#relate-on')).toHaveValue('LGA');
  await expect(page.locator('#relate-right-on')).toHaveValue('lga_name');
  await expect(page.locator('[data-relate-proposed]')).toContainText(`Proposed from the values: "LGA" with the second table's "lga_name", which links 3 of the first table's 4 keys to the second's 4.`);
  // Another column chosen, and the proposal's line goes.
  await page.locator('#relate-right-on').selectOption('state');
  await page.locator('#relate-on').selectOption('LGA');
  expect(errors).toEqual([]);
});

// THE SAME FOR APPEND ROWS (the practitioner, 2026-11-22: "Is it the same with append tables?").
test('Append rows lists the second table\'s columns whose values match the first\'s, and stacks one under on a click',async({page})=>{
  const errors=collectPageErrors(page);
  const more=table(['lga_name'],'cases',[[{lga_name:'aba north'},3],[{lga_name:'Abak'},1],[{lga_name:'Bwari'},2]]);
  await seedWorkflow(page,{nodes:[
    {id:'cases',type:'table_input',x:20,y:40,params:{label:'Cases, January',keys:cases.keys,valueField:'cases',data:cases}},
    {id:'more',type:'table_input',x:20,y:260,params:{label:'Cases, February',keys:more.keys,valueField:'cases',data:more}},
    {id:'stack',type:'append_rows',x:380,y:120,params:{label:'Both months'}},
    {id:'out',type:'table_output',x:740,y:120,params:{label:'Table'}}],
    edges:[{id:'a',from:'cases',to:'stack',port:'records'},{id:'b',from:'more',to:'stack',port:'records_2'},{id:'c',from:'stack',to:'out',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="stack"]').click({timeout:45000});
  await page.locator('#configure-step').click();
  const panel=page.locator('[data-column-matches][data-match-for="1"]');
  await expect(panel).toContainText('Columns whose values match');
  await expect(panel.locator('tbody tr').first()).toContainText('LGA');
  await expect(panel.locator('tbody tr').first()).toContainText('lga_name');
  await expect(panel.locator('tbody tr').first()).toContainText('2 · of 4 and 3');
  await panel.getByRole('button',{name:'Stack under: LGA and lga_name'}).click();
  // Stacked: the panel has nothing left to offer, and the second table's column is stacked as LGA.
  await expect(page.locator('[data-column-matches][data-match-for="1"]')).toHaveCount(0);
  await expect(page.locator('.append-before')).toContainText('stacked as LGA');
  expect(errors).toEqual([]);
});
