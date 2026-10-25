import test from 'node:test';
import assert from 'node:assert/strict';
import {blankWorkflow,newStudyArea,bboxPolygon,validateDrawnGeometry,validateAreaParams,studyAreaN3,quadToN3,boundaryFingerprint,CRS84} from '../build/study-area.js';
import {validateWorkflow,executionPlan,executeWorkflow} from '../build/core.js';
const polygon=points=>({type:'Polygon',coordinates:[[...points,points[0]]]});
test('blank workflow has no hidden nodes and requires a selection to run',()=>{
  const w=blankWorkflow();assert.equal(validateWorkflow(w).nodes.length,0);
  assert.throws(()=>executionPlan(w),/This canvas is empty/,'an empty canvas is told to add an input, not an output');
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

// A study area may be several jurisdictions. The practitioner, 2026-10-18: "if there are several
// countries or cities in different countries involved in the study area". Before this, choosing
// more than one unit collapsed them to a bounding box -- a shape belonging to none of them, and
// only ever because there was nowhere to put the second outline.
const square=(x,y,r=0.1)=>[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r],[x-r,y-r]];

test('two distant units are two parts, each as published',()=>{
  const g={type:'MultiPolygon',coordinates:[[square(30,1)],[square(34,3)]]};
  assert.deepEqual(validateDrawnGeometry(g),g,'nothing is merged, moved or boxed');
  const facts=studyAreaN3({id:'area-1',params:{source:'drawn',label:'Two districts',
    selectionMode:'polygon',geometry:g}}).facts;
  assert.match(facts,/MULTIPOLYGON \(\(\(29.9 0.9/,'both parts reach the receipt as one geometry');
  assert.ok(facts.includes('33.9 2.9'),'the second part is there too');
});

test('parts that overlap are refused rather than silently double-counting ground',()=>{
  const g={type:'MultiPolygon',coordinates:[[square(30,1,0.2)],[square(30.1,1.1,0.2)]]};
  assert.throws(()=>validateDrawnGeometry(g),/parts of this area must not overlap/);
});

test('a part inside another is refused, unless it sits in an interior ring',()=>{
  const outer=[[29,0],[31,0],[31,2],[29,2],[29,0]];
  // Wholly inside, no hole: the same ground would be counted twice.
  assert.throws(()=>validateDrawnGeometry({type:'MultiPolygon',
    coordinates:[[outer],[square(30,1,0.1)]]}),/lies inside another/);
  // Inside a hole: a genuine enclave that belongs to the area.
  const hole=[[29.7,0.7],[30.3,0.7],[30.3,1.3],[29.7,1.3],[29.7,0.7]];
  const withEnclave={type:'MultiPolygon',coordinates:[[outer,hole],[square(30,1,0.1)]]};
  assert.deepEqual(validateDrawnGeometry(withEnclave),withEnclave);
});

test('a bounding box is still one rectangle, not several parts',()=>{
  // Everything downstream that reads a bbox is entitled to four corners.
  assert.throws(()=>validateAreaParams({source:'drawn',label:'Box',selectionMode:'bbox',
    geometry:{type:'MultiPolygon',coordinates:[[square(30,1)],[square(34,3)]]}}),
    /single rectangle, not several parts/);
});

test('a multi-part area keeps its provenance and its as-published claim',()=>{
  const g={type:'MultiPolygon',coordinates:[[square(30,1)],[square(34,3)]]};
  const params={...acquiredParams(g),boundary:{...acquiredParams(g).boundary,
    unitName:'Bunia, Aru',vertices:8,publishedHash:boundaryFingerprint(g)}};
  const facts=studyAreaN3({id:'area-1',params}).facts;
  assert.match(facts,/fw:geometryAsPublished true/);
  assert.match(facts,/dcterms:source "Referenciel Geographique Commun, OCHA DR Congo"/);
});

test('a study area shown on its own does not crash the map output',()=>{
  // "I get an error on Map output view of Bunia study area" -- the practitioner, 2026-10-18, on
  // "Workflow stopped: undefined is not an object (evaluating 'c.from')". map_output DECLARES
  // `points` and `context` beside `area`, and the run asserted an edge existed for every declared
  // point port. A study area inspected before any data is added -- the whole of experiment 01 --
  // has none, so a valid workflow failed and blamed a minified variable.
  const w=validateWorkflow({schema:'fieldwork/workflow/1',exampleId:'blank',name:'area only',
    nodes:[{id:'area-1',type:'study_area',x:0,y:0,params:{source:'drawn',label:'Bunia',
        selectionMode:'polygon',geometry:bboxPolygon(30.21,1.48,30.29,1.59)}},
      {id:'map-1',type:'map_output',x:300,y:0,params:{label:'Study area and points',view:'map'}}],
    edges:[{id:'e1',from:'area-1',to:'map-1',port:'area'}]});
  return executeWorkflow(w,async()=>[{subject:'urn:fieldwork:area:area-1',
    predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}])
    .then(run=>{assert.equal(run.outputs.length,1,'the area is shown, with no point layers');});
});

/** ADJACENT UNITS SHARE A BORDER.
 *
 *  The practitioner, 2026-10-24: *"Study area can hold adjacent units, like North Kivu and Ituri
 *  Provinces for Ebola outbreak."* Until then two squares meeting along an edge were refused and
 *  the same two with a gap were accepted, so a multi-part study area worked only for units that
 *  do not touch -- which administrative units, tiling their ground, almost never are.
 *
 *  Combined area's manual already argued the other way: two provinces sharing a border "come
 *  through as two parts, not one welded outline". The widget kept the border; acquisition refused
 *  it. This is that inconsistency resolved. */
test('a study area holds adjacent parts, and still refuses overlapping ones',()=>{
  const sq=(x,y,w=1,h=1)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
  const parts=p=>({type:'MultiPolygon',coordinates:p});
  // Ituri and North Kivu: one border, two authorities, two parts.
  assert.doesNotThrow(()=>validateDrawnGeometry(parts([[sq(0,0)],[sq(1,0)]])));
  // Meeting at a single corner is still only a border.
  assert.doesNotThrow(()=>validateDrawnGeometry(parts([[sq(0,0)],[sq(1,1)]])));
  // Separate units were always fine and stay fine.
  assert.doesNotThrow(()=>validateDrawnGeometry(parts([[sq(0,0)],[sq(3,0)]])));
  // Interiors that meet are not two jurisdictions, they are a mistake.
  assert.throws(()=>validateDrawnGeometry(parts([[sq(0,0)],[sq(0.5,0.5)]])),/must not overlap/);
  // WITHIN one part the old rule is unchanged: a ring touching itself is a drawing fault.
  assert.throws(()=>validateDrawnGeometry({type:'Polygon',
    coordinates:[[[0,0],[2,0],[2,2],[1,0],[0,2],[0,0]]]}),/must not cross or touch/);
  // Three in a row, each sharing a border with the next, which is what a tiled layer looks like.
  assert.doesNotThrow(()=>validateDrawnGeometry(parts([[sq(0,0)],[sq(1,0)],[sq(2,0)]])));
  // AND CONTAINMENT STILL CATCHES CONTAINMENT. Ray casting reads a point on a ring as inside it,
  // so an adjacent unit's first vertex -- usually on the shared border -- made this fire too.
  // Probing from a vertex off the other outline fixed that without weakening the rule.
  assert.throws(()=>validateDrawnGeometry(parts([[sq(0,0,4,4)],[sq(1,1)]])),/lies inside another/);
});
