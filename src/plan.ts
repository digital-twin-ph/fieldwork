/** THE PLAN: what each part of each target will hold, written before the analysis and never rendered (experiment 202,
 *  the planning note, 2026-11-16; its four questions settled by the practitioner, 2026-11-18).
 *
 *  - **One part per slot of the outline, shared by the targets that use it** (question 1). A part is a template until
 *    somebody writes in it: the slot's heading and length per target, and no words. Fieldwork drafts none of it.
 *  - **Targets may be added or dropped once planning has begun** (question 2). A target added brings its slots as empty
 *    parts; a target dropped takes its empty parts with it and leaves every written one, said to belong to no target
 *    now chosen.
 *  - **The objectives note is the plan's objectives part** (question 3), the one part that is rendered, as the paper's
 *    numbered list. So the objectives slot has no part here: it is filled where it always was.
 *  - **Marked complete by the person, and that can be undone** (question 4). Marking takes a dated version of every
 *    written part; undoing keeps the versions.
 *
 *  Kept on the project beside the notes, not among them, so that no product can render a plan by drawing on the notes:
 *  the distinction "a plan is the author's working, not the product" is a hard stop by construction. */
import {projectOutline,type Outline,type OutlineRecord} from './outline.js';
import {noteKey,type Note} from './notes.js';
import {readNoteVersions,type NoteVersion} from './identity-file.js';

/** A SHELL: a table, chart or map the part will show, planned before it exists (the planning note, 2026-11-16). */
export interface Shell {kind:'table'|'chart'|'map'; text:string}
export const SHELL_KINDS:readonly Shell['kind'][]=['table','chart','map'];
export interface PlanPart {role:string; text:string; shells?:Shell[]; versions?:NoteVersion[]}
export interface Plan {parts:PlanPart[]; complete?:{at:string}}
export const MAX_PLAN_PART=4_000;

const isRecord=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);

/** Read tolerantly: a part with no role or no words is dropped, never coerced; a role named twice keeps the first. */
export function readPlan(raw:unknown):Plan|undefined{
  if(!isRecord(raw)||!Array.isArray(raw.parts))return undefined;
  const seen=new Set<string>();const parts:PlanPart[]=[];
  for(const p of raw.parts){
    if(!isRecord(p))continue;
    const role=typeof p.role==='string'?p.role.trim():'',text=typeof p.text==='string'?p.text.trim().slice(0,MAX_PLAN_PART):'';
    if(!role||!text||seen.has(role))continue;seen.add(role);
    const versions=readNoteVersions(p.versions);
    const shells=readShells(p.shells);
    parts.push({role,text,...(shells.length?{shells}:{}),...(versions.length?{versions}:{})});
  }
  const at=isRecord(raw.complete)&&typeof raw.complete.at==='string'&&!Number.isNaN(Date.parse(raw.complete.at))?raw.complete.at:'';
  if(!parts.length&&!at)return undefined;
  return {parts,...(at?{complete:{at}}:{})};
}

/** Shells read back: each a known kind with words; anything else dropped. */
export function readShells(raw:unknown):Shell[]{
  if(!Array.isArray(raw))return [];
  return raw.flatMap(x=>isRecord(x)&&SHELL_KINDS.includes(x.kind as Shell['kind'])&&typeof x.text==='string'&&x.text.trim()
    ?[{kind:x.kind as Shell['kind'],text:x.text.trim().slice(0,300)}]:[]);
}
/** Shells as typed, one a line: "map: cases by village". A line naming no kind is kept as written, as a table. */
export function shellsFromLines(text:string):Shell[]{
  return text.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
    const m=/^(table|chart|map)\s*:\s*(.+)$/i.exec(line);
    return m?{kind:m[1]!.toLowerCase() as Shell['kind'],text:m[2]!.trim()}:{kind:'table' as const,text:line};
  }).slice(0,12);
}
export const shellsToLines=(shells:readonly Shell[]=[])=>shells.map(s=>`${s.kind}: ${s.text}`).join('\n');

/** The objectives slot: filled by the objectives note, so it has no plan part of its own. */
const isObjectives=(slot:Outline['slots'][number])=>!!slot.fns?.includes('objective');
/** A slot that can be planned: every one but the references, which the record lists by itself. */
const plannable=(slot:Outline['slots'][number])=>slot.source!=='references';

export interface PlanView {
  /** In outline order: each plannable slot, its part's words where written, and how many notes fill it now. */
  parts:{role:string;label:string;byTarget:Outline['slots'][number]['byTarget'];text:string;objectives:boolean;filledBy:number;
    source:Outline['slots'][number]['source'];
    /** Each shell, and whether a table, chart or map of its kind is named by a note that fills the part. */
    shells:{kind:Shell['kind'];text:string;made:boolean}[];
    /** Where a note written to this part goes: its section and function. */
    part?:import('./notes.js').WriteUpPart; fn?:string}[];
  /** Parts that notes fill and no plan part names: written, not planned. */
  unplanned:number;
  /** Written parts whose slot no chosen target uses any more: kept, never lost. */
  unplaced:PlanPart[];
  written:number; of:number;
  complete?:{at:string};
  /** Parts whose words differ from the version taken when the plan was marked complete, or written since. */
  changedSince:string[];
}

