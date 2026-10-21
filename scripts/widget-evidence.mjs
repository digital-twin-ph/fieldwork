#!/usr/bin/env node
/** How much evidence each widget actually has, as a ladder rather than a yes or no.
 *
 * The practitioner's correction of 2026-10-12: *"Used in a worked example is one form of testing.
 * Comparing it with notebook is another. More worked examples for widget means more use. Field
 * testing even better."*
 *
 * So "tested" was the wrong shape. Two measurements had been treated as one question and both
 * readings were wrong: exempting widgets with no lab check would have exempted `isochrone`, the
 * centre of a worked example, while exempting widgets no example uses would have exempted
 * `reproject` and `measure_area`. They are different rungs, and a widget can be high on one and
 * low on the other.
 *
 *   1 · declared      it exists and nothing else — a pending widget, exempt from the budget
 *   2 · example use   a worked example exercises it; n examples is n times the evidence
 *   3 · lab parity    an independent recomputation agrees, or there is a declared reason none applies
 *   4 · field use     a practitioner used it on real work. **Nothing has this yet**, and the rung
 *                     is declared anyway, because an empty top rung is a measurement and a missing
 *                     one is a flattering omission.
 *
 * Use counts through a composition, because a `micro_workflow` node is its members. That
 * expansion currently changes nothing, and finding out why is the sharpest thing this measurement
 * produced: **no worked example carries a composition node at all.** The one bundled composition,
 * `compute_walking_catchment`, is exercised by nothing, and its four members — `snap_to_network`,
 * `reachable_nodes`, `travel_time_band`, `reachable_corridor` — have zero example uses because the
 * isochrone example still uses the `isochrone` composite rather than its decomposition. A
 * decomposition was built, a composition was shipped from it, and no example uses either. Whether
 * that fills a value gap in the inventory is exactly the question the ladder cannot answer and
 * someone has to.
 *
 * Usage: node scripts/widget-evidence.mjs [--write]
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {WORKED_EXAMPLE_KEYS,EXAMPLE_TEMPLATES} from '../build/example-templates.js';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));

// EVERY worked example the application offers, read from the registry the application itself
// uses. This was a hand-written map of nine, and the application had twelve: `coverage`,
// `hagelloch`, `rulesets` and `snow-extent` were missing, so this ledger reported that
// `coverage_check` had no example use while the Spatial coverage exercise was built around it.
// A ledger that reads a copy of a list reports on the copy.
const examples=Object.fromEntries(WORKED_EXAMPLE_KEYS.flatMap(key=>{
  try{return [[key,EXAMPLE_TEMPLATES[key]()]];}
  catch{return [];/* an example this build does not carry */}
}));

/** A micro_workflow node is its members, so its members are used wherever it is. */
const membersOf=node=>(node.params?.composition?.members??[]).map(member=>member.type??member.nodeType)
  .filter(Boolean);
const usedIn=workflow=>new Set(workflow.nodes.flatMap(node=>
  node.type==='micro_workflow'?['micro_workflow',...membersOf(node)]:[node.type]));

