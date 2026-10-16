/** What a file will not tell you, and what can be done about it — per input, in one place.
 *
 *  The practitioner, 2026-10-16: *"I think data quality inspection and management deserves its
 *  own modal dialog per input widget, because this is where human input becomes very
 *  consequential downstream."*
 *
 *  The scope was argued and settled. [Experiment 117](../docs/experiments/117-data-quality.md)
 *  first claimed quality degrades most invisibly *downstream* and so should be inspectable
 *  anywhere; the practitioner took that table apart and two of its six rows survived, both of
 *  them values that arrived wrong **in a file**. A file is what an input widget holds, which is
 *  why this is bound to inputs and nothing else.
 *
 *  It is not the quick look. The quick look reads the rows; this reads the COLUMNS, one card
 *  each, and is the only place a repair can be declared or taken back. Inspection and management
 *  in the practitioner's words — and management means both directions, because a repair that
 *  cannot be removed is a decision a practitioner cannot revisit.
 */
import type {Escape} from './types.js';
import {profileColumn,type ColumnKind,type ColumnProfile} from './column-profile.js';

export interface QualityRepair {column:string; to:ColumnKind; cast:number; unreadable:string[]; at:string}
export interface QualityView {
  title:string;
  columns:string[];
  /** The records as they will be READ: declared repairs already applied. */
  rows:Record<string,unknown>[];
  declared:Record<string,ColumnKind>;
  repairs:QualityRepair[];
  onRepair:(column:string,to:ColumnKind)=>void;
  /** Taking a repair back. The records a node holds were never overwritten, so this restores
   *  the originals rather than re-reading a file. */
  onRemoveRepair:(index:number)=>void;
}

const trim=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(2);

