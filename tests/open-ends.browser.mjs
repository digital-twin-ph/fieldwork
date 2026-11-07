import {test,expect} from '@playwright/test';

/** A STEP UNDER CONSTRUCTION IS COMPUTED BY A RUN (experiment 182): a join that leads to no output yet has its table
 *  after a run, so the step chained after it can be set up against it. */
const table=(id,keys,rows)=>({id,type:'table_input',x:0,y:0,params:{label:id,keys,valueField:'n',
  data:{kind:'data-table',keys,valueField:'n',rows:rows.map(([k,v])=>({key:Object.fromEntries(keys.map((c,i)=>[c,k[i]])),value:v})),rowCount:rows.length,missingValueCount:0}}});
const node=(id,type,x,params,y=0)=>({id,type,x,y,params:{label:id,...params}});
const edge=(from,to,port)=>({id:`${from}-${to}-${port}`,from,to,port});

test('a join leading to no output has its table after a run, and says why when it could not be made',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.evaluate(({nodes,edges})=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));w.nodes=nodes;w.edges=edges;delete w.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    const all=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');all.blank=w;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(all));},
    {nodes:[table('cases',['place','week'],[[['a','1'],5],[['b','1'],7]]),{...table('rain',['place','week'],[[['a','1'],1],[['b','1'],2]]),y:300},
      node('kept','select_rows',200,{keyColumn:'place',values:['a','b']}),node('shown','table_output',400,{}),
      node('join','relate_table',400,{on:'place',bring:'n'},260),node('bad','select_rows',400,{keyColumn:'nowhere',values:['x']},520)],
     edges:[edge('cases','kept','records'),edge('kept','shown','table'),edge('kept','join','records'),edge('rain','join','related'),edge('kept','bad','records')]});
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('.react-flow__node[data-id="join"]').click();
  await expect(page.locator('#output-quick-look')).toBeVisible();
  await page.locator('.react-flow__node[data-id="bad"]').click();
  await expect(page.locator('#inspector-content')).toContainText('The last run could not compute this step');
});
