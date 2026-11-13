import test from 'node:test';
import assert from 'node:assert/strict';
import {chartVegaSpec} from '../build/chart-vega.js';

/** A POPULATION PYRAMID (experiment 210, 2026-11-12): Hagelloch's cases by age and gender, two groups back to back. */
const bin=(label,panel,count)=>({key:`${panel}|${label}`,label,panel,count});
const chart={field:'value',caption:'cases by age',categoryTitle:'age',total:20,panels:['f','m',''],
  bins:[bin('10','f',3),bin('2','f',5),bin('10','m',4),bin('2','m',6),bin('2','',2)]};

test('two groups back to back, the youngest at the bottom, the blanks said and not drawn',()=>{
  const spec=chartVegaSpec(chart,{label:'P',keyColumn:'age',panelsBy:'gender',figure:'pyramid'});
  assert.deepEqual(spec.data.values.map(v=>[v.group,v.band,v.signed]),[['f','10',-3],['f','2',-5],['m','10',4],['m','2',6]]);
  assert.deepEqual(spec.encoding.y.sort,['10','2'],'listed from the top, so 2 is at the bottom');
  assert.equal(spec.encoding.x.axis.labelExpr,'abs(datum.value)');
  assert.ok(spec.title.subtitle.some(line=>line.includes('2 with gender blank are not drawn.')));
});

test('a column with other than two groups is refused, naming them',()=>{
  assert.throws(()=>chartVegaSpec({...chart,panels:['f','m','x'],bins:[...chart.bins,bin('2','x',1)]},
    {label:'P',keyColumn:'age',panelsBy:'gender',figure:'pyramid'}),/two groups back to back; gender holds 3: f, m, x/);
});

test('a marked date falls in the bin that holds it, and is drawn as a rule and its label over the chart',async()=>{
  const {markedBin}=await import('../build/chart-vega.js');
  // Days, weeks keyed by their first day, months: the last bin not after the date.
  assert.equal(markedBin([{key:'1854-09-07'},{key:'1854-09-08'},{key:'1854-09-09'}],'1854-09-08'),1);
  assert.equal(markedBin([{key:'1854-09-04'},{key:'1854-09-11'}],'1854-09-08'),0);
  assert.equal(markedBin([{key:'1854-08'},{key:'1854-09'}],'1854-09-08'),1);
  assert.equal(markedBin([{key:'1854-09-04'}],'1854-08-01'),undefined,'before the first bin, not drawn');
  assert.equal(markedBin([{key:'1'},{key:'2'}],'1854-09-08'),undefined,'a cycle has no dates');
  const curve={field:'count',caption:'deaths by day',total:6,categoryTitle:'date',bins:[{key:'1854-09-07',label:'1854-09-07',count:2},{key:'1854-09-08',label:'1854-09-08',count:3},{key:'1854-09-09',label:'1854-09-09',count:1}]};
  const spec=chartVegaSpec(curve,{label:'C',markedDates:[{date:'1854-09-08',label:'Pump handle removed'}]});
  assert.equal(spec.layer.length,3);
  assert.equal(spec.layer[1].mark.type,'rule');
  assert.deepEqual(spec.layer[2].data.values.map(v=>[v.displayLabel,v.text]),[['1854-09-08','Pump handle removed']]);
  assert.equal(chartVegaSpec(curve,{label:'C'}).layer,undefined,'no date marked, one mark as before');
});

test('a series split by a column: every period for every value, and stacked one colour each',async()=>{
  const {caseSeries,seriesTable,seriesChart}=await import('../build/case-series.js');
  const pts=[['2024-01-01','a'],['2024-01-01','b'],['2024-01-03','a'],['2024-01-03',''],].map(([d,g],i)=>({type:'Feature',id:`r${i}`,geometry:{type:'Point',coordinates:[0,0]},properties:{onset:d,class:g}}));
  const series=caseSeries({type:'FeatureCollection',features:pts},{dateField:'onset',dateKind:'onset',period:'day',splitBy:'class'});
  assert.deepEqual(series.groups,['a','b',''],'blank its own value, last');
  assert.equal(series.bins.length,9,'three days for each of three values, the empty day kept');
  assert.equal(series.total,4);
  assert.deepEqual(seriesTable(series).keys,['period','class']);
  const chart=seriesChart(series);
  assert.equal(chart.groupedBy,'class');
  const spec=chartVegaSpec(chart,{label:'S',inputMode:'series',figure:'stacked'});
  assert.equal(spec.encoding.y.stack,'zero');
  assert.deepEqual(spec.encoding.color.scale.domain,['a','b','class blank']);
  assert.throws(()=>chartVegaSpec({...chart,panels:Array.from({length:12},(_,i)=>String(i))},{label:'S',figure:'stacked'}),/12 values, more than the 6 colours/);
});
