import {Parser,Store,DataFactory} from 'n3';
import {loadGraph,ontologyFiles,validateGraph,summarize} from './validate-ontology.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {quadToN3} from '../build/study-area.js';
const {namedNode:n}=DataFactory,fw='urn:fieldwork:',rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export async function auditRuntimeRun(run){
  const graph=await loadGraph(ontologyFiles),issues=[];
  for(const text of [run.provenanceN3,...run.receipts.map(r=>r.facts)])graph.addQuads(new Parser().parse(text));
  // N3 formula syntax is checked separately; quoted rule graphs are not data for SHACL.
  for(const receipt of run.receipts)new Parser({format:'N3'}).parse(receipt.input);
  for(const receipt of run.receipts)graph.addQuads(new Parser().parse(receipt.conclusions.map(quadToN3).join('\n')));
  const catalog=JSON.parse(await readFile('widgets/registry.json','utf8'));
  for(const step of run.trace){const plan=n(`${fw}run:${run.runId}:plan:${step.nodeId}`),binding=catalog.widgets.find(w=>w.nodeType===step.type),version=graph.getObjects(plan,n(fw+'catalogVersion'),null)[0]?.value,ref=binding?.releases.find(r=>r.version===version);
    for(const [property,expected] of [['widget',binding?.id],['nodeType',step.type],['catalogVersion',ref?.version],['catalogDigest',ref?.sha256]]){
      const actual=graph.getObjects(plan,n(fw+property),null);if(actual.length!==1||actual[0].value!==expected)issues.push(`${step.nodeId}: incorrect ${property} binding`);
    }
  }
  // Evidence closure: every emitted application predicate/type must be declared.
  const declarations=await loadGraph(ontologyFiles);
  for(const receipt of run.receipts){for(const q of new Parser().parse(receipt.facts)){
    const terms=[q.predicate,...(q.predicate.value===rdf+'type'?[q.object]:[])];
    for(const term of terms)if(term.termType==='NamedNode'&&term.value.startsWith(fw)&&!declarations.countQuads(term,null,null,null))issues.push(`${receipt.nodeId}: undeclared term ${term.value}`);
  }}
  const report=await validateGraph(graph);
  return {graph,summary:{conforms:report.conforms&&issues.length===0,issues:[...new Set(issues)],shacl:summarize(report)}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file=process.argv[2];if(!file){console.error('Usage: node scripts/audit-runtime-n3.mjs exported-run-receipt.json');process.exitCode=1;}
  else {const run=JSON.parse(await readFile(file,'utf8'));const {summary}=await auditRuntimeRun(run);await mkdir('test-results',{recursive:true});await writeFile('test-results/runtime-ontology-audit.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));process.exitCode=summary.conforms?0:1;}
}
