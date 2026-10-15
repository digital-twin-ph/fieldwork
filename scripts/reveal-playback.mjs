// Step through a worked example as if it were being built, and show what progressive reveal
// would have offered at each step -- under both readings of the rule.
//
// The practitioner's suggestion, 2026-10-14: simulate the reveal in a worked example, like a
// step-by-step playback. It is the stage AGENTS.md says is usually skipped, between proposing a
// rule and enforcing it: watch it behave on something real before committing the application to
// it.
//
//   PORT reveal    — a widget is offered because something here emits a type it accepts.
//                    Known before anything runs. Structural.
//   RECEIPT reveal — a widget is offered because the facts already asserted are the facts it
//                    consumes. Needs a run, and says nothing about a node that was never run.
//
// The example runs once; its receipts are per node, so the canvas after step k is the union of
// the receipts of the nodes placed by then. That is what a practitioner who ran as they built
// would have had.
//
// Usage: node scripts/reveal-playback.mjs [example]
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {Parser,Store} from 'n3';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
globalThis.self=globalThis;
runInThisContext(read('vendor/eye-21.1.24.js'),{filename:'eye-21.1.24.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const {executeWorkflow,TYPES}=await import(new URL('build/core.js',root));
const {snowExtentExample,johnSnowExample}=await import(new URL('build/john-snow.js',root));
const {oldNalediWorkflow}=await import(new URL('build/old-naledi.js',root));
const {bundledRulesets}=await import(new URL('build/rulesets.js',root));
const FW='urn:fieldwork:';
const {widgets}=JSON.parse(read('widgets/port-contracts.json'));
const portNames=Object.keys(widgets).filter(n=>!widgets[n].lateBoundTo);

const EXAMPLES={'snow-extent':snowExtentExample,'snow-isochrone':()=>johnSnowExample('snow-isochrone'),
  'snow-voronoi':()=>johnSnowExample('snow-voronoi'),'old-naledi':oldNalediWorkflow};
const chosen=process.argv[2]||'snow-extent';
if(!EXAMPLES[chosen])throw new Error(`Unknown example ${chosen}. One of: ${Object.keys(EXAMPLES).join(', ')}`);
const workflow=EXAMPLES[chosen]();
const run=await executeWorkflow(workflow,reason);
const receiptOf=new Map(run.receipts.map(r=>[r.nodeId,r]));

// The order a practitioner would place them: sources first, then whatever their inputs allow.
const placed=[],waiting=[...workflow.nodes],produced=new Set();
const requiredOf=node=>{
  const entry=widgets[node.type];
  if(entry?.lateBoundTo)return [(node.params.ruleset?.inputs||node.params.composition?.inputs||[]).map(([,t])=>t)];
  return (entry?.contracts||[]).map(c=>c.required.map(([,t])=>t));
};
const outputOf=node=>widgets[node.type]?.lateBoundTo
  ?(node.params.ruleset?.output||node.params.composition?.output):widgets[node.type]?.output;
for(let moved=true;moved&&waiting.length;){
  moved=false;
  for(let i=0;i<waiting.length;i++){
    const node=waiting[i],options=requiredOf(node);
    if(options.length&&options.some(req=>req.every(t=>produced.has(t)))){
      placed.push(node);waiting.splice(i,1);i--;moved=true;
      const out=outputOf(node);if(out)produced.add(out);
    }
  }
}
const rulesets=bundledRulesets().filter(r=>r.inputContract?.expects);
const store=new Store();
const addReceipt=node=>{
  const receipt=receiptOf.get(node.id);
  if(!receipt)return false;
  try{store.addQuads(new Parser({format:'text/n3'}).parse(receipt.input));}catch{/* the parse failing is itself the answer */}
  for(const q of receipt.conclusions||[])store.addQuad({termType:'Quad',
    subject:{termType:'NamedNode',value:q.subject},predicate:{termType:'NamedNode',value:q.predicate},
    object:{termType:'Literal',value:q.object},graph:{termType:'DefaultGraph',value:''}});
  return true;
};
const asserted=()=>new Set(store.getQuads(null,null,null,null).map(q=>q.predicate.value)
  .filter(p=>p.startsWith(FW)).map(p=>p.slice(FW.length)));
const portAddable=available=>portNames.filter(n=>widgets[n].contracts.some(c=>
  c.required.every(([,t])=>available.has(t)))).length;

console.log(`\n${chosen}: ${placed.length} nodes, played back in build order\n`);
console.log(`  step  node                        port   facts  rulesets the canvas can now justify`);
const types=new Set();let previousJustified=new Set();
/** The first step at which each ruleset's declared expectations were all met. */
const justifiedAt=new Map();
for(const [index,node] of placed.entries()){
  types.add(outputOf(node));
  const ran=addReceipt(node);
  const terms=asserted();
  const justified=rulesets.filter(r=>r.inputContract.expects
    .every(e=>terms.has(e.predicate.replace('fw:',''))));
  const names=justified.map(r=>r.id.split(':').pop()+' '+r.version);
  for(const r of justified)if(!justifiedAt.has(r.id))justifiedAt.set(r.id,index+1);
  const fresh=names.filter(n=>!previousJustified.has(n));
  previousJustified=new Set(names);
  console.log(`  ${String(index+1).padStart(4)}  ${(node.id+' · '+node.type).padEnd(28).slice(0,28)}`
    +`${String(portAddable(new Set([...types].filter(Boolean)))).padStart(4)}`
    +`${String(terms.size).padStart(7)}  ${fresh.length?'NEW: '+fresh.join(', '):names.join(', ')||(ran?'—':'(did not run)')}`);
}
console.log(`\n  port: widgets addable under the port rule, of ${portNames.length}`);
console.log(`  facts: distinct fw: predicates on the canvas`);

// The verdict the playback exists to give: was a ruleset justified BEFORE the step that added
// it, or only by its own facts once it ran? Only the first is a reveal. The second is a canvas
// confirming what you already did.
console.log('\n  Anticipated, or only confirmed?');
for(const [id,step] of justifiedAt){
  const used=placed.findIndex(n=>n.type==='apply_ruleset'&&n.params.ruleset?.id===id);
  if(used<0){console.log(`    ${id.split(':').pop().padEnd(18)} justified at step ${step}, never used here`);continue;}
  console.log(`    ${id.split(':').pop().padEnd(18)} justified at step ${step}, added at step ${used+1} — `
    +(step<used+1?'ANTICIPATED: the canvas could have offered it'
      :'confirmed only: its own fact generator minted what it expects'));
}
console.log();
