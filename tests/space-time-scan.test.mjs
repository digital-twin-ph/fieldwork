import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spaceTimeScan,llrOf,scanValue,validateScanParams,SCAN_DEFAULTS} from '../build/space-time-scan.js';

// A SPACE-TIME PERMUTATION SCAN (experiment 200, Detect): the statistic by hand, every record accounted for, the seed
// reproducing the p-value, and Hagelloch as the first use.
const at=(id,date,x,y)=>({type:'Feature',id,properties:{onset:date},geometry:{type:'Point',coordinates:[x,y]}});
const settings={...SCAN_DEFAULTS,dateField:'onset',seed:7,replications:99};

test('the likelihood ratio is the space-time permutation model’s, and nothing below what is expected scores',()=>{
  // 6 observed where 2 were expected, of 20.
  assert.ok(Math.abs(llrOf(6,2,20)-(6*Math.log(3)+14*Math.log(14/18)))<1e-12);
  assert.equal(llrOf(2,2,20),0);
  assert.equal(llrOf(1,2,20),0);
});

test('a burst at one place over three days is found, with its observed and expected counts as worked by hand',()=>{
  const f=[];let k=0;
  // Background: one case a day for 60 days, rotating over 5 places 10 m apart along a line.
  const day=d=>new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10);
  for(let d=0;d<60;d++)f.push(at(`b${k++}`,day(d),0.0001*(d%5),0));
  // The burst: 6 cases at a sixth place, on days 10 to 12.
  for(let i=0;i<6;i++)f.push(at(`x${i}`,`2026-01-${String(10+i%3).padStart(2,'0')}`,0.01,0.01));
  const r=spaceTimeScan({type:'FeatureCollection',features:f},settings);
  const top=r.clusters[0];
  assert.deepEqual([top.start,top.end,top.places.length,top.observed],['2026-01-10','2026-01-12',1,6]);
  // Expected: the place's 6 cases over the period, times the 9 cases everywhere on days 10 to 12, over 66.
  assert.ok(Math.abs(top.expected-6*9/66)<1e-12);
  assert.ok(top.pValue<=0.05,`p ${top.pValue}`);
  assert.deepEqual(r.excluded,{noDate:0,noLocation:0,outsidePeriod:0});
});

test('records without a date or a place, or outside the period, are counted and not scanned',()=>{
  const f=[at('a','2026-01-01',0,0),at('b','2026-01-02',1,1),at('c','2026-01-03',0,0),at('d','2026-01-04',1,1),
    at('e','',0,0),{type:'Feature',id:'f',properties:{onset:'2026-01-02'},geometry:null},at('g','2026-03-01',0,0)];
  const r=spaceTimeScan({type:'FeatureCollection',features:f},{...settings,end:'2026-01-31'});
  assert.deepEqual(r.excluded,{noDate:1,noLocation:1,outsidePeriod:1});
  assert.equal(r.totals.cases,4);
  assert.equal(r.totals.records,7);
});

test('the same seed gives the same p-values; secondary clusters share no place with one before them',()=>{
  const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
  const s={...SCAN_DEFAULTS,dateField:'date_of_prodrome',unit:'week',seed:20261110,replications:199};
  const one=spaceTimeScan(cases,s),two=spaceTimeScan(cases,s);
  assert.deepEqual(one.clusters.map(c=>c.pValue),two.clusters.map(c=>c.pValue));
  const seen=new Set();
  for(const c of one.clusters){const keys=c.places.map(p=>p.join());assert.ok(keys.every(k=>!seen.has(k)));keys.forEach(k=>seen.add(k));}
  // Hagelloch by week: the most likely cluster is one house, 8 cases where 0.6 were expected.
  assert.deepEqual([one.clusters[0].places.length,one.clusters[0].observed],[1,8]);
  const {value,receipt}=scanValue(one,{id:'scan',params:{label:'Scan',dateField:'date_of_prodrome'}},'r','cases');
  assert.equal(value.features.length,one.clusters.length);
  assert.equal(value.features[0].properties.observed,8);
  assert.match(receipt.facts,/a fw:SpaceTimeScan, prov:Activity;.*fw:randomSeed 20261110;/);
  assert.match(receipt.method,/The most likely cluster: 8 cases where 0\.6 were expected/);
});

