import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {syntheticWorkflow} from './fixtures/synthetic-workflow.mjs';
/** Two point sources shown in one Table: the shape the retired `places` and `centers` steps had, which still migrate.
 *  The heat example supplied it until it retired on 2026-11-11 (docs/audits/old-naledi-audit.md). */
const exampleWorkflow=()=>{
  const places={...syntheticWorkflow().nodes[0],id:'neighborhoods',params:{...syntheticWorkflow().nodes[0].params,label:'Neighborhoods'}};
  const centre=(id,name,coordinates)=>({type:'Feature',id,properties:{name},geometry:{type:'Point',coordinates}});
  return {schema:'fieldwork/workflow/1',name:'Two sources',nodes:[places,
    {id:'centers',type:'point_input',x:35,y:229,params:{label:'Cooling centers',data:{type:'FeatureCollection',features:[
      centre('library','Central Library',[-84.367,33.79]),centre('community','West Community Hall',[-84.426,33.823])]}}},
    {id:'table',type:'table_output',x:605,y:150,params:{label:'Both layers',pointInputCount:2}}],
    edges:[{id:'e1',from:'neighborhoods',to:'table',port:'points'},{id:'e2',from:'centers',to:'table',port:'points_2'}]};
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
test('legacy point inputs use shared editors, preserve labels and save attributes offline',async({page,context})=>{
  await page.goto('/?example=blank');
  const legacy=exampleWorkflow();legacy.nodes[0].type='places';legacy.nodes[1].type='centers';
  await page.locator('#workflow-file').setInputFiles({name:'legacy-heat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  // Eight places and two centres; heat counted Review decisions here, which retired with it.
  await expect(page.locator('#result-rows tr')).toHaveCount(10);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('[data-add="places"]')).toHaveCount(0);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('[data-add="centers"]')).toHaveCount(0);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('[data-add="point_input"]')).toHaveCount(1);
  for(const [id,record] of [['neighborhoods','oakwood'],['centers','library']]){
  await page.locator('[data-view="workflow"]').click();
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#configure-step').click();
    await expect(page.locator('#input-mode option')).toHaveCount(5);
    await page.locator('#input-mode').selectOption('pins');
    await page.locator('#pins-online').uncheck();
    await page.locator('#pin-record').selectOption(record);
    await page.locator('#pin-pair-key').fill('review_note');
    await page.locator('#pin-pair-value').fill('Retained');
    await page.locator('#input-apply').click();
    await expect(page.locator('#input-dialog')).not.toBeVisible();
  }
  const w=await saved(page);
  assert.deepEqual(w.nodes.slice(0,2).map(n=>[n.type,n.params.label,n.params.data.features[0].properties.review_note]),[['point_input','Neighborhoods','Retained'],['point_input','Cooling centers','Retained']]);
  assert.deepEqual(w.edges,legacy.edges);
  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready');
  await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows tr')).toHaveCount(10);
  assert.deepEqual((await saved(page)).nodes,w.nodes);
});
