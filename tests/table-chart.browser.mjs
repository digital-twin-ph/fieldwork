import {test,expect} from '@playwright/test';
import {blankWorkflow} from '../build/study-area.js';

/** THE CONNECTION A PRACTITIONER COULD NOT MAKE.
 *
 *  Reported 2026-10-28, with a canvas holding a rate of deaths per 1,000 people across 32
 *  sub-districts and a Chart node beside it: *"I tried to connect a chart to rate with a
 *  denominator widget which outputs a table, doesn't connect."* It did not, and could not: the
 *  widget declared one port, `decisions`, and the Inspector's Input mode offered only Reasoning
 *  results and Catchment summaries. These tests hold the port open from the interface. */

const TABLE={kind:'data-table',keys:['group'],valueField:'per 1,000 people',
  unit:'per 1,000 people',
  rows:[['Battersea',5.113636363636363],['Brixton',0.6160164271047228],
    ['Camberwell',5.410889414947582],['Dulwich',0]]
    .map(([group,value])=>({key:{group},value})),
  rowCount:4,missingValueCount:0};

const withTable=async page=>{
  const w=blankWorkflow();
  w.nodes=[{id:'rates',type:'table_input',x:60,y:120,
    params:{label:'Deaths per 1,000 people',keys:['group'],valueField:'per 1,000 people',
      data:TABLE}},
    // The classic bars rather than Vega, so the figure's own numbers are readable as text.
    {id:'bars',type:'chart_output',x:320,y:120,
     params:{label:'Ranked',renderer:'html',orientation:'horizontal'}}];
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'rates.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="bars"]').click();
};

test('a chart offers a table port, and connecting one makes the edge',async({page})=>{
  await withTable(page);
  // The port that did not exist. No mode is set first, and none is offered.
  await expect(page.locator('#chart-records')).toBeVisible();
  await expect(page.locator('#catchment-output-mode')).toHaveCount(0);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await page.locator('#chart-records').selectOption('rates');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});

test('the bars are the rates themselves, and the unit is on the figure',async({page})=>{
  await withTable(page);
  await page.locator('#chart-records').selectOption('rates');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  // NOT ROUNDED, and printed as a figure rather than as the division's whole tail. Battersea
  // 5.11 and Camberwell 5.41 drew one identical bar until today.
  const bar=label=>page.locator('.bar-row').filter({hasText:label}).locator('b');
  await expect(bar('Battersea')).toHaveText('5.114');
  await expect(bar('Camberwell')).toHaveText('5.411');
  await expect(bar('Brixton')).toHaveText('0.616');
  await expect(bar('Dulwich')).toHaveText('0');
  // The unit the table declared, on the figure rather than dropped.
  await expect(page.locator('.results-panel')).toContainText('per 1,000 people');
});

test('a chart with nothing connected says so, instead of failing on a missing edge',async({page})=>{
  await withTable(page);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).not.toHaveText('✓ Run complete',{timeout:45000});
  await expect(page.locator('body')).toContainText('A Chart draws bars from what it is given');
});
