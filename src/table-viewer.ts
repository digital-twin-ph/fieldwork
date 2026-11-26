import {editedTitle} from './cell-edits.js';
/** A table, at a width you can actually read it.
 *
 *  The practitioner, 2026-10-16: *"For tabular data, I should have a quick look button to browse
 *  the table as a modal. The Inspector panel is too narrow to display potentially wider tables."*
 *  Exactly so. The Inspector is 292px, and what a tabular input offered inside it was a filename,
 *  a row count and a `<details>` block of raw JSON describing the table's SHAPE -- the keys, the
 *  value field, the row total. Everything about the table except the table.
 *
 *  This is a reader, not an editor. Nothing here changes a workflow: it opens, it is read, it
 *  closes, and the step is exactly as it was. That is why it can afford to be wide.
 */
import type {DataTable} from './data-table.js';
import {wideFrame} from './data-table-ui.js';
import type {Escape} from './types.js';
import {profileColumn,type ColumnKind,type ColumnProfile,type ColumnScale} from './column-profile.js';
import {SCALE_WORDS} from './column-metadata.js';

export interface TableView {
  title:string;
  /** Column names, in the order they should be read. */
  columns:string[];
  /** What a column holds, in words, shown beside its name (a two-by-two's "a": exposed cases). */
  headings?:Record<string,string>;
  rows:Record<string,unknown>[];
  /** Cells edited by hand, by row (experiment 214): marked, with what they were on hover. */
  edited?:Map<Record<string,unknown>,import('./cell-edits.js').EditedCells>;
  /** One line under the title: what this table is keyed by, what it measures, in what unit. */
  note?:string;
  /** A WIDE READING THIS VIEW MADE AND NOBODY HAS DECLARED (2026-11-25). Quick Look widens a long table on sight --
   *  the practitioner, 2026-10-27: *"pandas does not show you a long table"* -- and every other surface shows it as
   *  stored, so one table had two shapes a click apart. Offered here so the reading can be DECLARED, which is what
   *  makes it travel: a declaration lives on the table and every surface downstream reads it.
   *
   *  Absent where the table already declares its shape, and where no wide reading could be made. */
  proposedWide?:{measureKey:string;subjectKeys:string[]};
  /** Keeps the reading above, on the table this view was opened from. */
  onDeclareWide?:(reading:{measureKey:string;subjectKeys:string[]})=>void;
  /** What a ruleset has declared each column to be, where anything has. A column nobody has
   *  bound is not wrong; it is undeclared, and the profile says so by saying nothing. */
  declared?:Record<string,ColumnKind>;
  /** What the practitioner said each column is: its scale and codes (experiment 211). */
  scales?:Record<string,ColumnScale>;
  /** Where a column came from, for the columns whose origin is not obvious from the table alone.
   *
   *  The practitioner, 2026-10-27, on reading a related table: *"pandas also gives you the
   *  original keys so you know which half of the row came from which table."* It does that with
   *  an `_x`/`_y` suffix on the column name; this says it in words above the column, because a
   *  renamed column is a different column downstream and a note is not.
   *
   *  Only the columns named here are annotated. A table whose columns all came from one place
   *  passes nothing and reads as it did. */
  origins?:Record<string,string>;
  /** WHAT A COLUMN DID IN A JOIN, marked in the heading and down the column. The practitioner, 2026-11-05: *"When we
   *  show the before and after table views with joins can we highlight the columns used as keys?"* `key`: matched on,
   *  in every Before and in After; `brought`: the column the join added, in After. A word as well as a tint, so the
   *  mark does not rest on colour alone. */
  roles?:Record<string,'key'|'brought'>;
  /** ROWS THE STEP DID NOT KEEP, shown greyed in a Before rather than left out, so what a selection removed can be
   *  read beside what it kept. The practitioner, 2026-11-06: *"it would be nice to show which rows weren't selected
   *  grayed out"*. `why` says the rule, under the title. */
  excluded?:{rows:Set<Record<string,unknown>>; why:string};
  /** Offered per column when a repair is possible and the caller can carry it out. Given the
   *  column and told what the practitioner asked for; the dialog closes and the caller decides
   *  what to record. */
  onRepair?:(column:string,to:ColumnKind)=>void;
  /** The other sides of this step, offered as a toggle where a step has any. */
  steps?:{labels:string[];at:number;go:(index:number)=>void};
}

