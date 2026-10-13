import {packCatalogN3} from './pack-catalog.js';
import type {Workflow,WorkflowNode} from './types.js';
import {isRecord} from './guards.js';
import type {Receipt} from './results.js';
import {runtimeBindingN3} from './runtime-semantics.js';

export const MAX_PDF_BYTES=5_000_000,MAX_WORKFLOW_PDF_BYTES=10_000_000,MAX_BUNDLE_BYTES=20_000_000;
export const REFERENCE_ROLES={data:'Data source',method:'Method or processing step',assumption:'Assumption or parameter',context:'Background context'} as const;
export type ReferenceRole=keyof typeof REFERENCE_ROLES;
interface ReferenceMetadata {
  id:string; title:string; role:ReferenceRole; authors:string; published:string;
  locator:string; notes:string; addedAt:string; modifiedAt:string;
}
export type EvidenceReference=ReferenceMetadata & (
  {kind:'url';url:string} |
  {kind:'pdf';filename:string;sha256:string;bytes:number;mediaType:'application/pdf'}
);
export interface NodeEvidence {nodeId:string;references:EvidenceReference[]}
export interface EvidenceFile {sha256:string;bytes:number;dataBase64:string;mediaType?:'application/pdf'|'image/tiff'}
export interface EvidenceBundle {schema:'fieldwork/bundle/1';workflow:Workflow;attachments:EvidenceFile[]}