export function widgetEvidence(){
  const registry=read('widgets/registry.json');
  const coverage=read('widgets/check-coverage.json');
  const statusOf=w=>read(`widgets/releases/${w.nodeType}/${w.currentVersion}.json`).implementationStatus;
  const lab=Object.fromEntries(coverage.widgets.map(w=>[w.nodeType,
    w.expectation==='parity'?(w.check?'parity':'awaiting'):w.expectation]));
  const uses={};
  for(const [name,workflow] of Object.entries(examples))
    for(const type of usedIn(workflow))(uses[type]??=[]).push(name);

  const widgets=registry.widgets.filter(w=>statusOf(w)==='implemented').map(w=>{
    const exampleUses=(uses[w.nodeType]??[]).sort();
    const labRung=lab[w.nodeType]??'awaiting';
    // Two axes, reported separately rather than collapsed into one score. "Nothing to recompute"
    // is a settled lab position and not an absence of one, which the first version of this got
    // wrong -- it put `map_output`, used by all nine examples, on the same rung as a widget used
    // by none. A widget can be strong on one axis and weak on the other, and flattening that is
    // how `isochrone` and `summarize_hull` both came to be called "untested".
    const labSettled=labRung==='parity'||labRung==='none';
    const rung=exampleUses.length
      ?(labRung==='parity'?'example+parity':labSettled?'example, lab not applicable':'example only')
      :(labRung==='parity'?'parity only':labSettled?'neither applies':'declared only');
    return {nodeType:w.nodeType,exampleUses,exampleUseCount:exampleUses.length,lab:labRung,
      labOwed:!labSettled,fieldUse:[],rung};
  }).sort((a,b)=>a.nodeType.localeCompare(b.nodeType));

  return {schema:'fieldwork/widget-evidence/1',measuredAt:'2026-10-12',
    examplesShipped:Object.keys(examples).sort(),
    ladder:['declared only','example only','parity only','example, lab not applicable','example+parity',
      'field use — nothing has this yet'],
    weakest:'exampleUseCount 0 and a lab check still owed. That is the bottom of the ladder and the '
      +'population the pending exemption is about.',
    note:'Derived by scripts/widget-evidence.mjs from the shipped example workflows and '
      +'widgets/check-coverage.json. Never hand-edited. Use counts through a composition, because a '
      +'micro_workflow node is its members. Field use is declared and empty: an empty top rung is a '
      +'measurement, a missing one is a flattering omission.',
    counts:Object.fromEntries(['declared only','example only','parity only',
      'example, lab not applicable','example+parity','neither applies']
      .map(rung=>[rung,widgets.filter(w=>w.rung===rung).length])),
    compositionsUsedByNoExample:['compute_walking_catchment'],
    widgets};
}

const evidence=widgetEvidence();
// Derived, never hand-edited, in the pattern classification.json already uses: a stale copy is a
// claim about evidence nobody re-measured, which is the failure this whole file is a response to.
if(process.argv.includes('--check')){
  const committed=JSON.stringify(read('widgets/evidence.json'),null,1)+'\n';
  const recomputed=JSON.stringify(evidence,null,1)+'\n';
  if(committed!==recomputed){
    console.error('\nwidgets/evidence.json is stale. Run: node scripts/widget-evidence.mjs --write\n');
    const was=read('widgets/evidence.json');
    for(const widget of evidence.widgets){
      const before=was.widgets.find(w=>w.nodeType===widget.nodeType);
      if(!before)console.error(`  + ${widget.nodeType} (${widget.rung})`);
      else if(before.rung!==widget.rung)
        console.error(`  ~ ${widget.nodeType}: ${before.rung} -> ${widget.rung}`);
      else if(before.exampleUseCount!==widget.exampleUseCount)
        console.error(`  ~ ${widget.nodeType}: used by ${before.exampleUseCount} -> ${widget.exampleUseCount} example(s)`);
    }
    for(const widget of was.widgets)
      if(!evidence.widgets.some(w=>w.nodeType===widget.nodeType))console.error(`  - ${widget.nodeType}`);
    process.exit(1);
  }
}
if(process.argv.includes('--write')){
  writeFileSync(`${root}/widgets/evidence.json`,JSON.stringify(evidence,null,1)+'\n');
  console.log('Wrote widgets/evidence.json');
}
console.log(`Widget evidence across ${evidence.examplesShipped.length} worked examples:`);
for(const [rung,count] of Object.entries(evidence.counts))console.log(`  ${String(count).padStart(3)}  ${rung}`);
const weakest=evidence.widgets.filter(w=>!w.exampleUseCount&&w.labOwed).map(w=>w.nodeType);
if(weakest.length)console.log(`  weakest rung: ${weakest.join(', ')}`);
const most=[...evidence.widgets].sort((a,b)=>b.exampleUseCount-a.exampleUseCount).slice(0,3);
console.log(`  most used: ${most.map(w=>`${w.nodeType} (${w.exampleUseCount})`).join(', ')}`);
console.log(`  field use: ${evidence.widgets.filter(w=>w.fieldUse.length).length} widgets`);
