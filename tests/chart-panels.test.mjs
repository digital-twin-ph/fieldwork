import test from 'node:test';
import assert from 'node:assert/strict';
import {tableChart,chartMarkup,PANEL_POINT_LIMIT} from '../build/chart-output.js';
import {chartVegaSpec,panelMark} from '../build/chart-vega.js';

/** VARIABLES MOVING TOGETHER THROUGH TIME, one panel each on a shared axis (experiment 174). The practitioner,
 *  2026-11-04: *"How do we show the dependent and independent variables moving together through time?"* */
const DAYS=['2023-06-05','2023-06-06','2023-06-07','2023-06-08'];
const melted=(variables={count:[29,34,49,29],pm25:[10.9,85.6,190.0,70.3]})=>{
  const rows=Object.entries(variables).flatMap(([variable,values])=>
    DAYS.map((date,i)=>({key:{date,variable},value:values[i]??null})));
  return {kind:'data-table',keys:['date','variable'],valueField:'value',rows,rowCount:rows.length,
    missingValueCount:rows.filter(r=>r.value===null).length};
};

test('one panel per variable, in the order met, on a time axis',()=>{
  const chart=tableChart(melted(),'date','variable');
  assert.deepEqual(chart.panels,['count','pm25']);
  assert.equal(chart.temporal,true);
  assert.equal(chart.bins.length,8);
  assert.equal(chart.bins.find(b=>b.panel==='pm25'&&b.label==='2023-06-07').count,190);
  assert.match(chart.caption,/one panel per variable/);
});

test('a missing value is a gap, not a zero',()=>{
  const chart=tableChart(melted({count:[29,34,null,29]}),'date','variable');
  const gap=chart.bins.find(b=>b.label==='2023-06-07');
  assert.equal(gap.missing,true);
  const spec=chartVegaSpec(chart,{renderer:'vega-lite',panelsBy:'variable',panelMarks:{count:'line'}});
  assert.equal(spec.data.values.find(v=>v.label==='2023-06-07').count,null);
  assert.equal(spec.vconcat[0].layer.at(-1).mark.invalid,'break-paths-show-path-domains');
  assert.match(chart.caption,/1 point with no value, left as gaps/);
});

test('each panel has its own scale on one shared axis, and only the bottom one is labelled',()=>{
  const spec=chartVegaSpec(tableChart(melted(),'date','variable'),{renderer:'vega-lite',panelsBy:'variable',xAxisTitle:'Date'});
  assert.deepEqual(spec.resolve.scale,{x:'shared',y:'independent'});
  assert.equal(spec.vconcat.length,2);
  const [top,bottom]=spec.vconcat.map(panel=>panel.layer.at(-1));
  assert.deepEqual(top.transform,[{filter:'datum.panel === "count"'}]);
  assert.equal(top.encoding.y.title,'count');
  assert.equal(bottom.encoding.y.title,'pm25');
  assert.equal(top.encoding.x.type,'temporal');
  assert.equal(top.encoding.x.axis.labels,false);
  assert.equal(bottom.encoding.x.title,'Date');
  // There is no second y axis anywhere.
  assert.ok(!JSON.stringify(spec).includes('"orient":"right"'));
});

test('bars up to 60 points and a line beyond, unless the practitioner chose',()=>{
  const chart=tableChart(melted(),'date','variable');
  assert.equal(panelMark(chart,{},'count'),'bar');
  assert.equal(panelMark(chart,{panelMarks:{count:'line'}},'count'),'line');
  const long=Array.from({length:61},(_,i)=>new Date(Date.UTC(2023,0,1)+i*86_400_000).toISOString().slice(0,10));
  const rows=long.map(date=>({key:{date,variable:'o3'},value:30}));
  const wide=tableChart({kind:'data-table',keys:['date','variable'],valueField:'value',rows,rowCount:61,missingValueCount:0},'date','variable');
  assert.equal(panelMark(wide,{},'o3'),'line');
});

test('a shaded period is behind every panel, to the end of its last day',()=>{
  const spec=chartVegaSpec(tableChart(melted(),'date','variable'),
    {renderer:'vega-lite',panelsBy:'variable',shade:{from:'2023-06-06',to:'2023-06-07'}});
  for(const panel of spec.vconcat){
    assert.equal(panel.layer[0].mark.type,'rect');
    assert.deepEqual(panel.layer[0].data.values,[{from:'2023-06-06',to:'2023-06-08'}]);
  }
});

test('what panels refuse, and the renderer that cannot draw them says so',()=>{
  assert.throws(()=>tableChart(melted(),'date','date'),/cannot be both the axis and the panels/);
  assert.throws(()=>tableChart(melted(),'date','site'),/no "site" column/);
  const twice=melted();twice.rows.push({key:{date:'2023-06-05',variable:'count'},value:1});
  assert.throws(()=>tableChart(twice,'date','variable'),/appears twice in the count panel/);
  assert.ok(PANEL_POINT_LIMIT>=4*3653,'ten years of four daily series fit');
  assert.match(chartMarkup(tableChart(melted(),'date','variable'),s=>s),/Panels are drawn by the Vega-Lite renderer/);
});

test('a blank panel is drawn and named as blank, and numbered categories run in number order',()=>{
  const chart={field:'value',measure:'value',categoryTitle:'age',caption:'c',total:3,panels:['f',''],temporal:false,
    bins:[{key:'f\u000010',label:'10',count:1,panel:'f'},{key:'f\u00002',label:'2',count:2,panel:'f'},{key:'\u00009',label:'9',count:3,panel:''}]};
  const spec=chartVegaSpec(chart,{label:'x',panelsBy:'gender'},{});
  assert.equal(spec.vconcat[1].layer.at(-1).transform[0].filter,'datum.panel === ""');
  assert.equal(spec.vconcat[1].layer.at(-1).encoding.y.title,'gender blank');
  assert.deepEqual(spec.vconcat[0].layer.at(-1).encoding.x.sort,['2','9','10']);
});

test('bands that begin with a number run in the order of that number, not as text',()=>{
  const bin=(p,l,n)=>({key:`${p}\u0000${l}`,label:l,count:n,panel:p});
  const chart={field:'value',measure:'value',categoryTitle:'age_band',caption:'c',total:5,panels:['Male'],temporal:false,
    bins:[bin('Male','10–14',1),bin('Male','15+',1),bin('Male','5–9',1),bin('Male','0',1),bin('Male','1–4',1)]};
  const spec=chartVegaSpec(chart,{label:'x',panelsBy:'Sex'},{});
  assert.deepEqual(spec.vconcat[0].layer.at(-1).encoding.x.sort,['0','1–4','5–9','10–14','15+']);
});

test('a line runs along the categories, upright, with a dot at each value (2026-11-12)',()=>{
  const chart={field:'value',measure:'value',categoryTitle:'week',caption:'c',total:3,
    bins:[{key:'a',label:'2024-01-01',count:2},{key:'b',label:'2024-01-08',count:5},{key:'c',label:'2024-01-15',count:3}]};
  const spec=chartVegaSpec(chart,{label:'x',renderer:'vega-lite',mark:'line',orientation:'horizontal'},{});
  assert.equal(spec.mark.type,'line');
  assert.ok(spec.mark.point,'a dot at each value');
  assert.equal(spec.encoding.y.title!==undefined&&spec.encoding.x.title!==undefined,true);
  assert.notEqual(spec.encoding.x.field,'count','upright: the categories run along the bottom');
});
