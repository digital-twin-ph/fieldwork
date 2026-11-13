import {test,expect} from './fixtures.mjs';
import {inTableSettings,inChartSettings} from './map-settings.mjs';
import {useClassicBars} from './classic-bars.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';

// The legacy-bars migration test charted the heat example's decisions; it retired with decisions on 2026-11-11
// (docs/audits/old-naledi-audit.md). The Vega-Lite test below charts Hagelloch's daily counts instead.
test('Vega-Lite Chart enhancement renders from local count bins and reopens offline',async({page,context})=>{
  const w=EXAMPLE_TEMPLATES.hagelloch();delete w.exampleId;w.name='Hagelloch, charted';
  w.nodes.push({id:'enhanced',type:'chart_output',x:850,y:420,params:{label:'Enhanced counts',renderer:'vega-lite',mark:'point',orientation:'horizontal'}});
  w.edges.push({id:'enhanced-edge',from:'curve',to:'enhanced',port:'records'});
  await page.goto('/?example=blank');await page.locator('#workflow-file').setInputFiles({name:'enhanced.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Enhanced counts'}).click();
  await expect(page.locator('#vega-chart svg.marks')).toBeVisible({timeout:30000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#bars-panel')).toContainText('Underlying chart values');
  await page.locator('[data-view="results"]').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="enhanced"]').click();
  // The figure's words are set in Chart's Configure…, and Apply writes them (experiment 186, 2026-11-09).
  await inChartSettings(page,async d=>{
    await expect(d.locator('#chart-renderer')).toHaveValue('vega-lite');await expect(d.locator('#chart-mark')).toHaveValue('point');
    for(const [id,text] of [['#chart-title','Measles cases by day'],['#chart-subtitle','Hagelloch, 1861'],
      ['#chart-x-axis','Cases'],['#chart-y-axis','Day'],['#chart-source-note','Source: Pfeilsticker 1863, via surveillance']]){
      await d.locator(id).fill(text);await d.locator(id).press('Tab');}
    // No legend here: Hagelloch's 87 days exceed the six categories a legend allows, and the run refuses it. The legend's
    // spec and its fw:chartLegend fact are held by tests/shared-chart.test.mjs; the six-category refusal by
    // tests/chart-figure.test.mjs. Neither is exercised in the browser any longer, which this test did on heat.
  });
  await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Enhanced counts'}).click();await expect(page.locator('#vega-chart svg.marks')).toContainText('Measles cases by day');
  await expect(page.locator('#vega-chart svg.marks')).toContainText('Source: Pfeilsticker 1863, via surveillance');
  await expect(page.locator('#vega-chart svg.marks')).toContainText('Day');
  await page.locator('#vega-chart details[title="Click to view actions"] summary').click();
  const chartDownload=page.waitForEvent('download');await page.locator('#vega-chart .vega-actions a[download$=".svg"]').click();
  const svg=await readFile(await (await chartDownload).path(),'utf8');assert.match(svg,/Measles cases by day/);assert.match(svg,/Source: Pfeilsticker 1863, via surveillance/);
  await page.locator('[data-view="rules"]').click();await expect(page.locator('#n3-preview')).toContainText('fw:ChartSpecification');
  await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Enhanced counts'}).click();await expect(page.locator('#vega-chart svg.marks')).toBeVisible({timeout:30000});
});
