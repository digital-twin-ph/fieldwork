/** MAPPING A TABLE'S VARIABLES ONTO a, b, c AND d, in a dialog of its own.
 *
 *  The practitioner, 2026-10-31: *"The data tables are inputs to the computational epi widgets
 *  (2x2) so columns (variables) can be mapped to 2x2 cells."* And then: *"I think in the 2x2
 *  widget, that mapping exercise, being important, deserves a modal dialog."*
 *
 *  WHY IT DESERVES ONE. Every measure a two-by-two reports is a function of four letters, and
 *  which rows of a table become which letter is the step where the arithmetic acquires its
 *  meaning. It was six fields in an Inspector column -- an exposure column, two of its values, an
 *  outcome column, two of ITS values -- from which a reader could not see the resulting table at
 *  all. The six parameters already encode the mapping; `cellOf` already IS the
 *  letter-to-(column, value) function. What was missing was ever showing it.
 *
 *  THE MAPPING IS column+value -> CELL, NEVER cell -> number, and the difference is the whole
 *  safety of the widget. Pointing at four numbers directly would be more direct and would lose
 *  the four refusals the derivation gets for free -- above all `strataLeftOut`, which is why
 *  South London's N is 186,787 against a table of 486,936 and which can only be known by a widget
 *  that sees the whole table. So this dialog chooses COLUMNS AND VALUES and shows the cells that
 *  result; it never lets a cell be typed.
 *
 *  IT SHOWS WHAT THE MAPPING PRODUCES WHILE IT IS BEING MADE. Each cell displays its letter, the
 *  two conditions that define it, and the count currently matching -- or the reason there is
 *  none. A mapping whose consequence is invisible until the step runs is a mapping made blind,
 *  and the two failures this widget refuses (a cell matching no row, and a cell matching several)
 *  are both visible here before anything is computed. */
import type {DataTable} from './data-table.js';
import type {Escape,ParamsByType} from './types.js';

export type MappingParams=ParamsByType['two_by_two'];

/** What one cell of the proposed mapping currently resolves to.
 *
 *  `rows` is how many rows of the table match both conditions. Zero and two are both wrong and
 *  wrong DIFFERENTLY -- nobody counted it, against the table not being totalled -- so the count
 *  is carried rather than a boolean. */
export interface CellResolution {
  letter:'a'|'b'|'c'|'d';
  exposure:string; outcome:string;
  rows:number;
  value:number|null;
  problem:string|null;
}

const matching=(table:DataTable,request:MappingParams,exposure:string,outcome:string)=>
  table.rows.filter(row=>row.key[request.exposureColumn]===exposure
    &&row.key[request.outcomeColumn]===outcome);

/** THE FOUR CELLS THE CURRENT MAPPING WOULD PRODUCE, with what is wrong where anything is.
 *
 *  The same conditions `cellOf` enforces at run time, reported here instead of thrown: an
 *  Inspector that waits for a run to say a cell is ambiguous has made the practitioner guess. */
export function resolveCells(table:DataTable|undefined,
  request:MappingParams):CellResolution[]{
  const {exposed,unexposed,caseValue,nonCaseValue}=request;
  const plan:[CellResolution['letter'],string,string][]=[
    ['a',exposed,caseValue],['b',exposed,nonCaseValue],
    ['c',unexposed,caseValue],['d',unexposed,nonCaseValue]];
  return plan.map(([letter,exposure,outcome])=>{
    if(!table||!request.exposureColumn||!request.outcomeColumn||!exposure||!outcome)
      return {letter,exposure,outcome,rows:0,value:null,problem:'Not mapped yet.'};
    const rows=matching(table,request,exposure,outcome);
    if(!rows.length)return {letter,exposure,outcome,rows:0,value:null,
      problem:'No row has this combination. A missing cell is not a zero: nobody counted it.'};
    if(rows.length>1)return {letter,exposure,outcome,rows:rows.length,value:null,
      problem:`${rows.length} rows have this combination, so the cell is not one number. `
        +'Total the table within these two columns first.'};
    const value=rows[0].value;
    if(value===null)return {letter,exposure,outcome,rows:1,value:null,
      problem:'That cell is empty. An empty cell is unknown, not zero.'};
    return {letter,exposure,outcome,rows:1,value,problem:null};
  });
}

/** Values of the exposure column this mapping does not name.
 *
 *  Shown in the dialog rather than discovered in a warning after the run, because it is the
 *  commonest way a two-by-two misleads and because it is the one thing a cell-to-number mapping
 *  could never report. */
export const strataNotNamed=(table:DataTable|undefined,request:MappingParams):string[]=>{
  if(!table||!request.exposureColumn)return [];
  const named=new Set([request.exposed,request.unexposed].filter(Boolean));
  return [...new Set(table.rows.map(row=>row.key[request.exposureColumn]))]
    .filter(value=>value!==undefined&&value!==''&&!named.has(value));
};

const option=(value:string,selected:string,esc:Escape):string=>
  `<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(value)}</option>`;

/** The dialog's markup, built from the table and the mapping so far.
 *
 *  Separated from the dialog that shows it so the arrangement can be asserted without a browser:
 *  the thing worth testing here is which cell gets which condition, and that is a string. */