/** BEFORE AND AFTER ONE STEP. The practitioner, 2026-11-01, on a chain of table widgets: the output
 *  should be viewable *"to enable the user to see the evolution of the table through that part of
 *  the workflow"*, and a before and after toggle *"would be useful indeed."* Two inputs are two
 *  befores, so each is named. No input means nothing to compare, so no toggle. */
export function stepLabels(inputs:readonly string[]):string[]{
  return [...(inputs.length===1?['Before']:inputs.map(name=>`Before: ${name}`)),'After'];
}

/** What changed, in the After view's note, for a step with one table in. */
export const shapeChange=(before:TableView):string=>
  `Before this step: ${before.rows.length} rows, ${before.columns.length} columns.`;

/** Opens on After, which is what the button promises. Each press reopens with the other side. */
export function openStepViewer(views:readonly TableView[],labels:readonly string[],esc:Escape,
  at=views.length-1):void{
  openTableViewer({...views[at]!,...(views.length>1?{steps:{labels:[...labels],at,
    go:index=>openStepViewer(views,labels,esc,index)}}:{})},esc);
}

/** Beyond this, rendering every row costs more than a quick look is worth. The count always
 *  tells the truth about how many there are, and the heading says when it is showing fewer. */
const RENDER_CEILING=2000;