export function planView(targets:readonly string[],plan:Plan|undefined,notes:readonly Note[],
  written:Readonly<Record<string,string>>,references:number,record:OutlineRecord&{componentKind?:(note:Note)=>Shell['kind']|undefined}={}):PlanView{
  const outline=projectOutline(targets,notes,written,references,record);
  const byRole=new Map((plan?.parts??[]).map(p=>[p.role,p]));
  const parts=outline.slots.filter(plannable).map(slot=>{
    const objectives=isObjectives(slot);
    const text=objectives?(slot.objectives??[]).map(o=>o.text).join('\n'):byRole.get(slot.role)?.text??'';
    // A SHELL IS MADE when a note that fills the part names a table, chart or map of its kind; each component counts once.
    const named=new Set(notes.filter(n=>slot.part&&n.section===slot.part&&(!slot.fns||slot.fns.includes(('fn' in n&&n.fn)||'')))
      .flatMap(n=>n.kind==='authored'?n.components??[]:[]));
    const kinds=notes.filter(n=>named.has(noteKey(n))).map(n=>record.componentKind?.(n)).filter(Boolean) as Shell['kind'][];
    const shells=(byRole.get(slot.role)?.shells??[]).map(s=>{const at=kinds.indexOf(s.kind);if(at>=0)kinds.splice(at,1);return {...s,made:at>=0};});
    return {role:slot.role,label:slot.label,byTarget:slot.byTarget,text,objectives,filledBy:slot.filled,source:slot.source,shells,
      ...(slot.part?{part:slot.part}:{}),...(slot.fns?.[0]?{fn:slot.fns[0]}:{})};
  });
  const placed=new Set(parts.map(p=>p.role));
  const unplaced=(plan?.parts??[]).filter(p=>!placed.has(p.role));
  const complete=plan?.complete;
  const changedSince=complete?(plan?.parts??[]).filter(p=>{
    const marked=[...(p.versions??[])].reverse().find(v=>v.at===complete.at);
    return !marked||(marked.content as {text?:string}).text!==p.text;
  }).map(p=>p.role):[];
  const unplanned=parts.filter(p=>p.source==='notes'&&!p.objectives&&p.filledBy>0&&!p.text.trim()).length;
  return {parts,unplaced,unplanned,written:parts.filter(p=>p.text.trim()).length,of:parts.length,
    ...(complete?{complete}:{}),changedSince};
}

/** A part written, rewritten or cleared. Clearing removes it, which is what a template with no words is. */
export function withPart(plan:Plan|undefined,role:string,text:string,shells?:Shell[]):Plan{
  const words=text.trim().slice(0,MAX_PLAN_PART);
  const parts=(plan?.parts??[]).filter(p=>p.role!==role||words);
  const at=parts.findIndex(p=>p.role===role);
  const kept=shells===undefined?parts[at]?.shells:shells;
  if(words){const {shells:_s,...was}=parts[at]??{role,text:words};void _s;
    const next={...was,role,text:words,...(kept?.length?{shells:kept}:{})};
    if(at<0)parts.push(next);else parts[at]=next;}
  return {parts,...(plan?.complete?{complete:plan.complete}:{})};
}

/** Marked complete at `at`, with `version` taking each written part's dated version; or the mark undone, versions kept. */
export async function markedComplete(plan:Plan,at:string,version:(part:PlanPart,at:string)=>Promise<NoteVersion>):Promise<Plan>{
  const parts=await Promise.all(plan.parts.map(async p=>({...p,versions:[...(p.versions??[]),await version(p,at)]})));
  return {parts,complete:{at}};
}
export const unmarked=(plan:Plan):Plan=>({parts:plan.parts});

/** THE PLAN ON THE NOTES BOARD, above the outline: how much is written, each part with its words or an offer to write
 *  it, how many notes fill it now, and the parts no chosen target uses any more. Counts report; none marks anything. */
