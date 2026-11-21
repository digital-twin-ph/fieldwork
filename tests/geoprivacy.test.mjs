import test from 'node:test';
import assert from 'node:assert/strict';
import {latLngToCell} from 'h3-js';
import {geoprivacyExample} from '../build/geoprivacy-example.js';
import {moveDonut,aggregateHex} from '../build/geoprivacy.js';
import {comparePointSets} from '../build/point-comparison.js';
import {computeMeanCenter} from '../build/mean-center.js';
import {metric} from '../build/catchments.js';
import {distanceKm,executeWorkflow,validateWorkflow} from '../build/core.js';
import {auditRuntimeRun} from '../scripts/audit-runtime-n3.mjs';

const ready=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true',objectType:'Literal',datatype:'http://www.w3.org/2001/XMLSchema#boolean'}];
const input=geoprivacyExample().nodes.find(n=>n.id==='locations').params.data;
const pumps=geoprivacyExample().nodes.find(n=>n.id==='pumps').params.data;

test('projected mean-center comparison preserves pump context and rejects incomplete comparisons',()=>{
  const moved=moveDonut(input,{label:'Donut',innerM:50,outerM:125,seed:42}),params={label:'Compare',zone:30,hemisphere:'north'};
  const value=comparePointSets(input,moved,pumps,params),projection=metric(30,'north');
  const arithmeticMean=points=>points.reduce(([x,y],point)=>{const [e,n]=projection.forward(point.geometry.coordinates);return [x+e,y+n];},[0,0]).map(v=>v/points.length);
  const a=arithmeticMean(input.features),b=arithmeticMean(moved.features);
  assert.ok(Math.hypot(...projection.forward(value.originalMean).map((v,i)=>v-a[i]))<1e-6);
  assert.ok(Math.hypot(...projection.forward(value.movedMean).map((v,i)=>v-b[i]))<1e-6);
  assert.ok(Math.abs(value.centerShiftM-Math.hypot(a[0]-b[0],a[1]-b[1]))<1e-6);
  assert.equal(value.pumps.features.length,8);assert.ok(value.originalNearestPump.distanceM>0&&value.movedNearestPump.distanceM>0);
  assert.throws(()=>comparePointSets(input,{...moved,features:moved.features.slice(1)},pumps,params),/equally sized/);
  assert.throws(()=>comparePointSets(input,moved,{...pumps,features:[{...pumps.features[0],geometry:null}]},params),/known coordinates/);
  assert.throws(()=>comparePointSets(input,moved,pumps,{...params,zone:1}),/UTM zone/);
});

test('Mean center is a reusable typed computation on each donut branch',()=>{
  const moved=moveDonut(input,{label:'Donut',innerM:50,outerM:125,seed:42});
  const params={label:'Mean center',zone:30,hemisphere:'north'};
  const originalCenter=computeMeanCenter(input,params),movedCenter=computeMeanCenter(moved,params);
  const comparison=comparePointSets(input,moved,pumps,{...params,centers:true},originalCenter,movedCenter);
  assert.deepEqual(comparison.originalMean,originalCenter.coordinates);
  assert.deepEqual(comparison.movedMean,movedCenter.coordinates);
  assert.throws(()=>computeMeanCenter({...input,features:[]},params),/at least one point/);
  assert.throws(()=>computeMeanCenter({...input,features:[{...input.features[0],geometry:null}]},params),/known coordinates/);
  assert.throws(()=>comparePointSets(input,moved,pumps,{...params,centers:true},originalCenter,{...movedCenter,crs:'EPSG:32631'}),/CRS and source counts/);
});

test('donut movement is reproducible, metre-bounded, and omits source identities and attributes',()=>{
  const params={label:'Donut',innerM:50,outerM:125,seed:42};
  const first=moveDonut(input,params),second=moveDonut(input,params);
  assert.deepEqual(first,second);assert.equal(first.features.length,250);
  first.features.forEach((f,i)=>{const distance=distanceKm(f.geometry.coordinates,input.features[i].geometry.coordinates)*1000;assert.ok(distance>=49.99&&distance<125.01);assert.equal(f.id,`moved-${i+1}`);assert.deepEqual(Object.keys(f.properties),['name']);});
  assert.throws(()=>moveDonut(input,{...params,innerM:125,outerM:50}),/donut/);
  assert.throws(()=>moveDonut({...input,features:[{...input.features[0],geometry:null}]},params),/known coordinates/);
});

test('H3 aggregates every located point once and omits sparse cells',()=>{
  const params={label:'H3',resolution:9,minOccupancy:2},result=aggregateHex(input,params);
  assert.equal(result.kind,'hexbin');assert.ok(result.features.length>0);
  assert.ok(result.features.every(f=>f.count>=2&&f.geometry.type==='Polygon'));
  const counts=new Map();for(const f of input.features){const [lon,lat]=f.geometry.coordinates,id=latLngToCell(lat,lon,9);counts.set(id,(counts.get(id)||0)+1);}
  assert.deepEqual(result.features.map(f=>[f.id,f.count]).sort(),[...counts].filter(([,n])=>n>=2).sort());
  assert.equal(result.summary.matched+result.summary.unmatched,250);
  assert.throws(()=>aggregateHex(input,{...params,minOccupancy:1}),/minimum cell occupancy/);
});

