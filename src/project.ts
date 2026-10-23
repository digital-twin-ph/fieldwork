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
/** WHAT A PROJECT KNOWS ABOUT ITSELF, which until 2026-10-23 was nothing about time.
 *
 *  The practitioner went looking for the backup of a project with Chrome refusing to open the
 *  application, and the glossary's answer -- backed up, unbacked, never exported -- could not be
 *  computed, because a project recorded no moment of any kind. `exportedAt` existed only inside
 *  the document that leaves with the download.
 *
 *  Both are optional, and their absence is not a gap to be filled with a guess: a project carried
 *  over from before this knows neither when it changed nor whether it was ever exported, and the
 *  honest reading of that is NEVER EXPORTED. Saying "backed up" of a project whose export nobody
 *  recorded would be the interface making a promise the data cannot keep. */
export interface Project {
  schema:'fieldwork/project/2'; id:string; name:string; subject:string; workflows:string[];
  /** When any workflow in it last changed. Absent on a project carried over. */
  changedAt?:string;
  /** What the project held when that export was performed, so what has been added since can be
   *  said in the units it cost to make: workflows, widgets, and megabytes of data. */
  exportedWork?:{workflows:number;nodes:number;bytes:number};
  /** When an export of it was last PERFORMED here. Absent means none ever was.
   *
   *  Not when a backup was last verified, which a browser cannot do: it hands a file to the
   *  download machinery and loses sight of it, unable to read the filesystem or tell whether the
   *  file was kept, moved or deleted. This ages the process, not the file. */
  exportedAt?:string;
}

/** The workflows a built-in project holds, in reading order, with the label each carries in the
 *  picker. The keys are `exampleKey` values: this registry groups them, it does not rename them.
 *
 *  `blank` is in no project, and that is the point rather than an omission. A new empty canvas
 *  belongs to whatever investigation the practitioner is starting, and the practitioner,
 *  2026-10-19: *"the first step is not even study area - it's create a project."* An "Unfiled"
 *  project would have been a way to avoid asking. */
export const BUILT_IN_PROJECTS:readonly Project[]=[
  {schema:'fieldwork/project/2',id:'heat-outreach',name:'Heat outreach screening',subject:'Connecting geography to evidence, as the first worked example',workflows:['heat']},
  {schema:'fieldwork/project/2',id:'old-naledi',name:'Old Naledi, Gaborone',subject:'One informal settlement. Diagnostic access, and the population raster under it',workflows:['old-naledi','raster']},
  {schema:'fieldwork/project/2',id:'spatial-coverage',name:'Spatial coverage exercise',subject:'What a coverage claim needs before it means anything',workflows:['coverage']},
  {schema:'fieldwork/project/2',id:'cholera-london-1854',name:'1854 Cholera Outbreak in London',subject:'One cholera outbreak. Catchments, network reach, extent, and what the source coordinates disclose',workflows:['snow-voronoi','snow-isochrone','snow-geoprivacy','snow-extent']},
  {schema:'fieldwork/project/2',id:'manila-coastal',name:'Manila coastal exposure',subject:'AR6 sea-level projections against facility elevations',workflows:['sea-level']},
  {schema:'fieldwork/project/2',id:'rulesets',name:'Rulesets',subject:'How a rule is put together, and what happens to one run on damaged data',workflows:['rulesets']},
  {schema:'fieldwork/project/2',id:'hagelloch-1861',name:'Measles in Hagelloch, 1861',subject:'A closed outbreak with a complete line list',workflows:['hagelloch']},
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
  // A project made now knows when it began and that nothing has been exported of it yet.
  return {schema:'fieldwork/project/2',id,name:name.trim()||'Untitled project',
    subject:subject.trim(),workflows:[],changedAt:new Date().toISOString()};
}
/** WHETHER A COPY OF THIS WORK EXISTS ANYWHERE ELSE, in the glossary's three words.
 *
 *  A project that records no export has never been exported, and that is what is said of it --
 *  including every project carried over from before projects recorded anything, because "we do
 *  not know" and "no copy exists" are the same thing to someone about to lose it. */
export type ProjectSafety='backed up'|'not backed up';
/** The practitioner, 2026-10-23: *"projects are either backed up (exported) or not -- the
 *  significance being, if the browser crashes or loses data, a project not backed up is lost."*
 *  Two states, because that is the question being asked. Whether the export predates the last
 *  change is said by showing WHEN it was taken, not by a third word. */
export const projectSafety=(project:Project):ProjectSafety=>
  project.exportedAt?'backed up':'not backed up';
