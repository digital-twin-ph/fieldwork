/** THE WRITE-UP IS THE PROJECT'S, NOT THE OPEN WORKFLOW'S.
 *
 *  The practitioner, 2026-10-30, on finding the Notes tab holding one workflow's artifacts:
 *  *"This is not the model we are building. It's supposed to hold notes from all workflows in
 *  that project."*
 *
 *  **Which was a defect and not a design question.** Everything about the notes work assumed the
 *  project scope and the implementation had the run scope. `result` in `app.ts` is one variable
 *  holding the open workflow's last run, `result=null` on every workflow switch, and the Notes
 *  tab read `result.machined` -- so a six-workflow investigation could show one workflow's
 *  artifacts at a time, and a freshly opened project showed none at all because nothing had run.
 *  141's amendment of 2026-10-30 had just settled that IMRaD is the publication outline and a
 *  publication is a project; the surface was bound to the wrong object.
 *
 *  WHAT THIS KEEPS, AND WHY IT IS NOT THE RESULTS. Only the notes a run produced -- the machined
 *  prose and the derived citations -- never the tables, the geometry or the rasters. A run's
 *  outputs are large, they are what `WorkflowRun` is for, and keeping six workflows' worth would
 *  put megabytes in `localStorage` to show a paragraph. Notes are text.
 *
 *  AND WHY IT IS KEPT AT ALL, rather than assembled by re-running everything. Re-running six
 *  workflows to read a write-up would make opening a project expensive and would make the
 *  write-up depend on a reasoner being available; a practitioner organising a publication is
 *  reading, not computing. The cost is that a stored note can go stale, which is why every entry
 *  carries `runAt` and the panel says when a note's run happened. A sentence describing a
 *  computation is only as current as the run that wrote it, and saying so is cheaper than
 *  pretending otherwise -- the same call `forkHasDrifted` already makes for an edited note.
 *
 *  THE NODE LABELS TRAVEL WITH THE NOTES. `notesPanel` resolves a note's node through the OPEN
 *  workflow, so a note from another workflow would have shown a raw node id where a practitioner
 *  expects the step's name. The label is resolved when the note is stored, where the workflow
 *  that produced it is still in hand.
 */
import type {DerivedNote,MachinedNote} from './notes.js';

export const WRITE_UP_STORE='fieldwork-write-up-v1';

/** What one workflow's last run contributed to the write-up. */
export interface WriteUpEntry {
  workflowKey:string;
  /** The workflow's own name, so a note can say which part of the investigation it came from
   *  without the workflow being open. */
  workflowName:string;
  runId:string;
  /** When the run happened, as an ISO string. The only thing that makes staleness visible. */
  runAt:string;
  /** THE BUILD THAT MACHINED THESE WORDS.
   *
   *  A machined note is prose this application wrote, so it is only as current as the code that
   *  wrote it. Keeping the notes across reloads -- which a publication needs -- means a store
   *  can outlive the build that filled it, and then a practitioner who updates sees yesterday's
   *  sentences with no sign that the widgets have since changed what they say. Found on
   *  2026-10-30: equations added early in 0.13.0 were in the store, the artifact descriptions
   *  added later the same day were not, and nothing anywhere said why.
   *
   *  Entries from another build are DROPPED on read rather than shown, and the Notes tab then
   *  reports those workflows as not yet run -- which is true of this build, and which tells the
   *  practitioner exactly what to do. Cheaper than a migration and honest about what it knows. */
  build?:string;
  machined:MachinedNote[];
  derived:DerivedNote[];
  /** Node id to the label the practitioner gave it, for the steps these notes name. */
  labels:Record<string,string>;
}

export type WriteUp=Record<string,WriteUpEntry>;

const text=(value:unknown):string=>typeof value==='string'?value.trim():'';

/** Read tolerantly, like every other store here: an entry that cannot be read is dropped rather
 *  than taking the write-up down with it. A write-up is a convenience over runs that can be
 *  repeated, so losing one entry costs a re-run and losing the lot costs the practitioner. */
