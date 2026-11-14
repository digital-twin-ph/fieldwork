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
import {ISSUE_LABEL} from './data-issues.js';
import {profileColumn,columnStates,histogram,type ColumnKind,type ColumnProfile,type ColumnScale} from './column-profile.js';
import {SCALE_WORDS} from './column-metadata.js';
import {valueText,editsAt,versionWords,versionOf,editedTitle,type CellEdit,type EditEntry} from './cell-edits.js';

export interface QualityRepair {column:string; to:ColumnKind; cast:number; unreadable:string[]; at:string}
export interface QualityView {
  title:string;
  /** What reading the table found, listed before the columns. */
  findings?:readonly {text:string;kind?:string}[];
  columns:string[];
  /** The records as they will be READ: declared repairs already applied. */
  rows:Record<string,unknown>[];
  declared:Record<string,ColumnKind>;
  /** What the practitioner said each column is: its scale and codes (experiment 211). */
  scales?:Record<string,ColumnScale>;
  /** A RESULT CANNOT BE REPAIRED -- you repair the input it came from. An output table opens this
   *  same dialog as a REPORT: the profiles, the missingness and the shapes, with nothing to press.
   *  Absent where the view is read-only, which is how the dialog knows. Added 2026-10-21, when the
   *  practitioner asked for the input tables' data-quality check over an output table too. */
  repairs?:QualityRepair[];
  onRepair?:(column:string,to:ColumnKind)=>void;
  /** Taking a repair back. The records a node holds were never overwritten, so this restores
   *  the originals rather than re-reading a file. */
  onRemoveRepair?:(index:number)=>void;
  /** EDITING BY HAND (experiment 214): each record's id, in the order of `rows`; the edits the step holds; and, given
   *  an edit or a removal, the view as it now reads, so the dialog redraws in place. Absent: the view is a report. */
  recordIds?:string[];
  /** The step's edit log, every version (experiment 214). */
  edits?:EditEntry[];
  /** Edits whose value read is no longer there, so they were not applied. */
  staleEdits?:number;
  onEdit?:(edit:CellEdit)=>QualityView|undefined;
  /** Take back the edit a version made, as a new version. */
  onRemoveEdit?:(version:number)=>QualityView|undefined;
  /** Restore an earlier version, 0 being the records as imported, as a new version. */
  onRestore?:(version:number)=>QualityView|undefined;
}
const PAGE=50;

const trim=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(2);

