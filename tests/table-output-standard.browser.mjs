import {test,expect} from '@playwright/test';
import {inTableSettings} from './map-settings.mjs';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** TABLE ON THE STANDARD INSPECTOR (experiment 186, 2026-11-09). Touched for the sea-level example, when a number stopped
 *  becoming its headings: its name and write-up section, its inputs, one sentence and Configure…, and what the last run
 *  showed. The totals claim moved into Configure…, and is applied there. */
test('Table is on the standard Inspector, and its totals claim is set in Configure…',async({page})=>{
  const errors=collectPageErrors(page);
  const rows=[['water','Southwark',286],['water','Lambeth',14]].map(([measure,company,value])=>({key:{measure,company},value}));
  const data={kind:'data-table',keys:['measure','company'],valueField:'deaths',rows,rowCount:2,missingValueCount:0};
  await seedWorkflow(page,{nodes:[{id:'deaths',type:'table_input',x:20,y:40,params:{label:'Deaths by company',keys:data.keys,valueField:'deaths',data}},
    {id:'table',type:'table_output',x:400,y:40,params:{label:'Deaths',inputMode:'table'}}],
    edges:[{id:'e-table',from:'deaths',to:'table',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="table"]').click();
  const inspector=page.locator('#inspector-content');
  expect(await inspector.locator('[data-standard-section]').evaluateAll(els=>els.map(e=>e.dataset.standardSection)))
    .toEqual(['name','inputs','settings','result','learn and record']);
  await expect(inspector.locator('#table-table')).toHaveValue('deaths');
  await expect(inspector.locator('.standard-sentence')).toContainText('Shows the rows of Deaths by company as they stand');
  await expect(inspector.locator('#output-totals')).toHaveCount(0);
  await inTableSettings(page,d=>d.locator('#output-totals').check());
  await expect(inspector.locator('.standard-sentence')).toContainText('with totals you asserted');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='table').params.totalsAsserted)).toBe(true);
  expect(errors).toEqual([]);
});

/** ITS PORTS, LIKE MAP'S (2026-11-09, the practitioner: "streamline its input ports like map output"). The node draws
 *  what is connected and one port to connect more; the Inspector lists what is connected and one picker. A point layer
 *  chosen there is bound to the point port by what it emits. */
test('Table draws what is connected and one port to add another, on the canvas and in the Inspector',async({page})=>{
  const errors=collectPageErrors(page);
  const rows=[['water','Southwark',286]].map(([measure,company,value])=>({key:{measure,company},value}));
  const data={kind:'data-table',keys:['measure','company'],valueField:'deaths',rows,rowCount:1,missingValueCount:0};
  const pump={type:'Feature',id:'broad',properties:{name:'Broad Street'},geometry:{type:'Point',coordinates:[-0.1367,51.5133]}};
  await seedWorkflow(page,{nodes:[{id:'deaths',type:'table_input',x:20,y:40,params:{label:'Deaths by company',keys:data.keys,valueField:'deaths',data}},
    {id:'pumps',type:'point_input',x:20,y:260,params:{label:'Pumps',data:{type:'FeatureCollection',features:[pump]}}},
    {id:'table',type:'table_output',x:400,y:40,params:{label:'Deaths',inputMode:'table'}}],
    edges:[{id:'e-table',from:'deaths',to:'table',port:'table'}]});
  await page.locator('[data-view="workflow"]').click();
  const node=page.locator('.react-flow__node[data-id="table"]');
  await expect(node.locator('.node-port-row')).toHaveText(['Tabular data','+ Add an input']);
  await node.click();
  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('select[data-map-port]')).toHaveCount(1);
  await inspector.locator('#table-add-input').selectOption('pumps');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).edges
    .filter(e=>e.to==='table').map(e=>`${e.from}:${e.port}`).sort())).toEqual(['deaths:table','pumps:points']);
  // Both results on this canvas are connected, so there is nothing left to add, and the add port goes, as Map's does.
  await expect(node.locator('.node-port-row')).toHaveText(['Points 1','Tabular data']);
  await expect(inspector.locator('#table-add-input')).toHaveCount(0);
  expect(errors).toEqual([]);
});
