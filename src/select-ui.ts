/** SELECT ROWS BY VALUE, IN THE STANDARD DIALOG (experiment 186).
 *
 *  The Inspector says in one sentence what the step keeps; the column, the values or the range, and the preview of
 *  what they keep are here, and nothing reaches the workflow until Apply. The controls keep the ids they had in the
 *  Inspector, so a manual names the same control in its new place. */
import type {DataTable} from './data-table.js';
import type {ParamsByType,Escape} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {dataTableMarkup} from './data-table-ui.js';
import {selectRows,selectRange,orderOf,rangeSentence,type SelectResult} from './select-rows.js';

type SelectParams=ParamsByType['select_rows'];
export interface SelectDraft {keyColumn:string; values:string[]; mode:'values'|'leave-out'|'range'; range:{from:string;to:string}}

export function selectDraftOf(p:SelectParams):SelectDraft{
  return {keyColumn:p.keyColumn,values:[...p.values],mode:p.range?'range':p.leaveOut?'leave-out':'values',
    range:{from:p.range?.from??'',to:p.range?.to??''}};
}

/** What Apply writes. The ticked values are kept when a range is chosen, so going back to the list loses nothing. */
export function applySelectDraft(p:SelectParams,draft:SelectDraft):void{
  p.keyColumn=draft.keyColumn;
  p.values=draft.values.map(v=>v.trim()).filter(Boolean);
  if(draft.mode==='range'){p.range={from:draft.range.from.trim(),to:draft.range.to.trim()};delete p.leaveOut;}
  else{delete p.range;if(draft.mode==='leave-out')p.leaveOut=true;else delete p.leaveOut;}
}

/** THE INSPECTOR'S ONE SENTENCE: what the step will keep, with its settings as they are. */
export function selectSentence(p:SelectParams):string{
  if(!p.keyColumn)return 'Choose a column, and the values to keep, in Configure…';
  if(p.range){const from=p.range.from.trim(),to=p.range.to.trim();
    return from||to?`Keeps the rows with ${rangeSentence(p.keyColumn,from,to)}, both ends included.`
      :`Keeps a range of ${p.keyColumn}: give it a from, a to, or both, in Configure…`;}
  const named=p.values.filter(Boolean);
  if(!named.length)return `Choose the values of ${p.keyColumn} to ${p.leaveOut?'leave out':'keep'}, in Configure…`;
  const list=named.length>6?`${named.slice(0,6).join(', ')} and ${named.length-6} more`:named.join(', ');
  return p.leaveOut?`Keeps every row except those whose ${p.keyColumn} is ${list}.`
    :`Keeps the rows whose ${p.keyColumn} is ${list}${named.length>1?', in that order':''}.`;
}

/** What the draft would keep of the table, or why it cannot. */
function selection(table:DataTable,draft:SelectDraft):SelectResult|{refusal:string}{
  try{return draft.mode==='range'?selectRange(table,draft.keyColumn,draft.range.from,draft.range.to)
    :selectRows(table,draft.keyColumn,draft.values,draft.mode==='leave-out');}
  catch(error){return {refusal:error instanceof Error?error.message:String(error)};}
}

export interface SelectConfigView {
  step:string;
  sourceLabel:string;
  /** Each key column, with the values it holds where they are on this device (empty where they are not). */
  shape:Record<string,string[]>;
  /** The table, where it can be resolved without a run; absent means the preview waits for one. */
  table?:DataTable;
  initial:SelectDraft;
  apply:(draft:SelectDraft)=>void;
}

const count=(n:number)=>n.toLocaleString();

