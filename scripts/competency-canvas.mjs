// Can the ontology, as implemented, answer what a canvas-aware reveal rule would have to ask?
//
// The practitioner's hypothesis, stated 2026-10-14: syntactic, then semantic, then pragmatic
// interoperability are the FOUNDATION of progressive reveal. The levels are ordered, so this
// asks the questions level by level and reports where the graph stops answering.
//
//   Syntactic — what KIND of thing is this?        A port type, a class.
//   Semantic  — what does it MEAN?                 An observation, infrastructure, a synthetic point.
//   Pragmatic — is it FIT for the next operation?  An area that was measured, a point on a network.
//
// It reads a real run graph: the receipts and workflow provenance, the same text the N3 and
// evidence view shows, parsed back in. Nothing here reads the application's internals, because a
// rule in the ontology could not either.
//
// Usage: node scripts/competency-canvas.mjs [example]
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {Parser,Store} from 'n3';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
globalThis.self=globalThis;
runInThisContext(read('vendor/eye-21.1.24.js'),{filename:'eye-21.1.24.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const {executeWorkflow}=await import(new URL('build/core.js',root));
const {snowExtentExample,johnSnowExample}=await import(new URL('build/john-snow.js',root));
const {oldNalediWorkflow}=await import(new URL('build/old-naledi.js',root));
const FW='urn:fieldwork:', RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  RDFS='http://www.w3.org/2000/01/rdf-schema#subPropertyOf';

const ontology=new Store(new Parser().parse(read('ontology/fieldwork.ttl')));
/** Every property the ontology says is a kind of this one, including itself. */
const family=property=>{
  const want=new Set([FW+property]);
  for(;;){
    const before=want.size;
    for(const q of ontology.getQuads(null,RDFS,null,null))
      if(want.has(q.object.value))want.add(q.subject.value);
    if(want.size===before)return want;
  }
};
const graphOf=async workflow=>{
  const run=await executeWorkflow(workflow,reason);
  const store=new Store();
  for(const doc of [...run.receipts.map(r=>r.input),run.provenanceN3].filter(Boolean))
    try{store.addQuads(new Parser({format:'text/n3'}).parse(doc));}catch{/* a document that will not parse is itself an answer */}
  for(const r of run.receipts)for(const q of r.conclusions||[])
    store.addQuad({termType:'Quad',subject:{termType:'NamedNode',value:q.subject},
      predicate:{termType:'NamedNode',value:q.predicate},
      object:{termType:'Literal',value:q.object},graph:{termType:'DefaultGraph',value:''}});
  return {run,store};
};
const anyOf=(store,properties)=>[...properties].flatMap(p=>store.getQuads(null,p,null,null));

const EXAMPLES={'snow-extent':snowExtentExample,'snow-isochrone':()=>johnSnowExample('snow-isochrone'),
  'old-naledi':oldNalediWorkflow};
const chosen=process.argv[2]||'snow-extent';
if(!EXAMPLES[chosen])throw new Error(`Unknown example ${chosen}. One of: ${Object.keys(EXAMPLES).join(', ')}`);
// `--before` asks the questions of the canvas as it stands BEFORE the rule node is added, which
// is when a reveal rule has to answer them. Asking after the ruleset has run is asking whether
// the thing you already did was possible.
//
// The rule node is removed and the output it fed is re-attached to the step above it, because a
// node connected to no output is not in the execution plan and therefore emits NOTHING. That is
// the first thing a receipt-driven reveal has to reckon with: a canvas carries facts only about
// what has been run toward an output.
const before=process.argv.includes('--before');
const workflow=EXAMPLES[chosen]();
if(before){
  const rules=workflow.nodes.filter(n=>n.type==='apply_ruleset').map(n=>n.id);
  for(const rule of rules){
    const feeder=workflow.edges.find(e=>e.to===rule);
    for(const edge of workflow.edges)if(edge.from===rule&&feeder)edge.from=feeder.from;
  }
  const gone=new Set(rules);
  workflow.nodes=workflow.nodes.filter(n=>!gone.has(n.id));
  workflow.edges=workflow.edges.filter(e=>!gone.has(e.from)&&!gone.has(e.to));
  // An output that only a rule could feed has nothing left to show.
  const orphan=new Set(workflow.nodes.filter(n=>['table_output','chart_output','map_output','output'].includes(n.type)
    &&!workflow.edges.some(e=>e.to===n.id)).map(n=>n.id));
  workflow.nodes=workflow.nodes.filter(n=>!orphan.has(n.id));
  workflow.edges=workflow.edges.filter(e=>!orphan.has(e.to));
}
const {store}=await graphOf(workflow);

const questions=[
  ['SYNTACTIC','C1','What kinds of thing has this canvas produced?',()=>{
    const types=new Set(store.getQuads(null,RDF,null,null).map(q=>q.object.value)
      .filter(v=>v.startsWith(FW)).map(v=>v.slice(FW.length)));
    return [types.size>0,`${types.size} fw: classes: ${[...types].sort().slice(0,8).join(', ')}`];
  }],
  ['SYNTACTIC','C2','Which geometry is here, and in which CRS are its coordinates?',()=>{
    const wkt=store.getQuads(null,'http://www.opengis.net/ont/geosparql#asWKT',null,null);
    const crs=new Set(wkt.map(q=>(/<([^>]+)>/.exec(q.object.value)||[])[1]).filter(Boolean));
    return [wkt.length>0&&crs.size>0,`${wkt.length} geometries, CRS stated in the literal: ${[...crs].join(', ')||'none'}`];
  }],
  ['SEMANTIC','C3','Is a point here an observation, infrastructure, or synthetic?',()=>{
    const found=anyOf(store,family('sourceKind')).concat(anyOf(store,family('observationKind')));
    return [found.length>0,found.length?`${found.length} assertions`:'no term in the graph records what a point IS'];
  }],
  ['SEMANTIC','C4','Which feature is the study area, found by its role rather than by name?',()=>{
    const typed=store.getQuads(null,RDF,FW+'StudyArea',null);
    return [typed.length>0,`${typed.length} typed fw:StudyArea`];
  }],
  ['SEMANTIC','C5','What did a rule conclude, and about which thing?',()=>{
    const decisions=anyOf(store,family('decision'));
    return [decisions.length>0,`${decisions.length}: ${decisions.slice(0,3).map(q=>
      q.subject.value.split(':').pop()+' → '+q.object.value.split(':').pop()).join('; ')||'none'}`];
  }],
  ['PRAGMATIC','C6','What on this canvas asserts an enclosed area, asked once?',()=>{
    const kin=family('areaSquareMetres');
    const found=anyOf(store,kin);
    return [found.length>0,`${kin.size} term(s) in the family [${[...kin].map(t=>t.slice(FW.length)).join(', ')}], `
      +`${found.length} assertion(s) in the graph`];
  }],
  ['PRAGMATIC','C7','Which results were computed in a metric CRS, and which one?',()=>{
    const crs=anyOf(store,family('metricCRS'));
    return [crs.length>0,`${crs.length} assertions: ${[...new Set(crs.map(q=>q.object.value))].join(', ')||'none'}`];
  }],
  ['PRAGMATIC','C8','Could the extent ruleset run on what is here, by its own declared expectations?',()=>{
    const ruleset=JSON.parse(read('rulesets/extent-review/1.1.0.json'));
    const want=ruleset.inputContract.expects.map(e=>e.predicate.replace('fw:',''));
    const met=want.filter(w=>anyOf(store,family(w)).length>0);
    return [met.length===want.length,`expects [${want.join(', ')}], canvas answers [${met.join(', ')||'none'}]`];
  }],
  ['PRAGMATIC','C9','Is a point here attached to a street network, so it can be routed from?',()=>{
    const snapped=anyOf(store,family('networkSnaps')).concat(anyOf(store,family('snappedNodeCount')));
    return [snapped.length>0,snapped.length?`${snapped.length} assertions`:'the attachment is a point attribute, not a fact in the graph'];
  }],
  ['PRAGMATIC','C10','Is any result here over fewer sites than were offered?',()=>{
    const omitted=anyOf(store,family('unconnectedSiteCount')).concat(anyOf(store,family('offNetworkSiteCount')));
    return [omitted.length>0,omitted.length?`${omitted.length} assertions`:'nothing omitted in this example, or nothing says so'];
  }],
];
console.log(`\n${chosen}${before?' — canvas BEFORE the rule node is added':''}: ${store.size} triples in the run graph\n`);
if(process.argv.includes('--predicates')){
  const counts=new Map();
  for(const q of store.getQuads(null,null,null,null))
    if(q.predicate.value.startsWith(FW))counts.set(q.predicate.value.slice(FW.length),(counts.get(q.predicate.value.slice(FW.length))||0)+1);
  console.log([...counts].sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${t} ${n}`).join(', '),'\n');
}
let level='';
const tally={yes:0,no:0};
for(const [group,id,question,fn] of questions){
  if(group!==level){console.log(`  ── ${group} ${'─'.repeat(58-group.length)}`);level=group;}
  const [ok,detail]=fn();
  tally[ok?'yes':'no']++;
  console.log(`  ${id.padEnd(4)}${ok?'ANSWERED':'   —    '}  ${question}`);
  console.log(`        ${detail}`);
}
console.log(`\n  ${tally.yes} answered, ${tally.no} unanswered, of ${questions.length}\n`);
