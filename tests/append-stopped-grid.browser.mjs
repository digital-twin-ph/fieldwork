import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A RUN STOPPED AT APPEND ROWS STILL SHOWS ITS COLUMNS (2026-11-20). DR Congo's census named its provinces "province",
 *  the population models "name"; the run stopped at Append rows saying to stack one under the other in Configure…, and
 *  the grid needed tables only a finished run had kept. A stopped run now keeps the tables its finished steps made. */
const table=(key,names,value)=>({kind:'data-table',keys:[key],valueField:'population',unit:'people',
  rows:names.map((n,i)=>({key:{[key]:n},value:value+i})),rowCount:names.length,missingValueCount:0});
const provinces=['Kinshasa','Ituri','Tshopo','Kwilu'];
function workflow(census=table('province',['Kinshasa','Ituri','Tshopo','Equateur'],1)){
  const models=table('name',provinces,100);
  return {schema:'fieldwork/workflow/1',name:'Models beside a census',nodes:[
    {id:'models',type:'table_input',x:20,y:20,params:{label:'Models',keys:models.keys,valueField:'population',unit:'people',data:models}},
    {id:'census',type:'table_input',x:20,y:220,params:{label:'Census',keys:census.keys,valueField:'population',unit:'people',data:census}},
    {id:'stack',type:'append_rows',x:320,y:100,params:{label:'Both, row by row',nameSource:true,sourceColumn:'source',labels:['models','census']}},
    {id:'out',type:'table_output',x:620,y:100,params:{label:'Stacked'}}],
    edges:[{id:'e1',from:'models',to:'stack',port:'records'},{id:'e2',from:'census',to:'stack',port:'records_2'},{id:'e3',from:'stack',to:'out',port:'table'}]};
}

test('a run stopped at Append rows keeps its tables, so Columns can line the census up under name',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'stack.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow()))});
  await expect(page.locator('#run-button')).toBeEnabled();
  await page.locator('#run-button').click();
  await expect(page.locator('body')).toContainText('Workflow stopped',{timeout:30000});
  await expect(page.locator('body')).toContainText('stack its "province" under "name"');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="stack"]').click();
  await page.locator('#configure-step').click();
  const ap=page.locator('#append-config');
  await expect(ap.locator('.append-grid')).toBeVisible();
  await expect(ap.locator('.append-grid')).toContainText('Its "province" may be this: 3 of 4');
  // The census's box on the "name" row.
  const rows=await ap.locator('[data-grid-name]').evaluateAll(els=>els.map(e=>e.value));
  await ap.locator(`[data-grid-row="${rows.indexOf('name')}"][data-grid-table="1"]`).selectOption('province');
  await expect(ap).toContainText('After: the stacked table.');
  // Started again: every choice cleared, the suggestion back, then chosen once more.
  await ap.locator('#append-grid-reset').click();
  await expect(ap.locator('.append-grid')).toContainText('Its "province" may be this: 3 of 4');
  const again=await ap.locator('[data-grid-name]').evaluateAll(els=>els.map(e=>e.value));
  await ap.locator(`[data-grid-row="${again.indexOf('name')}"][data-grid-table="1"]`).selectOption('province');
  await ap.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  const params=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='stack').params);
  expect(params.stackUnder).toEqual([{table:1,column:'province',as:'name'}]);
  expect(errors.filter(e=>!/Workflow stopped/.test(e))).toEqual([]);
});

/** EVERY NAME MATCHING (2026-11-20): lined up without asking, said in the grid and the run, and changeable. */
test('a census whose every name matches is lined up without asking, and says so',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'stack.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow(table('province',provinces,1))))});
  await expect(page.locator('#run-button')).toBeEnabled();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="stack"]').click();
  await expect(page.locator('#inspector-content')).toContainText('Lined up without asking, every name matching');
  await page.locator('#configure-step').click();
  await expect(page.locator('#append-config [data-append-automatic]')).toContainText('"province" under "name"');
  expect(errors).toEqual([]);
});
