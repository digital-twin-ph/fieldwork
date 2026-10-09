import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,Parser} from 'n3';
import {dataTable} from '../build/data-table.js';
import {projectionExtract,projectionTable,readExtract,assignSites,assignmentTable,compareToElevation,
  selectionDomains,extractReceipt,assignmentReceipt,comparisonReceipt} from '../build/sea-level.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';

// Synthetic values with the published key structure. These are NOT AR6 numbers: a real extract
// comes from the pack's extraction script over the published store.
const headers=['site_id','scenario','workflow','family','year','quantile','value_m'];
const rows=[
  ['145','ssp126','wf_1e','with_vlm','2050','0.5','0.21'],
  ['145','ssp585','wf_1e','with_vlm','2100','0.5','0.77'],
  ['145','ssp585','wf_1e','without_vlm','2100','0.5','0.63'],
  ['394','ssp585','wf_1e','with_vlm','2100','0.5','0.58'],
];
const selection={keys:['site_id','scenario','workflow','family','year','quantile'],valueField:'value_m',unit:'metre'};
const table=()=>dataTable({headers,rows},selection);
const provenance={datasetIRI:'https://doi.org/10.5281/zenodo.6382554',datasetVersion:'20210809',
  baselinePeriod:'1995-2014',citations:['WG1 Chapter 9','FACTS model description','AR6 dataset 20210809'],
  familyValues:{withVerticalLandMotion:'with_vlm',withoutVerticalLandMotion:'without_vlm'}};
const sites={type:'FeatureCollection',features:[
  {type:'Feature',id:'s1',properties:{name:'MANILA',site_id:'145'},geometry:{type:'Point',coordinates:[120.97,14.58]}},
  {type:'Feature',id:'s2',properties:{name:'CEBU',site_id:'394'},geometry:{type:'Point',coordinates:[123.92,10.30]}},
]};
const points={type:'FeatureCollection',features:[
  {type:'Feature',id:'c1',properties:{name:'Clinic A',elevation_m:0.9},geometry:{type:'Point',coordinates:[120.99,14.60]}},
  {type:'Feature',id:'c2',properties:{name:'Clinic B',elevation_m:0.4},geometry:{type:'Point',coordinates:[123.90,10.31]}},
  {type:'Feature',id:'c3',properties:{name:'Unlocated',elevation_m:2.0},geometry:null},
]};
const extract=()=>projectionExtract(table(),provenance);
const graph=text=>new Store(new Parser().parse(text));

test('an extract is admissible only with the full key, the unit, the baseline and three citations', () => {
  const ok=extract();
  assert.deepEqual(ok.siteIds,['145','394']);
  assert.equal(selectionDomains(ok).family.length,2);
  // Dropping a key the table needs for uniqueness is caught by the table contract first, which is
  // the right order: experiment 48's unique-key rule fires before this widget sees the table.
  assert.throws(()=>dataTable({headers,rows},{keys:['site_id','scenario','year','quantile'],valueField:'value_m',unit:'metre'}),
    /share the key/);
  // A table whose reduced key is still unique reaches this widget, which then names what is absent.
  const unique=[rows[0],rows[1],rows[3]];
  const partial=dataTable({headers,rows:unique},{keys:['site_id','scenario','year','quantile'],valueField:'value_m',unit:'metre'});
  assert.throws(()=>projectionExtract(partial,provenance),/missing key columns: workflow, family/);
  assert.throws(()=>projectionExtract(dataTable({headers,rows},{...selection,unit:undefined}),provenance),/unit as metre/);
  assert.throws(()=>projectionExtract(table(),{...provenance,citations:['one','two']}),/three citations obligatory/);
  assert.throws(()=>projectionExtract(table(),{...provenance,baselinePeriod:'recent'}),/baseline period/);
  assert.throws(()=>projectionExtract(table(),{...provenance,datasetVersion:''}),/dataset version/);
});

test('a family value the declaration does not name is refused, since families are not comparable', () => {
  const stray=dataTable({headers,rows:[...rows,['145','ssp585','wf_1e','mystery','2100','0.5','0.9']]},selection);
  assert.throws(()=>projectionExtract(stray,provenance),/neither of the declared families/);
});

test('the extract travels as a displayable table and can be read back', () => {
  const value=projectionTable(extract());
  assert.equal(value.kind,'data-table');
  assert.equal(value.rowCount,4);
  assert.deepEqual(readExtract(value).provenance.citations.length,3);
  assert.throws(()=>readExtract({kind:'data-table',rows:[]}),/not a plain table/);
});

test('each point takes its nearest site, with the distance kept and unlocated points reported', () => {
  const assignments=assignSites(points,sites,extract());
  assert.equal(assignments.assigned,2);
  assert.equal(assignments.unassigned,1);
  assert.equal(assignments.rows[0].siteId,'145');
  assert.equal(assignments.rows[1].siteId,'394');
  assert.equal(assignments.rows[2].siteId,null);
  assert.match(assignments.rows[2].reason,/No coordinates/);
  assert.ok(assignments.rows[0].distanceM>0&&assignments.rows[0].distanceM<5000,`${assignments.rows[0].distanceM} m`);
  // The join is itself a table, so it can be displayed and checked.
  const joined=assignmentTable(assignments);
  assert.deepEqual(joined.keys,['point_id','projection_site']);
  assert.equal(joined.missingValueCount,1);
});

