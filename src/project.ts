import {isRecord} from './guards.js';

/** A project is one investigation. One subject, several questions, one workflow per question.
 *
 *  Until 2026-10-19 this application had no project. "Project" was a word in the title bar bound
 *  to `workflow.name`, and a `ProjectManifest` whose inventory spans exactly one workflow. The
 *  practitioner, 2026-10-19, on the John Snow material: *"the investigation is the project, and an
 *  investigation, like John Snow can have multiple workflows. That is the reality our current
 *  model will hit."*
 *
 *  It had already hit it twice, inside the worked examples:
 *    - `snow-voronoi`, `snow-isochrone`, `snow-geoprivacy` and `snow-extent` each embed their own
 *      `structuredClone` of `examples/john-snow/points.json` -- 42,566 bytes, 250 deaths and eight
 *      pumps, four times over, and a workflow is written twice on every save. 340,528 bytes, 6.5%
 *      of the 5,226,496 bytes `localStorage` was measured to hold, to store one outbreak.
 *    - `old-naledi` and `raster` both import `boundary` from `examples/old-naledi/data.js`.
 *  Four questions about one outbreak and two about one settlement, modelled as six unrelated
 *  workspaces, because a workspace was the largest thing the model had.
 *
 *  A project is deliberately a layer ABOVE the workflow and changes nothing below it. A workflow
 *  keeps its `exampleId`, its own name, its own singular `outputId` and its own canvas, and
 *  `exampleKey` still identifies a workflow at every one of its call sites. What the project adds
 *  is the one thing none of them could say: which workflows are asking about the same subject.
 *
 *  Two things it does NOT do, both deliberate and both recorded in experiment 122:
 *    - It does not share data between workflows. The four copies of Snow's points are still four
 *      copies. Moving data up to the project means `point_input` holding a content-addressed
 *      reference instead of a `FeatureCollection`, which every widget that reads `params.data`
 *      would have to resolve. That is phase two, and it is why 122 is `tried`, not `validated`.
 *    - It does not make one canvas hold several workflows. Nothing forbids drawing disconnected
 *      subgraphs on one canvas -- the rulesets example is described as "Four workflows on one
 *      canvas" -- but the practitioner's judgement, 2026-10-19, is that this is not good practice
 *      and the cost lands downstream: *"a very cluttered interface that makes it difficult to
 *      communicate the answer to questions."* A project gives four questions four canvases, which
 *      is the alternative that judgement implies.
 */
export interface Project {schema:'fieldwork/project/1'; id:string; name:string; subject:string; workflows:string[]}

/** The workflows a built-in project holds, in reading order, with the label each carries in the
 *  picker. The keys are `exampleKey` values: this registry groups them, it does not rename them.
 *
 *  `blank` is in no project, and that is the point rather than an omission. A new empty canvas
 *  belongs to whatever investigation the practitioner is starting, and the practitioner,
 *  2026-10-19: *"the first step is not even study area - it's create a project."* An "Unfiled"
 *  project would have been a way to avoid asking. */
export const BUILT_IN_PROJECTS:readonly Project[]=[
  {schema:'fieldwork/project/1',id:'heat-outreach',name:'Heat outreach screening',subject:'Connecting geography to evidence, as the first worked example',workflows:['heat']},
  {schema:'fieldwork/project/1',id:'old-naledi',name:'Old Naledi, Gaborone',subject:'One informal settlement. Diagnostic access, and the population raster under it',workflows:['old-naledi','raster']},
  {schema:'fieldwork/project/1',id:'spatial-coverage',name:'Spatial coverage exercise',subject:'What a coverage claim needs before it means anything',workflows:['coverage']},
  {schema:'fieldwork/project/1',id:'cholera-london-1854',name:'1854 Cholera Outbreak in London',subject:'One cholera outbreak. Catchments, network reach, extent, and what the source coordinates disclose',workflows:['snow-voronoi','snow-isochrone','snow-geoprivacy','snow-extent']},
  {schema:'fieldwork/project/1',id:'manila-coastal',name:'Manila coastal exposure',subject:'AR6 sea-level projections against facility elevations',workflows:['sea-level']},
  {schema:'fieldwork/project/1',id:'rulesets',name:'Rulesets',subject:'How a rule is put together, and what happens to one run on damaged data',workflows:['rulesets']},
  {schema:'fieldwork/project/1',id:'hagelloch-1861',name:'Measles in Hagelloch, 1861',subject:'A closed outbreak with a complete line list',workflows:['hagelloch']},
];
/** Labels for the picker, kept beside the grouping so a workflow is named in one place. */
export const WORKFLOW_LABELS:Readonly<Record<string,string>>={
  blank:'Blank · study area experiment',heat:'01 · Heat outreach','old-naledi':'02 · Old Naledi diagnostic access',
  coverage:'03 · Spatial coverage exercise',raster:'04 · Old Naledi raster clipping','snow-voronoi':'05 · John Snow Voronoi catchments',
  'snow-isochrone':'06 · John Snow network isochrones','snow-geoprivacy':'07 · John Snow geoprivacy','sea-level':'08 · Manila coastal exposure',
  'snow-extent':'09 · John Snow outbreak extent',rulesets:'10 · Rulesets · how a rule is put together',hagelloch:'11 · Measles in Hagelloch, 1861',
};
/** Which investigation a workflow belongs to, or `undefined` for one that belongs to none. */
export const projectOfWorkflow=(key:string,projects:readonly Project[]=BUILT_IN_PROJECTS):Project|undefined=>projects.find(p=>p.workflows.includes(key));
export const projectById=(id:string,projects:readonly Project[]=BUILT_IN_PROJECTS):Project|undefined=>projects.find(p=>p.id===id);
/** Projects holding more than one workflow -- the cases the single-workflow model got wrong. */
export const multiWorkflowProjects=(projects:readonly Project[]=BUILT_IN_PROJECTS):readonly Project[]=>projects.filter(p=>p.workflows.length>1);
/** A practitioner-created project. The id is derived from the name so it reads in a URL, and
 *  suffixed rather than rejected on collision: refusing a name because another project took it is
 *  a worse answer than numbering it. */
