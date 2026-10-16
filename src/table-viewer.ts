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
import type {Escape} from './types.js';

export interface TableView {
  title:string;
  /** Column names, in the order they should be read. */
  columns:string[];
  rows:Record<string,unknown>[];
  /** One line under the title: what this table is keyed by, what it measures, in what unit. */
  note?:string;
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
          +view.columns.map(c=>`<th>${esc(c)}</th>`).join('')+`</tr></thead><tbody>`
          +shown.map((row,i)=>`<tr><td>${i+1}</td>`
            +view.columns.map(c=>`<td>${cell(row[c])}</td>`).join('')+`</tr>`).join('')
          +`</tbody></table></div>`
        :`<div class="notice">No row matches that filter.</div>`)
      +`</div>`;
    dialog.querySelector<HTMLButtonElement>('#table-viewer-close')!.onclick=close;
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
export function tableViewOf(
  data:{keys:string[];valueField:string;unit?:string;rows:{key:Record<string,string>;value:number|null}[];rowCount:number},
  title:string,
):TableView{
  return {title,columns:[...data.keys,data.valueField],
    rows:data.rows.map(row=>({...row.key,[data.valueField]:row.value})),
    note:`Keyed by ${data.keys.join(', ')}. One value column, ${data.valueField}, `
      +`in ${data.unit?`${data.unit}`:'an unstated unit'}. ${data.rowCount} rows in all.`};
}
