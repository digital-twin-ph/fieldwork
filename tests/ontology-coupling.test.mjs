import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {declaredTerms,emittedTerms,undeclared} from '../scripts/ontology-coupling.mjs';

const debtFile=async()=>JSON.parse(await readFile('ontology/coupling-debt.json','utf8'));

test('no term is asserted that the ontology does not declare, beyond the recorded debt',async()=>{
  const [declared,emitted,debt]=await Promise.all([declaredTerms(),emittedTerms(),debtFile()]);
  const open=undeclared(emitted,declared);
  const known=new Set(debt.terms.map(t=>t.term));
  const appeared=open.filter(t=>!known.has(t.term));
  assert.deepEqual(appeared,[],
    `these terms are asserted with nothing defining them: ${appeared.map(t=>'fw:'+t.term).join(', ')}`);
  const settled=[...known].filter(term=>!open.some(t=>t.term===term));
  assert.deepEqual(settled,[],
    `these are declared now and must leave the debt list: ${settled.map(t=>'fw:'+t).join(', ')}`);
});

test('the debt is a ratchet: it may fall and may not rise',async()=>{
  const debt=await debtFile();
  // 53 when the coupling was first mechanised on 2026-10-10; 42 after sample_raster's
  // nine terms and buffer_point's two were declared the same day. Lower this number when
  // debt is paid; raising it means a term was asserted without being defined.
  assert.ok(debt.terms.length<=42,
    `the debt was 42 and is now ${debt.terms.length}; declare the new terms instead of recording them`);
  for(const entry of debt.terms){
    assert.ok(entry.modules?.length,`fw:${entry.term} records no asserting module`);
    assert.ok(['property','class-or-individual'].includes(entry.kind));
  }
});

test('every term the isochrone primitives assert is declared',async()=>{
  // The eight primitives built on 2026-10-10 carry no debt, which is the state the
  // mechanism exists to hold everything else to.
  const [declared,emitted,debt]=await Promise.all([declaredTerms(),emittedTerms(),debtFile()]);
  const owed=new Set(debt.terms.map(t=>t.term));
  const modules=['convex-hull.ts','combined-area.ts','network-snap.ts','reachable-nodes.ts',
    'reachable-corridor.ts','travel-time-band.ts','stack-polygons.ts','fill-interior-gaps.ts'];
  for(const [term,sources] of emitted)
    for(const source of sources)
      if(modules.includes(source)){
        assert.ok(declared.typed.has(term)||declared.mentioned.has(term),
          `fw:${term} is asserted by ${source} and declared nowhere`);
        assert.ok(!owed.has(term),`fw:${term} is asserted by ${source} and recorded as debt`);
      }
});

test('a declared property is typed, not merely mentioned',async()=>{
  const declared=await declaredTerms();
  // Terms this project added today, each of which should be a real declaration rather than
  // an incidental mention in a domain or a comment.
  for(const term of ['gapsFilled','areaAddedSquareMetres','bandMinutes','corridorHalfWidthMetres',
    'snappedNodeCount','travelMode','edgeLengthSource','bandedPolygonCount','sampleConvention',
    'circleAreaFraction'])
    assert.ok(declared.typed.has(term),`fw:${term} is mentioned but never typed`);
});

test('the provenance a composition produces stays within a recorded size',async()=>{
  // Ontology growth has a cost: every term asserted is a triple to write, store and reason
  // over. This ties the surface to a measured run rather than leaving it a worry.
  const {validateComposition,expandComposition}=await import('../build/compositions.js');
  const {executeWorkflow}=await import('../build/core.js');
  const {johnSnowExample}=await import('../build/john-snow.js');
  const composition=JSON.parse(await readFile('compositions/compute_walking_catchment/0.1.0.json','utf8'));
  validateComposition(composition,JSON.parse(await readFile('widgets/registry.json','utf8')));
  const example=johnSnowExample('snow-isochrone');
  const pumps=example.nodes.find(n=>n.id==='pumps'),network=example.nodes.find(n=>n.type==='network_input');
  const expanded=expandComposition(composition,'catchment',{zone:30,hemisphere:'north',maxSnapM:100,
    travelMode:'walking',speedMPerMin:75,direction:'outbound',traversalMinutes:15,minutes:5,bufferM:25});
  const map={id:'m',type:'map_output',x:0,y:0,params:{label:'Catchment',inputMode:'polygons'}};
  const run=await executeWorkflow({schema:'fieldwork/workflow/1',
    nodes:[structuredClone(pumps),structuredClone(network),...expanded.nodes,map],
    edges:[...expanded.edges,...expanded.inputs.map((input,i)=>({id:`feed-${i}`,
      from:input.port==='sites'?pumps.id:network.id,to:input.node,port:input.memberPort})),
      {id:'to-map',from:expanded.output,to:map.id,port:'polygons'}]},async()=>[]);
  const triples=run.provenanceN3.split('\n').filter(line=>line.trim().endsWith('.')).length;
  // Measured 2026-10-10: 83 triples and 13.4 KB for this four-member composition, about
  // 21 triples a member. The ceiling is deliberately close, so that adding a term to any
  // member shows up here rather than in a slow run later.
  assert.ok(triples>0&&triples<=92,
    `the walking catchment's provenance was 83 triples and is now ${triples}`);
  console.log(`walking catchment provenance: ${triples} triples, ${run.provenanceN3.length} bytes`);
});
