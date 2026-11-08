import type {RelateShape,MeasureShare,RelateRequest,ShiftColumn} from './relate-table.js';
import {rateMultiplier,machinedNotes} from './relate-table.js';
import type {DataTable} from './data-table.js';
import type {ParamsByType} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {dataTableMarkup,wideFrame,type ColumnRoles} from './data-table-ui.js';
import type {Escape} from './types.js';

/** DECIDING A JOIN, with the consequence in front of you.
 *
 *  The practitioner, 2026-10-28: *"I expect the views to show up in a Quick Look dialog modal
 *  where the user can make a decision about the type of join. The modal dialog should also show
 *  the preview of the joined tables depending on the type of join selected and a Finalize button
 *  after the selection. The choice should be reflected in the receipts."*
 *
 *  THE SAME DEVICE THE TABLE IMPORT USES, and for the same reason they gave for that one: *"We
 *  have to have validation that the conversion from long to wide happened correctly so we have to
 *  see the before and after. What if the quick look dialog could do that and if the after preview
 *  looks OK to the user he can commit."* A join is the other place where the application does
 *  something consequential to the practitioner's data and then hands it on.
 *
 *  WHY THERE ARE TWO CONTROLS AND NOT ONE. How keys are compared decides WHICH rows match; the
 *  join decides what happens to the rest. They multiply: tightening the comparison turns matched
 *  rows into unmatched ones, and the join then decides whether those vanish or are kept. Showing
 *  one without the other would let a practitioner fix a symptom and miss its cause -- nine of
 *  Snow's sub-districts differ from the published boundaries by a single comma, and the right
 *  answer there is to fold punctuation, not to decide what to do with nine dropped rows.
 *
 *  AND THE EFFECT REACHES THE NUMBERS. Per variable, the share an inner join retains, because
 *  that is what the practitioner is actually deciding about: for any two variables a rate of one
 *  over the other is multiplied by exactly the ratio of their shares. Where the shares differ,
 *  the dropped rows are not a random sample of the thing being measured, and that is the finding
 *  a complete-case analysis assumes away. */

const pct=(share:number|null)=>share===null?'—':`${(share*100).toFixed(1)}%`;
const count=(n:number)=>n.toLocaleString();

/** The three segments, sized by DISTINCT KEYS rather than rows: a long table holds several rows
 *  per subject, so counting rows would say that nine unmatched sub-districts are eighteen
 *  unmatched things. A segment that exists is never thinner than a sliver, because "a few" and
 *  "none" are the difference the bar is drawn to show. */
function overlapBar(shape:RelateShape,esc:Escape,leftLabel:string,rightLabel:string):string{
  const {leftOnly,matched,rightOnly}=shape.overlap;
  const total=leftOnly+matched+rightOnly||1;
  const seg=(n:number,kind:string,label:string)=>n
    ? `<div class="overlap-seg overlap-${kind}" style="flex:0 0 ${Math.max(n/total*100,7)}%">`
      +`<span>${esc(label)}</span><strong>${count(n)}</strong></div>`
    : '';
  return `<div class="overlap-bar" role="img" aria-label="${esc(`${matched} keys in both, `
      +`${leftOnly} only in ${leftLabel}, ${rightOnly} only in ${rightLabel}`)}">`
    +seg(leftOnly,'left',`only in ${leftLabel}`)
    +seg(matched,'both','in both')
    +seg(rightOnly,'right',`only in ${rightLabel}`)
    +'</div>';
}

/** WHAT THE JOIN DOES TO EACH NUMERIC VARIABLE. The share is the column a practitioner reads;
 *  the totals are there so they can check it against their own file. */
function sharesTable(shares:MeasureShare[],esc:Escape):string{
  return '<table class="relate-shares"><thead><tr><th>Variable</th>'
    +'<th title="Total over every row the first table offered">All</th>'
    +'<th title="Total over the rows that matched">Matched</th>'
    +'<th>Retained</th></tr></thead><tbody>'
    +shares.map(s=>`<tr><th scope="row">${esc(s.measure)}</th>`
      +`<td>${count(s.all)}</td><td>${count(s.related)}</td>`
      +`<td${s.share!==null&&s.share<1?' class="profile-flag"':''}>${pct(s.share)}</td></tr>`).join('')
    +'</tbody></table>';
}

