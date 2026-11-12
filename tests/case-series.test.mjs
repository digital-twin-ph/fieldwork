import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,Parser} from 'n3';
import {caseSeries,seriesTable,seriesChart,seriesReceipt} from '../build/case-series.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';

// Shaped like the project's John Snow data: addresses carrying death counts, with dates added.
// The dates are synthetic; the file in examples/john-snow has none.
const feature=(id,count,date,name=id)=>({type:'Feature',id,properties:{name,DEATHS:count,death_date:date},
  geometry:{type:'Point',coordinates:[-0.1379,51.5134]}});
const points=(...features)=>({type:'FeatureCollection',features});
const snow=points(feature('a',3,'1854-08-31'),feature('b',2,'1854-09-01'),feature('c',5,'1854-09-03'));
const options={dateField:'death_date',dateKind:'death',period:'day'};

test('a weighted series counts cases, an unweighted one counts records', () => {
  const weighted=caseSeries(snow,{...options,weightField:'DEATHS'});
  assert.equal(weighted.total,10);
  assert.equal(weighted.datedRecords,3);
  const records=caseSeries(snow,options);
  assert.equal(records.total,3);
  // This is the distinction the John Snow file forces: 250 rows carry 489 deaths.
  assert.notEqual(weighted.total,records.total);
});

test('a period with no cases is kept, because a gap is a fact about the outbreak', () => {
  const series=caseSeries(snow,{...options,weightField:'DEATHS'});
  assert.deepEqual(series.bins.map(b=>[b.key,b.count]),
    [['1854-08-31',3],['1854-09-01',2],['1854-09-02',0],['1854-09-03',5]]);
});

test('weeks begin on Monday and months group, with keys that sort into order', () => {
  const across=points(feature('a',1,'1854-08-31'),feature('b',1,'1854-09-04'),feature('c',1,'1854-09-05'));
  const weekly=caseSeries(across,{...options,period:'week'});
  assert.deepEqual(weekly.bins.map(b=>b.key),['1854-08-28','1854-09-04']);
  assert.equal(weekly.bins[1].count,2);
  assert.match(weekly.bins[0].label,/^Week beginning 1854-08-28$/);
  const monthly=caseSeries(across,{...options,period:'month'});
  assert.deepEqual(monthly.bins.map(b=>[b.key,b.count]),[['1854-08',1],['1854-09',2]]);
});

/** THE EPIDEMIOLOGICAL WEEK BEGINS ON A SUNDAY (experiment 187), as Brazil's data_iniSE records it. Every day of a
 *  year lands in the week of the Sunday on or before it, and a Sunday is the first day of its own week, never the last
 *  of the Monday week before. */
test('a week starting Sunday keys every day by the Sunday on or before it, and a Sunday by itself', () => {
  const DAY=86400000,day=t=>new Date(t).toISOString().slice(0,10);
  const year=Array.from({length:366},(_,i)=>day(Date.UTC(2024,0,1)+i*DAY));
  const series=caseSeries(points(...year.map((d,i)=>feature(`d${i}`,1,d))),{...options,period:'week-sunday'});
  for(const bin of series.bins)assert.equal(new Date(bin.key+'T00:00:00Z').getUTCDay(),0,`${bin.key} is a Sunday`);
  // Each Sunday in its own week: 2024-01-07 is a Sunday, and opens the week it keys.
  const sundays=caseSeries(points(feature('s',1,'2024-01-07'),feature('m',1,'2024-01-08'),feature('sat',1,'2024-01-13')),
    {...options,period:'week-sunday'});
  assert.deepEqual(sundays.bins.map(b=>[b.key,b.count]),[['2024-01-07',3]]);
  assert.match(sundays.bins[0].label,/^Week beginning 2024-01-07$/);
  // The Monday week puts the same Sunday in the week before.
  assert.deepEqual(caseSeries(points(feature('s',1,'2024-01-07')),{...options,period:'week'}).bins.map(b=>b.key),['2024-01-01']);
  // Every day counted once, in a week of seven days: 2024 starts on a Monday, so 53 weeks from 2023-12-31.
  assert.equal(series.total,366);
  assert.equal(series.bins[0].key,'2023-12-31');
  assert.ok(series.bins.slice(1,-1).every(b=>b.count===7));
  assert.match(seriesChart(sundays).caption,/^Cases by week starting Sunday of date of death/);
});

