import test from 'node:test';
import assert from 'node:assert/strict';
import {standaloneChartSvg,axisMaximum,FIGURE_WIDTH} from '../build/chart-figure.js';
import {FIGURE_PALETTE,FIGURE_ROLE,FIGURE_TYPE} from '../build/presentation.js';

const curve={caption:'Cases by day of date of death',field:'count',total:616,
  bins:[{key:'d1',label:'1854-08-31',count:3,order:1},{key:'d2',label:'1854-09-01',count:70,order:2},
        {key:'d3',label:'1854-09-02',count:127,order:3},{key:'d4',label:'1854-09-03',count:76,order:4}]};
const decisions={caption:'Locations by decision',field:'status',total:8,
  bins:[{key:'Review',label:'Review',count:5},{key:'NoFlag',label:'No flag',count:2},
        {key:'Unknown',label:'Insufficient data',count:0}]};
const svgFor=(chart,params={})=>standaloneChartSvg(chart,params,{sourceId:'curve',runId:'run-1'});

test('the figure is self-contained and says what it is', ()=>{
  const svg=svgFor(curve,{chartTitle:'Cholera deaths by date of death, Soho, 1854',
    subtitle:'Date of death, not date of onset.',xAxisTitle:'Date of death',yAxisTitle:'Recorded deaths',
    sourceNote:'Source: Snow 1855.'});
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  // An exported figure is opened elsewhere: nothing may be fetched when it is.
  assert.ok(!/<image|xlink:href|url\(http|<script/.test(svg),'no external reference and no script');
  for(const text of ['Cholera deaths by date of death','not date of onset','Date of death',
                     'Recorded deaths','Source: Snow 1855.'])
    assert.ok(svg.includes(text),`the figure must carry ${JSON.stringify(text)}`);
  assert.match(svg,/role="img"/);
  assert.match(svg,/<title>Cholera deaths/,'and name itself for a screen reader');
});

test('every bar is labelled with its value, so the axis round-trip is optional', ()=>{
  // This is also the relief the palette's contrast warning requires.
  const svg=svgFor(curve);
  for(const bin of curve.bins)assert.ok(svg.includes(`>${bin.count}<`),`${bin.count} must appear`);
});

test('a zero-count category keeps its place and its label', ()=>{
  // The gap is the finding. Dropping the row would hide it.
  const svg=svgFor(decisions);
  assert.ok(svg.includes('Insufficient data'));
  assert.ok(svg.includes('>0<'),'and its zero is written');
});

test('the baseline is zero and the axis maximum is a round number', ()=>{
  for(const [highest,expected] of [[3,5],[70,100],[127,200],[1,1],[0,1],[250,250],[8,10]])
    assert.equal(axisMaximum(highest),expected,`${highest} should scale to ${expected}`);
  for(const bad of [NaN,-5,Infinity])assert.equal(axisMaximum(bad),1);
  // The zero gridline is drawn in ink rather than grid grey, because it is the baseline.
  const svg=svgFor(curve);
  assert.ok(svg.includes(FIGURE_ROLE.quietInk),'the baseline is darker than the gridlines');
  assert.ok(svg.includes('>0<'),'and labelled zero');
});

test('no frame, no tick marks, and gridlines only on the measured axis', ()=>{
  const svg=svgFor(curve);
  // Tufte: the frame and the ticks carry no data. Five gridlines, one per labelled value.
  assert.equal((svg.match(/<line /g)||[]).length,5);
  assert.ok(!/fill="none" stroke/.test(svg),'no frame rectangle');
});

test('one series carries no legend; several hues carry one', ()=>{
  // A single series is named by the title, so a legend box would repeat it.
  assert.ok(!svgFor(decisions).includes('rx="2"'),'no legend swatch for one hue');
  const coloured=svgFor(decisions,{colorByCategory:true});
  assert.ok(coloured.includes('rx="2"'),'a swatch per category when the hues differ');
  for(const bin of decisions.bins)assert.ok(coloured.includes(bin.label));
});

test('a coloured figure uses the validated palette in order, and refuses to run out', ()=>{
  const coloured=svgFor(decisions,{colorByCategory:true});
  for(let i=0;i<decisions.bins.length;i++)
    assert.ok(coloured.includes(FIGURE_PALETTE[i]),`category ${i} takes palette slot ${i}`);
  const many={caption:'c',field:'count',total:7,
    bins:Array.from({length:7},(_,i)=>({key:'k'+i,label:'L'+i,count:i+1}))};
  // Seven categories is one past the validated six; inventing a hue is refused.
  assert.throws(()=>svgFor(many,{colorByCategory:true}),/at most 6 categories/);
});

test('an unnamed measure is still named, and a count is not called a total', ()=>{
  assert.ok(svgFor(curve).includes('Recorded count'));
  assert.ok(svgFor({...curve,field:'total'}).includes('Recorded total'));
});

test('both orientations draw, and the measured axis is the one that moves', ()=>{
  const vertical=svgFor(curve),horizontal=svgFor(curve,{orientation:'horizontal'});
  assert.ok(vertical.includes('rotate(-90)'),'vertical names its measure down the side');
  assert.ok(!horizontal.includes('rotate(-90)'));
  for(const svg of [vertical,horizontal]){
    assert.ok(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIGURE_WIDTH} `),
      'the figure is a fixed width so a pair of them line up on a page');
    assert.ok(svg.includes(FIGURE_TYPE.family),'the shared type stack travels with it');
  }
});

test('a long category label turns rather than collides', ()=>{
  const many={caption:'c',field:'count',total:40,
    bins:Array.from({length:20},(_,i)=>({key:'k'+i,label:`1854-09-${String(i+1).padStart(2,'0')}`,count:i}))};
  assert.ok(svgFor(many).includes('rotate(-45)'),'twenty dates cannot sit flat');
  assert.ok(!svgFor(decisions).includes('rotate(-45)'),'three short labels can');
});

test('an empty chart is refused rather than exported blank', ()=>{
  assert.throws(()=>svgFor({caption:'c',field:'count',total:0,bins:[]}),/no categories to draw/);
});

test('nothing is drawn outside the figure, at any number of categories', ()=>{
  // The lesson from rendering the Snow curve and looking at it: the string assertions above all
  // passed while the axis title sat on top of 43 rotated date labels and the last of them ran off
  // the edge. Geometry needs measuring, not reading.
  for(const count of [1,3,12,20,43,60]){
    const chart={caption:'c',field:'count',total:count,
      bins:Array.from({length:count},(_,i)=>({key:'k'+i,label:`1854-09-${String((i%30)+1).padStart(2,'0')}`,count:i}))};
    for(const params of [{},{orientation:'horizontal'}]){
      const svg=standaloneChartSvg(chart,params,{});
      const [,width,height]=svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
      const xs=[...svg.matchAll(/\sx="(-?[\d.]+)"/g)].map(m=>Number(m[1]));
      const ys=[...svg.matchAll(/\sy="(-?[\d.]+)"/g)].map(m=>Number(m[1]));
      assert.ok(Math.min(...xs)>=0,`${count} bars ${params.orientation??'vertical'}: something starts left of the figure`);
      assert.ok(Math.max(...xs)<=width,`${count} bars: something starts right of the figure`);
      assert.ok(Math.max(...ys)<=height,`${count} bars: something is drawn below the figure`);
      // The last bar must sit inside the plot, not on the edge.
      const rects=[...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)];
      for(const [,x,,w] of rects)assert.ok(Number(x)+Number(w)<=width,'a bar runs past the edge');
    }
  }
});

test('many bars are labelled selectively, few are labelled in full', ()=>{
  // A number over every one of 43 bars is noise; the eye reads the shape and the peak.
  const many={caption:'c',field:'count',total:100,
    bins:Array.from({length:43},(_,i)=>({key:'k'+i,label:'L'+i,count:i}))};
  const labels=svg=>[...svg.matchAll(/text-anchor="middle" font-size="12" fill="#1A1A1A">([\d,]+)</g)].length;
  const shown=labels(standaloneChartSvg(many,{},{}));
  assert.ok(shown>0&&shown<=6,`at 43 bars only the peak and its near neighbours, got ${shown}`);
  assert.ok(shown<many.bins.length/4,'and far fewer than one per bar');
  const few={caption:'c',field:'count',total:10,
    bins:Array.from({length:4},(_,i)=>({key:'k'+i,label:'L'+i,count:i+1}))};
  assert.equal(labels(standaloneChartSvg(few,{},{})),4,'at four bars every value is written');
});
