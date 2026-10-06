import test from 'node:test';
import assert from 'node:assert/strict';
import {blankWorkflow,newStudyArea,bboxPolygon,validateDrawnGeometry,validateAreaParams,studyAreaN3,quadToN3,CRS84} from '../build/study-area.js';
import {validateWorkflow,executionPlan} from '../build/core.js';
const polygon=points=>({type:'Polygon',coordinates:[[...points,points[0]]]});
test('blank workflow has no hidden nodes and requires a selection to run',()=>{
  const w=blankWorkflow();assert.equal(validateWorkflow(w).nodes.length,0);
  assert.throws(()=>executionPlan(w),/Add a visual output/);
  w.nodes.push({...newStudyArea(),id:'area-1',x:0,y:0});
  assert.throws(()=>executionPlan(w),/Select a study area/);
  w.nodes[0].params.geometry=bboxPolygon(25.89,-24.7,25.91,-24.68);
  assert.equal(executionPlan(w).length,1);
});
test('invalid drawings fail before they can become spatial facts',()=>{
  for(const shape of [polygon([[0,0],[2,2],[0,2],[2,0]]),polygon([[0,0],[1,0],[2,0]]),polygon([[0,0],[1,1],[0,0]]),polygon([[0,0],[2,0],[0,86]]),polygon([[-179,0],[179,0],[0,1]]),polygon([[0,0],[NaN,1],[1,0]])])assert.throws(()=>validateDrawnGeometry(shape));
  assert.throws(()=>bboxPolygon(2,0,1,1));
  const valid=polygon([[25.89,-24.7],[25.91,-24.7],[25.9,-24.68]]);
  assert.deepEqual(validateDrawnGeometry(valid),valid);
  assert.throws(()=>validateAreaParams({source:'drawn',label:'Area',selectionMode:'bbox',geometry:valid}),/four axis-aligned/);
  assert.throws(()=>validateDrawnGeometry({...valid,coordinates:[...valid.coordinates,valid.coordinates[0]]}),/without holes/);
});
test('GeoSPARQL representation preserves feature geometry separation and CRS84 coordinate order',()=>{
  const node={...newStudyArea(),id:'area-1'};node.params={...node.params,label:'Area "A"',selectionMode:'bbox',geometry:bboxPolygon(25.89,-24.7,25.91,-24.68)};
  const n3=studyAreaN3(node);
  assert.match(n3.facts,/a geo:Feature, fw:StudyArea/);
  assert.match(n3.facts,/geo:hasGeometry <urn:fieldwork:geometry:area-1>/);
  assert.ok(n3.facts.includes(`<${CRS84}> POLYGON ((25.89 -24.7, 25.91 -24.7`));
  assert.match(n3.facts,/\^\^geo:wktLiteral/);assert.ok(n3.facts.includes('Area \\"A\\"'));
  assert.match(n3.rules,/fw:geometryValidated true/);
  assert.equal(quadToN3({subject:'urn:a',predicate:'urn:p',object:'true',objectType:'Literal',datatype:'http://www.w3.org/2001/XMLSchema#boolean'}),'<urn:a> <urn:p> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .');
});
