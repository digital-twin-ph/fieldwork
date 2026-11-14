/** APPEND ROWS, IN THE STANDARD DIALOG (experiment 186, 2026-11-14: changed that day, so moved, as every widget touched
 *  is). The Inspector says in one sentence what is stacked; how many tables, the column naming each row's source and
 *  its labels, whether the labels are numbers, and a new key are here, with the stacked table as the preview, and
 *  nothing reaches the workflow until Apply. The controls keep the ids they had in the Inspector. */
import type {DataTable} from './data-table.js';
import type {Escape,ParamsByType} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {dataTableMarkup,wireTablePages} from './data-table-ui.js';
import {appendTables,appendSentence,appendTableCount,appendLabel} from './append-rows.js';

type Params=ParamsByType['append_rows'];
export interface AppendDraft {count:number; nameSource:boolean; sourceColumn:string; labels:string[];
  numbers:boolean; unit:string; newKey:boolean; keyColumn:string}

export function appendDraftOf(p:Params):AppendDraft{
  const count=appendTableCount(p);
  return {count,nameSource:!!p.nameSource,sourceColumn:p.sourceColumn??'source',
    labels:Array.from({length:count},(_,i)=>p.labels?.[i]??(i===0?p.firstLabel:i===1?p.secondLabel:undefined)??''),
    numbers:!!p.labelsAreNumbers,unit:p.labelsAreNumbers?.unit??'',newKey:p.newKey!==undefined,keyColumn:p.newKey??'row'};
}
export function applyAppendDraft(p:Params,d:AppendDraft):void{
  if(d.count<=2)delete p.tableCount;else p.tableCount=d.count;
  p.nameSource=d.nameSource;
  if(d.nameSource){p.sourceColumn=d.sourceColumn.trim()||'source';p.labels=d.labels.slice(0,d.count).map(l=>l.trim());
    delete p.firstLabel;delete p.secondLabel;
    if(d.numbers)p.labelsAreNumbers={unit:d.unit.trim()};else delete p.labelsAreNumbers;}
  else delete p.labelsAreNumbers;
  if(d.newKey)p.newKey=d.keyColumn.trim()||'row';else delete p.newKey;
}
const asParams=(d:AppendDraft):Params=>{const p={label:''} as Params;applyAppendDraft(p,d);return p;};

/** THE INSPECTOR'S ONE SENTENCE. */
export function appendSettingsSentence(p:Params):string{
  const count=appendTableCount(p),labels=Array.from({length:count},(_,i)=>appendLabel(p,i));
  return `Stacks the rows of ${count} tables, columns lined up by name`
    +(p.nameSource?`; "${p.sourceColumn||'source'}" says which: ${labels.join(', ')}${p.labelsAreNumbers?`, as numbers${p.labelsAreNumbers.unit?` in ${p.labelsAreNumbers.unit}`:''}`:''}`:'')
    +(p.newKey?`; "${p.newKey}" numbers every row as a new key`:'')+'.';
}

export interface AppendConfigView {
  step:string;
  /** Each port's table, in port order, where the last run had it. */
  tables:(DataTable|undefined)[];
  /** The step feeding each port, by name. */
  sources:string[];
  initial:AppendDraft;
  apply:(d:AppendDraft)=>void;
}