test('settings outside SaTScan’s ranges are refused with what to change',()=>{
  const ok={dateField:'d',unit:'day',maxCaseShare:0.5,maxTimeShare:0.5,replications:999,seed:1};
  assert.doesNotThrow(()=>validateScanParams(ok));
  assert.throws(()=>validateScanParams({...ok,maxCaseShare:0.6}),/at most 0\.5/);
  assert.throws(()=>validateScanParams({...ok,replications:10}),/99 to 99,999/);
  assert.throws(()=>validateScanParams({...ok,start:'2026-02-01',end:'2026-01-01'}),/starts on or before/);
});

test('the day-by-day replay: prospective, only runs ending each day, first flagged on 21 November in Hagelloch',async()=>{
  const {spaceTimeReplay,replayValue}=await import('../build/space-time-scan.js');
  const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
  const r=spaceTimeReplay(cases,{...SCAN_DEFAULTS,dateField:'date_of_prodrome',seed:20261110,replications:999});
  assert.equal(r.days.length,87);
  assert.equal(r.days.filter(d=>d.skipped).length,8,'too early to scan until the fourth case');
  for(const d of r.days)if(d.cluster)assert.equal(d.cluster.end,d.day,'every cluster runs to its own day');
  assert.equal(r.firstAt['0.05'],'1861-11-21');
  const flagged=r.days.find(d=>d.day==='1861-11-21').cluster;
  assert.deepEqual([flagged.places.length,flagged.observed,flagged.start],[4,6,'1861-11-21']);
  const {receipt}=replayValue(r,{id:'replay',params:{label:'Replay',dateField:'date_of_prodrome'}},'r','cases');
  assert.match(receipt.method,/first day the most likely cluster had p at or under 0\.05 was 1861-11-21/);
  assert.match(receipt.method,/looking every day raises the chance of a false alarm/);
});

test('both modes write a Methods note citing Kulldorff and others 2005, verified',async()=>{
  const {scanEquationNote,METHOD_REFERENCES,renderMethodCitation}=await import('../build/equations.js');
  const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
  const r=spaceTimeScan(cases,{...SCAN_DEFAULTS,dateField:'date_of_prodrome',unit:'week',seed:1,replications:99});
  const note=scanEquationNote(r,'scan','date_of_prodrome',{maxCaseShare:0.5,maxTimeShare:0.5});
  assert.match(note.text,/\$\$8 \\ln\\frac\{8\}/);
  assert.deepEqual(note.cites,['space-time permutation']);
  assert.match(note.text,/\\mu = \\frac\{C_\{Z\}\\,C_\{T\}\}\{N\}/);
  assert.equal(METHOD_REFERENCES['space-time permutation'].citation.doi,'10.1371/journal.pmed.0020059');
  assert.match(renderMethodCitation('space-time permutation'),/Kulldorff M.*PLoS Medicine\. 2005;2\(3\):e59/);
});

test('the circles do not depend on where the village sits: every longitude shifted, the same scan',()=>{
  const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
  const s={...SCAN_DEFAULTS,dateField:'date_of_prodrome',unit:'week',seed:3,replications:99};
  const here=spaceTimeScan(cases,s);
  for(const shift of [0.0486156,-0.3,1.7]){
    const moved=structuredClone(cases);for(const f of moved.features)f.geometry.coordinates[0]+=shift;
    const there=spaceTimeScan(moved,s);
    assert.equal(there.totals.circles,here.totals.circles,`shifted ${shift}`);
    assert.deepEqual(there.clusters.map(c=>c.pValue),here.clusters.map(c=>c.pValue));
  }
});