export function planMarkup(view:PlanView,esc:(v:unknown)=>string,canWrite:boolean,labelOfTarget:(id:string)=>string):string{
  if(!view.of&&!view.unplaced.length)return '';
  const state=view.complete
    ?`Marked complete ${esc(new Date(view.complete.at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))}`
      +(view.changedSince.length?`; ${view.changedSince.length} ${view.changedSince.length===1?'part has':'parts have'} changed since`:'')
    :'Not marked complete';
  const mark=canWrite?(view.complete
    ?`<button type="button" class="button small" data-plan-unmark>Undo complete</button>`
    :`<button type="button" class="button small" data-plan-mark ${view.written?'':'disabled'}>Mark the plan complete</button>`):'';
  // WHAT FILLS IT SO FAR, in the words of what fills it: notes, objectives, or the draft's own part.
  const sofar=(p:PlanView['parts'][number])=>p.source==='written'?(p.filledBy?'written in the draft':'not in the draft yet')
    :p.objectives?`${p.filledBy} ${p.filledBy===1?'objective':'objectives'} so far`:`${p.filledBy} ${p.filledBy===1?'note':'notes'} so far`;
  const row=(p:PlanView['parts'][number])=>{
    const wants=Object.entries(p.byTarget).map(([t,w])=>`${esc(labelOfTarget(t))}: <em>${esc(w.heading)}</em>, ${esc(w.length)}`).join('; ');
    const words=p.text.trim()?`<p class="plan-words">${esc(p.text).replace(/\n/g,'<br>')}</p>`:`<p class="plan-words is-empty">Not planned yet</p>`;
    const edit=canWrite?(p.objectives
      ?`<span class="muted">The objectives note holds this part.</span>`
      :`<button type="button" class="button small" data-plan-role="${esc(p.role)}">${p.text.trim()?'Edit':'Plan it'}</button>`):'';
    return `<li class="plan-part is-${p.text.trim()?'written':'empty'}" data-plan-part="${esc(p.role)}">`
      +`<p><strong>${esc(p.label)}</strong> <span class="outline-state">${esc(sofar(p))}</span> ${edit}</p>`
      +`<p class="muted">${wants}</p>${words}`
      +(p.shells.length?`<ul class="plan-shells">${p.shells.map(s=>`<li><span aria-hidden="true">${s.made?'●':'○'}</span> ${esc(s.kind)}: ${esc(s.text)} · ${s.made?'made':'not made yet'}</li>`).join('')}</ul>`:'')
      +(canWrite&&p.text.trim()&&p.source==='notes'&&!p.objectives?`<button type="button" class="button small" data-plan-note="${esc(p.role)}">Start a note from this</button>`:'')
      +`</li>`;
  };
  const unplaced=view.unplaced.length?`<h4>Planned for a target no longer chosen</h4><ul class="plan-unplaced">`
    +view.unplaced.map(p=>`<li data-plan-part="${esc(p.role)}"><strong>${esc(p.role)}</strong>: ${esc(p.text)}`
      +(canWrite?` <button type="button" class="button small" data-plan-role="${esc(p.role)}">Edit</button>`:'')+`</li>`).join('')+`</ul>`:'';
  return `<section class="notes-plan" aria-label="Plan"><h3>Plan</h3>`
    +`<p>${view.written} of ${view.of} parts written · ${state} ${mark}</p>`
    +(view.unplanned?`<p>${view.unplanned} ${view.unplanned===1?'part has':'parts have'} notes and no plan.</p>`:'')
    +`<p class="muted">Never part of any product. Write what each part will hold before the analysis; the notes are written to it.</p>`
    +`<ol class="plan-parts">${view.parts.map(row).join('')}</ol>${unplaced}</section>`;
}

/** WRITING ONE PART: its heading and length in each target, and a box for the words. Saving empty clears the part back
 *  to its template. */
export function openPlanDialog(part:{role:string;label:string;wants:string;text:string;shells?:Shell[]},esc:(v:unknown)=>string,
  save:(text:string,shells:Shell[])=>boolean):void{
  const dialog=document.createElement('dialog');
  dialog.id='plan-dialog';dialog.className='plan-dialog';dialog.setAttribute('aria-labelledby','plan-dialog-title');
  dialog.innerHTML=`<div class="manual-head"><h2 id="plan-dialog-title">Plan: ${esc(part.label)}</h2></div>`
    +`<p class="muted">${part.wants}</p>`
    +`<label class="field-label" for="plan-text">What this part will hold</label>`
    +`<textarea id="plan-text" rows="6" maxlength="${MAX_PLAN_PART}">${esc(part.text)}</textarea>`
    +`<label class="field-label" for="plan-shells">Tables, charts and maps it will show (optional)</label>`
    +`<p class="muted">One a line, each starting with table:, chart: or map:, such as <em>map: cases by village</em>.</p>`
    +`<textarea id="plan-shells" rows="3">${esc(shellsToLines(part.shells))}</textarea>`
    +`<p id="plan-error" role="alert" hidden>The plan could not be kept on this device.</p>`
    +`<div class="credential-actions"><button type="button" class="button" id="plan-cancel">Cancel</button>`
    +`<button type="button" class="button primary" id="plan-save">Save</button></div>`;
  document.body.append(dialog);
  const close=()=>{dialog.close();dialog.remove();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.querySelector<HTMLButtonElement>('#plan-cancel')!.onclick=close;
  dialog.querySelector<HTMLButtonElement>('#plan-save')!.onclick=()=>{
    if(save(dialog.querySelector<HTMLTextAreaElement>('#plan-text')!.value,shellsFromLines(dialog.querySelector<HTMLTextAreaElement>('#plan-shells')!.value)))close();
    else dialog.querySelector<HTMLElement>('#plan-error')!.hidden=false;};
  dialog.showModal();dialog.querySelector<HTMLTextAreaElement>('#plan-text')!.focus();
}