export function openAppendConfig(view:AppendConfigView,esc:Escape):void{
  let shown:DataTable|undefined;
  openConfigDialog<AppendDraft>({
    id:'append-config',widget:'Append rows',step:view.step,draft:view.initial,
    sections:d=>{
      const name=(i:number)=>d.count===2?(i===0?'the first table':'the second table'):`table ${i+1}`;
      const settings='<p class="description">Stacks the tables’ rows in order, lining columns up by name. All must measure '
        +'the same thing in the same unit.</p>'
        +`<div class="inspector-actions"><button type="button" id="append-add-table" class="button small">＋ Add a table</button>`
        +`<button type="button" id="append-remove-table" class="button small"${d.count<=2?' disabled':''}>Remove the last table</button></div>`
        +`<p class="muted">${d.count} tables, one input each${view.sources.some(Boolean)?`: ${view.sources.slice(0,d.count).map((s,i)=>esc(s||`${name(i)}, not connected`)).join('; ')}`:''}.</p>`
        +`<label class="check"><input type="checkbox" id="append-name-source"${d.nameSource?' checked':''}> Name the source of each row</label>`
        +(d.nameSource
          ?`<div class="field"><label class="field-label" for="append-source">Column naming the source</label>`
            +`<input id="append-source" maxlength="60" value="${esc(d.sourceColumn)}" placeholder="source"></div>`
            +Array.from({length:d.count},(_,i)=>{const id=i===0?'append-first':i===1?'append-second':`append-label-${i+1}`;
              return `<div class="field"><label class="field-label" for="${id}">Label for rows of ${name(i)}</label>`
                +`<input id="${id}" data-append-label="${i}" maxlength="60" value="${esc(d.labels[i]??'')}" placeholder="${i===0?'first':i===1?'second':`table ${i+1}`}"></div>`;}).join('')
            +`<label class="check"><input type="checkbox" id="append-numbers"${d.numbers?' checked':''}> The labels are numbers</label>`
            +(d.numbers?`<div class="field"><label class="field-label" for="append-numbers-unit">Their unit</label>`
              +`<input id="append-numbers-unit" maxlength="40" value="${esc(d.unit)}" placeholder="weeks before"></div>`:'')
          :'')
        +`<label class="check"><input type="checkbox" id="append-new-key"${d.newKey?' checked':''}> Create a new primary key</label>`
        +(d.newKey?`<div class="field"><label class="field-label" for="append-key">New key column</label>`
          +`<input id="append-key" maxlength="60" value="${esc(d.keyColumn)}"></div>`
          +`<p class="muted">Numbers every row 1 to N. The old key column stays${d.nameSource?', and source with the old key is kept as a second unique key':''}.</p>`:'');
      shown=undefined;
      const tables=view.tables.slice(0,d.count);
      if(tables.length<d.count||tables.some(t=>!t))return {settings,preview:'<p class="muted">Run the workflow once every table is connected, '
        +'and the stacked table these settings make is shown here before they are applied.</p>'};
      try{
        const result=appendTables(tables as DataTable[],asParams(d));shown=result.table;
        return {settings,preview:`<p>${esc(appendSentence(result,asParams(d)))}</p><div class="append-preview">${dataTableMarkup(result.table,esc,{pageSize:12})}</div>`};
      }catch(error){return {settings,message:{tone:'refusal',text:error instanceof Error?error.message:String(error)},blocked:true};}
    },
    wire:(root,d,redraw)=>{
      if(shown)wireTablePages(root.querySelector<HTMLElement>('.append-preview'),shown,esc,{pageSize:12});
      const on=(id:string,f:(el:HTMLInputElement)=>void,ev='change')=>root.querySelector<HTMLInputElement>(id)?.addEventListener(ev,e=>{f(e.target as HTMLInputElement);redraw();});
      on('#append-add-table',()=>{d.count++;d.labels.push('');},'click');
      on('#append-remove-table',()=>{if(d.count>2){d.count--;d.labels=d.labels.slice(0,d.count);}},'click');
      on('#append-name-source',el=>{d.nameSource=el.checked;});
      on('#append-source',el=>{d.sourceColumn=el.value;});
      root.querySelectorAll<HTMLInputElement>('[data-append-label]').forEach(el=>el.addEventListener('change',()=>{
        d.labels[Number(el.dataset.appendLabel)]=el.value;redraw();}));
      on('#append-numbers',el=>{d.numbers=el.checked;});
      on('#append-numbers-unit',el=>{d.unit=el.value;});
      on('#append-new-key',el=>{d.newKey=el.checked;});
      on('#append-key',el=>{d.keyColumn=el.value;});
    },
    apply:view.apply,
  },esc);
}
