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
import {profileColumn,columnStates,histogram,type ColumnKind,type ColumnProfile} from './column-profile.js';

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

  /** Where values are missing or unreadable, record by record, in the order the file holds them.
   *
   *  The question a total cannot answer: do the absences CLUSTER? Three gaps spread through a
   *  table are three gaps; three gaps in consecutive rows of a table sorted by date are a week
   *  nobody recorded, and that is a different problem with a different cause. */
  const missingness=()=>{
    const marked=view.columns.map(column=>
      ({column,states:columnStates(view.rows.map(row=>row[column]),view.declared[column])}));
    const flawed=marked.filter(m=>m.states.some(state=>state!=='ok'));
    if(!flawed.length)return `<p class="quality-clean">Every value in every column is present and `
      +`is what it was declared to be, so there is no pattern of absence to show.</p>`;
    const rows=view.rows.length;
    const height=Math.min(260,Math.max(80,rows));
    const band=height/rows;
    const width=120;
    return `<div class="quality-strips">`
      +flawed.map(({column,states})=>`<figure class="quality-strip">`
        +`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" `
        +`aria-label="${esc(column)}: where values are missing or unreadable, in file order">`
        +`<rect x="0" y="0" width="${width}" height="${height}" class="strip-ok"/>`
        +states.map((state,index)=>state==='ok'?''
          :`<rect x="0" y="${(index*band).toFixed(2)}" width="${width}" height="${Math.max(band,1).toFixed(2)}" `
           +`class="strip-${state}"></rect>`).join('')
        +`</svg><figcaption>${esc(column)}</figcaption></figure>`).join('')
      +`</div>`
      +`<p class="quality-legend"><span class="swatch strip-absent"></span> no value`
      +` <span class="swatch strip-mismatched"></span> not the declared kind`
      +` <span class="swatch strip-ok"></span> readable</p>`
      // The caveat that makes the picture usable rather than misleading.
      +`<p class="description">Top to bottom is <strong>the order the file holds</strong>, which may `
      +`carry meaning or none. If the records are sorted by date, a run of marks is a period nobody `
      +`recorded; if the order is arbitrary, the same run is a coincidence. This cannot tell which, `
      +`and a run is a reason to go and look rather than a finding.</p>`;
  };

  /** What the numbers look like, and what is in the categories. */
  const shapes=()=>profiles.map(p=>{
    const bins=p.numeric?histogram(view.rows.map(row=>row[p.column])):[];
    if(bins.length>1){
      const tallest=Math.max(...bins.map(b=>b.count));
      const w=360,h=90,bw=w/bins.length;
      // The fence drawn where it falls, so a reader sees which bars are beyond it rather than
      // being told a number and left to work it out.
      const span=p.numeric!.max-p.numeric!.min||1;
      const at=(value:number)=>((value-p.numeric!.min)/span)*w;
      return `<section class="quality-column"><header><h3>${esc(p.column)}</h3>`
        +`<span class="quality-declared">${bins.length} equal-width bins</span></header>`
        +`<svg class="quality-chart" viewBox="0 0 ${w} ${h+16}" width="100%" height="${h+16}" role="img" `
        +`aria-label="Distribution of ${esc(p.column)}">`
        +bins.map((b,i)=>`<rect x="${(i*bw).toFixed(1)}" y="${(h-(b.count/tallest)*h).toFixed(1)}" `
          +`width="${(bw-1).toFixed(1)}" height="${((b.count/tallest)*h).toFixed(1)}" class="chart-bar">`
          +`<title>${esc(trim(b.from))} to ${esc(trim(b.to))}: ${b.count}</title></rect>`).join('')
        +(p.numeric!.upperFence<p.numeric!.max
          ?`<line x1="${at(p.numeric!.upperFence).toFixed(1)}" y1="0" x2="${at(p.numeric!.upperFence).toFixed(1)}" y2="${h}" class="chart-fence"/>`:'')
        +(p.numeric!.lowerFence>p.numeric!.min
          ?`<line x1="${at(p.numeric!.lowerFence).toFixed(1)}" y1="0" x2="${at(p.numeric!.lowerFence).toFixed(1)}" y2="${h}" class="chart-fence"/>`:'')
        +`<text x="0" y="${h+13}" class="chart-axis">${esc(trim(p.numeric!.min))}</text>`
        +`<text x="${w}" y="${h+13}" text-anchor="end" class="chart-axis">${esc(trim(p.numeric!.max))}</text>`
        +`</svg>`
        +(p.numeric!.beyondFence?`<p class="quality-legend">The line marks 1.5×IQR. `
          +`${p.numeric!.beyondFence} value${p.numeric!.beyondFence===1?'':'s'} lie beyond it.</p>`:'')
        +`</section>`;
    }
    if(!p.frequencies?.length)return '';
    // A column whose every value is unique is an identifier, not a category. Five bars of one
    // is a frequency chart that has nothing to say, and saying what the column IS tells a reader
    // more than drawing it does.
    if(p.distinct===p.total-p.absent&&p.distinct>1)
      return `<section class="quality-column"><header><h3>${esc(p.column)}</h3>`
        +`<span class="quality-declared">${p.distinct} distinct</span></header>`
        +`<p class="quality-clean">Every value here is unique, so this is an identifier rather than `
        +`a category. There is no distribution to draw.</p></section>`;
    const most=p.frequencies[0].count;
    return `<section class="quality-column"><header><h3>${esc(p.column)}</h3>`
      +`<span class="quality-declared">${p.distinct} distinct</span></header>`
      +`<div class="quality-bars">`
      +p.frequencies.map(f=>`<div class="quality-bar-row"><span>${esc(f.value)}</span>`
        +`<div class="quality-bar"><div style="width:${((f.count/most)*100).toFixed(1)}%"></div></div>`
        +`<b>${f.count}</b></div>`).join('')
      +`</div>`
      +(p.distinct!>p.frequencies.length
        ?`<p class="quality-legend">and ${p.distinct!-p.frequencies.length} more.</p>`:'')
      +`</section>`;
  }).join('');

  let tab:'columns'|'shapes'='columns';

  const render=()=>{
    dialog.innerHTML=`<div class="manual-head"><h2 id="data-quality-title">${esc(view.title)}</h2>`
      +`<div><button class="button primary" id="data-quality-close">Close</button></div></div>`
      +`<div class="result-switch quality-tabs" role="tablist">`
      +([['columns','Columns'],['shapes','Shapes and gaps']] as const).map(([key,label])=>
        `<button role="tab" aria-selected="${key===tab}" data-quality-tab="${key}" `
        +`class="${key===tab?'active':''}">${label}</button>`).join('')
      +`</div>`
      +`<div class="quality-body">`
      +(tab==='shapes'
        ?`<p class="description">What is in each column, and where it is not. Drawn from the records `
         +`as the steps downstream will read them, declared repairs included.</p>`
         +`<h3 class="quality-heading">Where values are missing or unreadable</h3>`
         +missingness()
         +`<h3 class="quality-heading">What is in each column</h3>`
         +shapes()
        :`<p class="description">What this input will and will not tell the steps that read it. `
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
      +`tail will flag its largest values every time, and that is a property of the distribution.</p>`)
      +`</div>`;
    dialog.querySelectorAll<HTMLButtonElement>('[data-quality-tab]').forEach(button=>{
      button.onclick=()=>{tab=button.dataset.qualityTab as 'columns'|'shapes';render();};
    });
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
