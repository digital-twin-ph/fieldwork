import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gridPoints} from '../build/point-grid.js';
// On a drawn area since 2026-11-11: this ran on Old Naledi, which retired with its access review and the access table it
// drew (docs/audits/old-naledi-audit.md). What stays tested: Point grid's points feed a Table and a Map, its evidence is
// recorded, and both reopen offline.
const AREA={type:'Polygon',coordinates:[[[25.900,-24.690],[25.910,-24.690],[25.910,-24.681],[25.900,-24.681],[25.900,-24.690]]]};
test('generated samples feed shared outputs and reopen offline',async({page,context})=>{
  const expected=gridPoints(AREA,250).length;
  const w={schema:'fieldwork/workflow/1',name:'Point grid',nodes:[
    {id:'area',type:'study_area',x:0,y:0,params:{label:'Area',source:'drawn',selectionMode:'bbox',geometry:AREA}},
    {id:'samples',type:'point_grid',x:250,y:0,params:{label:'Point grid',spacingM:250}},
    {id:'sample-table',type:'table_output',x:0,y:650,params:{label:'Generated sample table'}},
    {id:'sample-map',type:'map_output',x:250,y:650,params:{label:'Generated sample map'}}],
    edges:[{id:'grid-area',from:'area',to:'samples',port:'area'},{id:'sample-table-edge',from:'samples',to:'sample-table',port:'points'},
      {id:'sample-map-edge',from:'samples',to:'sample-map',port:'points'},{id:'sample-map-area',from:'area',to:'sample-map',port:'area'}]};
  await page.goto('/?example=blank');await page.locator('#workflow-file').setInputFiles({name:'shared-samples.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Generated sample table'}).click();
  await expect(page.locator('#table-panel')).toContainText(`Sample ${expected}`);
  await page.getByRole('tab',{name:'Generated sample map'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(expected);
  await page.locator('[data-view="rules"]').click();const pending=page.waitForEvent('download');await page.locator('#download-evidence').click();
  const receipt=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  assert.match(receipt.receipts.find(r=>r.nodeId==='samples').facts,/fw:GridSampleGeneration/);
  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready');await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Generated sample table'}).click();await expect(page.locator('#table-panel')).toContainText(`Sample ${expected}`);
});
