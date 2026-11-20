/** APPEND ROWS, IN THE STANDARD DIALOG (experiment 186, 2026-11-14: changed that day, so moved, as every widget touched
 *  is). The Inspector says in one sentence what is stacked; how many tables, the column naming each row's source and
 *  its labels, whether the labels are numbers, and a new key are here, with the stacked table as the preview, and
 *  nothing reaches the workflow until Apply. The controls keep the ids they had in the Inspector. */
import type {DataTable} from './data-table.js';
import type {Escape,ParamsByType} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {openWalkthrough} from './table-walkthrough.js';
import {appendWalkthrough} from './table-walkthroughs.js';
import {dataTableMarkup,wireTablePages} from './data-table-ui.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {appendTables,appendSentence,appendTableCount,appendLabel,appendPort,valueMismatch,columnGrid,placeColumn,renameStacked,type StackUnder} from './append-rows.js';

type Params=ParamsByType['append_rows'];
export interface AppendDraft {count:number; nameSource:boolean; sourceColumn:string; labels:string[];
  numbers:boolean; unit:string; newKey:boolean; keyColumn:string;
  /** Each table's own column stacked under the first table's name for it. */
  stackUnder:StackUnder[]}

export function appendDraftOf(p:Params):AppendDraft{
  const count=appendTableCount(p);
  return {count,nameSource:!!p.nameSource,sourceColumn:p.sourceColumn??'source',
    labels:Array.from({length:count},(_,i)=>p.labels?.[i]??(i===0?p.firstLabel:i===1?p.secondLabel:undefined)??''),
    numbers:!!p.labelsAreNumbers,unit:p.labelsAreNumbers?.unit??'',newKey:p.newKey!==undefined,keyColumn:p.newKey??'row',
    stackUnder:(p.stackUnder??[]).map(m=>({...m}))};
}
export function applyAppendDraft(p:Params,d:AppendDraft):void{
  if(d.count<=2)delete p.tableCount;else p.tableCount=d.count;
  p.nameSource=d.nameSource;
  if(d.nameSource){p.sourceColumn=d.sourceColumn.trim()||'source';p.labels=d.labels.slice(0,d.count).map(l=>l.trim());
    delete p.firstLabel;delete p.secondLabel;
    if(d.numbers)p.labelsAreNumbers={unit:d.unit.trim()};else delete p.labelsAreNumbers;}
  else delete p.labelsAreNumbers;
  if(d.newKey)p.newKey=d.keyColumn.trim()||'row';else delete p.newKey;
  const under=d.stackUnder.filter(m=>m.table<d.count);
  if(under.length)p.stackUnder=under.map(m=>({...m}));else delete p.stackUnder;
}
const asParams=(d:AppendDraft):Params=>{const p={label:''} as Params;applyAppendDraft(p,d);return p;};