export function openDataQuality(view:QualityView,esc:Escape):void{
  const dialog=document.createElement('dialog');
  dialog.id='data-quality';
  dialog.setAttribute('aria-labelledby','data-quality-title');
  const close=()=>{dialog.close();dialog.remove();};

  const profiles=view.columns.map(column=>
    profileColumn(column,view.rows.map(row=>row[column]),view.declared[column]));

  /** What is wrong, said first and plainly, or that nothing is. */
  const problems=(p:ColumnProfile)=>{
    const said:string[]=[];
    if(p.mismatched)said.push(`<li class="quality-problem"><strong>${p.mismatched} of ${p.total}</strong> `
      +`${p.mismatched===1?'value is':'values are'} not ${p.declared}s — `
      +`${p.examples.map(e=>`<code>${esc(e)}</code>`).join(', ')}`
      +`${p.repairable<p.mismatched?`. Only ${p.repairable} would survive being read as ${p.declared}s`:''}`
      +`. A rule reading this column is told ${p.mismatched===1?'that value is':'those values are'} not recorded.</li>`);
    // Said, never offered a fix. Filling a gap is imputation: a modelling decision that belongs
    // to the practitioner and their method, not to a widget's convenience. 117 records why.
    if(p.absent)said.push(`<li class="quality-problem"><strong>${p.absent} of ${p.total}</strong> `
      +`${p.absent===1?'record has':'records have'} no value here. Nothing is offered to fill ${p.absent===1?'it':'them'}: `
      +`choosing a replacement is a modelling decision, not a correction.</li>`);
    // What "clean" means depends on whether anything was declared. Telling a practitioner that
    // every value is what the column was declared to be, when nothing declared it, is a claim
    // this cannot support -- and it is the claim they would most want to rely on.
    return said.length?`<ul class="quality-problems">${said.join('')}</ul>`
      :`<p class="quality-clean">${p.declared
        ?`Every record has a value, and every value is a ${esc(p.declared)}.`
        :'Every record has a value. Nothing has declared what they should be, so there is nothing here to be wrong against.'}</p>`;
  };

  /** What is in it. Awareness, not a finding — see the fence note below. */
  const shape=(p:ColumnProfile)=>{
    const rows:string[]=[];
    if(p.numeric)rows.push(`<tr><th>Range</th><td>${esc(trim(p.numeric.min))} to ${esc(trim(p.numeric.max))}, median ${esc(trim(p.numeric.median))}</td></tr>`
      +`<tr><th>Middle half</th><td>${esc(trim(p.numeric.q1))} to ${esc(trim(p.numeric.q3))}</td></tr>`
      +`<tr><th>Beyond 1.5×IQR</th><td>${p.numeric.beyondFence} value${p.numeric.beyondFence===1?'':'s'}`
      +`${p.numeric.beyondFence?` outside ${esc(trim(p.numeric.lowerFence))} to ${esc(trim(p.numeric.upperFence))}`:''}</td></tr>`);
    if(p.distinct!==undefined)rows.push(`<tr><th>Distinct</th><td>${p.distinct}</td></tr>`);
    if(p.frequencies?.length)rows.push(`<tr><th>Most often</th><td>`
      +p.frequencies.map(f=>`${esc(f.value)} <span class="quality-count">${f.count}</span>`).join(', ')+`</td></tr>`);
    return rows.length?`<table class="quality-shape">${rows.join('')}</table>`:'';
  };

  const render=()=>{
    dialog.innerHTML=`<div class="manual-head"><h2 id="data-quality-title">${esc(view.title)}</h2>`
      +`<div><button class="button primary" id="data-quality-close">Close</button></div></div>`
      +`<div class="quality-body">`
      +`<p class="description">What this input will and will not tell the steps that read it. `
      +`A column is only ever <em>wrong</em> against something declared: where no rule has bound a `
      +`column, it is undeclared rather than mistaken, and nothing below calls it a problem.</p>`
      +(view.repairs.length
        ?`<section class="quality-repairs"><h3>Declared repairs</h3>`
         +`<p class="description">Applied to a copy when the records are handed on. What this step `
         +`holds is exactly what was imported, so removing one restores the original values.</p>`
         +`<ul>`+view.repairs.map((r,index)=>`<li><code>${esc(r.column)}</code> read as ${esc(r.to)}s — `
           +`${r.cast} cast${r.unreadable.length?`, ${r.unreadable.length} left unreadable`:''}`
           +` <button class="button small" data-remove-repair="${index}">Remove</button></li>`).join('')
         +`</ul></section>`
        :'')
      +profiles.map(p=>`<section class="quality-column">`
        +`<header><h3>${esc(p.column)}</h3>`
        +`<span class="quality-declared">${p.declared?`declared ${esc(p.declared)}`:'not bound by any rule'}</span></header>`
        +problems(p)
        +shape(p)
        +(p.declared&&p.repairable
          ?`<div class="inspector-actions"><button class="button" data-repair="${esc(p.column)}">`
           +`Read ${p.repairable} value${p.repairable===1?'':'s'} as ${esc(p.declared)}s</button></div>`
          :'')
        +`</section>`).join('')
      +`<p class="description"><strong>A count beyond the fence is not a finding.</strong> It is a `
      +`rank-based prompt to look at that many values. Whether any of them is an outlier is a `
      +`judgement about the thing measured, which this cannot make — a column of counts with a long `
      +`tail will flag its largest values every time, and that is a property of the distribution.</p>`
      +`</div>`;
    dialog.querySelector<HTMLButtonElement>('#data-quality-close')!.onclick=close;
    dialog.querySelectorAll<HTMLButtonElement>('[data-repair]').forEach(button=>{
      button.onclick=()=>{
        const column=button.dataset.repair!;
        const declared=view.declared[column];
        if(!declared)return;
        close();
        view.onRepair(column,declared);
      };
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-remove-repair]').forEach(button=>{
      button.onclick=()=>{close();view.onRemoveRepair(Number(button.dataset.removeRepair));};
    });
  };

  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
