import test from 'node:test';
import assert from 'node:assert/strict';
import {siblingAreas,areaVertices,SHAREABLE_INPUT_TYPES} from '../build/project.js';

/** A STUDY AREA THE PROJECT HAS ALREADY DRAWN, offered to the workflow being edited.
 *
 *  The practitioner, 2026-10-31: *"if the widget is used in a new workflow within a project, there
 *  should be a dropdown ... of existing study areas in the project to import to this workflow.
 *  The same should be true for other input widgets. This prevents the palette from being cluttered
 *  with importable inputs."* Experiment 141. */

const box={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
const area=(label,extra={})=>({id:'area',type:'study_area',
  params:{source:'drawn',label,selectionMode:'bbox',geometry:box,...extra}});
const project={schema:'fieldwork/project/2',id:'p',name:'P',subject:'s',
  workflows:['w1','w2','w3']};
const saved={
  w1:{name:'The ground',nodes:[area('Study extent')]},
  w2:{name:'Mortality',nodes:[area('Sub-districts',{selectionMode:'polygon'})]},
  w3:{name:'Mine',nodes:[area('Mine')]},
};

test('the other workflows of THIS project, and never the one being edited',()=>{
  const found=siblingAreas('w3',[project],saved);
  assert.deepEqual(found.map(a=>a.label),['Study extent','Sub-districts']);
  assert.deepEqual(found.map(a=>a.workflowName),['The ground','Mortality']);
  // The qualifier the practitioner sharpened for `siblingInputs` on 2026-10-19 holds here too:
  // a workflow in no project has nothing to be offered.
  assert.deepEqual(siblingAreas('w1',[],saved),[]);
  assert.deepEqual(siblingAreas('nope',[project],saved),[]);
});

test('A FIRST WORKFLOW IS OFFERED NOTHING, which is the absent-rather-than-empty case',()=>{
  // The dropdown is not built at all from this, so a new project does not advertise sharing
  // before there is anything to share.
  assert.deepEqual(siblingAreas('w1',[{...project,workflows:['w1']}],saved),[]);
});

test('an area nobody has drawn yet is not an area to take',()=>{
  const empty={...saved,w1:{name:'The ground',nodes:[area('Unstarted',{geometry:null})]}};
  assert.deepEqual(siblingAreas('w3',[project],empty).map(a=>a.label),['Sub-districts']);
});

test('what cannot be read is skipped silently, per node',()=>{
  // A dropdown is the wrong place to report a workflow that will not parse: there is nothing to
  // offer FROM, which is not the same as an error to show at the far end of a control.
  const broken={...saved,
    w1:{name:'The ground',nodes:[{type:'study_area',params:{source:'drawn',
      selectionMode:'trapezoid',geometry:box}}]},
    w2:{name:'Mortality',nodes:['not a node',{type:'study_area'},
      {type:'study_area',params:{source:'acquired',geometry:box,selectionMode:'bbox'}},
      {type:'point_input',params:{data:{features:[]}}},
      area('Kept')]}};
  assert.deepEqual(siblingAreas('w3',[project],broken).map(a=>a.label),['Kept']);
  assert.deepEqual(siblingAreas('w3',[project],{w1:7,w2:null}),[]);
});

test('PROVENANCE TRAVELS WHOLE, licence and all',()=>{
  // An area traced from a published outline stays an acquired area when it is reused. Carrying
  // only the three fields a dropdown shows would leave the terms of use behind at the workflow
  // boundary, which is the import defect this application refuses elsewhere by name.
  const prov={boundaryID:'GBR-ADM2-1',unitID:'u1',unitName:'Lambeth',publishedHash:'abc',
    source:'geoBoundaries',licence:'CC-BY-4.0',licenceSource:'geoBoundaries',
    yearRepresented:'2022'};
  const found=siblingAreas('w3',[project],
    {...saved,w1:{name:'The ground',nodes:[area('Lambeth',{boundary:prov})]}});
  assert.deepEqual(found[0].boundary,prov);
  // And a node whose boundary is not a record carries none rather than a half one.
  const half=siblingAreas('w3',[project],
    {...saved,w1:{name:'The ground',nodes:[area('X',{boundary:'Lambeth'})]}});
  assert.equal(half[0].boundary,undefined);
});

test('each offer says what it is, so a name is not the only thing to choose on',()=>{
  const found=siblingAreas('w3',[project],saved);
  assert.deepEqual(found.map(a=>a.selectionMode),['bbox','polygon']);
  assert.deepEqual(found.map(a=>a.vertices),[5,5]);
  assert.deepEqual(found.map(a=>a.nodeId),['area','area']);
  assert.equal(areaVertices({type:'MultiPolygon',
    coordinates:[box.coordinates,box.coordinates]}),10);
});

test('an area with no label of its own is still named',()=>{
  const found=siblingAreas('w3',[project],
    {...saved,w1:{name:'The ground',nodes:[area('   ')]}});
  assert.equal(found[0].label,'Study area');
});

test('STUDY AREA STAYS OUT OF THE PALETTE’S SHARING GROUP',()=>{
  // The request is to SHORTEN that group, so adding a seventh kind of thing to it would be the
  // opposite of what was asked. A study area has no payload to deduplicate either -- AreaParams
  // declares neither `data` nor `dataRef`, so putting it in this list would deduplicate nothing
  // while lengthening the group. It is collected by its own function and offered where the
  // shape is chosen.
  assert.ok(!SHAREABLE_INPUT_TYPES.includes('study_area'));
  // THE WHOLE LIST IS PINNED, as a tripwire rather than as a fact worth asserting twice: adding
  // a type here changes what the palette offers and what a project stores, and that should cost
  // somebody a deliberate line. `polygon_input` joined 2026-10-31 and cost exactly that.
  assert.deepEqual([...SHAREABLE_INPUT_TYPES],
    ['point_input','table_input','network_input','polygon_input']);
});

test('A SHARED TYPE MUST BE ABLE TO CARRY A DIGEST, or sharing it stores it twice',()=>{
  // The rule that decides membership, written as a check rather than as prose. `siblingInputs`
  // reads `params.data` and the handler digests it, so a type with no `data` cannot be shared
  // at all, and a type whose own acquisition never writes a `dataRef` leaves its SOURCE inline
  // forever -- which is true of point_input and table_input today and is recorded as a defect
  // in those widgets rather than a reason to remove them from this list.
  for(const type of SHAREABLE_INPUT_TYPES)
    assert.ok(['point_input','table_input','network_input','polygon_input'].includes(type),
      `${type} is shareable and this test does not know whether it can carry a payload`);
});
