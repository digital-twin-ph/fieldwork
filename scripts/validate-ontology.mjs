import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Parser, Store, Writer, DataFactory} from 'n3';
import SHACLValidator from 'rdf-validate-shacl';

export const ontologyFiles=['fieldwork','jurisdictions','gadm','stac','processing'].map(n=>`ontology/${n}.ttl`);
export const shapeFiles=['assets-jurisdictions','stac','processing'].map(n=>`ontology/shapes/${n}.ttl`);
export const exampleFiles=['gadm-botswana-distribution','gadm-study-area','stac-processing'].map(n=>`ontology/examples/${n}.ttl`);
export async function loadGraph(files){
  const store=new Store();
  // Separate parsers prevent unrelated files' blank-node labels from colliding.
  for(const file of files)store.addQuads(new Parser({baseIRI:pathToFileURL(file).href}).parse(await readFile(file,'utf8')));
  return store;
}
export async function validateGraph(data,{postSelection=false}={}){
  const shapes=await loadGraph([...shapeFiles,...(postSelection?['ontology/shapes/selection-result.ttl']:[])]);
  const {namedNode:n}=DataFactory;
  // A candidate's declared input shape is evaluated against that request's input.
  // This binds SHACL Core targetNode statements; it does not execute an operation.
  for(const route of data.match(null,n('urn:fieldwork:candidateOperation'),null)){
    const inputs=[...data.match(route.subject,n('urn:fieldwork:routingInput'),null)];
    const contracts=[...data.match(route.object,n('urn:fieldwork:requiresInputShape'),null)];
    for(const input of inputs)for(const contract of contracts)shapes.addQuad(contract.object,n('http://www.w3.org/ns/shacl#targetNode'),input.object);
  }
  // Make only the loaded shape identities visible to reference constraints.
  // Never mutate the caller's graph or fetch an unknown shape IRI.
  const validationData=new Store([...data]);
  validationData.addQuads(shapes.getQuads(null,n('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),n('http://www.w3.org/ns/shacl#NodeShape'),null));
  return new SHACLValidator(shapes).validate(validationData);
}
export function summarize(report){
  return {conforms:report.conforms,results:report.results.map(r=>({focusNode:r.focusNode?.value,path:r.path?.value,message:r.message.map(m=>m.value),constraint:r.sourceConstraintComponent?.value}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=process.argv.slice(2),postSelection=args.includes('--post-selection'),files=args.filter(a=>a!=='--post-selection');
    if(files.some(f=>f.startsWith('--')))throw new Error('Usage: npm run validate:ontology -- [--post-selection] [data.ttl ...]');
    const data=await loadGraph([...ontologyFiles,...(files.length?files:exampleFiles)]);
    const report=await validateGraph(data,{postSelection});
    await mkdir('test-results',{recursive:true});
    await writeFile('test-results/ontology-validation.json',JSON.stringify(summarize(report),null,2)+'\n');
    const writer=new Writer();writer.addQuads([...report.dataset]);
    await writeFile('test-results/ontology-validation.ttl',await new Promise((resolve,reject)=>writer.end((e,text)=>e?reject(e):resolve(text))));
    console.log(JSON.stringify(summarize(report),null,2));process.exitCode=report.conforms?0:1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
