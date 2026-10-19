import test from 'node:test';
import assert from 'node:assert/strict';
import {addableTypes,PALETTE_GROUPS,RETIRED_FROM_PALETTE,ADDABLE_VIA_COMPOSITION,INPUT_STAGE} from '../build/palette.js';
import {TYPES,exampleWorkflow} from '../build/core.js';
import {oldNalediWorkflow} from '../build/old-naledi.js';
import {johnSnowExample} from '../build/john-snow.js';
import {geoprivacyExample} from '../build/geoprivacy-example.js';
import {blankWorkflow} from '../build/study-area.js';
import {coverageExercise} from '../build/spatial-coverage.js';

const EXAMPLES=[
  ['heat',exampleWorkflow()],['old-naledi',oldNalediWorkflow()],['blank',blankWorkflow()],
  ['coverage',coverageExercise()],['snow-voronoi',johnSnowExample('snow-voronoi')],
  ['snow-isochrone',johnSnowExample('snow-isochrone')],['snow-geoprivacy',geoprivacyExample()],
];

// A node type reachable from no example is a widget nobody can add. It will still build,
// validate, register and pass its own tests, so only this check catches it.
//
// This passed while nine widgets were addable on one example each, because it asked whether a type
// was reachable from ANY of seven. The question that matters is whether it is reachable from the
// one the practitioner has open, and the test below now asks that instead.
const reachable=()=>{
  const all=new Set();
  for(const [,workflow] of EXAMPLES)
    for(const type of addableTypes({workflowTypes:workflow.nodes.map(n=>n.type)})) all.add(type);
  return all;
};

test('every node type is addable from some example, or deliberately is not',()=>{
  // Legacy identities that normalise through the experiment 18 adapter, plus the superseded
  // generic output. Each stays executable so saved work still runs; none is offered again.
  // micro_workflow is reachable, but through a composition entry rather than its own: the
  // palette lists one per bundled composition and each adds the node already configured.
  const deliberate=new Set([...RETIRED_FROM_PALETTE,'places','centers',...ADDABLE_VIA_COMPOSITION]);
  const unreachable=Object.keys(TYPES).filter(type=>!reachable().has(type)&&!deliberate.has(type));
  assert.deepEqual(unreachable,[],
    `these node types are registered but cannot be added from any example: ${unreachable.join(', ')}`);
  for(const type of deliberate)
    assert.ok(type in TYPES,`${type} is listed as deliberately unreachable but is not a node type`);
});

test('every palette group has a place in the ordering',()=>{
  const groups=[...new Set(Object.values(TYPES).map(t=>t.group))];
  const missing=groups.filter(g=>!PALETTE_GROUPS.includes(g));
  assert.deepEqual(missing,[],
    `these groups would sort to the front because they are absent from PALETTE_GROUPS: ${missing.join(', ')}`);
});

test('an empty canvas offers the input stage only, and the retired output is never offered',()=>{
  const empty=addableTypes({workflowTypes:[]});
  assert.ok(empty.has('study_area'),'an empty canvas must offer a study area');
  assert.ok(!empty.has('xpert'),'an empty canvas does not offer one example\'s evidence hierarchy');
  assert.ok(!empty.has('map_output'),'there is nothing to show before there is something to process');
  for(const [exampleKey,workflow] of EXAMPLES)
    assert.ok(!addableTypes({workflowTypes:workflow.nodes.map(n=>n.type)}).has('output'),
      `${exampleKey} must not offer the superseded output node`);
});

// The defect this file could not see. "How do I know which widgets need work if I can't even see
// them" -- the practitioner, 2026-10-19, on finding `measure_distance` absent from the palette.
// Nine widgets were addable only where a template named them, and eight of the nine carried an
// open evaluation obligation: four of seven pending audits, three of thirteen awaiting a lab
// check, eight of forty-four awaiting a name review.
test('every live widget is addable from EVERY example that holds an input',()=>{
  const deliberate=new Set([...RETIRED_FROM_PALETTE,'places','centers',...ADDABLE_VIA_COMPOSITION,'output']);
  const live=Object.keys(TYPES).filter(type=>!deliberate.has(type));
  // A blank canvas holds no input, so the input-stage gate applies to it and it is covered above.
  const withInput=EXAMPLES.filter(([,w])=>w.nodes.some(n=>INPUT_STAGE.has(n.type)));
  assert.ok(withInput.length>=5,'most of the worked examples hold an input');
  for(const [exampleKey,workflow] of withInput){
    const offered=addableTypes({workflowTypes:workflow.nodes.map(n=>n.type)});
    const missing=live.filter(type=>!offered.has(type));
    assert.deepEqual(missing,[],`${exampleKey} cannot add: ${missing.join(', ')}`);
    // measure_distance is the one that was reported: it appeared in a single template, the heat
    // example, which TODO.md slates for retirement.
    assert.ok(offered.has('measure_distance'),`${exampleKey} must be able to add Measure distance`);
    assert.ok(offered.has('network_input'),`${exampleKey} must be able to add a street network`);
  }
});
