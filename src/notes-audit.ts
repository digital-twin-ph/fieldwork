/** THE NOTES AUDIT: where a target's write-up has gaps, before it is rendered (experiment 202; the practitioner,
 *  2026-11-18: *"We can have a notes audit step before render. It should give visual and stats cues about gaps"*; and,
 *  asked when and how, *"on request"* and *"per target for now"*).
 *
 *  It reports and never refuses: a gap is said, with a word and a mark, and the render is never held back by it. It
 *  scores no sentence and drafts none (the notes are the person's own). Per target, because each target's slots and
 *  lengths are its own. */
import {projectOutline,TARGETS,type OutlineRecord} from './outline.js';
import {UNWRITTEN,noteKey,type Note} from './notes.js';
import type {Plan} from './plan.js';

/** A declared length, as far as it can be counted: a range of words or of sentences. Others are shown, not counted. */
export interface Length {unit:'words'|'sentences'; min:number; max:number}
export function readLength(text:string):Length|null{
  const words=/^(?:up to )?(\d+)(?: to (\d+))? words/.exec(text);
  if(words)return text.startsWith('up to')?{unit:'words',min:0,max:+words[1]!}
    :words[2]?{unit:'words',min:+words[1]!,max:+words[2]!}:{unit:'words',min:0,max:+words[1]!};
  const n:Record<string,number>={one:1,two:2,three:3,four:4};
  const sentences=/(\d+|one|two) (?:or|to) (\d+|two|three|four) sentences/.exec(text);
  if(sentences)return {unit:'sentences',min:n[sentences[1]!]??+sentences[1]!,max:n[sentences[2]!]??+sentences[2]!};
  return null;
}
const wordCount=(t:string)=>t.trim()?t.trim().split(/\s+/).length:0;
const sentenceCount=(t:string)=>t.split(/[.!?]+(?:\s|$)/).filter(s=>s.trim()).length;
const bodyOf=(n:Note)=>n.kind==='quoted'?n.quote:n.text;
const written=(n:Note)=>{const b=bodyOf(n)?.trim();return !!b&&b!==UNWRITTEN;};

export interface AuditSlot {
  role:string; heading:string; length:string;
  /** empty: nothing fills it; planned: a plan part says what it will hold, nothing fills it yet; filled. */
  state:'empty'|'planned'|'filled';
  filledBy:number; planned:boolean;
  /** Measured against the declared length, where it can be counted. */
  measure?:{count:number;unit:Length['unit'];fits:'short'|'within'|'long'};
}
export interface Audit {
  target:string; label:string;
  slots:AuditSlot[]; filled:number; of:number;
  /** Slots with notes and no plan part: written, not planned. */
  unplanned:string[];
  /** Planned, nothing written yet. */
  plannedEmpty:string[];
  /** Authored or quoted notes that fill no slot of this target. */
  unplaced:{id:string;section:string;words:number}[];
  objectives:{text:string;answered:boolean;components:number}[];
  /** Tables, charts and maps, and how many a note rests on (lists among its components). */
  figures:{total:number;restedOn:number};
  references:{works:number;uncited:number};
}

export function auditTarget(target:string,notes:readonly Note[],written_:Readonly<Record<string,string>>,
  plan:Plan|undefined,references:{works:number;uncited:number},record:OutlineRecord={}):Audit{
  const outline=projectOutline([target],notes,written_,references.works,record);
  const planned=new Set((plan?.parts??[]).map(p=>p.role));
  const slots:AuditSlot[]=outline.slots.map(slot=>{
    const want=slot.byTarget[target]!;
    const isObjectives=!!slot.fns?.includes('objective');
    const plannedHere=isObjectives?slot.filled>0:planned.has(slot.role);
    const state:AuditSlot['state']=slot.filled>0?'filled':plannedHere?'planned':'empty';
    const length=readLength(want.length);
    let measure:AuditSlot['measure'];
    if(length&&slot.filled>0){
      const text=slot.source==='written'
        ?Object.entries(written_).filter(([k])=>k===slot.role||k===`role:${slot.role}`).map(([,v])=>v).join(' ')
        :notes.filter(n=>(n.kind==='authored'||n.kind==='quoted')&&written(n)&&slotHolds(slot,n)).map(n=>bodyOf(n)).join(' ');
      const count=length.unit==='words'?wordCount(text):sentenceCount(text);
      measure={count,unit:length.unit,fits:count<length.min?'short':count>length.max?'long':'within'};
    }
    return {role:slot.role,heading:want.heading,length:want.length,state,filledBy:slot.filled,planned:plannedHere,...(measure?{measure}:{})};
  });
  const placed=(n:Note)=>outline.slots.some(slot=>slotHolds(slot,n));
  const unplaced=notes.filter(n=>(n.kind==='authored'||n.kind==='quoted')&&written(n)&&!placed(n)&&!(n.kind==='authored'&&n.image))
    .map(n=>({id:n.id??'',section:n.section,words:wordCount(bodyOf(n)??'')}));
  const objectives=(outline.slots.find(s=>s.objectives)?.objectives??[]).map(o=>({text:o.text,answered:o.answered,components:o.components}));
  const components=notes.filter(n=>record.isComponent?.(n));
  const restingKeys=new Set(notes.flatMap(n=>n.kind==='authored'?n.components??[]:[]));
  const restedOn=components.filter(c=>restingKeys.has(noteKey(c))).length;
  return {target,label:TARGETS.find(t=>t.id===target)?.label??target,slots,
    filled:slots.filter(s=>s.state==='filled').length,of:slots.length,
    unplanned:slots.filter(s=>s.state==='filled'&&!s.planned&&!slotIsWritten(outline,s.role)&&s.role!=='references').map(s=>s.heading),
    plannedEmpty:slots.filter(s=>s.state==='planned').map(s=>s.heading),
    unplaced,objectives,figures:{total:components.length,restedOn},references};
}
/** Whether a note fills a slot of the outline: the outline's own rule, by section and function. */
function slotHolds(slot:ReturnType<typeof projectOutline>['slots'][number],n:Note):boolean{
  if(!written(n))return false;
  const fn=('fn' in n&&n.fn)||'';
  if(slot.source==='limitations')return fn==='limitation';
  if(slot.source!=='notes'||fn==='limitation')return false;
  if(slot.part&&n.section!==slot.part)return false;
  return !slot.fns||slot.fns.includes(fn);
}
const slotIsWritten=(outline:ReturnType<typeof projectOutline>,role:string)=>outline.slots.find(s=>s.role===role)?.source==='written';

