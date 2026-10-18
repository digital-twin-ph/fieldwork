import test from 'node:test';
import assert from 'node:assert/strict';
import {blankWorkflow,newStudyArea,bboxPolygon,validateDrawnGeometry,validateAreaParams,studyAreaN3,quadToN3,boundaryFingerprint,CRS84} from '../build/study-area.js';
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
  // A ring repeated is not an enclave: it coincides with the boundary, so it is a fault.
  assert.throws(()=>validateDrawnGeometry({...valid,coordinates:[...valid.coordinates,valid.coordinates[0]]}),/must not cross or touch/);
  // A genuine enclave IS admitted now. 22 of 189 DRC ADM2 units carry one, and the old contract
  // refused all of them outright -- the practitioner, 2026-10-18: "we want to admit polygons as
  // long as they do not overrun memory."
  const withEnclave={type:'Polygon',coordinates:[
    [[25.0,-24.0],[26.0,-24.0],[26.0,-23.0],[25.0,-23.0],[25.0,-24.0]],
    [[25.4,-23.6],[25.6,-23.6],[25.6,-23.4],[25.4,-23.4],[25.4,-23.6]]]};
  assert.deepEqual(validateDrawnGeometry(withEnclave),withEnclave);
  assert.match(studyAreaN3({id:'area-h',params:{source:'drawn',label:'With enclave',selectionMode:'polygon',geometry:withEnclave}}).facts,
    /POLYGON \(\(25 -24.*\), \(25.4 -23.6/,'both rings reach the receipt');
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

// A boundary carrying provenance is a claim to authenticity from the source. The practitioner,
// 2026-10-18: "we should not even attempt to simplify it", and "When the user chooses to modify a
// bounding box from a known source like geoBoundaries, that modification should show up in the N3
// receipts." Both halves are the same obligation: name the authority, and say whether the shape
// is still theirs.
const acquiredGeometry=()=>({type:'Polygon',coordinates:[[[30.21,1.48],[30.29,1.48],[30.29,1.59],[30.21,1.59],[30.21,1.48]]]});
const acquiredParams=geometry=>({source:'drawn',label:'Bunia',selectionMode:'polygon',geometry,
  boundary:{boundaryID:'COD-ADM2-63176286',unitID:'63176286B65',unitName:'Bunia',
    source:'Referenciel Geographique Commun, OCHA DR Congo',licence:'CC BY 3.0 IGO',
    licenceSource:'data.humdata.org/x',yearRepresented:'2019',canonical:'territory, city',
    retrievedFrom:'https://example.org/COD-ADM2.geojson',retrievedAt:'2026-10-18T00:00:00.000Z',
    vertices:4,publishedHash:boundaryFingerprint(acquiredGeometry())}});

test('an acquired boundary names its authority in the receipt, not just its licence',()=>{
  const facts=studyAreaN3({id:'area-1',params:acquiredParams(acquiredGeometry())}).facts;
  // A licence states the terms of reuse; it does not say who drew the line, and for a contested
  // frontier only the second answers anything.
  assert.match(facts,/dcterms:source "Referenciel Geographique Commun, OCHA DR Congo"/);
  assert.match(facts,/dcterms:identifier "COD-ADM2-63176286 \/ 63176286B65"/);
  assert.match(facts,/dcterms:license "CC BY 3.0 IGO"/);
  // The level declares that ADM2 mixes two kinds of unit, which is why Bunia (a city, 78 km2) and
  // Irumu (a territory, 7,986 km2) sit as peers in one list.
  assert.match(facts,/dcterms:type "territory, city"/);
  assert.match(facts,/dcterms:date "2019"/);
  assert.match(facts,/prov:wasDerivedFrom <https:\/\/example.org\/COD-ADM2.geojson>/);
  assert.match(facts,/fw:geometryAsPublished true/);
  assert.match(facts,/not simplified, generalised or edited/);
});

test('editing an acquired boundary is recorded as a modification, not hidden',()=>{
  const moved=acquiredGeometry();
  moved.coordinates[0][1][0]=30.30;
  const facts=studyAreaN3({id:'area-1',params:acquiredParams(moved)}).facts;
  assert.match(facts,/fw:geometryAsPublished false/);
  assert.match(facts,/MODIFIED IN THIS WORKFLOW/);
  assert.match(facts,/one or more were moved/,'a moved vertex keeps the count, so the count cannot be the tell');
  // The source is still cited -- CC BY requires indicating changes, not dropping attribution --
  // but it is cited as what this derives from, not as the author.
  assert.match(facts,/dcterms:source "Referenciel Geographique Commun, OCHA DR Congo"/);
  assert.match(facts,/not as the author of this shape/);
});

test('a bounding box around several units says it is nobody published boundary',()=>{
  const p=acquiredParams(bboxPolygon(30.0,1.0,31.0,2.0));
  p.selectionMode='bbox';
  p.boundary={...p.boundary,publishedHash:'bounding-box',unitName:'Bunia, Irumu',vertices:0};
  const facts=studyAreaN3({id:'area-1',params:p}).facts;
  assert.match(facts,/fw:geometryAsPublished false/);
  assert.match(facts,/bounding box around the chosen units/);
  assert.match(facts,/includes ground in none of them/);
});

test('a drawn area with no source makes no authenticity claim at all',()=>{
  // Silence is the right answer here: asserting fw:geometryAsPublished false on a hand-drawn
  // shape would imply there was a published boundary it departs from.
  const facts=studyAreaN3({id:'area-1',params:{source:'drawn',label:'Mine',selectionMode:'polygon',
    geometry:acquiredGeometry()}}).facts;
  assert.doesNotMatch(facts,/fw:geometryAsPublished/);
  assert.doesNotMatch(facts,/dcterms:source/);
});

test('the fingerprint changes with the coordinates and not with anything else',()=>{
  const a=acquiredGeometry(),b=acquiredGeometry();
  assert.equal(boundaryFingerprint(a),boundaryFingerprint(b),'same coordinates, same fingerprint');
  b.coordinates[0][1][0]=30.2900001;
  assert.notEqual(boundaryFingerprint(a),boundaryFingerprint(b),'a moved vertex must show');
});
