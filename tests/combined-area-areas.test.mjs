import test from 'node:test';
import assert from 'node:assert/strict';
import {combineAreas} from '../build/combined-area.js';

/** "Can two adjacent study areas be merged as one polygon?" … "But a study area is a polygon." …
 *  "So two study area polygons combined should still be a study area." -- 2026-10-22. */
const area=(id,label,coordinates,type='Polygon')=>({kind:'study-area',areaId:`urn:a:${id}`,
  geometryId:`urn:a:${id}:g`,label,boundary:{type,coordinates},bounds:[0,0,1,1],rows:[],centers:[]});
const north=area('n','Nord-Kivu',[[[29,-1],[30,-1],[30,0],[29,0],[29,-1]]]);
const ituri=area('i','Ituri',[[[29,0],[30,0],[30,1],[29,1],[29,0]]]);
const node={id:'combine',type:'summarize_combined_area',x:0,y:0,
  params:{label:'',zone:35,hemisphere:'south',yields:'area'}};

test('the result is a study area, which is the whole point',()=>{
  const {value}=combineAreas(node,[north,ituri],'run');
  assert.equal(value.kind,'study-area','an area in, an area out: it must feed what an area feeds');
  assert.equal(value.boundary.type,'MultiPolygon');
  assert.equal(value.boundary.coordinates.length,2);
  assert.equal(value.label,'Nord-Kivu + Ituri');
  // The bounds cover both, which is what a clip and an extract will read.
  assert.deepEqual(value.bounds,[29,-1,30,1]);
});

test('touching borders are kept, not dissolved',()=>{
  const {value,receipt}=combineAreas(node,[north,ituri],'run');
  // Both outlines survive intact: the shared edge appears in each ring, because a published
  // outline is a record of where a boundary is and welding two would invent a third line.
  assert.deepEqual(value.boundary.coordinates[0],north.boundary.coordinates);
  assert.deepEqual(value.boundary.coordinates[1],ituri.boundary.coordinates);
  assert.match(receipt.method,/not dissolved/);
  assert.match(receipt.facts,/fw:AreaCombination/);
  assert.match(receipt.facts,/prov:used <urn:a:n>/);
  assert.match(receipt.facts,/prov:used <urn:a:i>/);
  assert.match(receipt.facts,/fw:partCount 2/);
});

test('a MultiPolygon part contributes its own rings, not a nested one',()=>{
  const both=area('b','Both',[north.boundary.coordinates,ituri.boundary.coordinates],'MultiPolygon');
  const third=area('t','Tshopo',[[[28,0],[29,0],[29,1],[28,1],[28,0]]]);
  const {value}=combineAreas(node,[both,third],'run');
  assert.equal(value.boundary.coordinates.length,3,'two rings from the first part and one from the second');
});

test('one area is not a combination',()=>{
  assert.throws(()=>combineAreas(node,[north],'run'),/two study areas/);
  assert.throws(()=>combineAreas(node,[north,undefined],'run'),/two study areas/);
});

test('a given name wins over the joined one',()=>{
  const {value}=combineAreas({...node,params:{label:'Eastern provinces'}},[north,ituri],'run');
  assert.equal(value.label,'Eastern provinces');
});

// No new widget: the one whose description already said "overlapping and touching areas become
// one" simply takes areas now, and yields what it was given. "I don't think we need a primitive.
// We just need the combine polygons widget recognizing study area inputs and output study area as
// well" -- 2026-10-22.
test('the Combined area widget takes areas and yields an area',async()=>{
  const {TYPES,outputOf,nodeInputs}=await import('../build/core.js');
  const ports=TYPES.summarize_combined_area.inputs.map(([port,type])=>`${port}:${type}`);
  assert.deepEqual(ports,['polygons:polygons','area:area','area2:area']);
  const bare={id:'u',type:'summarize_combined_area',x:0,y:0,params:{label:'',zone:35,hemisphere:'south'}};
  assert.equal(outputOf(bare),'polygons','given polygons it is still a polygons result');
  assert.equal(outputOf({...bare,params:{...bare.params,yields:'area'}}),'area',
    'given areas it is a study area, which is what a study area feeds');
  // Every port is declared whichever way it is used: no mode decides which ports exist.
  assert.equal(nodeInputs(bare).length,3);
});