test('the kind of date is required and travels into the caption', () => {
  assert.throws(()=>caseSeries(snow,{...options,dateKind:'guess'}),/State which kind of date/);
  assert.throws(()=>caseSeries(snow,{...options,dateField:' '}),/reads no date it was not told about/);
  assert.throws(()=>caseSeries(snow,{...options,period:'quarter'}),/Choose a period/);
  assert.match(seriesChart(caseSeries(snow,options)).caption,/Cases by day of date of death/);
  assert.match(seriesChart(caseSeries(snow,{...options,dateKind:'onset'})).caption,/date of onset/);
});

test('an unparseable date excludes and reports the record rather than guessing its order', () => {
  const mixed=points(feature('a',1,'1854-08-31'),feature('b',1,'31/08/1854'),feature('c',1,''),feature('d',1,undefined));
  const series=caseSeries(mixed,options);
  assert.equal(series.datedRecords,1);
  assert.equal(series.undatedRecords,3);
  assert.deepEqual(series.undated.map(u=>u.value),['31/08/1854','','(attribute absent)']);
  assert.match(seriesChart(series).caption,/3 record\(s\) without a usable date are excluded/);
  // An impossible calendar date is not a date.
  assert.equal(caseSeries(points(feature('x',1,'1854-02-30')),options).undatedRecords,1);
});

test('a non-numeric or negative case weight is refused, naming the record', () => {
  assert.throws(()=>caseSeries(points(feature('a','many','1854-09-01')),{...options,weightField:'DEATHS'}),
    /Record a has a case weight of "many"/);
  assert.throws(()=>caseSeries(points(feature('a',-2,'1854-09-01')),{...options,weightField:'DEATHS'}),
    /at least zero/);
});

test('the series is also a table, and its receipt conforms to the runtime shapes', async () => {
  const series=caseSeries(snow,{...options,weightField:'DEATHS'});
  const table=seriesTable(series);
  assert.deepEqual(table.keys,['period']);
  assert.equal(table.valueField,'cases');
  assert.equal(table.rowCount,4);
  const facts=seriesReceipt({id:'series'},series,'r1','points').facts;
  const report=await validateGraph(new Store(new Parser().parse(facts)));
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
  assert.match(facts,/fw:eventDateKind "death"/);
  assert.match(facts,/fw:caseWeightField "DEATHS"/);
  assert.match(facts,/fw:undatedRecordCount "0"\^\^xsd:integer/);
  // A series that does not say which kind of date it used must not conform.
  assert.equal((await validateGraph(new Store(new Parser().parse(facts.replace(/fw:eventDateKind "death"; /g,''))))).conforms,false);
  // A Sunday week is a period the shapes know (experiment 187).
  const sunday=seriesReceipt({id:'series'},caseSeries(snow,{...options,period:'week-sunday'}),'r1','points').facts;
  assert.match(sunday,/fw:seriesPeriod "week-sunday"/);
  assert.equal((await validateGraph(new Store(new Parser().parse(sunday)))).conforms,true);
});

// --- Snow's own daily table, bundled in examples/john-snow -----------------------------------
import {readFile} from 'node:fs/promises';
import {dataTable} from '../build/data-table.js';
import {caseSeriesFromTable} from '../build/case-series.js';

const snowDates=async()=>{
  const text=await readFile(new URL('../examples/john-snow/snow_dates.csv',import.meta.url),'utf8');
  const lines=text.trim().split('\n');
  return {headers:lines[0].split(','),all:lines.slice(1).map(l=>l.split(','))};
};