/** THE KEY, COUNTED: "sub_districts" for one key column, "site and date combinations" for several, since a plural
 *  on the last name of "site and date" would count dates (2026-11-05). */
export const keyNoun=(on:string,n:number)=>on.includes(' and ')?`${on} combination${n===1?'':'s'}`:`${on}${n===1?'':'s'}`;


type RelateParams=ParamsByType['relate_table'];

/** WHAT THE DIALOG EDITS: every setting of the step, as the person sees them. A shift is a list here even when it
 *  holds one: the step stores one shift as `shiftDays` and several as `shifts`, and that is the store's business. */
export interface RelateDraft {
  on:string; alsoOn:string[]; bring:string; normalisation:'exact'|'fuzzy';
  within:{date:string;start:string;end:string};
  /** As typed, so a half-written number is not lost on a redraw. */
  shifts:string[];
  /** Empty until the person chooses: a join with unmatched rows does not run on a default nobody picked. */
  decision:'drop'|'keep'|''; label:string; reason:string;
}

export function relateDraftOf(p:RelateParams):RelateDraft{
  const shifts=(p.shifts?.length??0)>1?p.shifts!:p.shiftDays?[p.shiftDays]:[];
  return {on:p.on??'',alsoOn:[...(p.alsoOn??[])],bring:p.bring??'',normalisation:p.normalisation??'fuzzy',
    within:{date:p.within?.date??'',start:p.within?.start??'',end:p.within?.end??''},
    shifts:shifts.map(String),
    decision:p.unmatched?.decision??'',label:p.unmatched?.label??'',reason:p.unmatched?.reason??''};
}

/** The shifts as numbers, or why they are not. Empty boxes are ignored, so "+ Add a shift" never leaves a refusal. */
export function draftShifts(draft:RelateDraft):{shifts:number[];problem?:string}{
  const typed=draft.shifts.map(s=>s.trim()).filter(Boolean);
  const shifts=typed.map(Number);
  const bad=typed.find((t,i)=>!Number.isInteger(shifts[i]));
  if(bad!==undefined)return {shifts:[],problem:`A shift is a whole number of days; "${bad}" is not.`};
  const twice=shifts.find((d,i)=>shifts.indexOf(d)!==i);
  if(twice!==undefined)return {shifts,problem:`The shift ${twice} days is listed twice.`};
  if(shifts.length>1&&!(draft.within.date&&draft.within.start&&draft.within.end))
    return {shifts,problem:'Several shifts need a date matched to a period: choose the date and the period first.'};
  return {shifts};
}

/** The request the planner reads, from a draft. */
export function requestOf(draft:RelateDraft,{measureKey}:{measureKey?:string}={}):RelateRequest{
  const within=draft.within.date&&draft.within.start&&draft.within.end?{within:{...draft.within}}:{};
  const {shifts}=draftShifts(draft);
  return {on:draft.on,...(draft.alsoOn.length?{alsoOn:draft.alsoOn}:{}),...within,
    ...(shifts.length===1&&shifts[0]!==0?{shiftDays:shifts[0]}:{}),bring:draft.bring,normalisation:draft.normalisation,
    ...(measureKey?{measureKey}:{}),
    ...(draft.decision==='keep'?{unmatched:{decision:'keep' as const,label:draft.label,signature:''}}:{})};
}

/** WHAT APPLY WRITES. `signature` is the gap's, where the join could be planned and left rows unmatched; without one
 *  the decision already stored stays, because nothing here could see what it was about. */
export function applyRelateDraft(p:RelateParams,draft:RelateDraft,plan?:{signature:string;gaps:number}):void{
  p.on=draft.on; p.bring=draft.bring; p.normalisation=draft.normalisation;
  if(draft.alsoOn.length)p.alsoOn=[...draft.alsoOn];else delete p.alsoOn;
  if(draft.within.date&&draft.within.start&&draft.within.end)p.within={...draft.within};else delete p.within;
  const {shifts}=draftShifts(draft);
  delete p.shifts; delete p.shiftDays;
  if(shifts.length>1)p.shifts=shifts;
  else if(shifts.length===1&&shifts[0]!==0)p.shiftDays=shifts[0];
  if(shifts.length>1||(plan&&!plan.gaps)){delete p.unmatched;return;}
  if(plan&&!draft.decision){delete p.unmatched;return;}
  if(plan)p.unmatched={decision:draft.decision as 'drop'|'keep',signature:plan.signature,
    ...(draft.decision==='keep'?{label:draft.label.trim()}:{}),...(draft.reason.trim()?{reason:draft.reason.trim()}:{})};
}

