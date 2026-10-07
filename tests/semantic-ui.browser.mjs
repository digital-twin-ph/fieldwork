import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {readFile} from 'node:fs/promises';
import {loadGraph,ontologyFiles,validateGraph,summarize} from '../scripts/validate-ontology.mjs';
import {quadToN3} from '../build/study-area.js';

test('N3 tab shows conforming canvas RDF for unfinished widgets',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?example=blank');
  await page.locator('[data-add="raster_input"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await page.locator('[data-view="rules"]').click();
  const shown=await page.locator('#n3-preview').innerText();
  assert.match(shown,/CURRENT CANVAS PLANS/);
  assert.match(shown,/fw:CanvasNodePlan/);
  assert.match(shown,/fw:catalogDigest/);
  const graph=new Store(new Parser().parse(shown));
  const report=await validateGraph(graph);
  assert.equal(report.conforms,true,JSON.stringify(summarize(report)));
  assert.deepEqual(errors,[]);
});

test('executed N3 tab and downloaded John Snow evidence have the same conforming graph',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="rules"]').click();
  const shown=await page.locator('#n3-preview').innerText();
  assert.match(shown,/fw:NetworkIsochrone/);
  assert.match(shown,/fw:WorkflowNodePlan/);
  const download=page.waitForEvent('download');await page.locator('#download-evidence').click();
  const run=JSON.parse(await readFile(await (await download).path(),'utf8'));
  const graph=await loadGraph(ontologyFiles);
  for(const source of [run.provenanceN3,...run.receipts.flatMap(r=>[r.facts,r.conclusions.map(quadToN3).join('\n')])])graph.addQuads(new Parser().parse(source));
  const report=await validateGraph(graph);
  assert.equal(report.conforms,true,JSON.stringify(summarize(report)));
  assert.deepEqual(errors,[]);
});