/** THE INSPECTOR'S ONE SENTENCE. */
export function appendSettingsSentence(p:Params):string{
  const count=appendTableCount(p),labels=Array.from({length:count},(_,i)=>appendLabel(p,i));
  return `Stacks the rows of ${count} tables, columns lined up by name`
    +(p.nameSource?`; "${p.sourceColumn||'source'}" says which: ${labels.join(', ')}${p.labelsAreNumbers?`, as numbers${p.labelsAreNumbers.unit?` in ${p.labelsAreNumbers.unit}`:''}`:''}`:'')
    +(p.newKey?`; "${p.newKey}" numbers every row as a new key`:'')
    +(p.stackUnder?.length?`; ${p.stackUnder.map(m=>`table ${m.table+1}'s "${m.column}" under "${m.as}"`).join(', ')}`:'')+'.';
}

export interface AppendConfigView {
  step:string;
  /** Each port's table, in port order, where the last run had it. */
  tables:(DataTable|undefined)[];
  /** The step feeding each port, by name. */
  sources:string[];
  /** The value column each step feeding a port declares, where it says without a run. */
  values?:(string|undefined)[];
  initial:AppendDraft;
  apply:(d:AppendDraft)=>void;
}

export function openAppendConfig(view:AppendConfigView,esc:Escape):void{
  let shown:DataTable|undefined;
  openConfigDialog<AppendDraft>({
    id:'append-config',widget:'Append rows',step:view.step,draft:view.initial,
    sections:d=>{
      const name=(i:number)=>d.count===2?(i===0?'the first table':'the second table'):`table ${i+1}`;
      const settings='<p class="description">Stacks the tables’ rows in order, lining their columns up as Columns says: by name, '
        +'or a table’s own column under another’s name. All must measure the same thing in the same unit.</p>'
        // SHOWN ON A MADE-UP EXAMPLE (experiment 223), with the choices made below, before they are applied.
        +'<p><button class="button" id="append-show-me" data-show-me>Show me how it works</button></p>'
        +`<div class="inspector-actions"><button type="button" id="append-add-table" class="button small">＋ Add a table</button>`
        +`<button type="button" id="append-remove-table" class="button small"${d.count<=2?' disabled':''}>Remove the last table</button></div>`
        +`<p class="muted">${d.count} tables, one input each${view.sources.some(Boolean)?`: ${view.sources.slice(0,d.count).map((s,i)=>esc(s||`${name(i)}, not connected`)).join('; ')}`:''}.</p>`
        +'<!--columns-->'
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
      const names=view.sources.slice(0,d.count);
      if(tables.length<d.count||tables.some(t=>!t)){
        // EACH STEP'S VALUE COLUMN, as each declares it, and the one that differs, said before a run (2026-11-20).
        const values=(view.values??[]).slice(0,d.count);
        const known=values.length===d.count&&values.every(v=>!!v);
        const mismatch=known?valueMismatch(values.map(v=>({valueField:v!})),names):null;
        const list=values.some(Boolean)?'<ul class="append-values">'+Array.from({length:d.count},(_,i)=>
          `<li>${esc(names[i]||`${name(i)}, not connected`)}: value column ${values[i]?`<strong>${esc(values[i]!)}</strong>`:'not known until a run'}</li>`).join('')+'</ul>':'';
        return {settings,preview:list+'<p class="muted">Run the workflow once every table is connected, '
          +'and the stacked table these settings make is shown here before they are applied.</p>',
          ...(mismatch?{message:{tone:'warning' as const,text:mismatch}}:{})};
      }
      // THE COLUMNS, AS A GRID (2026-11-20): every stacked column, which of each table's columns fills it, and the
      // name it is stacked under, each changeable; then each table as read, its columns marked with where they go.
      const ts=tables as DataTable[];
      const grid=columnGrid(ts,d.stackUnder);
      const placedAs=(i:number,column:string)=>d.stackUnder.find(m=>m.table===i&&m.column===column)?.as??column;
      const lineUp='<fieldset class="append-grid"><legend>Columns</legend>'
        +'<p class="muted">One row per column of the stacked table. For each table, the column that fills it, or none: its rows are then empty there. '
        +'Rename a stacked column in its first box.</p><div class="table-scroll"><table><thead><tr><th scope="col">Stacked as</th>'
        +ts.map((_,i)=>`<th scope="col">${esc(names[i]||name(i))}</th>`).join('')+'</tr></thead><tbody>'
        +grid.map((row,r)=>`<tr><td><input data-grid-name="${r}" aria-label="Stacked column ${r+1}, named" maxlength="60" value="${esc(row.as)}"></td>`
          +row.cells.map((cell,i)=>{
            const native=cell.column===row.as&&placedAs(i,row.as)===row.as;
            if(native)return `<td>${esc(row.as)}</td>`;
            const options=['<option value="">none</option>',...ts[i]!.keys.map(k=>`<option value="${esc(k)}"${k===cell.column?' selected':''}>${esc(k)}</option>`)].join('');
            return `<td><select data-grid-row="${r}" data-grid-table="${i}" aria-label="${esc(names[i]||name(i))}: column stacked as ${esc(row.as)}">${options}</select>`
              +(cell.suggested?`<p class="notice">Its "${esc(cell.suggested.column)}" may be this: ${cell.suggested.matched} of ${cell.suggested.of} of its names are here in another table.</p>`:'')+'</td>';}).join('')+'</tr>').join('')
        +'</tbody></table></div></fieldset>'
        +'<fieldset class="append-before"><legend>Before: each table as read</legend>'
        +ts.map((t,i)=>`<details${i===0?' open':''}><summary>${esc(names[i]||name(i))} \u00b7 ${t.rows.length.toLocaleString('en')} rows</summary>`
          +'<div class="table-scroll"><table><thead><tr>'+t.keys.map(k=>{const as=placedAs(i,k);
            return `<th scope="col">${esc(k)}${as!==k?`<span class="muted role-note">stacked as ${esc(as)}</span>`:''}</th>`;}).join('')
          +`<th scope="col">${esc(t.valueField)}</th></tr></thead><tbody>`
          +t.rows.slice(0,5).map(row=>'<tr>'+t.keys.map(k=>`<td>${esc(row.key[k]??'')}</td>`).join('')+`<td>${row.value??''}</td></tr>`).join('')
          +'</tbody></table></div></details>').join('')+'</fieldset>';
      try{
        const result=appendTables(tables as DataTable[],asParams(d),names);shown=result.table;
        return {settings:settings.replace('<!--columns-->',lineUp),preview:`<p><strong>After: the stacked table.</strong> ${esc(appendSentence(result,asParams(d)))}</p><div class="append-preview">${dataTableMarkup(result.table,esc,{pageSize:12})}</div>`};
      }catch(error){return {settings:settings.replace('<!--columns-->',lineUp),message:{tone:'refusal',text:error instanceof Error?error.message:String(error)},blocked:true};}
    },
    wire:(root,d,redraw)=>{
      if(shown)wireTablePages(root.querySelector<HTMLElement>('.append-preview'),shown,esc,{pageSize:12});
      const showMe=root.querySelector<HTMLButtonElement>('#append-show-me');
      if(showMe)showMe.onclick=()=>openWalkthrough(appendWalkthrough({nameSource:d.nameSource,sourceColumn:d.sourceColumn,labels:d.labels}),esc,showMe);
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
      const ts=view.tables.slice(0,d.count) as DataTable[];
      root.querySelectorAll<HTMLSelectElement>('[data-grid-table]').forEach(el=>el.addEventListener('change',()=>{
        const row=columnGrid(ts,d.stackUnder)[Number(el.dataset.gridRow)];if(!row)return;
        d.stackUnder=placeColumn(d.stackUnder,Number(el.dataset.gridTable),row.as,el.value||null);redraw();}));
      root.querySelectorAll<HTMLInputElement>('[data-grid-name]').forEach(el=>el.addEventListener('change',()=>{
        const row=columnGrid(ts,d.stackUnder)[Number(el.dataset.gridName)];if(!row)return;
        d.stackUnder=renameStacked(ts,d.stackUnder,row.as,el.value);redraw();}));
    },
    apply:view.apply,
  },esc);
}

/** APPEND ROWS' INSPECTOR, out of app.ts (2026-11-20, touched for its columns grid): the name, the inputs, one sentence,
 *  Configure…, and what the last run did. */
export const appendInspector:OwnInspector<'append_rows'>={
  markup:(n,kit)=>{const k=kit as StepKit,p=n.params,why=k.unfinished(n.id);
    return kit.section('Name',kit.name('append-label',p.label||k.title('append_rows')))
      +kit.section('Inputs',kit.inputs(n))
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(appendSettingsSentence(p))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">`
        +`${kit.esc(why?`The last run could not compute this step: ${why}`:k.method(n.id)??'Not run yet.')}</p>`);},
  wire:(n,kit,root)=>{const k=kit as StepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const w=kit.workflow(),node=w.nodes.find(x=>x.id===n.id);
      if(node?.type!=='append_rows')return;
      const most=Math.max(appendTableCount(node.params),8);
      const ports=Array.from({length:most},(_,i)=>appendPort(i));
      const upstream=(port:string)=>{const from=w.edges.find(e=>e.to===n.id&&e.port===port)?.from;return w.nodes.find(x=>x.id===from);};
      openAppendConfig({
        step:node.params.label||k.title('append_rows'),
        tables:ports.map(port=>k.tableOn(n.id,port)),
        sources:ports.map(port=>{const up=upstream(port);return up?(up.params.label||k.title(up.type)):'';}),
        // WHAT EACH STEP SAYS ITS VALUE COLUMN IS, without a run (2026-11-20): a run stopped here leaves no tables to read.
        values:ports.map(port=>{const table=k.tableOn(n.id,port);if(table)return table.valueField;
          const up=upstream(port);
          if(up?.type==='sample_raster')return up.params.attribute||undefined;
          if(up?.type==='table_input')return up.params.valueField||undefined;
          return undefined;}),
        initial:appendDraftOf(node.params),
        apply:d=>k.keep(w=>{const target=w.nodes.find(x=>x.id===n.id);if(target?.type!=='append_rows')return;
          // FEWER TABLES DROP THE CONNECTIONS TO THE PORTS THAT GO.
          w.edges=w.edges.filter(e=>!(e.to===n.id&&ports.slice(d.count).includes(e.port)));
          applyAppendDraft(target.params,d);}),
      },kit.esc);
    });
  },
};
