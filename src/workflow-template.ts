import type {Workflow,WorkflowNode} from './types.js';

/** Reusing a METHOD without reusing what it was run on.
 *
 *  The practitioner, 2026-10-21, with a North Kivu workflow built and an Ituri one to build:
 *  *"can the workflow be imported as a template to be filled up?"* Exporting and importing
 *  carries the material and the identity -- a 16,547-vertex boundary, 961 retrieved records, 48
 *  decisions, and the storage key of the workflow it came from, which the import would then
 *  overwrite. What is worth reusing is none of that. It is the shape of the investigation: which
 *  widgets, how they are wired, and every decision about HOW to work.
 *
 *  So the rule is a line between a SETTING and MATERIAL:
 *
 *  - A setting is a decision a practitioner made and would make again -- which facility source to
 *    ask, how far apart two records may be and still be one place, whether a boundary point is
 *    inside, which mark a layer draws with. Kept.
 *  - Material is what a particular run happened to acquire -- a geometry, a set of records, a
 *    street graph, a raster, and the judgements made about those records. Cleared.
 *
 *  THE SOURCE IS A SETTING, which the practitioner asked for by name: a template keeps "ask
 *  OpenStreetMap", "ask Overture", "ask HDX" and loses what each answered.
 *
 *  ONE PLACE WHERE THIS CANNOT BE HONOURED, and it is stated rather than fudged. An acquired
 *  study area carries a `boundary` record naming the level, the authority, the licence, the unit
 *  and when it was read. The level is a source and the unit is the material, but the record is one
 *  thing: keeping the level alone would mean writing a provenance record with the unit fields
 *  emptied, which is a fabricated record of a retrieval that did not happen. So the study area
 *  comes back empty and its level is chosen again. A record that says where a boundary came from
 *  must describe a boundary that was actually fetched. */

/** Parameters that hold what a run acquired, by the key they are held under. Keyed rather than
 *  typed because the same key means the same thing everywhere in this application: `data` is
 *  records, `asset` is a raster, `geometry` is a drawn or fetched outline. */
const MATERIAL=['data','dataRef','asset','assetRef','retrieved','geometry','revisions','boundary',
  'decisions','exclusions','repairs','composition'] as const;

/** `composition` is a member list, not material, and a micro-workflow without it has no ports at
 *  all -- so it is excluded from the clearing even though it looks like held content. */
const KEEP_ANYWAY=new Set(['composition']);

/** The two material keys that hold a SCALAR: a digest standing in for content kept elsewhere. */
const MATERIAL_SCALARS=new Set(['dataRef','assetRef']);

/** Material is HELD CONTENT -- an object or an array -- and never a word.
 *
 *  The comment above claims a key means the same thing everywhere, and `boundary` disproves it:
 *  on a study area it is the provenance record of a fetched outline, and on Summarize points to
 *  polygon it is the setting `'include' | 'exclude'`, which is exactly the kind of decision a
 *  template exists to carry. Clearing it by name emptied a setting and made the template invalid,
 *  which is how a template of the isochrone example could not be made at all. Found 2026-10-21
 *  while fixing the template that would not load. */
const isHeldContent=(key:string,held:unknown):boolean=>
  MATERIAL_SCALARS.has(key)||held===null||held===undefined||typeof held==='object';

export interface TemplateReport {
  workflow:Workflow;
  /** What was cleared, per node, so the practitioner is told rather than left to notice. */
  cleared:{nodeId:string;label:string;keys:string[]}[];
}

/** The EMPTY VALUE OF THE SAME SHAPE, because a template has to be a workflow.
 *
 *  Deleting the key was wrong wherever a reader expects the key to be there. A street network's
 *  `data` is `{nodes,edges}` and a table's is `{rows,columns}`, so deleting it made
 *  `params.data.nodes.length` throw while the canvas rendered; a drawn study area's `geometry` is
 *  `Boundary | null` and deleting it made `validateWorkflow` refuse the whole workflow. The
 *  template was never validated, so it saved anyway and then could not be opened: *"The Health
 *  Facilities North Kivu · template workflow won't load so can't be deleted"*, 2026-10-21.
 *
 *  A geometry empties to null, which is what "no area chosen yet" is spelled as. A collection
 *  empties its features, an array empties to nothing, and a record of arrays empties each array
 *  and keeps the rest -- a table's columns and its value field are settings, and only its rows are
 *  material. Anything else has no empty form and is removed, which is what an optional provenance
 *  record wants. */
function emptyOfSameShape(key:string,held:unknown):{known:true;value:unknown}|{known:false}{
  if(key==='geometry')return {known:true,value:null};
  if(Array.isArray(held))return {known:true,value:[]};
  if(held&&typeof held==='object'){
    const record=held as Record<string,unknown>;
    if(Array.isArray(record.features))return {known:true,value:{...record,features:[]}};
    const arrays=Object.keys(record).filter(name=>Array.isArray(record[name]));
    if(arrays.length)return {known:true,value:{...record,...Object.fromEntries(arrays.map(name=>[name,[]]))}};
  }
  return {known:false};
}

/** A copy of the workflow's method, with a new identity, ready to be filled. */
export function templateFrom(workflow:Workflow,options:{name:string;projectId?:string;workflowKey:string}):TemplateReport{
  const copy=structuredClone(workflow) as Workflow;
  const cleared:TemplateReport['cleared']=[];
  copy.nodes=copy.nodes.map(node=>{
    const params=node.params as unknown as Record<string,unknown>;
    const keys:string[]=[];
    for(const key of MATERIAL){
      if(KEEP_ANYWAY.has(key)||!Object.hasOwn(params,key))continue;
      const held=params[key];
      if(!isHeldContent(key,held))continue;
      // An already-empty parameter is not something that was cleared, and saying it was would
      // overstate what the template did.
      const empty=held===null||held===undefined
        ||(Array.isArray(held)&&!held.length)
        ||(typeof held==='object'&&'features' in (held as object)&&!((held as {features:unknown[]}).features||[]).length);
      if(!empty)keys.push(key);
      // A COLLECTION TRAVELS WITH ITS ACCOUNT. Find health facilities refuses to hold records with
      // no record of where they came from, and an empty collection is still a collection: a
      // retrieval that kept nothing is a finding, and its provenance is the whole of it. So where
      // the retrieval record is being cleared, the collection goes rather than being emptied.
      const blank=key==='data'&&Object.hasOwn(params,'retrieved')?{known:false} as const:emptyOfSameShape(key,held);
      if(blank.known)params[key]=blank.value;
      else delete params[key];
    }
    if(keys.length)cleared.push({nodeId:node.id,label:String(params.label||node.id),keys});
    return node as WorkflowNode;
  });
  // A template is a new workflow, not the one it was taken from: its own key, its own name, and
  // no example identity, so saving it cannot write over the workflow that was copied.
  copy.name=options.name;
  copy.workflowKey=options.workflowKey;
  if(options.projectId)copy.projectId=options.projectId;
  delete (copy as {exampleId?:string}).exampleId;
  delete (copy as {manifest?:unknown}).manifest;
  return {workflow:copy,cleared};
}