test('connected example exposes private before and derived after tabs with valid runtime RDF',async()=>{
  const duplicate=geoprivacyExample();duplicate.edges.find(e=>e.to==='compare'&&e.port==='moved').from='locations';
  assert.throws(()=>validateWorkflow(duplicate),/distinct original, moved, and pump sources/);
  const wrongCenter=geoprivacyExample();wrongCenter.edges.find(e=>e.to==='moved-center'&&e.port==='points').from='locations';
  assert.throws(()=>validateWorkflow(wrongCenter),/same point source/);
  const workflow=validateWorkflow(geoprivacyExample()),run=await executeWorkflow(workflow,ready);
  // COMPARISON MAP RETIRED INTO MAP (2026-11-20): the comparison is a Map of five point layers and a Table of distances.
  const ids=run.outputs.map(o=>o.nodeId);
  for(const id of ['before-map','before-table','after-move-map','after-move-table','comparison-map','comparison-distances','after-group-map','after-group-table'])assert.ok(ids.includes(id),id);
  const at=id=>run.outputs.find(o=>o.nodeId===id);
  assert.equal(at('after-move-map').rows.length,250);assert.equal(at('after-group-map').polygons.kind,'hexbin');
  assert.equal(at('comparison-map').rows.length,250+250+2+8);
  assert.match(run.tables['compare'].rows[1].key.measure,/^original mean centre to its nearest pump, /);
  assert.equal(run.tables['compare'].unit,'m');
  assert.match(run.receipts.find(r=>r.nodeId==='compare').facts,/fw:metricCRS "EPSG:32630"/);
  assert.match(run.receipts.find(r=>r.nodeId==='compare').facts,/fw:originalMeanCenter/);
  assert.match(run.receipts.find(r=>r.nodeId==='compare').facts,/fw:originalNearestPumpId/);
  assert.match(run.receipts.find(r=>r.nodeId==='original-center').facts,/fw:MeanCenterComputation/);
  assert.match(run.receipts.find(r=>r.nodeId==='moved-center').facts,/fw:MeanCenterResult/);
  assert.match(run.receipts.find(r=>r.nodeId==='move').facts,/fw:randomSeed 42/);
  assert.match(run.receipts.find(r=>r.nodeId==='group').facts,/fw:HexCellDataset/);
  assert.match(run.receipts.find(r=>r.nodeId==='group').facts,/geo:asWKT/);
  assert.ok(at('after-move-map').rows.every(r=>r.recordId.startsWith('moved-')&&!('DEATHS' in r.attributes)));
  assert.ok(at('after-group-map').rows.every(r=>!('siteId' in r.attributes)));
  const audit=await auditRuntimeRun(run);assert.equal(audit.summary.conforms,true,JSON.stringify(audit.summary));
  const broken=structuredClone(run),receipt=broken.receipts.find(r=>r.nodeId==='group');receipt.facts=receipt.facts.replace(/fw:minimumOccupancy 2; /,'');receipt.input=receipt.facts;
  const negative=await auditRuntimeRun(broken);assert.equal(negative.summary.conforms,false);assert.match(JSON.stringify(negative.summary.shacl),/minimumOccupancy/);
  const missingCenter=structuredClone(run),comparison=missingCenter.receipts.find(r=>r.nodeId==='compare');comparison.facts=comparison.facts.replace(/; fw:movedMeanCenter <[^>]+>/,'');comparison.input=comparison.facts;
  const centerAudit=await auditRuntimeRun(missingCenter);assert.equal(centerAudit.summary.conforms,false);assert.match(JSON.stringify(centerAudit.summary.shacl),/movedMeanCenter/);
  const brokenMean=structuredClone(run),mean=brokenMean.receipts.find(r=>r.nodeId==='original-center');mean.facts=mean.facts.replace(/; fw:inputCount 250/,'');mean.input=mean.facts;
  const meanAudit=await auditRuntimeRun(brokenMean);assert.equal(meanAudit.summary.conforms,false);assert.match(JSON.stringify(meanAudit.summary.shacl),/inputCount/);
});

test('a saved Comparison map opens rewritten as a Map of what was compared and a Table of its distances',()=>{
  // As the example was saved before 2026-11-20: Compare point sets feeding a Comparison map.
  const saved=geoprivacyExample();
  saved.nodes=saved.nodes.filter(n=>n.id!=='comparison-distances').map(n=>n.id==='comparison-map'?{...n,type:'comparison_map',params:{label:'PRIVATE · original vs moved centers'}}:n);
  saved.edges=saved.edges.filter(e=>e.to!=='comparison-map'&&e.to!=='comparison-distances').concat({id:'old',from:'compare',to:'comparison-map',port:'comparison'});
  const w=validateWorkflow(saved);
  const map=w.nodes.find(n=>n.id==='comparison-map');
  assert.equal(map.type,'map_output');assert.equal(map.sourceMigration.fromType,'comparison_map');assert.equal(map.params.pointInputCount,5);
  assert.deepEqual(w.edges.filter(e=>e.to==='comparison-map').map(e=>`${e.port}:${e.from}`).sort(),
    ['area:study','points:locations','points_2:move','points_3:original-center','points_4:moved-center','points_5:pumps']);
  const table=w.nodes.find(n=>n.type==='table_output'&&w.edges.some(e=>e.to===n.id&&e.from==='compare'));
  assert.ok(table,'a Table reads the distances');
});