export function newProject(name:string,subject:string,existing:readonly Project[]=BUILT_IN_PROJECTS):Project{
  const base=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'project';
  let id=base;for(let n=2;existing.some(p=>p.id===id);n++)id=`${base}-${n}`;
  return {schema:'fieldwork/project/1',id,name:name.trim()||'Untitled project',subject:subject.trim(),workflows:[]};
}
const MAX_WORKFLOWS=50;
/** Checked at the storage boundary, like `validateWorkflow`: a stored project is practitioner
 *  data that a previous version of this application wrote, so it is read defensively. */
export function validateProject(raw:unknown):Project{
  if(!isRecord(raw)||raw.schema!=='fieldwork/project/1'||typeof raw.id!=='string'||!raw.id
    ||typeof raw.name!=='string'||typeof raw.subject!=='string'||!Array.isArray(raw.workflows)
    ||raw.workflows.length>MAX_WORKFLOWS||raw.workflows.some(w=>typeof w!=='string'||!w))
    throw new Error('Project could not be read. It names an investigation and the workflows in it.');
  return {schema:'fieldwork/project/1',id:raw.id,name:raw.name,subject:raw.subject,workflows:[...new Set(raw.workflows as string[])]};
}

/** The input widgets whose payload two workflows can genuinely share.
 *
 *  Not every member of the palette's `INPUT_STAGE`. The measurement that produced this set, across
 *  the four John Snow workflows on 2026-10-19:
 *
 *  | copies | bytes each | widget | |
 *  |---|---|---|---|
 *  | 4x | 41,408 | `point_input` | the 250 death locations, identical in all four |
 *  | 4x | 1,218 | `point_input` | the eight pumps, identical in all four |
 *  | 3x | 1,837 | `table_input` | Snow 1855 Table 1 |
 *  | 1x | 225,022 | `network_input` | the Soho street network |
 *  | 1x | 116 | `study_area` | "Soho reporting rectangle" |
 *  | 1x | 116 | `study_area` | "Soho isochrone reporting extent" |
 *  | 1x | 116 | `study_area` | "Soho display extent" |
 *
 *  131,552 bytes of that are redundant copies, 263,104 against the double write. And the three
 *  study areas are three DIFFERENT geometries with three different labels, while `snow-extent` has
 *  none at all -- so `study_area` is in the input stage and is deliberately not here. The
 *  distinction is acquired against authored: a `point_input` records where it came from, and two
 *  workflows holding one are holding one thing twice; a drawn boundary is a decision made per
 *  question, which is why `study_area` alone carries `AreaRevision` and a node-scoped IRI. */
export const SHAREABLE_INPUT_TYPES:readonly string[]=['point_input','table_input','network_input'];

export interface SiblingInput {workflowKey:string; workflowName:string; nodeId:string; type:string; label:string; records:number|null; dataRef?:string}