/** HOW MUCH WORK IS AT RISK, measured in what it cost to make.
 *
 *  The practitioner, 2026-10-23: *"I think alert should depend on the amount of work. Like data
 *  added, widgets added, those have cost in terms of time and size, which are in the receipts."*
 *  Elapsed time is the wrong measure: a week away from a laptop risks nothing, and an afternoon
 *  that downloaded a province risks a 200 MB request against a donated service and the hours
 *  around it.
 *
 *  So the amount is reported and no threshold is applied here. What counts as worth interrupting
 *  someone is a question for the interface and the person using it, not for this function, and a
 *  number invented here would be exactly the kind this project spent two days removing.
 *
 *  Compute time is NOT included, though it belongs: a run's duration lives in `lastRunMs` in
 *  memory and is lost on reload, so there is nothing to compare against. Persisting it is its own
 *  change, and claiming it here before then would be a measure nobody took. */
export interface ProjectWork {workflows:number; nodes:number; bytes:number}
export type UnexportedWork=
  {kind:'never'; at:ProjectWork}|{kind:'since'; added:ProjectWork}|null;
export function unexportedWork(project:Project,current:ProjectWork):UnexportedWork{
  if(!project.workflows.length)return null;                    // nothing made, nothing to lose
  if(!project.exportedAt||!project.exportedWork)return {kind:'never',at:current};
  const was=project.exportedWork;
  const added={
    workflows:Math.max(0,current.workflows-was.workflows),
    nodes:Math.max(0,current.nodes-was.nodes),
    bytes:Math.max(0,current.bytes-was.bytes),
  };
  return added.workflows||added.nodes||added.bytes?{kind:'since',added}:null;
}

/** True when a copy exists but was taken before the work it would have to restore. */
export const exportPredatesWork=(project:Project):boolean=>
  !!project.exportedAt&&!!project.changedAt
  &&Date.parse(project.changedAt)>Date.parse(project.exportedAt);

const MAX_WORKFLOWS=50;
/** Checked at the storage boundary, like `validateWorkflow`: a stored project is practitioner
 *  data that a previous version of this application wrote, so it is read defensively. */
export function validateProject(raw:unknown):Project{
  // A project written before 2026-10-23 says schema 1 and carries no timestamps. It is read, not
  // refused: the work is the same work, and what it does not know about itself is stated as not
  // known rather than invented.
  if(!isRecord(raw)||(raw.schema!=='fieldwork/project/2'&&raw.schema!=='fieldwork/project/1')||typeof raw.id!=='string'||!raw.id
    ||typeof raw.name!=='string'||typeof raw.subject!=='string'||!Array.isArray(raw.workflows)
    ||raw.workflows.length>MAX_WORKFLOWS||raw.workflows.some(w=>typeof w!=='string'||!w))
    throw new Error('Project could not be read. It names an investigation and the workflows in it.');
  const moment=(value:unknown):string|undefined=>
    typeof value==='string'&&!Number.isNaN(Date.parse(value))?value:undefined;
  const changedAt=moment(raw.changedAt),exportedAt=moment(raw.exportedAt);
  const count=(value:unknown):number=>Number.isSafeInteger(value)&&(value as number)>=0?value as number:0;
  const work=isRecord(raw.exportedWork)
    ?{workflows:count(raw.exportedWork.workflows),nodes:count(raw.exportedWork.nodes),bytes:count(raw.exportedWork.bytes)}
    :undefined;
  return {schema:'fieldwork/project/2',id:raw.id,name:raw.name,subject:raw.subject,
    workflows:[...new Set(raw.workflows as string[])],
    ...(changedAt?{changedAt}:{}),...(exportedAt?{exportedAt}:{}),...(work?{exportedWork:work}:{})};
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
/** `held` answers whether a digest is actually in the payload store.
 *
 *  Stripping a payload the store does not hold writes a workflow that cannot be read back. That
 *  is not hypothetical: an encrypted project arrives from another device carrying BOTH the data
 *  and the reference, and its payload has never been seen here. Dehydrating it on the first save
 *  left a reference pointing at nothing, and the next reload refused the workflow -- correctly,
 *  since a missing payload is a refusal rather than an empty input, which made an imported
 *  project look like it had vanished. Found 2026-10-20 while testing the round trip the
 *  practitioner asked for. Called without `held`, nothing is stripped, which is the safe default
 *  for every caller that does not know what the store contains. */
export function dehydrateWorkflow<T extends {nodes:unknown[]}>(workflow:T,held:(digest:string)=>boolean=()=>false):T{
  return {...workflow,nodes:workflow.nodes.map(node=>{
    if(!isRecord(node)||!isRecord(node.params))return node;
    const params=node.params;
    if(typeof params.dataRef!=='string'||params.data===undefined||!held(params.dataRef))return node;
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
