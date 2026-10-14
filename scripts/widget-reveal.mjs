// The reveal sequence, derived from the port graph rather than drawn by hand.
//
// Prints a Mermaid flowchart for docs/experiments/112-progressive-widget-reveal.md. A diagram of
// what unlocks what is worth nothing if it is maintained separately from the contracts it claims
// to describe, so it is generated: `npm run reveal:widgets` rewrites the block between the
// markers, and validate-docs fails if the file has drifted from the definitions.
import {TYPES,nodeInputs} from '../build/core.js';

/** The alternative contracts a widget can take, selected by its `inputMode` parameter.
 *
 *  This constant is the finding, not the fix. `TYPES[t].inputs` is a UNION across these modes, not
 *  a conjunction: `map_output` lists area, points, coverage and raster, and in `polygons` mode it
 *  needs only polygons. Reading that union as "needs all four" is why the first version of this
 *  analysis reported that a map could never be revealed. `nodeInputs(node)` already resolves the
 *  real contract from the node's parameters -- the knowledge exists and is reachable only by
 *  constructing a node and asking. Listing the modes here is how this script reaches it; declaring
 *  them on the widget is the work experiment 112 asks for. */
const MODES={map_output:['spatial','decisions','raster','polygons','network'],
  table_output:['spatial','decisions','polygons','table'],
  chart_output:['decisions','polygons','series']};

/** The ports a node actually has to have connected before it will run.
 *
 *  `nodeInputs` returns the ports a node MAY take; `executionPlan` then drops the ones it does not
 *  insist on -- `coverage` always, and `raster` unless the map is in raster mode -- before refusing
 *  a missing connection. That filter is a ternary inside executionPlan, so this script has to
 *  restate it to get the same answer, and restating it is the defect experiment 112 reports: one
 *  contract, written twice, in two files, with nothing holding the copies together. */
function requiredPorts(node){
  const all=nodeInputs(node);
  if(!['map_output','table_output'].includes(node.type))
    return node.type==='network_input'?all.filter(([port])=>port!=='area'):all;
  return all.filter(([port])=>port!=='coverage'
    &&(port!=='raster'||node.type==='map_output'&&node.params.inputMode==='raster'));
}

/** Every contract a widget could satisfy, as sets of port types. A widget with no modes has one. */
function contracts(type){
  const ports=node=>requiredPorts(node).map(([,p])=>p);
  if(!MODES[type])return [ports({id:'n',type,x:0,y:0,params:{label:'x'}})];
  return MODES[type].map(inputMode=>ports({id:'n',type,x:0,y:0,params:{label:'x',inputMode,pointInputCount:1}}));
}

const live=Object.entries(TYPES).filter(([,d])=>d&&d.group);
const inputsOf=t=>(TYPES[t].inputs||[]).map(([,type])=>type);
// A widget is reachable once ANY ONE of its contracts can be satisfied.
// A widget is reachable once ANY ONE of its contracts can be satisfied. A contract with NO
// required ports is satisfied by definition: `network_input` declares an `area` it does not
// insist on -- a country can name the scope instead -- so it is a source that may optionally be
// bounded. Requiring a non-empty set here stranded it, and with it every widget that consumes a
// `network`: isochrone, reachable_corridor, reachable_nodes and snap_to_network. Five widgets
// orphaned by one wrong `&&`, which is the shape of defect this whole analysis exists to find.
const satisfiable=(t,have)=>contracts(t).some(ports=>ports.every(p=>have.has(p)));
const sources=live.filter(([t])=>!inputsOf(t).length).map(([t])=>t);

/** `mode` is the open question this diagram exists to pose: a widget is revealed when EVERY one
 *  of its declared inputs can be produced, or when ANY one can. The two differ by a factor of two
 *  at the first step, and `all` never reveals a map. */
export function waves(mode='all'){
  const have=new Set(sources.map(t=>TYPES[t].output).filter(Boolean));
  const reached=new Set(sources),out=[];
  for(let i=0;i<12;i++){
    const next=live.filter(([t])=>!reached.has(t)&&inputsOf(t).length
      &&(mode==='modes'?satisfiable(t,have)
        :mode==='all'?inputsOf(t).every(p=>have.has(p)):inputsOf(t).some(p=>have.has(p)))).map(([t])=>t);
    if(!next.length)break;
    out.push(next);
    for(const t of next){reached.add(t);if(TYPES[t].output)have.add(TYPES[t].output);}
  }
  return {waves:out,reached,orphaned:live.filter(([t])=>!reached.has(t)).map(([t])=>t)};
}

const label=t=>`${t}["${TYPES[t].title}"]`;
const id=p=>'P_'+p.replace(/[^a-z]/gi,'');

/** Which widgets each port type unlocks, and which widgets produce it. The gate is the PORT, not
 *  the widget: "once there is a study area" is really "once an `area` exists", and four widgets
 *  can supply one. Keying the diagram on ports rather than on waves is what makes it answer the
 *  question a practitioner actually has -- what do I need on the canvas to reach this? */
export function gates(){
  const produced=new Map(),consumed=new Map();
  for(const [t,d] of live){
    if(d.output)(produced.get(d.output)??produced.set(d.output,[]).get(d.output)).push(t);
    for(const p of new Set(inputsOf(t)))(consumed.get(p)??consumed.set(p,[]).get(p)).push(t);
  }
  return [...consumed.keys()].sort().map(port=>({port,produced:produced.get(port)??[],consumed:consumed.get(port)}));
}

/** The spine: ports in the order a practitioner meets them, with the rest folded into one node so
 *  the diagram stays readable. A diagram nobody can take in is not documentation. */
const SPINE=['area','points','polygons','network'];

export function mermaid(){
  const g=gates(),byPort=new Map(g.map(x=>[x.port,x]));
  const lines=['flowchart LR',
    '  classDef gate fill:#fbf5e8,stroke:#b68c48,color:#1a1a1a;',
    '  classDef start fill:#eaf5ef,stroke:#388a7b,color:#1a1a1a;',
    '  classDef rest fill:#f4f4f4,stroke:#9a9a9a,color:#1a1a1a;'];
  lines.push(`  START(["Empty canvas<br/>${sources.length} widgets need nothing"]):::start`);
  for(const t of sources)lines.push(`  START --> ${label(t)}`);
  for(const port of SPINE){
    const x=byPort.get(port);if(!x)continue;
    lines.push(`  ${id(port)}{{"<b>${port}</b> on the canvas<br/>unlocks ${x.consumed.length} widgets"}}:::gate`);
    for(const from of x.produced)lines.push(`  ${from} --> ${id(port)}`);
  }
  // Everything downstream of the spine, counted rather than drawn: 11 further port types.
  const rest=g.filter(x=>!SPINE.includes(x.port));
  const widgets=new Set(rest.flatMap(x=>x.consumed));
  lines.push(`  REST["${rest.length} further port types<br/>gate ${widgets.size} widgets<br/>(summaries, decisions, outputs)"]:::rest`);
  for(const port of SPINE)if(byPort.has(port))lines.push(`  ${id(port)} --> REST`);
  return lines.join('\n');
}

if(import.meta.url===`file://${process.argv[1]}`){
  const strict=waves('all'),loose=waves('any');
  console.log(`every input satisfied: ${strict.waves.map(w=>w.length).join(' -> ')} | orphaned ${strict.orphaned.length}`);
  console.log(`any input satisfied:   ${loose.waves.map(w=>w.length).join(' -> ')} | orphaned ${loose.orphaned.length}`);
  console.log();
  console.log(mermaid());
}