test('Snow’s table gives two different curves, which is why the kind of date is required', async () => {
  const {headers,all}=await snowDates();
  // The final row has no date, and a keyed table cannot hold an empty key, so it is excluded here
  // and its 45 attacks of unknown date are absent from the series by construction.
  const dated=all.filter(row=>row[1]);
  assert.equal(all.length-dated.length,1);
  assert.equal(Number(all.find(row=>!row[1])[2]),45);

  const deaths=caseSeriesFromTable(dataTable({headers,rows:dated},{keys:['date'],valueField:'deaths'}),
    {dateField:'date',dateKind:'death',period:'day'});
  const attacks=caseSeriesFromTable(dataTable({headers,rows:dated},{keys:['date'],valueField:'attacks'}),
    {dateField:'date',dateKind:'onset',period:'day'});

  assert.equal(deaths.total,616);
  assert.equal(attacks.total,571);
  assert.equal(deaths.bins.length,43);
  assert.equal(deaths.bins[0].key,'1854-08-19');
  assert.equal(deaths.bins.at(-1).key,'1854-09-30');

  // The historical point the widget exists to keep: the two curves peak on different days.
  const peak=series=>series.bins.reduce((best,bin)=>bin.count>best.count?bin:best);
  assert.equal(peak(deaths).key,'1854-09-02');
  assert.equal(peak(deaths).count,127);
  assert.equal(peak(attacks).key,'1854-09-01');
  assert.equal(peak(attacks).count,143);
  assert.notEqual(peak(deaths).key,peak(attacks).key);

  // Weekly aggregation shows the lag: more attacks than deaths in the first full week, then the
  // reverse. Both series are facts about the same outbreak and are not interchangeable.
  const weekly=kind=>caseSeriesFromTable(dataTable({headers,rows:dated},{keys:['date'],valueField:kind==='death'?'deaths':'attacks'}),
    {dateField:'date',dateKind:kind,period:'week'});
  const deathWeeks=weekly('death').bins,attackWeeks=weekly('onset').bins;
  const week=(bins,key)=>bins.find(b=>b.key===key).count;
  assert.ok(week(attackWeeks,'1854-08-28')>week(deathWeeks,'1854-08-28'));
  assert.ok(week(deathWeeks,'1854-09-04')>week(attackWeeks,'1854-09-04'));
});

test('the table path names the real value column, not an internal placeholder', async () => {
  const {headers,all}=await snowDates();
  const series=caseSeriesFromTable(dataTable({headers,rows:all.filter(r=>r[1])},{keys:['date'],valueField:'deaths'}),
    {dateField:'date',dateKind:'death',period:'day'});
  assert.equal(series.weightField,'deaths');
  assert.match(seriesChart(series).caption,/weighted by deaths/);
  assert.doesNotMatch(seriesChart(series).caption,/__/);
});

test('a date column the table does not key on is refused with the keys it does have', async () => {
  const {headers,all}=await snowDates();
  const table=dataTable({headers,rows:all.filter(r=>r[1])},{keys:['date'],valueField:'deaths'});
  assert.throws(()=>caseSeriesFromTable(table,{dateField:'onset_date',dateKind:'onset',period:'day'}),
    /no key column "onset_date". Its key columns are: date/);
});

/** THE CYCLES (2026-11-12): day of the week and month of the year, counted by place in the cycle, every place kept. */
const dated=dates=>({type:'FeatureCollection',features:dates.map(([date,n],i)=>({type:'Feature',id:`c${i}`,geometry:null,
  properties:{name:`c${i}`,onset:date,...(n===undefined?{}:{n})}}))});
test('month of the year counts January to December across years, keeps an empty month, and honours a weight',()=>{
  // 2023-01-15 and 2024-01-03 are both January; 2024-03-31 counts 4; no case in February; one record undated.
  const series=caseSeries(dated([['2023-01-15',1],['2024-01-03',1],['2024-03-31',4],['2023-12-25',1],['not a date',1]]),
    {dateField:'onset',dateKind:'onset',period:'month-of-year',weightField:'n'});
  assert.deepEqual(series.bins.map(b=>b.label),['January','February','March','April','May','June','July','August','September','October','November','December']);
  assert.deepEqual(series.bins.map(b=>b.count),[2,0,4,0,0,0,0,0,0,0,0,1]);
  assert.equal(series.total,7);
  assert.equal(series.undatedRecords,1);
  assert.match(seriesChart(series).caption,/Cases by month of the year of date of onset/);
});
test('day of the week runs Monday to Sunday as ISO 8601 numbers them',()=>{
  // 2024-01-01 was a Monday, 2024-01-07 a Sunday, 2023-12-31 a Sunday.
  const series=caseSeries(dated([['2024-01-01'],['2024-01-07'],['2023-12-31'],['2024-01-03']]),
    {dateField:'onset',dateKind:'onset',period:'weekday'});
  assert.deepEqual(series.bins.map(b=>`${b.label} ${b.count}`),
    ['Monday 1','Tuesday 0','Wednesday 1','Thursday 0','Friday 0','Saturday 0','Sunday 2']);
});