test('a site layer unrelated to the extract is refused rather than matched by position', () => {
  const unrelated={type:'FeatureCollection',features:[{type:'Feature',id:'x',properties:{name:'Elsewhere',site_id:'999'},geometry:{type:'Point',coordinates:[120,14]}}]};
  assert.throws(()=>assignSites(points,unrelated,extract()),/same published dataset/);
});

test('the comparison refuses a missing datum, a missing field and a partial key', () => {
  const assignments=assignSites(points,sites,extract());
  const base={selection:{scenario:'ssp585',workflow:'wf_1e',family:'with_vlm',year:'2100',quantile:'0.5'},
    elevationField:'elevation_m',verticalDatum:'MSL 1995-2014'};
  assert.throws(()=>compareToElevation(assignments,{...base,verticalDatum:' '}),/vertical datum/);
  assert.throws(()=>compareToElevation(assignments,{...base,elevationField:''}),/derives no elevation/);
  assert.throws(()=>compareToElevation(assignments,{...base,selection:{...base.selection,family:''}}),/Choose one family/);
});

test('equality counts as reaching the elevation, and unknowns stay unknown', () => {
  const assignments=assignSites(points,sites,extract());
  const options={selection:{scenario:'ssp585',workflow:'wf_1e',family:'with_vlm',year:'2100',quantile:'0.5'},
    elevationField:'elevation_m',verticalDatum:'MSL 1995-2014'};
  const result=compareToElevation(assignments,options);
  // Clinic A: 0.77 m projected against 0.90 m supplied -> stays below.
  assert.equal(result.rows[0].status,'NoFlag');
  assert.match(result.rows[0].explanation,/stays below/);
  // Clinic B: 0.58 m against 0.40 m -> reaches or exceeds.
  assert.equal(result.rows[1].status,'Review');
  assert.match(result.rows[1].explanation,/reaches or exceeds/);
  assert.match(result.rows[1].explanation,/not an inundation estimate/);
  // Unlocated point: no site, so no comparison.
  assert.equal(result.rows[2].status,'Unknown');
  assert.equal(result.exceeded,1);assert.equal(result.below,1);assert.equal(result.unknown,1);

  // Exact equality is the boundary case, and it counts as reaching.
  const equal=structuredClone(points);equal.features[1].properties.elevation_m=0.58;
  const boundary=compareToElevation(assignSites(equal,sites,extract()),options);
  assert.equal(boundary.rows[1].status,'Review');

  // A family swap changes the answer, which is why the key must be complete.
  const without=compareToElevation(assignments,{...options,selection:{...options.selection,family:'without_vlm'}});
  assert.equal(without.rows[0].attributes.projected_change_m,0.63);
  assert.equal(without.rows[1].attributes.projected_change_m,'unknown');
});

test('the receipts conform to the pack shapes vendored into this build', async () => {
  const ex=extract(),assignments=assignSites(points,sites,ex);
  const comparison=compareToElevation(assignments,{selection:{scenario:'ssp585',workflow:'wf_1e',family:'with_vlm',year:'2100',quantile:'0.5'},
    elevationField:'elevation_m',verticalDatum:'MSL 1995-2014'});
  const facts=extractReceipt({id:'x'},ex,'r1').facts
    +assignmentReceipt({id:'a'},assignments,'r1',{points:'p',sites:'s',projections:'x'}).facts
    +comparisonReceipt({id:'c'},comparison,assignments,'r1','a').facts;
  const report=await validateGraph(graph(facts));
  assert.equal(report.conforms,true,report.results.map(r=>`${r.focusNode?.value} ${r.path?.value} ${r.message?.map?.(m=>m.value).join(' ')??r.message}`).join('\n'));
  assert.match(facts,/slr:ProjectionExtract/);
  assert.match(facts,/slr:datasetFamily slr:WithVerticalLandMotion/);
  assert.match(facts,/slr:elevationDatum "MSL 1995-2014"/);
  assert.match(facts,/slr:assignmentDistance/);
});

test('a comparison missing its datum in the receipt would not conform', async () => {
  const ex=extract(),assignments=assignSites(points,sites,ex);
  const comparison=compareToElevation(assignments,{selection:{scenario:'ssp585',workflow:'wf_1e',family:'with_vlm',year:'2100',quantile:'0.5'},
    elevationField:'elevation_m',verticalDatum:'MSL 1995-2014'});
  const facts=comparisonReceipt({id:'c'},comparison,assignments,'r1','a').facts.replace(/slr:elevationDatum "[^"]*"; /g,'');
  assert.equal((await validateGraph(graph(facts))).conforms,false);
});