export function openSelectConfig(view:SelectConfigView,esc:Escape):void{
  // A LONG LIST IS SEARCHED, not scrolled. The search only hides boxes, so narrowing unticks nothing; it is a reading
  // aid, not a setting, so it is kept here and survives the rebuild a tick causes.
  let filterText='',tickedOnly=false;
  const columns=Object.keys(view.shape);

  openConfigDialog<SelectDraft>({
    id:'select-config',widget:'Select rows by value',step:view.step,draft:view.initial,
    sections:draft=>{
      const held=view.shape[draft.keyColumn]??[],order=orderOf(held);
      // The column is known but its values are not: a table whose rows are not on this device yet.
      const unseen=!held.length&&!!draft.keyColumn&&draft.keyColumn in view.shape;
      const rangeOffered=!!order||unseen||draft.mode==='range';
      const keep=draft.mode==='leave-out'?'Values to leave out':'Values to keep';

      let settings=`<p class="description">Keeps only the rows of <strong>${esc(view.sourceLabel)}</strong> whose chosen `
        +'column holds the values you name, in the order you name them.</p>'
        +`<div class="field"><label class="field-label" for="select-key">Key column to choose by</label>`
        +`<select id="select-key"${columns.length?'':' disabled'}>`
        +(columns.length?(draft.keyColumn&&columns.includes(draft.keyColumn)?'':'<option value="">Choose a column…</option>')
          :`<option value="">Connect a table first</option>`)
        +columns.map(c=>`<option value="${esc(c)}"${c===draft.keyColumn?' selected':''}>${esc(c)}</option>`).join('')
        +'</select></div>';
      if(draft.keyColumn){
        settings+=`<div class="field"><label class="field-label" for="select-mode">Keep</label><select id="select-mode">`
          +`<option value="values"${draft.mode==='values'?' selected':''}>The values I tick</option>`
          +`<option value="leave-out"${draft.mode==='leave-out'?' selected':''}>Every value except those I tick</option>`
          +(rangeOffered?`<option value="range"${draft.mode==='range'?' selected':''}>A range of `
            +`${order==='date'?'dates':order==='number'?'numbers':'dates or numbers'}</option>`:'')
          +'</select></div>';
        if(draft.mode==='range'){
          const sorted=held.filter(Boolean).sort(order==='number'?(a,b)=>Number(a)-Number(b):undefined);
          const kind=!order?'text':order==='number'?'number':sorted.every(v=>v.length===10)?'date':'text';
          const end=(id:string,key:'from'|'to',label:string)=>`<label class="field-label" for="${id}">${label}</label>`
            +`<input id="${id}" type="${kind}" data-select-range="${key}" value="${esc(draft.range[key])}"`
            +(sorted.length?` min="${esc(sorted[0]!)}" max="${esc(sorted.at(-1)!)}"`:'')
            +` placeholder="${esc(sorted.length?(key==='from'?sorted[0]!:sorted.at(-1)!):key==='from'?'for example 2023-06-01':'for example 2023-06-14')}">`;
          settings+=`<div class="field">${end('select-from','from','From')}${end('select-to','to','To')}`
            +'<p class="description">Both ends are kept. Leave one empty to run from the start or to the end. '
            +(sorted.length?`${esc(draft.keyColumn)} runs from ${esc(sorted[0]!)} to ${esc(sorted.at(-1)!)}; rows keep the table’s order.`
              :'This table’s values are not on this device yet, so the range is checked when the workflow runs. Dates are written year-month-day.')
            +'</p></div>';
        }else if(held.length){
          settings+=`<fieldset class="field"><legend class="field-label">${keep}</legend>`
            +(held.length>12
              ?`<div class="select-filter"><input id="select-filter" type="search" placeholder="Find a value…" aria-label="Find a value" value="${esc(filterText)}">`
                +`<label class="check"><input type="checkbox" id="select-ticked-only"${tickedOnly?' checked':''}> Ticked only</label>`
                +`<p class="description" id="select-count">${draft.values.length} of ${held.length} ticked</p></div>`
              :'')
            +'<div class="select-values">'
            +held.map(v=>`<label class="check"><input type="checkbox" data-select-value="${esc(v)}"${draft.values.includes(v)?' checked':''}> ${esc(v)}</label>`).join('')
            // A VALUE THE STEP HOLDS AND THE TABLE DOES NOT still gets a box, marked, so it can be seen and unticked.
            +draft.values.filter(v=>!held.includes(v)).map(v=>`<label class="check absent"><input type="checkbox" data-select-value="${esc(v)}" checked> `
              +`${esc(v)} <span class="absent-note">not in this table</span></label>`).join('')
            +'</div></fieldset>';
        }else{
          settings+=`<div class="field"><label class="field-label" for="select-values">${keep}, one per line</label>`
            +`<textarea id="select-values" rows="4">${esc(draft.values.join('\n'))}</textarea></div>`;
        }
      }

      if(!draft.keyColumn)return {settings,preview:'<p class="muted">Choose the column to choose rows by.</p>'};
      if(!view.table)return {settings,preview:'<p class="muted">Run the workflow once the table is connected, and the rows '
        +'these settings keep are shown here before they are applied.</p>'};
      const picked=selection(view.table,draft);
      if('refusal' in picked)return {settings,message:{tone:'refusal',text:picked.refusal},blocked:true};
      const preview=`<p class="select-preview-count">Keeps <strong>${count(picked.kept)}</strong> of `
        +`${count(picked.kept+picked.dropped)} rows; ${count(picked.dropped)} left out.</p>`
        +`<div class="relate-preview">${dataTableMarkup(picked.table,esc,{pageSize:12,roles:{[draft.keyColumn]:'key'}})}</div>`;
      const decisions=picked.absent.length
        ?`<p>${picked.absent.length===1?'This value is':'These values are'} named and not in the table: `
          +picked.absent.map(v=>`<strong>${esc(v)}</strong>`).join(', ')
          +'. Each run reports '+(picked.absent.length===1?'it':'them')+', because asking for a row that is not there is '
          +'usually a typo or a changed table upstream. Untick '+(picked.absent.length===1?'it':'them')+' to stop.</p>'
        :undefined;
      return {settings,preview,...(decisions?{decisions}:{})};
    },
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLSelectElement>('#select-key')?.addEventListener('change',e=>{
        const column=(e.target as HTMLSelectElement).value;
        if(column!==draft.keyColumn){draft.keyColumn=column;draft.values=[];draft.range={from:'',to:''};
          if(draft.mode==='range'&&!orderOf(view.shape[column]??[])&&(view.shape[column]??[]).length)draft.mode='values';}
        filterText='';tickedOnly=false;redraw();});
      root.querySelector<HTMLSelectElement>('#select-mode')?.addEventListener('change',e=>{
        draft.mode=(e.target as HTMLSelectElement).value as SelectDraft['mode'];redraw();});
      root.querySelectorAll<HTMLInputElement>('[data-select-range]').forEach(el=>el.addEventListener('change',()=>{
        draft.range[el.dataset.selectRange as 'from'|'to']=el.value.trim();redraw();}));
      // The kept values are a LIST and their ORDER is the order a figure reads in, so a tick appends: unticking and
      // re-ticking a value moves it to the end, which is how a person reorders without a second control.
      root.querySelectorAll<HTMLInputElement>('[data-select-value]').forEach(el=>el.addEventListener('change',()=>{
        const value=el.dataset.selectValue!;
        draft.values=el.checked?[...draft.values.filter(v=>v!==value),value]:draft.values.filter(v=>v!==value);redraw();}));
      root.querySelector<HTMLTextAreaElement>('#select-values')?.addEventListener('change',e=>{
        draft.values=(e.target as HTMLTextAreaElement).value.split('\n').map(l=>l.trim()).filter(Boolean);redraw();});
      const filter=root.querySelector<HTMLInputElement>('#select-filter'),ticked=root.querySelector<HTMLInputElement>('#select-ticked-only');
      const narrow=()=>{const wanted=filterText.trim().toLowerCase();
        root.querySelectorAll<HTMLInputElement>('[data-select-value]').forEach(box=>{
          (box.closest('label') as HTMLElement).hidden=!((!wanted||box.dataset.selectValue!.toLowerCase().includes(wanted))&&(!tickedOnly||box.checked));});};
      filter?.addEventListener('input',()=>{filterText=filter.value;narrow();});
      ticked?.addEventListener('change',()=>{tickedOnly=ticked.checked;narrow();});
      narrow();
    },
    apply:view.apply,
  },esc);
}
