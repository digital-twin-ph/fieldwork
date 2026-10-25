import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {standaloneChartSvg} from '../build/chart-figure.js';
import {chartVegaSpec,chartSpecificationFacts} from '../build/chart-vega.js';
import {FIGURE_ROLE,FIGURE_TYPE} from '../build/presentation.js';

const curve={caption:'Cases by day of date of death',field:'count',total:616,
  bins:[{key:'d1',label:'1854-08-31',count:3,order:1},{key:'d2',label:'1854-09-01',count:70,order:2},
        {key:'d3',label:'1854-09-02',count:127,order:3},{key:'d4',label:'1854-09-03',count:76,order:4}]};
const decisions={caption:'Locations by decision',field:'status',total:8,
  bins:[{key:'Review',label:'Review',count:5},{key:'NoFlag',label:'No flag',count:2},
        {key:'Unknown',label:'Insufficient data',count:0}]};
const titled={chartTitle:'Cholera deaths by date of death, Soho, London, 1854',
  subtitle:'Date of death, not date of onset or of report.',
  xAxisTitle:'Date of death, 1854',yAxisTitle:'Recorded deaths',sourceNote:'Source: Snow 1855.'};

test('the exported figure is the specification the receipt stores', async()=>{
  // The property this file exists for. Before 2026-10-13 the export was drawn by hand from the
  // bins, so it could drift from the figure the receipt described and nothing would have noticed.
  const node={id:'epidemic',type:'chart_output',x:0,y:0,params:{label:'Curve',...titled}};
  const facts=chartSpecificationFacts(node,'run-1','curve',curve,'record-count');
  const stored=new Parser().parse(facts)
    .find(q=>q.predicate.value==='urn:fieldwork:rendererSpecification').object.value;
  const svg=await standaloneChartSvg(curve,node.params,{sourceId:'curve',runId:'run-1'});
  // Same specification in, same specification rendered: every word the receipt claims is on the page.
  const spec=JSON.parse(stored);
  assert.equal(spec.title.text,titled.chartTitle);
  for(const text of [titled.chartTitle,titled.subtitle,titled.xAxisTitle,titled.yAxisTitle,titled.sourceNote])
    assert.ok(svg.includes(text),`the figure must carry ${JSON.stringify(text)}`);
});

test('a chart on the classic bars still exports, by deriving the specification', async()=>{
  // The classic bars are divs with no SVG to take. Rather than draw a second figure by hand, the
  // specification is derived for the export, so even that file is one the receipt could describe.
  const svg=await standaloneChartSvg(curve,{renderer:'html',...titled},{});
  assert.match(svg,/^<svg/);
  assert.ok(svg.includes(titled.chartTitle));
});