/** The input widgets a workflow can reuse: the ones in OTHER workflows of the SAME project.
 *
 *  The practitioner, 2026-10-19, stating the sequence and then sharpening the qualifier:
 *
 *  > *"I create an empty project. Then I create my first workflow, it has input widgets. I create
 *  > a second workflow and I should then be able to see input widget from other workflows IN the
 *  > same project."*
 *
 *  > *"there is qualifier -- other workflows FROM THE SAME PROJECT. So if there are no other
 *  > workflows there will be nothing on that list of input widgets."*
 *
 *  So this returns nothing in three states, and all three are ordinary rather than edge cases:
 *  a workflow in no project, which membership being optional makes reachable; the first workflow
 *  of a new project, which is every project's first step; and a project whose other workflows
 *  hold no shareable input. The caller shows no section at all rather than an empty one, because a
 *  control that is empty until a second workflow exists advertises sharing before there is
 *  anything to share. */
export function siblingInputs(currentKey:string,projects:readonly Project[],saved:Record<string,unknown>):SiblingInput[] {
  const project=projectOfWorkflow(currentKey,projects);
  if(!project)return [];
  const found:SiblingInput[]=[];
  for(const key of project.workflows){
    if(key===currentKey)continue;
    const workflow=saved[key];
    if(!isRecord(workflow)||!Array.isArray(workflow.nodes))continue;
    const workflowName=typeof workflow.name==='string'&&workflow.name?workflow.name:key;
    for(const node of workflow.nodes){
      if(!isRecord(node)||typeof node.type!=='string'||!SHAREABLE_INPUT_TYPES.includes(node.type))continue;
      const params=isRecord(node.params)?node.params:{};
      const data=params.data;
      const records=isRecord(data)&&Array.isArray(data.features)?data.features.length
        :isRecord(data)&&Array.isArray(data.rows)?data.rows.length
        :isRecord(data)&&Array.isArray(data.nodes)?data.nodes.length:null;
      found.push({workflowKey:key,workflowName,nodeId:String(node.id??''),type:node.type,
        label:typeof params.label==='string'&&params.label?params.label:node.type,
        records,...(typeof params.dataRef==='string'?{dataRef:params.dataRef}:{})});
    }
  }
  return found;
}

/** The digest a shared payload is stored under.
 *
 *  SHA-256 over the payload as JSON. Not a security boundary and not a canonical serialisation:
 *  key order comes from whatever produced the object, so two payloads that are equal as values but
 *  were built differently would get different digests. That costs a missed deduplication, which is
 *  the harmless direction. The case this has to get right is the common one -- several workflows
 *  holding `structuredClone`s of one imported file, which preserve key order exactly -- and there
 *  the digests agree. */
export async function payloadDigest(payload:unknown):Promise<string>{
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

/** Replace each referenced payload with its digest, for writing to storage.
 *
 *  The inverse of `hydrateWorkflow`. A node keeps `dataRef` and loses `data`, so one payload is
 *  written once to the dataset store instead of once per workflow that uses it. Returns a shallow
 *  rebuild rather than mutating: the workflow in memory must keep its payload, because everything
 *  except the storage layer expects it to be there. */
export function dehydrateWorkflow<T extends {nodes:unknown[]}>(workflow:T):T{
  return {...workflow,nodes:workflow.nodes.map(node=>{
    if(!isRecord(node)||!isRecord(node.params))return node;
    const params=node.params;
    if(typeof params.dataRef!=='string'||params.data===undefined)return node;
    const {data:_omitted,...rest}=params;
    return {...node,params:rest};
  })};
}

/** Put each referenced payload back, before anything else reads the workflow.
 *
 *  `validateWorkflow` runs `validateGeoJSON(node.params.data)` on every point input, so a node
 *  holding a reference and no payload is REFUSED. That is why hydration happens here, between
 *  parsing storage and validating it, rather than inside the widgets: the reference exists on disk
 *  and nowhere else.
 *
 *  A reference whose payload is missing is a refusal, not an empty collection. An input that
 *  silently became zero records would run and produce a clean, wrong answer, which is the one
 *  outcome worse than failing to open. */
export function hydrateWorkflow(raw:unknown,datasets:Record<string,unknown>,clone=false):unknown{
  if(!isRecord(raw)||!Array.isArray(raw.nodes))return raw;
  const missing:string[]=[];
  const nodes=raw.nodes.map(node=>{
    if(!isRecord(node)||!isRecord(node.params))return node;
    const params=node.params;
    if(typeof params.dataRef!=='string'||params.data!==undefined)return node;
    const payload=datasets[params.dataRef];
    if(payload===undefined){missing.push(`${String(node.id??node.type??'a node')} (${params.dataRef.slice(0,12)})`);return node;}
    return {...node,params:{...params,data:clone?structuredClone(payload):payload}};
  });
  if(missing.length)throw new Error(`Shared input data is missing for ${missing.join(', ')}. `
    +'The project holds a reference to data this device no longer has. Import the project again, or the workflow it came from.');
  return {...raw,nodes};
}