const signed=(d:number)=>`${d>0?'+':d<0?'\u2212':''}${Math.abs(d)}`;

/** THE INSPECTOR'S ONE SENTENCE: what the step will do with the settings it holds. */
export function relateSentence(p:RelateParams,right:string):string{
  if(!p.on||!p.bring)return 'Not set up yet: choose what to match on and what to bring across.';
  const keys=[p.on,...(p.alsoOn??[])].join(' and ');
  const shifts=(p.shifts?.length??0)>1?p.shifts!:p.shiftDays?[p.shiftDays]:[];
  return `Brings ${p.bring} from ${right}, matched on ${keys}`
    +(p.within?`, with ${p.within.date} inside ${p.within.start} to ${p.within.end}`:'')
    +(shifts.length>1?`, at ${shifts.length} shifts (${shifts.map(signed).join(', ')} days)`
      :shifts.length?`, shifted ${signed(shifts[0]!)} days`:'')
    +'.';
}

export interface RelateConfigView {
  step:string;
  leftLabel:string; rightLabel:string;
  /** Columns each table declares, known before a run. */
  hereColumns:string[]; thereColumns:string[];
  /** The second table's value column, which can be brought too. */
  relatedValue?:string;
  measureKey?:string;
  /** The two tables, where they can be resolved without a run; absent means the preview waits for one. */
  left?:DataTable; right?:DataTable;
  plan:(request:RelateRequest)=>RelateShape|{refusal:string};
  planShifts:(request:RelateRequest,shifts:number[])=>{table:DataTable;columns:ShiftColumn[]}|{refusal:string};
  initial:RelateDraft;
  apply:(draft:RelateDraft,plan?:{signature:string;gaps:number})=>void;
}

/** RELATE'S SETTINGS, PREVIEW AND DECISIONS, in the standard dialog (experiment 186).
 *
 *  What used to be split between the Inspector (which columns, the period, the shift) and the join dialog (how keys
 *  compare, what happens to unmatched rows) is one dialog, because they multiply: a different key or shift changes
 *  which rows match, and so what there is to decide. The preview is the join this draft would make. */