test('the figure is self-contained', async()=>{
  const svg=await standaloneChartSvg(curve,titled,{});
  // Opened elsewhere: nothing may be fetched, and it must not take the colour of what it lands on.
  assert.ok(!/<image|xlink:href|url\(http|<script/.test(svg),'no external reference and no script');
  assert.ok(svg.includes(FIGURE_ROLE.background.toLowerCase())||svg.includes(FIGURE_ROLE.background),
    'it carries its own surface');
  assert.ok(svg.includes(FIGURE_TYPE.family.split(',')[0].replace(/'/g,''))
    ||svg.includes('Helvetica'),'and the shared type stack');
});

test('every value is drawn, including a zero', async()=>{
  const svg=await standaloneChartSvg(decisions,{},{});
  for(const bin of decisions.bins)assert.ok(svg.includes(bin.label),`${bin.label} keeps its place`);
});

test('the renderer refuses what the specification refuses', async()=>{
  // The export cannot become a way around the checks the specification makes.
  await assert.rejects(standaloneChartSvg({bins:[{key:'a',label:'A',count:-1}],caption:'c',field:'count'},{},{}),
    /nonnegative/);
  await assert.rejects(standaloneChartSvg(
    {bins:[{key:'a',label:'A',count:1},{key:'a',label:'B',count:2}],caption:'c',field:'count'},{},{}),
    /unique stable keys/);
  const seven={caption:'c',field:'count',total:7,
    bins:Array.from({length:7},(_,i)=>({key:'k'+i,label:'L'+i,count:i+1}))};
  await assert.rejects(standaloneChartSvg(seven,{colorByCategory:true},{}),/at most 6 distinct categories/);
});

test('both orientations render, and neither invents a baseline', async()=>{
  for(const orientation of ['vertical','horizontal']){
    const svg=await standaloneChartSvg(curve,{...titled,orientation},{});
    assert.match(svg,/^<svg/);
    assert.ok(svg.length>1000,'a real figure, not an empty frame');
  }
  // Cairo's rule survives the round trip: the quantitative scale still starts at zero.
  const spec=chartVegaSpec(curve,{renderer:'vega-lite'},{});
  const quantity=spec.encoding.y.type==='quantitative'?spec.encoding.y:spec.encoding.x;
  assert.equal(quantity.scale.domainMin,0);
});

test('the figure renders without a DOM, so it can be checked outside a browser', async()=>{
  assert.equal(typeof document,'undefined','this test would be vacuous in a browser');
  const svg=await standaloneChartSvg(curve,titled,{});
  assert.ok(svg.length>0);
});

test('a long subtitle or source note wraps instead of running off the edge', async()=>{
  // Vega-Lite does not wrap title text; it cuts it. Found by exporting the Snow curve and looking
  // at it: "the pump handle was removed on 8 Septem".
  const {wrapToWidth}=await import('../build/chart-vega.js');
  const long='Date of death, not date of onset or of report. The outbreak is conventionally dated '
    +'from 31 August; the pump handle was removed on 8 September, by which time the curve had turned.';
  const lines=wrapToWidth(long,560);
  assert.ok(lines.length>1,'it must break');
  for(const line of lines)assert.ok(line.length<=Math.floor(560/6.2),`"${line}" is too long for the plot`);
  assert.equal(lines.join(' '),long.replace(/\s+/g,' '),'and lose no words');
  // A narrow plot breaks sooner; a short note stays on one line.
  assert.ok(wrapToWidth(long,300).length>lines.length);
  assert.deepEqual(wrapToWidth('Source: Snow 1855.',560),['Source: Snow 1855.']);
  // The spec carries the wrapped lines, which is what the renderer draws.
  const spec=chartVegaSpec(curve,{subtitle:long,renderer:'vega-lite'},{sourceId:'s'});
  assert.ok(Array.isArray(spec.title.subtitle));
  for(const line of spec.title.subtitle)
    assert.ok(line.length<=Math.floor(spec.width/6.2),`spec line too long: ${line}`);
});

/** A FIGURE FOR PUBLICATION, not only a correct one.
 *
 *  The practitioner, 2026-10-25, on the Hagelloch measles curve: *"This chart from Hagelloch is
 *  not publish friendly"*. Two defects, both in the defaults rather than in the data.
 *
 *  The x axis was titled "Category", which is true of every chart and tells a reader nothing. An
 *  epidemic curve published with "Category" under its dates has not said what it binned, and the
 *  chart could not know: `ChartSummary` carried the bins and a prose caption, so only the widget
 *  that computed the series knew it was a date of onset by day. It now declares that.
 *
 *  And every one of 87 daily labels was drawn. Vega-Lite thins overlapping labels on quantitative
 *  and temporal axes by default and NOT on nominal ones, and an epidemic curve's axis is nominal
 *  here, so the labels collided into a solid band. */
test('a series chart names its own axis and thins labels that would collide',async()=>{
  const {seriesChart}=await import('../build/case-series.js');
  const {chartVegaSpec}=await import('../build/chart-vega.js');
  const bins=Array.from({length:87},(_,i)=>({key:`d${i}`,label:`1861-11-${i}`,count:i%7,order:i}));
  const chart=seriesChart({period:'day',dateKind:'onset',total:87,bins,undatedRecords:0});
  assert.equal(chart.categoryTitle,'Date of onset, by day');

  const spec=chartVegaSpec(chart,{mark:'bar',orientation:'vertical'});
  // The producer's title reaches the axis, in place of the word that said nothing.
  assert.equal(spec.encoding.x.title,'Date of onset, by day');
  assert.notEqual(spec.encoding.x.title,'Category');
  // And the labels thin themselves rather than overlapping. Every bar is still drawn: this is a
  // label rule, not a filter, and the count below is what proves no data was dropped to get it.
  assert.equal(spec.encoding.x.axis.labelOverlap,'parity');
  assert.equal(spec.data.values.length,87);

  // A practitioner's own axis title still wins over the producer's.
  const chosen=chartVegaSpec(chart,{mark:'bar',orientation:'vertical',xAxisTitle:'Day of illness'});
  assert.equal(chosen.encoding.x.title,'Day of illness');
});

test('a chart whose producer declares no axis title still says Category',async()=>{
  const {chartVegaSpec}=await import('../build/chart-vega.js');
  // Unchanged behaviour where there is nothing better to say: the fallback is a fallback, not a
  // thing to be removed, and a producer that knows nothing about its categories omits the field.
  const spec=chartVegaSpec({field:'status',caption:'By decision',total:2,
    bins:[{key:'a',label:'Review',count:1},{key:'b',label:'No flag',count:1}]},
    {mark:'bar',orientation:'vertical'});
  assert.equal(spec.encoding.x.title,'Category');
});