export function openDataQuality(first:QualityView,esc:Escape):void{
  let view=first;
  const dialog=document.createElement('dialog');
  dialog.id='data-quality';
  dialog.setAttribute('aria-labelledby','data-quality-title');
  const close=()=>{dialog.close();dialog.remove();};

  let profiles=view.columns.map(column=>
    profileColumn(column,view.rows.map(row=>row[column]),view.declared[column],view.scales?.[column]));
  const refresh=(next:QualityView|undefined)=>{if(!next)return;view=next;
    profiles=view.columns.map(column=>profileColumn(column,view.rows.map(row=>row[column]),view.declared[column],view.scales?.[column]));render();};
  let page=0;

  /** What is wrong, said first and plainly, or that nothing is. */
  const problems=(p:ColumnProfile)=>{
    const said:string[]=[];
    // EACH PROBLEM LED BY ITS KIND, as the ontology and the receipt name it (experiment 207).
    if(p.mismatched)said.push(`<li class="quality-problem"><strong>${ISSUE_LABEL.ValueUnreadable} · ${p.mismatched} of ${p.total}</strong> `
      +`${p.mismatched===1?'value is':'values are'} not ${p.declared}s — `
      +`${p.examples.map(e=>`<code>${esc(e)}</code>`).join(', ')}`
      +`${p.repairable<p.mismatched?`. Only ${p.repairable} would survive being read as ${p.declared}s`:''}`
      +`. A rule reading this column is told ${p.mismatched===1?'that value is':'those values are'} not recorded.</li>`);
    if(p.uncoded)said.push(`<li class="quality-problem"><strong>${ISSUE_LABEL.ValueNotCoded} · ${p.uncoded.count} of ${p.total}</strong> `
      +`${p.uncoded.examples.map(e=>`<code>${esc(e)}</code>`).join(', ')}: kept as written. Its declared codes are `
      +`${esc((view.scales?.[p.column]?.codes??[]).map(c=>c.value).join(', '))}.</li>`);
    // Said, never offered a fix. Filling a gap is imputation: a modelling decision that belongs
    // to the practitioner and their method, not to a widget's convenience. 117 records why.
    // THE TWO ABSENCES, APART. A field the record does not have and a field it has and left empty
    // are different findings with different remedies -- the first is a question for the source,
    // the second for whoever filled the form. They were one number until 2026-10-21.
    if(p.absent)said.push(`<li class="quality-problem"><strong>${ISSUE_LABEL.ValueAbsent} · ${p.absent} of ${p.total}</strong> `
      +(p.missing&&p.empty?`${ISSUE_LABEL.FieldMissing}: ${p.missing} ${p.missing===1?'does':'do'} not have the field at all. `
        +`${ISSUE_LABEL.ValueEmpty}: ${p.empty} ${p.empty===1?'has':'have'} it and left it empty.`
        :p.empty?`${ISSUE_LABEL.ValueEmpty}: the field is there and empty.`
        :`${ISSUE_LABEL.FieldMissing}: the field is not there at all.`)+`</li>`);
    // What "clean" means depends on whether anything was declared. Telling a practitioner that
    // every value is what the column was declared to be, when nothing declared it, is a claim
    // this cannot support -- and it is the claim they would most want to rely on.
    return said.length?`<ul class="quality-problems">${said.join('')}</ul>`
      :`<p class="quality-clean">${p.declared
        ?`Every record has a value, and every value is a ${esc(p.declared)}.`
        :p.scale?'Every record has a value.'
        :'Every record has a value. Nothing has declared what they should be, so there is nothing here to be wrong against.'}</p>`;
  };

  /** What is in it. Awareness, not a finding — see the fence note below. */
  const shape=(p:ColumnProfile)=>{
    const rows:string[]=[];
    if(p.scale)rows.push(`<tr><th>Scale</th><td>${SCALE_WORDS[p.scale]}</td></tr>`);
    if(p.numeric)rows.push(`<tr><th>Range</th><td>${esc(trim(p.numeric.min))} to ${esc(trim(p.numeric.max))}, median ${esc(trim(p.numeric.median))}</td></tr>`
      +`<tr><th>Middle half</th><td>${esc(trim(p.numeric.q1))} to ${esc(trim(p.numeric.q3))}</td></tr>`
      +`<tr><th>${ISSUE_LABEL.BeyondFence}</th><td>${p.numeric.beyondFence} value${p.numeric.beyondFence===1?'':'s'}`
      +`${p.numeric.beyondFence?` outside ${esc(trim(p.numeric.lowerFence))} to ${esc(trim(p.numeric.upperFence))}`:''}</td></tr>`);
    if(p.distinct!==undefined)rows.push(`<tr><th>Distinct</th><td>${p.distinct}</td></tr>`);
    if(p.frequencies?.length)rows.push(`<tr><th>${p.scale==='ordinal'?'In order':'Most often'}</th><td>`
      +p.frequencies.map(f=>`${esc(f.value)}${f.label?` ${esc(f.label)}`:''} <span class="quality-count">${f.count}</span>`).join(', ')+`</td></tr>`);
    return rows.length?`<table class="quality-shape">${rows.join('')}</table>`:'';
  };

  /** A nullity matrix: every column side by side, sharing one row axis.
   *
   *  Adapted from **missingno** (Bilogur), which the practitioner pointed at on 2026-10-16. Its
   *  matrix exists to reveal patterns *within and between* columns, and the between is what this
   *  dialog could not do an hour ago: the first version drew one strip per column as a separate
   *  figure, so two columns that go missing together looked exactly like two that do not. Rows
   *  are shared here, so a reader can run their eye across a record.
   *
   *  The sparkline on the right is missingno's too: how complete each record is, so the worst
   *  rows are findable rather than merely present somewhere in the picture.
   *
   *  Read from the library's documentation. Nobody here has used it, and what is adopted is the
   *  idea rather than the implementation -- see [117](../docs/experiments/117-data-quality.md). */
  const missingness=()=>{
    const marked=view.columns.map(column=>
      ({column,states:columnStates(view.rows.map(row=>row[column]),view.declared[column])}));
    if(!marked.some(m=>m.states.some(state=>state!=='ok')))
      return `<p class="quality-clean">Every value in every column is present and is what it was `
        +`declared to be, so there is no pattern of absence to show.</p>`;

    const rows=view.rows.length;
    const height=Math.min(300,Math.max(100,rows));
    const band=Math.max(height/rows,0.5);
    const colWidth=Math.min(90,Math.max(36,520/marked.length));
    const gap=6, sparkWidth=70, labels=58;
    const matrixWidth=marked.length*(colWidth+gap);
    const width=matrixWidth+sparkWidth+10;
    // How much of each record is readable. One bar per row, as missingno draws it.
    const complete=view.rows.map((_,index)=>
      marked.filter(m=>m.states[index]==='ok').length/marked.length);
    return `<svg class="quality-matrix" viewBox="0 0 ${width} ${height+labels}" width="100%" `
      +`height="${height+labels}" role="img" aria-label="Where values are missing or unreadable, `
      +`every column against the same records">`
      +marked.map(({column,states},c)=>{
        const x=c*(colWidth+gap);
        return `<rect x="${x}" y="0" width="${colWidth}" height="${height}" class="strip-ok"/>`
          +states.map((state,index)=>state==='ok'?''
            :`<rect x="${x}" y="${(index*(height/rows)).toFixed(2)}" width="${colWidth}" `
             +`height="${band.toFixed(2)}" class="strip-${state}"/>`).join('')
          +`<text x="${x+colWidth/2}" y="${height+14}" text-anchor="end" class="matrix-label" `
          +`transform="rotate(-45 ${x+colWidth/2} ${height+14})">${esc(column)}</text>`;
      }).join('')
      // The completeness sparkline: how much of each record survives.
      +`<g transform="translate(${matrixWidth+10} 0)">`
      +`<rect x="0" y="0" width="${sparkWidth}" height="${height}" class="strip-ok"/>`
      +complete.map((fraction,index)=>
        `<rect x="0" y="${(index*(height/rows)).toFixed(2)}" width="${(fraction*sparkWidth).toFixed(1)}" `
        +`height="${band.toFixed(2)}" class="spark-bar"/>`).join('')
      +`<text x="${sparkWidth/2}" y="${height+14}" text-anchor="end" class="matrix-label" `
      +`transform="rotate(-45 ${sparkWidth/2} ${height+14})">how complete</text></g>`
      +`</svg>`
      +`<p class="quality-legend"><span class="swatch strip-absent"></span> no value`
      +` <span class="swatch strip-mismatched"></span> not the declared kind`
      +` <span class="swatch strip-ok"></span> readable`
      +` <span class="swatch spark-bar"></span> how much of the record is readable</p>`
      +`<p class="description">Every column against <strong>the same records</strong>, so two columns `
      +`that go missing together can be told from two that do not. Top to bottom is `
      +`<strong>the order the file holds</strong>, which may carry meaning or none: if the records are `
      +`sorted by date, a run of marks is a period nobody recorded; if the order is arbitrary, the same `
      +`run is a coincidence. This cannot tell which, and a run is a reason to go and look rather than a `
      +`finding.</p>`;
  };

  /** How much of each column arrived, as a bar each. missingno's simplest plot, and the one that
   *  answers "which column is worst" without anybody counting marks. */
  const completeness=()=>{
    const bars=profiles.map(p=>({column:p.column,
      readable:p.total-p.absent-p.mismatched,total:p.total}));
    return `<div class="quality-bars">`
      +bars.map(b=>`<div class="quality-bar-row"><span>${esc(b.column)}</span>`
        +`<div class="quality-bar"><div style="width:${((b.readable/b.total)*100).toFixed(1)}%"></div></div>`
        +`<b>${b.readable}</b></div>`).join('')
      +`</div><p class="quality-legend">Readable values, out of ${view.rows.length} records.</p>`;
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

  // OPENED ON FINDINGS WHEN THE ROWS OR THE DICTIONARY HAVE A PROBLEM. Columns nobody has described yet is a finding
  // every new table carries (experiment 172), and opening on it every time hid the column profile this dialog leads with.
  const pressing=(view.findings??[]).some(f=>f.kind!=='undescribed-column'&&f.kind!=='unconfirmed-description');
  let tab:'findings'|'columns'|'shapes'|'records'|'edits'=pressing?'findings':'columns';

  /** THE RECORDS, A PAGE AT A TIME, EACH CELL A BOX (experiment 214). What is shown is what is handed on: repairs and
   *  edits applied. Typing a value and leaving the box records an edit; nothing is written to the file. */
  const recordsTab=()=>{
    const ids=view.recordIds??[],pages=Math.max(1,Math.ceil(view.rows.length/PAGE));page=Math.min(page,pages-1);
    const from=page*PAGE,shown=view.rows.slice(from,from+PAGE);
    return `<p class="description">Each value as the steps downstream will read it. Change one and leave the box: it is `
      +`recorded as an edit on this step, with the value it replaced, and can be removed under Edits. The file is not changed.</p>`
      +`<div class="quality-records-nav"><button class="button small" data-records-page="${page-1}" ${page?'':'disabled'}>Previous</button>`
      +`<span>Records ${(from+1).toLocaleString('en')} to ${Math.min(view.rows.length,from+PAGE).toLocaleString('en')} of ${view.rows.length.toLocaleString('en')}</span>`
      +`<button class="button small" data-records-page="${page+1}" ${page<pages-1?'':'disabled'}>Next</button></div>`
      +`<div class="quality-records"><table><thead><tr><th scope="col">Record</th>${view.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>`
      +shown.map((row,k)=>{const id=ids[from+k]??String(from+k+1);
        return `<tr><th scope="row">${esc(id)}</th>${view.columns.map(c=>{const v=valueText(row[c]);
          const made=editsAt(view.edits??[]).filter(e=>e.record===id&&e.column===c),edited=made.length>0;
          return `<td${edited?` class="is-edited cell-edited" data-cell-edited title="${esc(editedTitle({from:made[0]!.from,version:made.at(-1)!.version}))}"`:''}><input aria-label="${esc(c)} of ${esc(id)}" data-edit-record="${esc(id)}" data-edit-column="${esc(c)}" value="${esc(v??'')}" placeholder="not recorded"></td>`;}).join('')}</tr>`;}).join('')
      +`</tbody></table></div>`;
  };
  const editsTab=()=>{
    const log=view.edits??[],now=editsAt(log),filled=now.filter(e=>e.from===null).length;
    const current=now.length
      ?`<p class="description">Version ${log.length}: ${now.length} value${now.length===1?'':'s'} edited by hand on this step${filled?`, ${filled} of them filling an empty cell`:''}. `
        +`Each is applied to a copy when the records are handed on, and stated in the run.`
        +(view.staleEdits?` <strong>${view.staleEdits} ${view.staleEdits===1?'is':'are'} not applied</strong>: the value it was made against is no longer there.`:'')+`</p>`
        +`<ul class="quality-edits" data-quality-edits>`+[...now].reverse().map(e=>
          `<li><code>${esc(e.column)}</code> of <strong>${esc(e.record)}</strong>: ${e.from===null?'<em>not recorded</em>':`“${esc(e.from)}”`} → `
          +`${e.to===null?'<em>emptied</em>':`“${esc(e.to)}”`} <span class="muted">version ${e.version}</span>`
          +` <button class="button small" data-remove-edit="${e.version}">Take back</button></li>`).join('')+`</ul>`
      :`<p class="description">${log.length?`Version ${log.length}: no value is edited by hand now.`:'No value has been edited by hand. Edit one under Records.'}</p>`;
    // THE HISTORY, EVERY VERSION, NOTHING DELETED: a version can be restored, and the restoring is a version too.
    const history=log.length?`<h3 class="quality-heading">History</h3><p class="description">Every change, newest first. Taking an edit back `
      +`or restoring a version adds a version; none is deleted.</p><ol class="quality-history" reversed data-edit-history>`
      +log.map((_,i)=>i).reverse().map(i=>`<li value="${versionOf(log,i)}"><strong>Version ${versionOf(log,i)}</strong>: ${esc(versionWords(log,i))} `
        +`<span class="muted">${esc((log[i]!.at??'').slice(0,16).replace('T',' '))}</span>`
        +(i<log.length-1?` <button class="button small" data-restore-version="${versionOf(log,i)}">Restore this version</button>`:' <span class="pill">Now</span>')+`</li>`).join('')
      +`<li value="0"><strong>Version 0</strong>: the records as imported <button class="button small" data-restore-version="0">Restore this version</button></li></ol>`:'';
    return current+history;
  };
  const render=()=>{
    dialog.innerHTML=`<div class="manual-head"><h2 id="data-quality-title">${esc(view.title)}</h2>`
      +`<div><button class="button primary" id="data-quality-close">Close</button></div></div>`
      +`<div class="result-switch quality-tabs" role="tablist">`
      +([...(view.findings?.length?[['findings',`Findings (${view.findings.length})`]] as const:[]),
        ['columns','Columns'],['shapes','Shapes and gaps'],
        ...(view.onEdit&&view.recordIds?[['records','Records']] as const:[]),
        ...(view.onEdit?[['edits',`Edits (${editsAt(view.edits??[]).length})`]] as const:[])] as const).map(([key,label])=>
        `<button role="tab" aria-selected="${key===tab}" data-quality-tab="${key}" `
        +`class="${key===tab?'active':''}">${label}</button>`).join('')
      +`</div>`
      +`<div class="quality-body">`
      +(tab==='records'?recordsTab():tab==='edits'?editsTab():tab==='findings'
        ?`<p class="description">What reading the file found. Every row was kept as it stands.</p>`
         +`<ul class="quality-problems" data-quality-findings>${view.findings!.slice(0,200).map(f=>
           `<li class="quality-problem">${esc(f.text)}</li>`).join('')}</ul>`
         +(view.findings!.length>200?`<p class="muted">200 of ${view.findings!.length} shown.</p>`:'')
        :tab==='shapes'
        ?`<p class="description">What is in each column, and where it is not. Drawn from the records `
         +`as the steps downstream will read them, declared repairs included.</p>`
         +`<h3 class="quality-heading">Where values are missing or unreadable</h3>`
         +missingness()
         +`<h3 class="quality-heading">How much of each column arrived</h3>`
         +completeness()
         +`<h3 class="quality-heading">What is in each column</h3>`
         +shapes()
        :`<p class="description">What this input will and will not tell the steps that read it. `
      +`A column is only ever <em>wrong</em> against something declared: where no rule has bound a `
      +`column, it is undeclared rather than mistaken, and nothing below calls it a problem.</p>`
      +(view.repairs?.length
        ?`<section class="quality-repairs"><h3>Declared repairs</h3>`
         +`<p class="description">Applied to a copy when the records are handed on. What this step `
         +`holds is exactly what was imported, so removing one restores the original values.</p>`
         +`<ul>`+view.repairs!.map((r,index)=>`<li><code>${esc(r.column)}</code> read as ${esc(r.to)}s — `
           +`${r.cast} cast${r.unreadable.length?`, ${r.unreadable.length} left unreadable`:''}`
           +` <button class="button small" data-remove-repair="${index}">Remove</button></li>`).join('')
         +`</ul></section>`
        :'')
      +profiles.map(p=>`<section class="quality-column">`
        +`<header><h3>${esc(p.column)}</h3>`
        +`<span class="quality-declared">${p.declared?`declared ${esc(p.declared)}`:'not bound by any rule'}</span></header>`
        +problems(p)
        +shape(p)
        +(view.onRepair&&p.declared&&p.repairable
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
      button.onclick=()=>{tab=button.dataset.qualityTab as typeof tab;render();};
    });
    dialog.querySelector<HTMLButtonElement>('#data-quality-close')!.onclick=close;
    dialog.querySelectorAll<HTMLButtonElement>('[data-records-page]').forEach(button=>{
      button.onclick=()=>{page=Number(button.dataset.recordsPage);render();};});
    dialog.querySelectorAll<HTMLInputElement>('[data-edit-record]').forEach(box=>{
      const held=valueText(box.value);
      box.addEventListener('change',()=>{
        const to=valueText(box.value.trim());if(to===held)return;
        refresh(view.onEdit?.({record:box.dataset.editRecord!,column:box.dataset.editColumn!,from:held,to,at:new Date().toISOString()}));});
      box.addEventListener('keydown',e=>{if(e.key==='Enter')box.blur();});
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-remove-edit]').forEach(button=>{
      button.onclick=()=>refresh(view.onRemoveEdit?.(Number(button.dataset.removeEdit)));});
    dialog.querySelectorAll<HTMLButtonElement>('[data-restore-version]').forEach(button=>{
      button.onclick=()=>refresh(view.onRestore?.(Number(button.dataset.restoreVersion)));});
    dialog.querySelectorAll<HTMLButtonElement>('[data-repair]').forEach(button=>{
      button.onclick=()=>{
        const column=button.dataset.repair!;
        const declared=view.declared[column];
        if(!declared)return;
        close();
        view.onRepair?.(column,declared);
      };
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-remove-repair]').forEach(button=>{
      button.onclick=()=>{close();view.onRemoveRepair?.(Number(button.dataset.removeRepair));};
    });
  };

  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
