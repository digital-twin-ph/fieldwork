import {test,expect} from './fixtures.mjs';
import {blankWorkflow} from '../build/study-area.js';
import {checkDrawnBars} from '../build/figure-check.js';

/** EXPERIMENT 156 AGAINST A REAL RENDERER.
 *
 *  `a-figure-is-checked-against-its-claim.test.mjs` checks the checker. This runs it on the SVG
 *  the application actually draws, which is the only place the defect of 2026-10-31 existed: the
 *  bins were ordered correctly, `chartMarkup` drew them correctly, and the Vega renderer -- the
 *  one behind the Results tab and the exported SVG -- never called `orderBins` at all.
 *
 *  The numbers are South London's, from Snow's Table XII: deaths in 1854 per death in 1849, by
 *  supplying company. Lambeth moved its intake above the tidal limit in 1852 and Southwark and
 *  Vauxhall did not. */

const BINS=[['Southwark and Vauxhall',1.0871],['Jointly supplied',0.6522],['Lambeth only',0.2284]];
const TABLE={kind:'data-table',keys:['water_supply'],valueField:'ratio',unit:'',
  rows:BINS.map(([water_supply,value])=>({key:{water_supply},value})),
  rowCount:3,missingValueCount:0};

const chartWith=async(page,params)=>{
  const w=blankWorkflow();
  w.nodes=[{id:'ratios',type:'table_input',x:60,y:120,
      params:{label:'1854 per 1849, by company',keys:['water_supply'],valueField:'ratio',data:TABLE}},
    {id:'figure',type:'chart_output',x:340,y:120,params:{label:'Change by company',...params}}];
  w.edges=[{id:'e1',from:'ratios',to:'figure',port:'records'}];
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'ratios.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('[data-view="results"]')).toBeVisible();
  await page.locator('[data-view="results"]').click();
};

/** Reads the figure the way a reader does: each bar's length, and the label under it.
 *
 *  PAIRED BY POSITION IN SCREEN SPACE, never by index. Pairing a bar to the label at the same
 *  index asks the renderer whether it agrees with itself, which is the question that was being
 *  begged -- the defect this test exists for was precisely a renderer that drew bars in one order
 *  while believing another. `getBoundingClientRect` is used rather than `getBBox` because a
 *  rotated axis label's own box is in its local frame, where every label shares an x. */
const readBars=page=>page.evaluate(()=>{
  const svg=[...document.querySelectorAll('svg')].find(s=>s.querySelector('g.mark-rect.role-mark'));
  if(!svg)return null;
  const groups=[...svg.querySelectorAll('g.mark-text.role-axis-label')]
    .map(g=>[...g.querySelectorAll('text')]);
  // The category axis is the one whose labels are not all numbers; the other is the value scale.
  const axis=groups.find(g=>g.some(t=>!/^-?[\d.]+$/.test(t.textContent.trim())))||[];
  const labels=axis.map(t=>{const r=t.getBoundingClientRect();
    return {text:t.textContent.trim(),cx:r.x+r.width/2};});
  return [...svg.querySelectorAll('g.mark-rect.role-mark path')].map(path=>{
    const r=path.getBoundingClientRect(),cx=r.x+r.width/2;
    const nearest=labels.slice().sort((a,b)=>Math.abs(a.cx-cx)-Math.abs(b.cx-cx))[0];
    return {label:nearest?nearest.text:'',length:r.height,cx};
  }).sort((a,b)=>a.cx-b.cx);   // left to right, which is the order a reader meets them in
});

for(const barOrder of ['smallest','largest','category'])
  test(`the drawn figure matches its claim: ${barOrder}`,async({page})=>{
    await chartWith(page,{barOrder});
    const drawn=await readBars(page);
    expect(drawn,'no bars could be read from the figure').not.toBeNull();
    expect(drawn.length).toBe(3);
    // Every label was found. A bar paired to an empty label means the reader has nothing to read.
    expect(drawn.every(b=>b.label),`a bar carries no label: ${JSON.stringify(drawn)}`).toBeTruthy();
    const chart={field:'ratio',measure:'ratio',unit:'',total:3,barOrder,
      bins:BINS.map(([label,count],i)=>({key:`b${i}`,label,count}))};
    const faults=checkDrawnBars(chart,drawn,0.04);
    expect(faults,faults.map(f=>`${f.check}: ${f.detail}`).join('\n')).toEqual([]);
  });