export function openTableViewer(view:TableView,esc:Escape):void{
  const dialog=document.createElement('dialog');
  dialog.id='table-viewer';
  dialog.setAttribute('aria-labelledby','table-viewer-title');
  const close=()=>{dialog.close();dialog.remove();};

  let filter='';
  const matching=()=>{
    const needle=filter.trim().toLowerCase();
    if(!needle)return view.rows;
    return view.rows.filter(row=>view.columns.some(column=>
      String(row[column]??'').toLowerCase().includes(needle)));
  };

  // A value nobody recorded is shown AS missing. An empty cell reads like a tidy zero, and the
  // difference between the two is the thing a rule over this column will turn on.
  const cell=(value:unknown)=>value===null||value===undefined||value===''
    ?`<em class="record-missing">not recorded</em>`:esc(String(value));

  // Computed once over every row, not over the page being shown: a profile of the first ten
  // rows would be a profile of nothing, and the number a reader acts on has to be the whole
  // column's.
  const profiles=new Map<string,ColumnProfile>(view.columns.map(column=>
    [column,profileColumn(column,view.rows.map(row=>row[column]),view.declared?.[column],view.scales?.[column])]));

  /** What the file says about this column, in the header, above the values it says it about. */
  const summary=(p:ColumnProfile)=>{
    const parts:string[]=[];
    if(p.declared)parts.push(`declared ${p.declared}`);
    if(p.scale)parts.push(SCALE_WORDS[p.scale].toLowerCase());
    if(p.absent)parts.push(`<b class="profile-flag">${p.absent} absent</b>`);
    if(p.mismatched)parts.push(`<b class="profile-flag">${p.mismatched} not ${p.declared}s</b>`);
    if(p.numeric)parts.push(`min ${esc(trim(p.numeric.min))} · median ${esc(trim(p.numeric.median))} · max ${esc(trim(p.numeric.max))}`);
    // "Beyond the fence", never "outliers". Whether a value is an outlier is a judgement about
    // the thing measured; this is a rank-based prompt to go and look at that many values.
    if(p.numeric?.beyondFence)parts.push(`${p.numeric.beyondFence} beyond 1.5×IQR`);
    if(p.distinct!==undefined)parts.push(`${p.distinct} distinct`);
    if(p.frequencies?.length)parts.push(`${p.scale==='ordinal'?'in order':'most often'} ${p.frequencies.slice(0,3)
      .map(f=>`${esc(f.value)}${f.label?` ${esc(f.label)}`:''} (${f.count})`).join(', ')}`);
    return parts.join(' · ');
  };
  const trim=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(2);

  /** A cell that does not match what its column was declared to be. */
  const mismatches=(column:string,value:unknown)=>{
    const declared=view.declared?.[column];
    if(declared===undefined||value===null||value===undefined||value==='')return false;
    return declared==='number'?!(typeof value==='number'&&Number.isFinite(value))
      :declared==='boolean'?typeof value!=='boolean':false;
  };

  const render=()=>{
    const rows=matching(),shown=rows.slice(0,RENDER_CEILING);
    dialog.innerHTML=`<div class="manual-head"><h2 id="table-viewer-title">${esc(view.title)}</h2>`
      +`<div><button class="button primary" id="table-viewer-close">Close</button></div></div>`
      +`<div class="table-viewer-body">`
      +(view.steps?`<div class="table-viewer-steps" role="group" aria-label="Before and after this step">`
        +view.steps.labels.map((label,i)=>`<button class="button small${i===view.steps!.at?' primary':''}" `
          +`data-table-step="${i}" aria-pressed="${i===view.steps!.at}">${esc(label)}</button>`).join('')
        +`</div>`:'')
      +(view.note?`<p class="description">${esc(view.note)}</p>`:'')
      // SAID WHERE THE SHAPE IS NOT THE TABLE'S OWN (2026-11-25). The practitioner: *"For Quick Look if the table
      // came in natively long can we give the user a hint while displaying it wide?"*
      //
      // Quick Look widens a long table on sight, and every other surface shows it as stored -- so one table has two
      // shapes a click apart, and nothing said which was which. A reader who takes this for the table's own shape
      // will be surprised by the next dialog they open.
      //
      // THE HINT AND THE OFFER ARE SEPARATE. The hint is about what is on the screen, so it shows wherever this view
      // widened an undeclared table; the button is an action on the table, so it shows only where there is a table
      // to write it to. A step's computed output has no stored table yet and still gets the hint.
      +(view.proposedWide
        ?`<p class="description table-wide-offer"><strong>This table is stored long</strong>, one row per value. `
          +`It is shown here wide: one row per ${esc(view.proposedWide.subjectKeys.join(' and '))}, `
          +`columns from ${esc(view.proposedWide.measureKey)}. Elsewhere it is shown as it is stored.`
          +(view.onDeclareWide
            ?` <button type="button" class="button small" data-declare-wide>Always show this table wide</button>`:'')
          +'</p>'
        :'')
      +(view.excluded?.rows.size?`<p class="description table-excluded-note"><span class="table-excluded-swatch"></span>`
        +`${view.excluded.rows.size.toLocaleString('en-US')} of ${view.rows.length.toLocaleString('en-US')} rows greyed: not kept by this step, ${esc(view.excluded.why)}.</p>`:'')
      +`<div class="record-controls">`
      +`<input id="table-viewer-filter" type="search" placeholder="Filter rows…" value="${esc(filter)}" aria-label="Filter rows">`
      +`<span class="records-rows">${rows.length} of ${view.rows.length} rows`
      +`${shown.length<rows.length?`, showing the first ${shown.length}`:''}</span></div>`
      +(shown.length
        ?`<div class="table-viewer-table" tabindex="0" role="region" aria-label="Table"><table><thead><tr><th>#</th>`
          +view.columns.map(c=>{
            const p=profiles.get(c)!,said=summary(p);
            const from=view.origins?.[c];
            const role=view.roles?.[c];
            return `<th${role?` class="column-role-${role}" data-column-role="${role}"`:''}>${esc(c)}${view.headings?.[c]?`<span class="meaning">: ${esc(view.headings[c]!)}</span>`:''}`
              +(role?`<span class="column-role">${role==='key'?'matched on':'brought across'}</span>`:'')
              +(from?`<span class="column-origin">${esc(from)}</span>`:'')
              +(said?`<span class="profile">${said}</span>`:'')
              // The repair, where the column has values that would survive one and the caller
              // can carry it out. Named with its count, so what it will and will not fix is
              // stated before it is pressed rather than after.
              +(view.onRepair&&p.declared&&p.repairable
                ?`<button class="button small" data-repair="${esc(c)}">Read ${p.repairable} value${p.repairable===1?'':'s'} as ${p.declared}s</button>`
                :'')
              +`</th>`;
          }).join('')+`</tr></thead><tbody>`
          +shown.map((row,i)=>`<tr${view.excluded?.rows.has(row)?' class="row-excluded" data-row-excluded':''}><td>${i+1}</td>`
            +view.columns.map(c=>{const was=view.edited?.get(row)?.[c];
              const classes=[mismatches(c,row[c])?'cell-mismatch':'',view.roles?.[c]?`column-role-${view.roles[c]}`:'',was?'cell-edited':''].filter(Boolean);
              return `<td${classes.length?` class="${classes.join(' ')}"`:''}${was?` data-cell-edited title="${esc(editedTitle(was))}"`:''}>${cell(row[c])}</td>`;}).join('')+`</tr>`).join('')
          +`</tbody></table></div>`
        :`<div class="notice">No row matches that filter.</div>`)
      +`</div>`;
    dialog.querySelector<HTMLButtonElement>('#table-viewer-close')!.onclick=close;
    dialog.querySelectorAll<HTMLButtonElement>('[data-table-step]').forEach(button=>{
      button.onclick=()=>{close();view.steps!.go(Number(button.dataset.tableStep));};
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-repair]').forEach(button=>{
      button.onclick=()=>{
        const column=button.dataset.repair!;
        const declared=view.declared?.[column];
        if(!declared||!view.onRepair)return;
        close();
        view.onRepair(column,declared);
      };
    });
    // BOUND ON EVERY RENDER, with the rest. It was bound once, after the first render, while filtering rebuilds the
    // dialog's markup on each keystroke: the button stayed on the screen and did nothing (review of 0.196.0).
    dialog.querySelector<HTMLButtonElement>('[data-declare-wide]')?.addEventListener('click',()=>{
      if(!view.proposedWide||!view.onDeclareWide)return;
      view.onDeclareWide(view.proposedWide);
      close();
    });
    const search=dialog.querySelector<HTMLInputElement>('#table-viewer-filter')!;
    search.oninput=()=>{
      filter=search.value;
      const at=search.selectionStart;
      render();
      // Re-rendering replaces the input, so the caret is put back where the typist left it.
      const again=dialog.querySelector<HTMLInputElement>('#table-viewer-filter')!;
      again.focus();
      if(at!==null)again.setSelectionRange(at,at);
    };
  };

  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}

