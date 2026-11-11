import {test,expect} from './fixtures.mjs';
import {seedWorkflow} from './seed-workflow.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {readFileSync} from 'node:fs';

// WHO INFECTED WHOM, DRAWN, by hand (experiment 200, step 5). The practitioner: "I still don't see the transmission
// chain chart for hagelloch." The cases go to a Chart; Configure… draws them as a transmission tree.
const data=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));

test('Hagelloch drawn as chains over time: a Chart set to Transmission tree in Configure…',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await seedWorkflow(page,{nodes:[
    {id:'cases',type:'point_input',x:20,y:60,params:{label:'188 measles cases, one per child',data}},
    {id:'tree',type:'chart_output',x:400,y:60,params:{label:'Who infected whom'}}],
    edges:[{id:'e1',from:'cases',to:'tree',port:'records'}]});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="tree"]').click();
  const inspector=page.locator('#inspector-content');
  expect(await inspector.locator('[data-standard-section]').evaluateAll(els=>els.map(e=>e.dataset.standardSection)))
    .toEqual(['name','inputs','settings','result','learn and record']);
  await page.locator('#configure-step').click();
  await page.locator('#chart-figure').selectOption('tree');
  await page.locator('#chart-tree-id').selectOption('case_ID');
  await page.locator('#chart-tree-parent').selectOption('infector');
  await page.locator('#chart-tree-date').selectOption('date_of_prodrome');
  await page.locator('#config-apply').click();
  await expect(inspector.locator('.standard-sentence')).toContainText('Draws who infected whom in 188 measles cases, one per child as chains over time');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  await page.locator('[data-view="results"]').click();
  const panel=page.locator('#bars-panel');
  await expect(page.locator('#result-metrics')).toContainText('4 chains');
  await expect(page.locator('main').first()).toContainText('188 cases in 4 chains, joined by 184 links from infector to case, from 1861-10-30 to 1862-01-24.');
  await expect(page.locator('main').first()).toContainText('The largest chain starts with 184 and holds 173 cases over 6 generations.');
  // Drawn by Vega-Lite (the practitioner, 2026-11-09): a symbol per case, and two rules per link, down then across.
  await expect(page.locator('#vega-chart g.mark-symbol.role-mark path')).toHaveCount(188,{timeout:30_000});
  await expect(page.locator('#vega-chart g.mark-rule.role-mark line')).toHaveCount(368);
  await expect(page.locator('#vega-chart svg.marks')).toContainText('No infector recorded');
  await page.screenshot({path:'test-results/hagelloch-transmission-tree.png',fullPage:true});
  expect(errors).toEqual([]);
});