export function openRelateConfig(view:RelateConfigView,esc:Escape):void{
  // Which pair the multiplier is stated for: a reading aid, not a setting, so it is not in the draft.
  let numerator='',denominator='';
  const select=(id:string,label:string,options:string[],current:string,empty:string,{optional=false}={})=>
    `<div class="field"><label class="field-label" for="${id}">${esc(label)}</label>`
    +`<select id="${id}"${options.length?'':' disabled'}>`
    +(options.length?`<option value="">${optional?'Not used':'Choose a column\u2026'}</option>`:`<option value="">${esc(empty)}</option>`)
    +options.map(c=>`<option value="${esc(c)}"${c===current?' selected':''}>${esc(c)}</option>`).join('')
    +'</select></div>';

  openConfigDialog<RelateDraft>({
    id:'relate-config',widget:'Relate a column from another table',step:view.step,draft:view.initial,
    sections:draft=>{
      const here=view.hereColumns,there=view.thereColumns;
      const shared=here.filter(c=>there.includes(c));
      const keysOn=[draft.on,...draft.alsoOn];
      const bringable=[...there,...(view.relatedValue&&!there.includes(view.relatedValue)?[view.relatedValue]:[])]
        .filter(c=>!keysOn.includes(c)&&!here.includes(c));
      const {shifts,problem:shiftProblem}=draftShifts(draft);

      // SETTINGS.
      const settings=`<p class="description">Brings a column from <strong>${esc(view.rightLabel)}</strong> onto the rows of `
        +`<strong>${esc(view.leftLabel)}</strong>, matched on columns both tables carry.</p>`
        +select('relate-on','Matched on',shared,draft.on,there.length?'These tables share no column':'Connect both tables first')
        +(draft.on&&shared.length>1
          ?`<fieldset class="field" id="relate-also"><legend class="field-label">And also matched on</legend>`
            +shared.filter(c=>c!==draft.on).map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}"`
              +`${draft.alsoOn.includes(c)?' checked':''}> ${esc(c)}</label>`).join('')
            +'<p class="muted">Rows relate only where every chosen column agrees.</p></fieldset>'
          :'')
        +select('relate-bring','Bring across',bringable,draft.bring,'Connect both tables first')
        +'<div class="field"><label class="field-label" for="relate-compare">Compare keys</label><select id="relate-compare">'
        +`<option value="fuzzy"${draft.normalisation==='fuzzy'?' selected':''}>Folding punctuation and case</option>`
        +`<option value="exact"${draft.normalisation==='exact'?' selected':''}>Exactly, after trimming</option></select></div>`
        +'<h4>A date within a period <span class="muted">· optional</span></h4>'
        +'<p class="muted">A row relates to the period whose start and end hold its date.</p>'
        +select('relate-within-date','Date, in the first table',here,draft.within.date,'Connect the first table',{optional:true})
        +select('relate-within-start','Period start, in the second',there,draft.within.start,'Connect the second table',{optional:true})
        +select('relate-within-end','Period end, in the second',there,draft.within.end,'Connect the second table',{optional:true})
        +'<h4>Shifts, in days <span class="muted">· optional</span></h4>'
        +'<p class="muted">The date is moved by each shift before it is matched: +3 takes a week\u2019s Sunday to its Wednesday, '
        +'and a lag of k weeks is 7k fewer. Two or more shifts bring one column each.</p>'
        +'<div id="relate-shifts">'
        +draft.shifts.map((s,i)=>`<div class="config-list-row"><label class="field-label" for="relate-shift-${i}">Shift ${i+1}</label>`
          +`<input id="relate-shift-${i}" data-shift="${i}" inputmode="numeric" value="${esc(s)}">`
          +`<button class="button small" data-drop-shift="${i}" aria-label="Remove shift ${i+1}">Remove</button></div>`).join('')
        +`<button class="button small" id="relate-shift-add">+ Add a shift</button></div>`;

      if(!draft.on||!draft.bring)
        return {settings,preview:'<p class="muted">Choose what to match on and what to bring across to see the join.</p>'};
      if(shiftProblem)return {settings,message:{tone:'refusal',text:shiftProblem},blocked:true};
      if(!view.left||!view.right)
        return {settings,preview:'<p class="muted">Run the workflow once both tables are connected, and the join is shown here before it is applied.</p>',
          decisions:'<p class="muted">Whether any rows go unmatched is known once both tables are there.</p>'};

      const request=requestOf(draft,{measureKey:view.measureKey});
      // SEVERAL SHIFTS: one column each, every row kept, the empties counted per shift. Nothing is dropped, so there
      // is nothing to decide about unmatched rows.
      if(shifts.length>1){
        const planned=view.planShifts(request,shifts);
        if('refusal' in planned)return {settings,message:{tone:'refusal',text:planned.refusal},blocked:true};
        const preview='<table class="relate-shares"><thead><tr><th>Column</th><th>Shift</th><th>Matched</th><th>Empty</th></tr></thead><tbody>'
          +planned.columns.map(c=>`<tr><th scope="row">${esc(c.column)}</th><td>${esc(signed(c.shiftDays))} d</td>`
            +`<td>${count(c.matched)}</td><td${c.empty?' class="profile-flag"':''}>${count(c.empty)}</td></tr>`).join('')
          +'</tbody></table>'
          +`<p class="muted">${count(planned.table.rowCount)} rows, every one kept. This is the table the next step reads.</p>`
          +`<div class="relate-preview">${dataTableMarkup(planned.table,esc,{pageSize:12,
            roles:Object.fromEntries([...keysOn.filter(Boolean).map(k=>[k,'key'] as const),...planned.columns.map(c=>[c.column,'brought'] as const)])})}</div>`;
        return {settings,preview,decisions:'<p>Every row is kept. A row with no value at a shift has that column '
          +'left empty, and the empties are counted above; a model on a column leaves out only the rows empty in it.</p>'};
      }

      const planned=view.plan(request);
      if('refusal' in planned)return {settings,message:{tone:'refusal',text:planned.refusal},blocked:true};
      const shape=planned,gaps=shape.overlap.gaps,on=keysOn.filter(Boolean).join(' and ');
      const names=shape.shares.map(s=>s.measure);
      if(!names.includes(numerator))numerator=names[0]??'';
      if(!names.includes(denominator))denominator=names[1]??names[0]??'';
      const multiplier=names.length>1?rateMultiplier(shape.shares,numerator,denominator):null;
      const keeping=draft.decision==='keep'&&gaps.length>0;
      const table=keeping&&shape.previews.keep?shape.previews.keep:shape.previews.drop;

      // PREVIEW: the shape, its effect on the numbers, the Methods note it would machine, and the table.
      const preview=overlapBar(shape,esc,view.leftLabel,view.rightLabel)
        +(gaps.length
          ?`<p>Not in ${esc(view.rightLabel)}: `+gaps.slice(0,12).map(g=>`<strong>${esc(g.key)}</strong> (${g.rows} row${g.rows===1?'':'s'})`).join(', ')
            +(gaps.length>12?`, and ${gaps.length-12} more`:'')+'.</p>'
          :`<p>Every ${esc(on)} in ${esc(view.leftLabel)} was found in ${esc(view.rightLabel)}. No row is left out.</p>`)
        +(names.length?'<h4>Effect on the numeric variables</h4>'+sharesTable(shape.shares,esc):'')
        +(names.length>1
          ?'<div class="relate-row"><label class="field-label" for="relate-rate-num">A rate of</label><select id="relate-rate-num">'
            +names.map(n=>`<option value="${esc(n)}"${n===numerator?' selected':''}>${esc(n)}</option>`).join('')
            +'</select><label class="field-label" for="relate-rate-den">over</label><select id="relate-rate-den">'
            +names.map(n=>`<option value="${esc(n)}"${n===denominator?' selected':''}>${esc(n)}</option>`).join('')+'</select></div>'
            +(multiplier===null||numerator===denominator?'<p class="muted">Pick two different variables to see what dropping does to a rate of one over the other.</p>'
              :multiplier===1?`<p>Both keep the same share, so a rate of ${esc(numerator)} over ${esc(denominator)} is unchanged. Dropping costs precision here, not the estimate.</p>`
              :`<div class="notice notice-warning">Dropping multiplies a rate of <strong>${esc(numerator)}</strong> over <strong>${esc(denominator)}</strong> by `
                +`<strong>${multiplier.toFixed(4)}</strong>: it comes out at ${(multiplier*100).toFixed(1)}% of its value over the whole table. `
                +'The two variables do not drop in step, so the rows that did not match are not a random sample of what you are measuring.</div>')
          :'')
        +'<h4>Methods note, machined from this join</h4><div class="machined-note">'
        +machinedNotes({on,bring:draft.bring,normalisation:draft.normalisation,overlap:shape.overlap,shares:shape.shares,
          ...(gaps.length&&draft.decision?{declared:{decision:draft.decision,...(draft.decision==='keep'?{label:draft.label.trim()}:{}),
            ...(draft.reason.trim()?{reason:draft.reason.trim()}:{})}}:{})},
          {left:view.leftLabel,right:view.rightLabel}).map(note=>`<p>${esc(note.text)}</p>`).join('')+'</div>'
        +`<h4>${keeping?'The table \u00b7 every row kept':'The table \u00b7 matched rows only'}</h4>`
        +`<p class="muted">${count(table.rowCount)} row${table.rowCount===1?'':'s'}. This is the table the next step reads.</p>`
        +(wideFrame(table)?'':`<p class="muted">This table has ${table.keys.length} key columns, so it is shown as stored, one value per row.</p>`)
        +`<div class="relate-preview">${dataTableMarkup(table,esc,{pageSize:12,
          roles:{...Object.fromEntries(keysOn.filter(Boolean).map(k=>[k,'key'])),[draft.bring]:'brought'} as ColumnRoles})}</div>`;

      // DECISIONS: what happens to the rows that did not match, which the step will not decide.
      const decisions=gaps.length
        ?`<p>${count(gaps.length)} ${esc(keyNoun(on,gaps.length))} in ${esc(view.leftLabel)} ${gaps.length===1?'has':'have'} no row in `
          +`${esc(view.rightLabel)}. Dropping them and keeping them give different totals, so this step does not choose.</p>`
          +`<label class="check"><input type="radio" name="relate-decision" value="drop"${draft.decision==='drop'?' checked':''}> `
          +`Drop them: keep the ${count(shape.overlap.matched)} matched ${esc(keyNoun(on,shape.overlap.matched))}</label>`
          +`<label class="check"><input type="radio" name="relate-decision" value="keep"${draft.decision==='keep'?' checked':''}> `
          +'Keep them under a category I name: every row stays</label>'
          +(draft.decision==='keep'
            ?'<div class="field"><label class="field-label" for="relate-join-label">Name for the category</label>'
              +`<input id="relate-join-label" maxlength="60" value="${esc(draft.label)}" placeholder="for example Supply not recorded"></div>`
            :'')
          +(draft.decision?'':'<p class="standard-state"><strong>Not decided yet.</strong> The run refuses this join until you choose.</p>')
          +'<div class="field"><label class="field-label" for="relate-join-reason">Why (recorded in the evidence)</label>'
          +`<input id="relate-join-reason" maxlength="200" value="${esc(draft.reason)}"></div>`
        :'<p>Nothing to decide: no row is left out.</p>';
      const blocked=keeping&&!!shape.labelRefusal;
      return {settings,preview,decisions,...(blocked?{message:{tone:'refusal' as const,text:shape.labelRefusal!},blocked}:{})};
    },
    wire:(root,draft,redraw)=>{
      const on=(id:string,fn:(el:HTMLSelectElement)=>void)=>{const el=root.querySelector<HTMLSelectElement>(`#${id}`);if(el)el.onchange=()=>{fn(el);redraw();};};
      on('relate-on',el=>{draft.on=el.value;draft.alsoOn=draft.alsoOn.filter(c=>c!==el.value);});
      on('relate-bring',el=>{draft.bring=el.value;});
      on('relate-compare',el=>{draft.normalisation=el.value==='exact'?'exact':'fuzzy';});
      on('relate-within-date',el=>{draft.within.date=el.value;});
      on('relate-within-start',el=>{draft.within.start=el.value;});
      on('relate-within-end',el=>{draft.within.end=el.value;});
      on('relate-rate-num',el=>{numerator=el.value;});
      on('relate-rate-den',el=>{denominator=el.value;});
      root.querySelectorAll<HTMLInputElement>('#relate-also input').forEach(box=>box.onchange=()=>{
        draft.alsoOn=[...root.querySelectorAll<HTMLInputElement>('#relate-also input:checked')].map(b=>b.value);redraw();});
      root.querySelectorAll<HTMLInputElement>('[data-shift]').forEach(box=>{
        const i=Number(box.dataset.shift);
        box.oninput=()=>{draft.shifts[i]=box.value;};
        box.onchange=()=>{draft.shifts[i]=box.value;redraw();};
      });
      root.querySelectorAll<HTMLButtonElement>('[data-drop-shift]').forEach(b=>b.onclick=()=>{
        draft.shifts.splice(Number(b.dataset.dropShift),1);redraw();});
      const add=root.querySelector<HTMLButtonElement>('#relate-shift-add');
      if(add)add.onclick=()=>{draft.shifts.push('');redraw();
        root.ownerDocument.getElementById(`relate-shift-${draft.shifts.length-1}`)?.focus();};
      root.querySelectorAll<HTMLInputElement>('[name="relate-decision"]').forEach(r=>r.onchange=()=>{
        if(r.checked){draft.decision=r.value==='keep'?'keep':'drop';redraw();}});
      const label=root.querySelector<HTMLInputElement>('#relate-join-label');
      // Redrawn on change, not on every keystroke, so the preview does not rebuild under the typist.
      if(label){label.oninput=()=>{draft.label=label.value;};label.onchange=()=>{draft.label=label.value;redraw();};}
      const reason=root.querySelector<HTMLInputElement>('#relate-join-reason');
      if(reason){reason.oninput=()=>{draft.reason=reason.value;};reason.onchange=()=>{draft.reason=reason.value;redraw();};}
    },
    apply:draft=>{
      const {shifts}=draftShifts(draft);
      let plan:{signature:string;gaps:number}|undefined;
      if(shifts.length<2&&draft.on&&draft.bring&&view.left&&view.right){
        const planned=view.plan(requestOf(draft,{measureKey:view.measureKey}));
        if(!('refusal' in planned))plan={signature:planned.signature,gaps:planned.overlap.gaps.length};
      }
      view.apply(draft,plan);
    },
  },esc);
}