/** A long-format table as columns and rows: the key columns it is keyed by, then its one value
 *  field. The shape the table widget already declares, read the way a reader reads it. */
/** A table as a QUICK LOOK shows it: a frame where one can be drawn, and the stored rows where
 *  one cannot.
 *
 *  This flattened every table to its storage -- `[...keys, valueField]`, one row per key-value
 *  pair -- so Quick Look on Snow's Table VIII showed 224 rows of `sub_district | measure | count`.
 *  The practitioner, 2026-10-27: *"If I showed the long table from South London for this Friday
 *  demo, I would probably get weird looks."* And on the shape itself: *"pandas does not show you
 *  a long table."*
 *
 *  Quick Look is the view a practitioner opens to CHECK A STEP, so it met the internal long shape
 *  at the one moment the point was to read the data. `wideFrame` refuses where the keys do not
 *  resolve -- an assignment table keeps its value column's heading -- and the stored rows are
 *  shown then, which is honest about a table nobody can pivot. */
export function tableViewOf(
  data:{kind?:string;keys:string[];valueField:string;unit?:string;rows:{key:Record<string,string>;value:number|null}[];rowCount:number;headings?:Record<string,string>},
  title:string,
):TableView{
  const unit=data.unit?`${data.unit}`:'an unstated unit';
  const frame=wideFrame({kind:'data-table',...data} as DataTable);
  if(frame)
    return {title,...(data.headings?{headings:data.headings}:{}),
      // PROPOSED ONLY WHERE NOBODY HAS SAID. A table Fieldwork melted already carries its reading, and re-offering
      // it would ask the practitioner to declare what the file already said.
      ...((data as {wide?:unknown;shownWide?:unknown}).wide||(data as {shownWide?:unknown}).shownWide
        ?{}:{proposedWide:{measureKey:frame.measureKey,subjectKeys:frame.subjectKeys}}),
      columns:[frame.subject,...frame.attributes,...frame.columns],
      rows:frame.rows.map(row=>({[frame.subject]:row.label,
        ...Object.fromEntries(frame.attributes.map((name,i)=>[name,row.attributes[i]])),
        ...Object.fromEntries(frame.columns.map((name,i)=>[name,row.cells[i]??null]))})),
      note:`${frame.rows.length} ${frame.subject}`
        +(frame.attributes.length?`, with ${frame.attributes.join(' and ')}`:'')
        +`, and ${frame.columns.length} variable${frame.columns.length===1?'':'s'} in ${unit}. `
        +`${data.rowCount} values in all.`};
  const edited=new Map<Record<string,unknown>,import('./cell-edits.js').EditedCells>();
  return {title,columns:[...data.keys,data.valueField],
    rows:data.rows.map(row=>{const r={...row.key,[data.valueField]:row.value} as Record<string,unknown>;
      const e=(row as {edited?:import('./cell-edits.js').EditedCells}).edited;if(e)edited.set(r,e);return r;}),
    ...(edited.size?{edited}:{}),
    note:`Keyed by ${data.keys.join(', ')}. One value column, ${data.valueField}, `
      +`in ${unit}. ${data.rowCount} rows in all.`};
}