export function mappingMarkup(table:DataTable|undefined,request:MappingParams,
  esc:Escape):string{
  const columns=table?.keys??[];
  const valuesOf=(column:string):string[]=>table&&column
    ?[...new Set(table.rows.map(r=>r.key[column]).filter(v=>v!==undefined&&v!==''))].sort()
    :[];
  const cells=resolveCells(table,request);
  const left=strataNotNamed(table,request);
  const picker=(id:string,key:keyof MappingParams,label:string,choices:string[]):string=>
    `<label class="field-label" for="${id}">${esc(label)}</label>`
    +`<select id="${id}" data-mapping="${esc(String(key))}"${choices.length?'':' disabled'}>`
    +`<option value="">Choose…</option>`
    +choices.map(v=>option(v,String(request[key]??''),esc)).join('')+`</select>`;
  const cellBox=(c:CellResolution):string=>
    `<td class="map-cell${c.problem?' map-cell-problem':''}">`
    +`<span class="tbt-letter">${c.letter}</span>`
    +(c.value===null?`<span class="map-problem">${esc(c.problem??'')}</span>`
      :`<span class="tbt-value">${esc(c.value.toLocaleString('en-US'))}</span>`)
    +`</td>`;
  return `<div class="mapping-body">`
    +`<p class="description">Every measure a two-by-two reports is a function of these four `
    +`letters. Choose the columns and the values; the cells follow, and the step reads the whole `
    +`table so it can still tell you what you left out.</p>`
    +`<div class="mapping-grid">`
    +`<div class="field">${picker('map-exposure-column','exposureColumn','Exposure column',columns)}</div>`
    +`<div class="field">${picker('map-exposed','exposed','Exposed value',valuesOf(request.exposureColumn))}</div>`
    +`<div class="field">${picker('map-unexposed','unexposed','Unexposed value',valuesOf(request.exposureColumn))}</div>`
    +`<div class="field">${picker('map-outcome-column','outcomeColumn','Outcome column',columns)}</div>`
    +`<div class="field">${picker('map-case','caseValue','Case value',valuesOf(request.outcomeColumn))}</div>`
    +`<div class="field">${picker('map-noncase','nonCaseValue','Non-case value',valuesOf(request.outcomeColumn))}</div>`
    +`</div>`
    +`<table class="two-by-two mapping-preview"><thead><tr>`
    +`<th scope="col">${esc(request.exposureColumn||'exposure')}</th>`
    +`<th scope="col">${esc(request.caseValue||'case')}</th>`
    +`<th scope="col">${esc(request.nonCaseValue||'non-case')}</th>`
    +`</tr></thead><tbody>`
    +`<tr><th scope="row">${esc(request.exposed||'exposed')}</th>`
    +cellBox(cells[0])+cellBox(cells[1])+`</tr>`
    +`<tr><th scope="row">${esc(request.unexposed||'unexposed')}</th>`
    +cellBox(cells[2])+cellBox(cells[3])+`</tr>`
    +`</tbody></table>`
    // WHAT THE MAPPING LEAVES OUT, before it is used rather than after. South London's exposure
    // column holds a third value -- the sub-districts both companies supplied -- and a mapping
    // that names two of three is correct and incomplete, which are different things.
    +(left.length
      ?`<div class="notice notice-warning">Not named by this mapping: `
        +left.map(v=>`<b>${esc(v)}</b>`).join(', ')
        +`. Those rows are in neither group, so the totals will be of the two named values and `
        +`not of the table.</div>`
      :'')
    +`</div>`;
}

/** Open the mapping dialog. `onChange` is called with the whole updated mapping, so the caller
 *  writes it through its own `change()` gate rather than this module reaching into a workflow. */
export function openMappingDialog(table:DataTable|undefined,request:MappingParams,esc:Escape,
  onChange:(next:MappingParams)=>void):void{
  const dialog=document.createElement('dialog');
  dialog.id='two-by-two-mapping';
  dialog.setAttribute('aria-labelledby','two-by-two-mapping-title');
  let current={...request};
  const close=()=>{dialog.close();dialog.remove();};
  const render=()=>{
    dialog.innerHTML=`<div class="manual-head">`
      +`<h2 id="two-by-two-mapping-title">Map the table onto the two-by-two</h2>`
      +`<div><button class="button primary" id="mapping-close">Done</button></div></div>`
      +mappingMarkup(table,current,esc);
    dialog.querySelector<HTMLButtonElement>('#mapping-close')!.onclick=close;
    dialog.querySelectorAll<HTMLSelectElement>('[data-mapping]').forEach(select=>{
      select.onchange=()=>{
        const key=select.dataset.mapping as keyof MappingParams;
        current={...current,[key]:select.value} as MappingParams;
        // CHANGING A COLUMN DROPS THE VALUES CHOSEN FROM THE OLD ONE. They name values that no
        // longer exist, and leaving them would show a mapping whose cells cannot resolve while
        // the fields still read as answered.
        if(key==='exposureColumn')current={...current,exposed:'',unexposed:''};
        if(key==='outcomeColumn')current={...current,caseValue:'',nonCaseValue:''};
        onChange(current);
        render();
      };
    });
  };
  render();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