export function referenceURL(raw:string):string {
  if(!raw.trim()||raw.length>2000||/[\u0000-\u0020<>"{}|^`\\]/.test(raw))throw new Error('Enter a complete HTTP or HTTPS URL without spaces.');
  let url:URL;try{url=new URL(raw);}catch{throw new Error('Enter a complete HTTP or HTTPS URL.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP or HTTPS URL without embedded credentials.');
  return url.href;
}
function boundedText(value:unknown,label:string,limit:number,required=false):asserts value is string {
  if(typeof value!=='string'||value.length>limit||(required&&!value.trim()))throw new Error(`${label} must be ${required?'nonempty ':''}text of at most ${limit} characters.`);
}
export function validateReferences(value:unknown):asserts value is EvidenceReference[]|undefined {
  if(value===undefined)return;
  if(!Array.isArray(value)||value.length>20)throw new Error('Use at most 20 evidence references per node.');
  const ids=new Set<string>();
  for(const ref of value){
    if(!isRecord(ref)||typeof ref.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(ref.id)||ids.has(ref.id))throw new Error('Invalid or duplicate evidence reference ID.');
    ids.add(ref.id);
    for(const [key,limit] of Object.entries({title:200,authors:300,published:100,locator:200,notes:2000}))boundedText(ref[key],key,limit,key==='title');
    if(typeof ref.role!=='string'||!Object.hasOwn(REFERENCE_ROLES,ref.role))throw new Error('Choose what the reference supports.');
    for(const key of ['addedAt','modifiedAt'])if(typeof ref[key]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(ref[key])||!Number.isFinite(Date.parse(ref[key]))||new Date(ref[key]).toISOString()!==ref[key])throw new Error('Invalid reference timestamp.');
    if(String(ref.modifiedAt)<String(ref.addedAt))throw new Error('Reference modification time predates its creation.');
    if(ref.kind==='url'){boundedText(ref.url,'URL',2000,true);referenceURL(ref.url);}
    else if(ref.kind==='pdf'){
      boundedText(ref.filename,'PDF filename',200,true);
      if(!/^[a-f0-9]{64}$/.test(String(ref.sha256))||ref.mediaType!=='application/pdf'||typeof ref.bytes!=='number'||!Number.isInteger(ref.bytes)||ref.bytes<5||ref.bytes>MAX_PDF_BYTES)throw new Error('Invalid PDF metadata. PDFs must be at most 5 MB.');
    }else throw new Error('A reference must be a URL or PDF.');
  }
}
export function referencedPDFs(workflow:Pick<Workflow,'nodes'>):Map<string,Extract<EvidenceReference,{kind:'pdf'}>> {
  const files=new Map<string,Extract<EvidenceReference,{kind:'pdf'}>>();let count=0;
  for(const node of workflow.nodes){validateReferences(node.references);for(const ref of node.references||[]){count++;if(ref.kind==='pdf'){const previous=files.get(ref.sha256);if(previous&&previous.bytes!==ref.bytes)throw new Error('Conflicting sizes for the same PDF hash.');files.set(ref.sha256,ref);}}}
  if(count>100)throw new Error('Use at most 100 evidence references per workflow.');
  if([...files.values()].reduce((sum,f)=>sum+f.bytes,0)>MAX_WORKFLOW_PDF_BYTES)throw new Error('Referenced PDFs exceed the 10 MB total per workflow.');
  return files;
}
export async function pdfDigest(bytes:Uint8Array<ArrayBuffer>):Promise<string> {
  if(bytes.length<5||bytes.length>MAX_PDF_BYTES||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('Choose a PDF file with a valid PDF header, up to 5 MB.');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function encodeFile(bytes:Uint8Array):string {
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}
export function decodeFile(text:unknown):Uint8Array<ArrayBuffer> {
  if(typeof text!=='string'||text.length>Math.ceil(MAX_PDF_BYTES/3)*4||text.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw new Error('Invalid or oversized PDF encoding.');
  const binary=atob(text);return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

/** References document the plan. PDF/link contents are not computation inputs or EYE premises. */
/** The term for a port type, derived rather than tabulated.
 *
 *  Every port type's ontology individual is its name in upper camel case with `Port` appended, so
 *  `coverage-check` is `fw:CoverageCheckPort`. Derived so a new port type cannot be added with its
 *  term silently missing -- there is no table to forget to update -- and `tests/evidence.test.mjs`
 *  asserts that every member of the union has an individual declared. */
export const portTypeTerm=(portType:string):string=>
  'fw:'+portType.split('-').map(part=>part[0].toUpperCase()+part.slice(1)).join('')+'Port';

export function evidenceProvenance(nodes:WorkflowNode[],edges:Workflow['edges'],runId:string,receipts:Receipt[]=[],
  portTypes:Record<string,string|null>={}):{evidence:NodeEvidence[];provenanceN3:string} {
  const evidence=nodes.filter(n=>n.references?.length).map(n=>({nodeId:n.id,references:structuredClone(n.references!)}));
  const iri=(part:string)=>`<urn:fieldwork:run:${runId}:${part}>`,literal=(text:string)=>JSON.stringify(text);
  let facts='@prefix dc: <http://purl.org/dc/elements/1.1/>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n# Citation metadata supplied by the workflow author; not independently verified evidence.\n';
  facts+='@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n';
  facts+=packCatalogN3(runId);
  const ids=new Set(nodes.map(n=>n.id));
  for(const node of nodes){
    const step=iri('step:'+node.id),plan=iri('plan:'+node.id),output=iri('output:'+node.id);
    facts+=`${plan} a prov:Plan; dcterms:identifier ${literal(node.id)}.\n${step} a prov:Activity; fw:workflowNode ${plan}; prov:generated ${output}.\n${output} a prov:Entity${portTypes[node.id]?`; fw:portType ${portTypeTerm(portTypes[node.id]!)}`:''}.\n`;
    facts+=runtimeBindingN3(node,runId,receipts);
    for(const edge of edges.filter(e=>e.to===node.id&&ids.has(e.from)))facts+=`${step} prov:used ${iri('output:'+edge.from)}.\n`;
    for(const ref of node.references||[])facts+=referenceN3(iri('reference:'+node.id+':'+ref.id),plan,ref,literal);
  }
  // A ruleset's basis, from the receipts of the runs that applied it. Attached to the **ruleset**
  // as a prov:Plan rather than to the node, because the authority belongs to the rules and not to
  // the practitioner who placed a widget — and because the same ruleset applied by two nodes is
  // one basis, not two.
  //
  // Emitted here, into provenance, and never into `facts` or `rules`. A citation in a rule premise
  // would let the reasoner draw conclusions from a bibliography, which the test beside this file
  // has asserted against for node references since before rulesets existed.
  const seen=new Set<string>();
  for(const receipt of receipts){
    const ruleset=receipt.ruleset;
    if(!ruleset||seen.has(ruleset.id+'@'+ruleset.version))continue;
    seen.add(ruleset.id+'@'+ruleset.version);
    const entity=`<${ruleset.id}>`;
    facts+=`${entity} a fw:Ruleset, prov:Plan; dcterms:hasVersion ${literal(ruleset.version)}; `
      +`dcterms:title ${literal(ruleset.title)}; fw:basisStatus fw:${ruleset.basis.status.replace(/(^|-)([a-z])/g,(_,d,c)=>c.toUpperCase())}.\n`;
    facts+=`${iri('plan:'+receipt.nodeId)} prov:hadPlan ${entity}.\n`;
    for(const ref of ruleset.basis.evidence)
      facts+=referenceN3(iri('ruleset:'+ruleset.id.split(':').pop()+':'+ref.id),entity,ref,literal);
    // An unresolved citation is recorded as unresolved rather than as a reference. A bibliography
    // entry nobody can open is not evidence, and emitting it as one would overstate the basis in
    // exactly the place a reader goes to check it.
    for(const unresolved of ruleset.basis.unresolvedCitations)
      facts+=`${entity} fw:unresolvedCitation ${literal(unresolved.citation)}.\n`;
  }
  return {evidence,provenanceN3:facts};
}

/** One emitter for both node references and ruleset evidence, so the two cannot drift apart. */
function referenceN3(citation:string,subject:string,ref:EvidenceReference,literal:(text:string)=>string):string{
  const role={data:'DataSourceReference',method:'MethodReference',assumption:'AssumptionReference',context:'ContextReference'}[ref.role];
  let facts=`${subject} dcterms:references ${citation}.\n${citation} a fw:EvidenceReference, prov:Entity; dcterms:title ${literal(ref.title)}; fw:referenceRole fw:${role}; dcterms:created ${literal(ref.addedAt)}^^xsd:dateTime; dcterms:modified ${literal(ref.modifiedAt)}^^xsd:dateTime.\n`;
  for(const [predicate,value] of [['dc:creator',ref.authors],['dcterms:issued',ref.published],['fw:locator',ref.locator],['dcterms:description',ref.notes]])if(value)facts+=`${citation} ${predicate} ${literal(value)}.\n`;
  if(ref.kind==='url')facts+=`${citation} dcterms:source <${referenceURL(ref.url)}> .\n`;
  else facts+=`${citation} dcterms:source <urn:sha256:${ref.sha256}>; dcterms:format "application/pdf"; fw:sha256 ${literal(ref.sha256)}; fw:byteSize ${ref.bytes}; fw:filename ${literal(ref.filename)}.\n`;
  return facts;
}
