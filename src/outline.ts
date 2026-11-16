/** THE OUTLINE OF WHAT A PROJECT IS WRITING TOWARDS (experiment 202, Stage A, 2026-11-15).
 *
 *  The practitioner: *"the role for the notes has to be picked early so the outline for the type of output (and render)
 *  guides what form the notes take, the length of each note, and where they go."* A project names its targets; each
 *  target declares an outline of slots in `widgets/report-formats.json`, each slot a role with the heading and length it
 *  takes there. A note's role is its section and its function, so every note already has one; a written part's role is
 *  the key it is kept under. This module joins the targets' outlines into one, in reading order, and says for each slot
 *  which targets use it, how much fills it, and for each target how many of its slots are filled.
 *
 *  It reads; it drafts nothing. A slot is filled by the person's writing or the record's notes, never by this. */
import reportFormats from '../widgets/report-formats.json';
import {UNWRITTEN,type Note,type WriteUpPart} from './notes.js';

export interface RoleDeclaration {source:'written'|'notes'|'limitations'|'references'; part?:WriteUpPart; fns?:string[];
  keys?:string[]; label:string}
export interface OutlineSlotDeclaration {role:string; heading:string; length:string}
const ROLES=reportFormats.roles as unknown as Record<string,RoleDeclaration>;
const OUTLINES=(reportFormats as unknown as {outlines:Record<string,OutlineSlotDeclaration[]>}).outlines;

/** The targets a project can name: the publication and every declared format, by id, with the name shown. */
export const TARGETS:readonly {id:string;label:string}[]=[{id:'publication',label:'Publication'},
  ...(reportFormats.formats as {id:string;label:string}[]).map(f=>({id:f.id,label:f.label}))];
export const isTarget=(id:unknown):id is string=>TARGETS.some(t=>t.id===id);

export interface OutlineSlot {
  role:string; label:string; source:RoleDeclaration['source'];
  /** For a role filled by notes: the section and functions a note needs to fill it. */
  part?:WriteUpPart; fns?:string[];
  /** Per target that uses this slot: its heading and length there. */
  byTarget:Record<string,{heading:string;length:string}>;
  /** How many notes fill it, or 1 where a written part does. */
  filled:number;
}
export interface Outline {slots:OutlineSlot[]; coverage:{target:string;label:string;filled:number;of:number}[]}

const fnOf=(note:Note)=>('fn' in note&&note.fn)||'';
const bodyOf=(note:Note)=>note.kind==='quoted'?note.quote:note.text;

/** Whether a note fills a role: its section, and its function where the role names functions. A limitation fills the
 *  limitations role wherever it sits, and no other role, as the render gathers it under Discussion. */
export function noteFills(note:Note,role:RoleDeclaration):boolean{
  // Written, not the marker a note holds until it is: an empty slot stays empty until somebody writes into it.
  const body=bodyOf(note)?.trim();if(!body||body===UNWRITTEN)return false;
  if(role.source==='limitations')return fnOf(note)==='limitation';
  if(role.source!=='notes'||fnOf(note)==='limitation')return false;
  if(role.part&&note.section!==role.part)return false;
  return !role.fns||role.fns.includes(fnOf(note));
}

/** ONE OUTLINE FOR EVERY TARGET: the union of their slots, in the order the first target to use each meets it. */
export function projectOutline(targets:readonly string[],notes:readonly Note[],written:Readonly<Record<string,string>>,
  references:number):Outline{
  const chosen=targets.filter(isTarget);
  const order:string[]=[];const byRole=new Map<string,OutlineSlot>();
  for(const target of chosen)for(const decl of OUTLINES[target]??[]){
    const role=ROLES[decl.role];if(!role)continue;
    let slot=byRole.get(decl.role);
    if(!slot){
      const keys=role.keys??[`role:${decl.role}`];
      const filled=role.source==='written'?(keys.some(k=>written[k]?.trim())?1:0)
        :role.source==='references'?(references>0?1:0)
        :notes.filter(n=>noteFills(n,role)).reduce((sum,n)=>sum+(role.fns?.includes('objective')&&'items' in n&&n.items?.length?n.items.length:1),0);
      slot={role:decl.role,label:role.label,source:role.source,...(role.part?{part:role.part}:{}),
        ...(role.fns?{fns:role.fns}:{}),byTarget:{},filled};
      byRole.set(decl.role,slot);order.push(decl.role);
    }
    slot.byTarget[target]={heading:decl.heading,length:decl.length};
  }
  const slots=order.map(r=>byRole.get(r)!);
  const coverage=chosen.map(target=>{const mine=slots.filter(s=>s.byTarget[target]);
    return {target,label:TARGETS.find(t=>t.id===target)!.label,filled:mine.filter(s=>s.filled>0).length,of:mine.length};});
  return {slots,coverage};
}

/** THE OUTLINE ON THE NOTES BOARD: coverage per target, then each slot with its state, the targets that use it and
 *  what it wants in each. An empty slot filled by notes offers a note of its section and function, ready to write. */
export function outlineMarkup(outline:Outline,esc:(v:unknown)=>string,canWrite:boolean):string{
  if(!outline.coverage.length)return '';
  const cover=outline.coverage.map(c=>`<li><strong>${esc(c.label)}</strong>: ${c.filled} of ${c.of} filled</li>`).join('');
  const rows=outline.slots.map(slot=>{
    const unit=slot.fns?.includes('objective')?'objective':'note';
    const state=slot.filled?(slot.source==='written'?'written':slot.source==='references'?'listed'
      :`${slot.filled} ${unit}${slot.filled===1?'':'s'}`):'empty';
    const wants=Object.entries(slot.byTarget).map(([target,w])=>
      `<li>${esc(TARGETS.find(t=>t.id===target)!.label)}: <em>${esc(w.heading)}</em>, ${esc(w.length)}</li>`).join('');
    const add=canWrite&&!slot.filled&&slot.source==='notes'&&slot.part
      ?`<button type="button" class="button small" data-add-note="${esc(slot.part)}" data-add-fn="${esc(slot.fns?.[0]??'')}">Write it</button>`
      :canWrite&&!slot.filled&&slot.source==='written'?`<button type="button" class="button small" data-publication>Write it in the draft</button>`:'';
    return `<li class="outline-slot is-${slot.filled?'filled':'empty'}" data-outline-role="${esc(slot.role)}">`
      +`<p><strong>${esc(slot.label)}</strong> <span class="outline-state">${esc(state)}</span> ${add}</p><ul>${wants}</ul></li>`;
  }).join('');
  return `<section class="notes-outline" aria-label="Outline"><h3>Outline</h3><ul class="outline-coverage">${cover}</ul>`
    +`<ol class="outline-slots">${rows}</ol></section>`;
}

/** WHAT A NOTE OF THIS SECTION AND FUNCTION BECOMES IN EACH TARGET: the heading and length of the slot it fills there,
 *  for the note's own dialog. Empty where no target names a slot for it. */
export function slotsForNote(targets:readonly string[],section:WriteUpPart,fn:string):{target:string;label:string;heading:string;length:string}[]{
  const probe={kind:'authored',id:'probe',section,text:'probe',...(fn?{fn}:{})} as Note;
  const out:{target:string;label:string;heading:string;length:string}[]=[];
  for(const target of targets.filter(isTarget))for(const decl of OUTLINES[target]??[]){
    const role=ROLES[decl.role];
    if(role&&(role.source==='notes'||role.source==='limitations')&&noteFills(probe,role))
      out.push({target,label:TARGETS.find(t=>t.id===target)!.label,heading:decl.heading,length:decl.length});
  }
  return out;
}