/** THE AUDIT, DRAWN: a bar for the target's slots filled, then each slot with a word and a mark (never colour alone),
 *  then the lists. Words, not grades. */
export function auditMarkup(audit:Audit,esc:(v:unknown)=>string):string{
  const pct=audit.of?Math.round(100*audit.filled/audit.of):0;
  const mark={empty:'○',planned:'◐',filled:'●'} as const;
  const word={empty:'empty',planned:'planned, not written',filled:'written'} as const;
  const fits={short:'shorter than asked',within:'within the length',long:'longer than asked'} as const;
  const rows=audit.slots.map(s=>`<li class="audit-slot is-${s.state}" data-audit-role="${esc(s.role)}">`
    +`<span class="audit-mark" aria-hidden="true">${mark[s.state]}</span> <strong>${esc(s.heading)}</strong>: ${word[s.state]}`
    +(s.state==='filled'&&s.filledBy>1?` (${s.filledBy})`:'')
    +` <span class="muted">· asks for ${esc(s.length)}</span>`
    +(s.measure?` <span class="audit-fit is-${s.measure.fits}">· ${s.measure.count} ${s.measure.unit}, ${fits[s.measure.fits]}</span>`:'')
    +`</li>`).join('');
  const list=(title:string,items:string[],none:string)=>`<h4>${esc(title)}</h4>`+(items.length?`<ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`:`<p class="muted">${esc(none)}</p>`);
  return `<section class="notes-audit" data-audit-target="${esc(audit.target)}" aria-label="Notes audit: ${esc(audit.label)}">`
    +`<p class="audit-summary"><strong>${audit.filled} of ${audit.of} parts written</strong> for ${esc(audit.label)}</p>`
    +`<div class="audit-bar" role="img" aria-label="${audit.filled} of ${audit.of} parts written"><span style="width:${pct}%"></span></div>`
    +`<p class="muted">● written · ◐ planned, not written · ○ empty. Lengths are counted where they are given in words or sentences.</p>`
    +`<ol class="audit-slots">${rows}</ol>`
    +list('Planned, not yet written',audit.plannedEmpty.map(esc),'Every planned part has notes.')
    +list('Written, not planned',audit.unplanned.map(esc),'Every written part was planned.')
    +list('Notes this target does not use',audit.unplaced.map(u=>`${esc(u.section)}: a note of ${u.words} words`),'Every note has a place in this target.')
    +list('Objectives',audit.objectives.map(o=>`${esc(o.text)}: ${o.answered?'answered':'no answer yet'}, ${o.components} ${o.components===1?'table, chart or map':'tables, charts or maps'}`),'No objectives stated.')
    +`<h4>Tables, charts and maps</h4><p>${audit.figures.total} in all; ${audit.figures.restedOn} named by a note that rests on ${audit.figures.restedOn===1?'it':'them'}.</p>`
    +`<h4>References</h4><p>${audit.references.works} ${audit.references.works===1?'work':'works'} cited`
      +(audit.references.uncited?`; ${audit.references.uncited} named but not read`:'')+`.</p>`
    +`</section>`;
}

/** THE AUDIT, ON REQUEST: one target at a time, the targets as tabs. Closing it changes nothing. */
export function openAuditDialog(targets:readonly {id:string;label:string}[],first:string,audit:(target:string)=>Audit,
  esc:(v:unknown)=>string):void{
  document.querySelector('#notes-audit-dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='notes-audit-dialog';dialog.className='audit-dialog';dialog.setAttribute('aria-labelledby','notes-audit-title');
  let current=targets.some(t=>t.id===first)?first:targets[0]?.id??first;
  const draw=()=>{
    dialog.innerHTML=`<div class="manual-head"><h2 id="notes-audit-title">Notes audit</h2>`
      +`<button type="button" class="button" id="notes-audit-close">Close</button></div>`
      +(targets.length>1?`<div class="audit-tabs" role="tablist">${targets.map(t=>`<button type="button" role="tab" class="button small"`
        +` aria-selected="${t.id===current}" data-audit-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('')}</div>`:'')
      +`<p class="muted">Where this write-up has gaps. It reports; it never stops a draft.</p>`
      +auditMarkup(audit(current),esc);
    dialog.querySelector<HTMLButtonElement>('#notes-audit-close')!.onclick=close;
    dialog.querySelectorAll<HTMLButtonElement>('[data-audit-tab]').forEach(b=>b.onclick=()=>{current=b.dataset.auditTab!;draw();
      dialog.querySelector<HTMLElement>(`[data-audit-tab="${current}"]`)?.focus();});
  };
  const close=()=>{dialog.close();dialog.remove();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  document.body.append(dialog);draw();dialog.showModal();
  dialog.querySelector<HTMLElement>('#notes-audit-title')?.setAttribute('tabindex','-1');
}
