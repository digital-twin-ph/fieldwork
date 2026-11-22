import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** SERIES TOGETHER (2026-11-21, the practitioner: "add those charts and update the Chart widget"): the counts as bars, the
 *  threshold dashed over them, and a triangle on each day that signals, from Detect unusual counts' table, in one panel. */
test.use({serviceWorkers:'block'});
const COUNTS=[4,4,6,2,3,5,3,4,4,2,5,5,2,3,6,6,3,5,3,5,6,2,4,3,5,9,12,15,11,8,2,5,2,5,4,3,6,4,5,3];
const day=i=>new Date(Date.UTC(2026,9,1)+i*864e5).toISOString().slice(0,10);
const flow={schema:'fieldwork/workflow/1',exampleId:'blank',name:'Series together',nodes:[
  {id:'counts',type:'table_input',x:20,y:100,params:{label:'Visits by day',keys:['date'],valueField:'visits',
    data:{kind:'data-table',keys:['date'],valueField:'visits',rowCount:40,missingValueCount:0,rows:COUNTS.map((v,i)=>({key:{date:day(i)},value:v}))}}},
  {id:'detect',type:'detect_unusual_counts',x:320,y:100,params:{label:'Unusual days',timeField:'date',method:'ears-c1'}},
  {id:'chart',type:'chart_output',x:620,y:100,params:{label:'Against the threshold',figure:'series',renderer:'vega-lite',keyColumn:'date',panelsBy:'measure',
    seriesMarks:{observed:'bar',threshold:'dashed'},signals:{from:'signal',on:'observed',label:'signal'}}}],
  edges:[{id:'e1',from:'counts',to:'detect',port:'records'},{id:'e2',from:'detect',to:'chart',port:'records'}]};

test('the counts as bars, the threshold dashed, and a triangle on each day that signals',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'series.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(flow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  const figure=page.locator('svg').filter({hasText:'value by date: observed, threshold, one measure each'}).first();
  await expect(figure).toBeVisible({timeout:20000});
  // THE TWO SERIES IN THE LEGEND, AND THE MARKS: 40 bars, one dashed line, two triangles (days 26 and 27).
  await expect(figure).toContainText('observed');await expect(figure).toContainText('threshold');await expect(figure).toContainText('signal');
  await expect(figure.locator('path[aria-roledescription="bar"]')).toHaveCount(40);
  await expect(figure.locator('path[aria-roledescription="line mark"]')).toHaveCount(1);
  await expect(figure.locator('path[aria-roledescription="point"]')).toHaveCount(2);
  // THE SENTENCE, AND THE DIALOG'S SETTINGS.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="chart"]').click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('as series together on one scale, one per measure: observed as bars, threshold as a dashed line, a triangle on observed where signal is 1');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#chart-config');
  await expect(dialog.locator('#chart-figure')).toHaveValue('series');
  await expect(dialog.locator('[data-series-mark="observed"]')).toHaveValue('bar');
  await expect(dialog.locator('[data-series-mark="statistic"]')).toHaveValue('');
  await expect(dialog.locator('#chart-signal-from')).toHaveValue('signal');
  expect(errors).toEqual([]);
});