export function readWriteUp(raw:string|null,build?:string):WriteUp{
  if(!raw)return {};
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{return {};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const out:WriteUp={};
  for(const [key,value] of Object.entries(parsed as Record<string,unknown>)){
    if(!value||typeof value!=='object')continue;
    const entry=value as Partial<WriteUpEntry>;
    const machined=Array.isArray(entry.machined)?entry.machined.filter(
      n=>n&&typeof n==='object'&&(n as MachinedNote).kind==='machined'&&text((n as MachinedNote).text)):[];
    const derived=Array.isArray(entry.derived)?entry.derived.filter(
      n=>n&&typeof n==='object'&&(n as DerivedNote).kind==='derived'&&text((n as DerivedNote).text)):[];
    if(!machined.length&&!derived.length)continue;
    // Written by a different build of this application, so the words may no longer be what the
    // widgets would write. Dropped, and reported as not run. An entry with no build recorded
    // predates this field and is dropped for the same reason.
    if(build&&text(entry.build)!==build)continue;
    out[key]={workflowKey:text(entry.workflowKey)||key,
      workflowName:text(entry.workflowName)||key,
      runId:text(entry.runId),runAt:text(entry.runAt),
      ...(text(entry.build)?{build:text(entry.build)}:{}),
      machined:machined as MachinedNote[],derived:derived as DerivedNote[],
      labels:entry.labels&&typeof entry.labels==='object'&&!Array.isArray(entry.labels)
        ?Object.fromEntries(Object.entries(entry.labels as Record<string,unknown>)
          .filter(([,v])=>text(v)).map(([k,v])=>[k,text(v)]))
        :{}};
  }
  return out;
}

/** The entry one finished run contributes. Returns null where it contributed no prose, so a
 *  workflow of inputs and a map writes nothing rather than an empty row. */
export function entryForRun(workflowKey:string,workflowName:string,
  run:{runId?:string;machined?:Record<string,MachinedNote[]>;derived?:DerivedNote[]},
  labelOf:(nodeId:string)=>string|undefined,at:string,build?:string):WriteUpEntry|null{
  const machined=Object.entries(run.machined||{})
    .flatMap(([nodeId,list])=>(list||[]).map(note=>({...note,nodeId})));
  const derived=[...(run.derived||[])];
  if(!machined.length&&!derived.length)return null;
  const labels:Record<string,string>={};
  for(const note of [...machined,...derived]){
    const id=note.nodeId;
    if(!id)continue;
    const label=labelOf(id);
    if(label)labels[id]=label;
  }
  return {workflowKey,workflowName,runId:text(run.runId),runAt:at,
    ...(text(build)?{build:text(build)}:{}),machined,derived,labels};
}

/** THE WRITE-UP OF ONE PROJECT: every workflow of it that has run, in the project's own workflow
 *  order rather than in the order they happened to be run.
 *
 *  The order matters and is not arbitrary. A project lists its workflows in the sequence the
 *  practitioner arranged them, which is the closest thing to an intended reading order that
 *  exists before anything is placed in the IMRaD outline. Ordering by `runAt` instead would make
 *  the write-up re-sort itself every time somebody re-ran a step. */
export function writeUpOf(store:WriteUp,workflowKeys:readonly string[]):WriteUpEntry[]{
  return workflowKeys.map(key=>store[key]).filter((e):e is WriteUpEntry=>!!e);
}

/** Replace one workflow's contribution, and drop the entries of workflows the project no longer
 *  lists. A workflow deleted from a project must not go on contributing to its write-up, and
 *  nothing else would ever remove it. */
export function recordEntry(store:WriteUp,entry:WriteUpEntry,
  keep?:readonly string[]):WriteUp{
  const next:WriteUp={...store,[entry.workflowKey]:entry};
  if(!keep)return next;
  const allowed=new Set(keep);
  return Object.fromEntries(Object.entries(next).filter(([key])=>allowed.has(key)));
}

/** Forget one workflow's contribution: for a workflow deleted, or a run that failed in a way
 *  that makes its prose untrue. */
export const forgetEntry=(store:WriteUp,workflowKey:string):WriteUp=>
  Object.fromEntries(Object.entries(store).filter(([key])=>key!==workflowKey));

/** How a note from another workflow is attributed, in one place so the panel and any report word
 *  it the same way. Returns undefined for the workflow that is open, where the chip already
 *  links to the step and saying the workflow name again is noise. */
export function sourceOfNote(entry:WriteUpEntry,openWorkflowKey:string|undefined):string|undefined{
  if(entry.workflowKey===openWorkflowKey)return undefined;
  const when=entry.runAt?.slice(0,10);
  return when?`${entry.workflowName} · ran ${when}`:entry.workflowName;
}
