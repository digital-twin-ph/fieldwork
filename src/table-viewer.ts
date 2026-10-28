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
import {profileColumn,type ColumnKind,type ColumnProfile} from './column-profile.js';

export interface TableView {
  title:string;
  /** Column names, in the order they should be read. */
  columns:string[];
  rows:Record<string,unknown>[];
  /** One line under the title: what this table is keyed by, what it measures, in what unit. */
  note?:string;
  /** What a ruleset has declared each column to be, where anything has. A column nobody has
   *  bound is not wrong; it is undeclared, and the profile says so by saying nothing. */
  declared?:Record<string,ColumnKind>;
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
  /** Offered per column when a repair is possible and the caller can carry it out. Given the
   *  column and told what the practitioner asked for; the dialog closes and the caller decides
   *  what to record. */
  onRepair?:(column:string,to:ColumnKind)=>void;
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
    [column,profileColumn(column,view.rows.map(row=>row[column]),view.declared?.[column])]));

  /** What the file says about this column, in the header, above the values it says it about. */
  const summary=(p:ColumnProfile)=>{
    const parts:string[]=[];
    if(p.declared)parts.push(`declared ${p.declared}`);
    if(p.absent)parts.push(`<b class="profile-flag">${p.absent} absent</b>`);
    if(p.mismatched)parts.push(`<b class="profile-flag">${p.mismatched} not ${p.declared}s</b>`);
    if(p.numeric)parts.push(`min ${esc(trim(p.numeric.min))} · median ${esc(trim(p.numeric.median))} · max ${esc(trim(p.numeric.max))}`);
    // "Beyond the fence", never "outliers". Whether a value is an outlier is a judgement about
    // the thing measured; this is a rank-based prompt to go and look at that many values.
    if(p.numeric?.beyondFence)parts.push(`${p.numeric.beyondFence} beyond 1.5×IQR`);
    if(p.distinct!==undefined)parts.push(`${p.distinct} distinct`);
    if(p.frequencies?.length)parts.push(`most often ${p.frequencies.slice(0,3)
      .map(f=>`${esc(f.value)} (${f.count})`).join(', ')}`);
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
      +(view.note?`<p class="description">${esc(view.note)}</p>`:'')
      +`<div class="record-controls">`
      +`<input id="table-viewer-filter" type="search" placeholder="Filter rows…" value="${esc(filter)}" aria-label="Filter rows">`
      +`<span class="records-rows">${rows.length} of ${view.rows.length} rows`
      +`${shown.length<rows.length?`, showing the first ${shown.length}`:''}</span></div>`
      +(shown.length
        ?`<div class="table-viewer-table"><table><thead><tr><th>#</th>`
          +view.columns.map(c=>{
            const p=profiles.get(c)!,said=summary(p);
            const from=view.origins?.[c];
            return `<th>${esc(c)}`
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
          +shown.map((row,i)=>`<tr><td>${i+1}</td>`
            +view.columns.map(c=>`<td${mismatches(c,row[c])?' class="cell-mismatch"':''}>${cell(row[c])}</td>`).join('')+`</tr>`).join('')
          +`</tbody></table></div>`
        :`<div class="notice">No row matches that filter.</div>`)
      +`</div>`;
    dialog.querySelector<HTMLButtonElement>('#table-viewer-close')!.onclick=close;
    dialog.querySelectorAll<HTMLButtonElement>('[data-repair]').forEach(button=>{
      button.onclick=()=>{
        const column=button.dataset.repair!;
        const declared=view.declared?.[column];
        if(!declared||!view.onRepair)return;
        close();
        view.onRepair(column,declared);
      };
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
  data:{kind?:string;keys:string[];valueField:string;unit?:string;rows:{key:Record<string,string>;value:number|null}[];rowCount:number},
  title:string,
):TableView{
  const unit=data.unit?`${data.unit}`:'an unstated unit';
  const frame=wideFrame({kind:'data-table',...data} as DataTable);
  if(frame)
    return {title,
      columns:[frame.subject,...frame.attributes,...frame.columns],
      rows:frame.rows.map(row=>({[frame.subject]:row.label,
        ...Object.fromEntries(frame.attributes.map((name,i)=>[name,row.attributes[i]])),
        ...Object.fromEntries(frame.columns.map((name,i)=>[name,row.cells[i]??null]))})),
      note:`${frame.rows.length} ${frame.subject}`
        +(frame.attributes.length?`, with ${frame.attributes.join(' and ')}`:'')
        +`, and ${frame.columns.length} variable${frame.columns.length===1?'':'s'} in ${unit}. `
        +`${data.rowCount} values in all.`};
  return {title,columns:[...data.keys,data.valueField],
    rows:data.rows.map(row=>({...row.key,[data.valueField]:row.value})),
    note:`Keyed by ${data.keys.join(', ')}. One value column, ${data.valueField}, `
      +`in ${unit}. ${data.rowCount} rows in all.`};
}
