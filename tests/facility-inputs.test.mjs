import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkflow,executionPlan,distanceKm} from '../build/core.js';
import {oldNalediWorkflow,executeOldNode} from '../build/old-naledi.js';
import {boundary,facilities} from '../examples/old-naledi/data.js';
import {Parser} from 'n3';
const legacy=JSON.parse(await readFile(new URL('./fixtures/old-naledi-source-2026-10-06.json',import.meta.url),'utf8'));
/** The 2026-10-06 fixture now refuses to open, by design.
 *
 *  It holds an `access` node, which was retired on 2026-10-12 and decomposed into three steps --
 *  a candidate filter knob, the nearest-neighbour search, and travel_time. A widget that cannot be
 *  replaced by one other widget cannot be migrated, and the practitioner's rule is that such a
 *  workflow ceases to work **naming the widget**, rather than failing somewhere inside with
 *  "Incompatible node connection" as this did before.
 *
 *  The fixture is kept rather than rewritten: it is evidence of what a workflow looked like on
 *  that date, and frozen evidence does not get edited to keep a test green.
 */
test('a workflow holding a non-replaceable retired widget refuses to open, naming it',()=>{
  const original=structuredClone(legacy);
  assert.throws(()=>validateWorkflow(legacy),/Facility access, which was retired and cannot be replaced/);
  assert.deepEqual(legacy,original,'and the refusal does not mutate what it refused');
});

/** What that fixture used to prove, proved against the live example instead: the legacy facility
 *  registry splits once into a connected Input data source, and splits idempotently. */
test('the legacy registry splits once into a shared source, and only once',()=>{
  const w=validateWorkflow(oldNalediWorkflow());
  const source=w.nodes.find(n=>n.type==='point_input'&&n.params.data?.features?.length===214);
  assert.ok(source,'the 214 bundled facility records arrive on a shared Input data node');
  assert.equal(source.params.sourceInfo.commit,'7f183843075a6534b6699cd107cc74def1315bcd');
  assert.deepEqual(validateWorkflow(w),w,'splitting is idempotent');
});
test('connected selection preserves the historical candidate set and actually uses edited input',async()=>{
  const w=validateWorkflow(oldNalediWorkflow()),node=w.nodes.find(n=>n.type==='facilities');
  const source=w.nodes.find(n=>n.id==='facility-data');
  const points={...source.params.data,sourceNodeId:source.id,sourceInfo:source.params.sourceInfo};
  const inputs={area:{boundary,areaId:'urn:test:area'},points};const receipts=[];
  const result=await executeOldNode(node,inputs,()=>{throw Error('Selection must not invoke reasoning');},receipts,distanceKm);
  const coords=boundary.type==='MultiPolygon'?boundary.coordinates.flat(2):boundary.coordinates.flat();const origin=[(Math.min(...coords.map(p=>p[0]))+Math.max(...coords.map(p=>p[0])))/2,(Math.min(...coords.map(p=>p[1]))+Math.max(...coords.map(p=>p[1])))/2];
  const expected=facilities.filter(f=>distanceKm(origin,f.coordinates)<=6);
  assert.deepEqual(result.facilities.map(({attributes,...f})=>f),expected);
  assert.equal(receipts[0].kind,'computation');assert.match(receipts[0].facts,/fw:NearbyFacilitySelection/);
  const quads=new Parser().parse(receipts[0].facts);
  assert.equal(quads.find(q=>q.predicate.value==='urn:fieldwork:selectedRecordCount').object.value,String(expected.length));
  assert.equal(quads.filter(q=>q.predicate.value==='http://www.w3.org/ns/prov#used').length,2);
  inputs.points={...points,features:[{...points.features[0],geometry:null}]};
  const missing=await executeOldNode(node,inputs,()=>{},[],distanceKm);
  assert.equal(missing.facilities.length,0);assert.equal(missing.facilitySource.missingLocationCount,1);
  inputs.points={...points,features:[{...points.features[0],properties:{name:'Incomplete'}}]};
  await assert.rejects(executeOldNode(node,inputs,()=>{},[],distanceKm),/owner and serviceType/);
});
