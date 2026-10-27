import type {Escape} from './types.js';
import type {DataTable,DataTableSource,TableSelection} from './data-table.js';
import {dataTable,wideDataTable,keyDomains,MAX_TABLE_ROWS} from './data-table.js';
import {parseCSV} from './input-data.js';
import {contentHash} from './project-files.js';

const FILE_BYTES=5_000_000;
export interface WideChoice {keys:string[]; valueFields:string[]; measureKey:string}
export interface TableImport {data:DataTable; source:DataTableSource; keys:string[]; valueField:string;
  unit?:string; wide?:WideChoice}
/** What the editor reopens with. `wide` present means the file was read as wide. */
export interface TableReopen extends TableSelection {wide?:WideChoice}

/** Reads a CSV in either shape, and ASSUMES WIDE on a fresh import.
 *
 *  The practitioner, 2026-10-26: *"We have to assume wide in as default, that's the epidemiology
 *  mindset."* One row per subject and a column per variable is what a case line list, a
 *  surveillance export and a published table all look like. `wideDataTable` was written that day
 *  and wired to nothing -- it had a full test file and no call site in the application, so the
 *  default was a decision recorded in code that no practitioner could reach. Reported on
 *  2026-10-27 as a question: *"I also thought we automatically convert tables to wide format?"*
 *
 *  Both readers stay, because they give OPPOSITE diagnoses of the same file. A repeated key tuple
 *  is the long shape to one and a duplicate subject record to the other, and a flag over one
 *  reader would have to pick a side. So the shape is chosen and the choice is recorded.
 *
 *  AN EXISTING TABLE REOPENS IN THE SHAPE IT WAS READ WITH, never in the new default: a saved
 *  workflow whose table came in long predates this control, and re-reading it as wide would
 *  change the table under a workflow built on it.
 *
 *  Either way the stored table is LONG. Nothing downstream learns a second shape; this is a door,
 *  not a second representation. */
export function openTableEditor(onSave:(result:TableImport)=>boolean,existing?:TableReopen):void{
  const dialog=document.createElement('dialog');dialog.id='table-dialog';dialog.setAttribute('aria-labelledby','table-title');
  dialog.innerHTML='<h2 id="table-title">Import tabular data</h2>'
    +'<p>A <strong>wide</strong> CSV is assumed: one row per subject and a column per variable, which is what a line list, a surveillance export and a published table look like. Name the columns that identify the subject and the columns holding values; the rest of the application reads one long table, and this converts. A table has no geometry; latitude and longitude columns, if present, are ordinary columns.</p>'
    +'<label class="field-label" for="table-file">CSV file (up to 5 MB, '+MAX_TABLE_ROWS.toLocaleString()+' rows)</label><input id="table-file" type="file" accept=".csv,text/csv">'
    +'<label class="field-label" for="table-shape">Shape of the file</label><select id="table-shape">'
    +'<option value="wide">Wide \u00b7 one row per subject, a column per variable</option>'
    +'<option value="long">Long \u00b7 one row per observation, one value column</option></select>'
    // THE ALERT, not a silent switch. The practitioner, 2026-10-27: "Table input should alert the
    // user if table is in long format and confirm to convert." Detected rather than guessed, and
    // acted on only by the button: reading a file in the other shape changes what every
    // downstream step sees, and this application does not make that choice for anybody.
    +'<div id="table-shape-alert" class="notice" hidden role="alert"><p id="table-shape-says"></p>'
    +'<button id="table-shape-accept" class="button" type="button"></button></div>'
    +'<fieldset id="table-keys" hidden><legend>Key columns</legend><p class="muted" id="table-keys-says"></p></fieldset>'
    +'<fieldset id="table-values" hidden><legend>Value columns</legend><p class="muted">The variables to take. Named rather than inferred, so a column the file gains later is absent from this analysis by decision rather than by accident.</p></fieldset>'
    +'<div id="table-long-value"><label class="field-label" for="table-value">Value column</label><select id="table-value" disabled></select></div>'
    +'<div id="table-wide-names" hidden><label class="field-label" for="table-measure-key">Name for the column holding the variable names</label><input id="table-measure-key" maxlength="40" value="measure">'
    +'<label class="field-label" for="table-value-name">Name for the column holding their values</label><input id="table-value-name" maxlength="40" value="value">'
    +'<p class="muted">Both are your words, because every downstream step names them: a Rate takes its measure key, and a derived value names two of its values.</p></div>'
    +'<label class="field-label" for="table-unit">Unit of the value (entered by you)</label><input id="table-unit" maxlength="40" placeholder="for example metre; leave empty if unstated">'
    +'<p class="muted">A unit is recorded as you state it and is never inferred from the file. An empty value cell is kept as unknown and counted, never read as zero.</p>'
    +'<p id="table-status" role="status"></p><details><summary>Table shape and provenance</summary><pre id="table-preview"></pre></details>'
    +'<p id="table-error" role="alert" hidden></p><div class="package-actions"><button id="table-cancel" class="button">Cancel</button><button id="table-save" class="button primary" disabled>Save table</button></div>';
  document.body.append(dialog);
  const q=<T extends HTMLElement>(id:string)=>dialog.querySelector<T>(id)!;
  const fileInput=q<HTMLInputElement>('#table-file'),keysBox=q<HTMLFieldSetElement>('#table-keys'),valueSelect=q<HTMLSelectElement>('#table-value');
  const shapeSelect=q<HTMLSelectElement>('#table-shape'),valuesBox=q<HTMLFieldSetElement>('#table-values');
  const longValue=q<HTMLElement>('#table-long-value'),wideNames=q<HTMLElement>('#table-wide-names');
  const measureKeyInput=q<HTMLInputElement>('#table-measure-key'),valueNameInput=q<HTMLInputElement>('#table-value-name');
  const keysSays=q<HTMLElement>('#table-keys-says');
  const shapeAlert=q<HTMLElement>('#table-shape-alert'),shapeSays=q<HTMLElement>('#table-shape-says');
  const shapeAccept=q<HTMLButtonElement>('#table-shape-accept');
  const unitInput=q<HTMLInputElement>('#table-unit'),status=q<HTMLElement>('#table-status'),preview=q<HTMLElement>('#table-preview');
  const error=q<HTMLElement>('#table-error'),save=q<HTMLButtonElement>('#table-save'),cancel=q<HTMLButtonElement>('#table-cancel');
  if(existing?.unit)unitInput.value=existing.unit;
  // AN EXISTING TABLE REOPENS IN ITS OWN SHAPE. A workflow saved before this control came in has
  // no `wide` block and was read long; re-reading it as wide would change the table under
  // whatever was built on it.
  shapeSelect.value=existing?(existing.wide?'wide':'long'):'wide';
  if(existing?.wide){measureKeyInput.value=existing.wide.measureKey;valueNameInput.value=existing.valueField;}
  let file:File|undefined,text='',parsed:ReturnType<typeof parseCSV>|undefined,result:TableImport|undefined,busy=false,serial=0;
  const shape=()=>shapeSelect.value==='wide'?'wide':'long';
  const fail=(e:unknown)=>{error.textContent=e instanceof Error?e.message:String(e);error.hidden=false;save.disabled=true;result=undefined;error.scrollIntoView({block:'nearest'});};
  const chosenKeys=()=>[...keysBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map(box=>box.value);
  const chosenValues=()=>[...valuesBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map(box=>box.value);

  /** WHETHER THE FILE IS ACTUALLY LONG, decided from the file and the chosen subject keys rather
   *  than from a failed read.
   *
   *  A wide file has one row per subject, so the subject keys identify a row. A long file repeats
   *  them -- one row per subject per measure -- and that repetition is the whole signature. Asked
   *  here instead of catching `wideDataTable`'s refusal, because matching an error's prose is a
   *  test of the wording and this is a test of the data.
   *
   *  Reported rather than acted on: the button converts, and only the button. */
  const longSignature=(keys:string[]):{repeats:number;example:string}|undefined=>{
    if(!parsed||!keys.length)return undefined;
    const index=(name:string)=>parsed!.headers.map(h=>h.trim()).indexOf(name);
    const at=keys.map(index);
    if(at.some(i=>i<0))return undefined;
    const seen=new Map<string,number>();
    let repeats=0,example='';
    parsed.rows.forEach((row,position)=>{
      const signature=at.map(i=>(row[i]??'').trim()).join('\u0000');
      const earlier=seen.get(signature);
      if(earlier===undefined){seen.set(signature,position);return;}
      repeats++;
      if(!example)example=keys.map((name,i)=>`${name}=${(row[at[i]]??'').trim()}`).join(', ');
    });
    return repeats?{repeats,example}:undefined;
  };

  function build(){
    error.hidden=true;result=undefined;save.disabled=true;shapeAlert.hidden=true;
    if(!file||!parsed)return;
    const wide=shape()==='wide';
    const unit=unitInput.value.trim();
    try{
      const keys=chosenKeys();
      let table:DataTable,imported:TableImport;
      if(wide){
        const valueFields=chosenValues();
        const measureKey=measureKeyInput.value.trim()||'measure';
        const valueField=valueNameInput.value.trim()||'value';
        // THE ALERT. Raised before the read, so the practitioner meets the diagnosis rather than
        // `wideDataTable`'s refusal, and with the one action that resolves it.
        const repeated=longSignature(keys);
        if(repeated){
          shapeSays.textContent=`This file looks like it is already in LONG format. `
            +`${repeated.repeats.toLocaleString()} row${repeated.repeats===1?'':'s'} repeat a subject that `
            +`${keys.length===1?'the key column':'the key columns'} should identify once -- for example `
            +`${repeated.example}. A wide file has one row per subject, so reading this as wide would `
            +`refuse it. Nothing has been changed.`;
          shapeAccept.textContent='Read it as long instead';
          shapeAlert.hidden=false;
          status.textContent='This table has not been imported.';
          save.disabled=true;result=undefined;
          return;
        }
        table=wideDataTable(parsed,{keys,valueFields,measureKey,valueField,...(unit?{unit}:{})});
        imported={data:table,source:{filename:file.name,bytes:file.size,sha256:'',rows:table.rowCount},
          keys:table.keys,valueField,...(unit?{unit}:{}),wide:{keys,valueFields,measureKey}};
        preview.textContent=JSON.stringify({sourceFile:file.name,readAs:'wide',subjectKeys:keys,
          valueColumns:valueFields,measureKey,valueField,unit:unit||'(unstated)',
          subjects:parsed.rows.length,rows:table.rowCount,missingValues:table.missingValueCount,
          firstRows:table.rows.slice(0,3)},null,2);
        status.textContent=`${parsed.rows.length} subjects \u00d7 ${valueFields.length} value `
          +`column${valueFields.length===1?'':'s'} = ${table.rowCount} rows, `
          +`${table.missingValueCount} values absent.`;
      }else{
        const valueField=valueSelect.value;
        table=dataTable(parsed,{keys,valueField,...(unit?{unit}:{})});
        imported={data:table,source:{filename:file.name,bytes:file.size,sha256:'',rows:table.rowCount},
          keys,valueField,...(unit?{unit}:{})};
        preview.textContent=JSON.stringify({sourceFile:file.name,readAs:'long',keys,valueField,
          unit:unit||'(unstated)',rows:table.rowCount,missingValues:table.missingValueCount,
          distinctValuesPerKey:Object.fromEntries(Object.entries(keyDomains(table)).map(([k,v])=>[k,v.length])),
          firstRows:table.rows.slice(0,3)},null,2);
        status.textContent=`${table.rowCount} rows, ${Object.keys(table.rows[0]?.key??{}).length} key columns, ${table.missingValueCount} values absent.`;
      }
      result=imported;
      save.disabled=false;
    }catch(e){status.textContent='This table has not been imported.';fail(e);}
  }

  /** Which controls belong to the chosen shape, and what the key columns are called in it. */
  function applyShape(){
    const wide=shape()==='wide';
    valuesBox.hidden=!wide;wideNames.hidden=!wide;longValue.hidden=wide;
    keysSays.textContent=wide
      ?'The columns that identify the subject of a row. A wide file has one row per subject, so together these must be unique.'
      :'Together these identify a row. Every key tuple must be unique.';
    build();
  }
  shapeSelect.onchange=applyShape;
  shapeAccept.onclick=()=>{shapeSelect.value='long';applyShape();};
  fileInput.onchange=async()=>{
    const request=++serial;file=fileInput.files?.[0];parsed=undefined;keysBox.hidden=true;valueSelect.disabled=true;
    keysBox.innerHTML='<legend>Key columns</legend><p class="muted" id="table-keys-says"></p>';
    valuesBox.innerHTML='<legend>Value columns</legend><p class="muted">The variables to take. Named rather than inferred, so a column the file gains later is absent from this analysis by decision rather than by accident.</p>';
    valuesBox.hidden=true;shapeAlert.hidden=true;
    valueSelect.innerHTML='';preview.textContent='';result=undefined;save.disabled=true;error.hidden=true;
    if(!file){status.textContent='';return;}
    if(file.size>FILE_BYTES){status.textContent='';fail(new Error('Select a file of at most 5 MB.'));return;}
    status.textContent='Reading the file…';
    try{
      text=await file.text();if(request!==serial)return;
      parsed=parseCSV(text);
      const guessValue=parsed.headers.findIndex(h=>/^(value|value_m|amount|measure|level)$/i.test(h.trim()));
      keysBox.innerHTML+=parsed.headers.map((header,i)=>{
        const escaped=header.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
        const preselect=existing?existing.keys.includes(header.trim()):i!==(guessValue<0?parsed!.headers.length-1:guessValue);
        return `<label><input type="checkbox" value="${escaped}" ${preselect?'checked':''}> ${escaped}</label>`;}).join('');
      keysBox.hidden=false;
      valueSelect.innerHTML=parsed.headers.map((header,i)=>{
        const escaped=header.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
        const chosen=existing?header.trim()===existing.valueField:i===(guessValue<0?parsed!.headers.length-1:guessValue);
        return `<option value="${escaped}" ${chosen?'selected':''}>${escaped}</option>`;}).join('');
      valueSelect.disabled=false;
      // THE VALUE COLUMNS, for the wide reader. Preselected as everything that is not a chosen
      // subject key, because that is the common case and the practitioner can take fewer -- but
      // named in the markup either way, so the selection is a decision and not a leftover.
      valuesBox.innerHTML+=parsed.headers.map(header=>{
        const escaped=header.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
        const held=existing?.wide?.valueFields;
        const preselect=held?held.includes(header.trim()):!keysBox.querySelector<HTMLInputElement>(`input[value="${CSS.escape(escaped)}"]`)?.checked;
        return `<label><input type="checkbox" value="${escaped}" ${preselect?'checked':''}> ${escaped}</label>`;}).join('');
      // A column cannot be both the subject and a variable of it, so taking one as a key drops it
      // from the values offered -- and the other way round. Enforced in `wideDataTable` as a
      // refusal; reflected here so the refusal is rarely met.
      const syncValues=()=>{
        const keys=new Set(chosenKeys());
        for(const box of valuesBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]')){
          const clash=keys.has(box.value);
          box.disabled=clash;if(clash)box.checked=false;
          box.parentElement?.classList.toggle('muted',clash);
        }
      };
      for(const box of keysBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))
        box.onchange=()=>{syncValues();build();};
      for(const box of valuesBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))box.onchange=build;
      syncValues();
      applyShape();
    }catch(e){if(request===serial){status.textContent='The file could not be read.';fail(e);}}
  };
  valueSelect.onchange=build;unitInput.onchange=build;
  measureKeyInput.onchange=build;valueNameInput.onchange=build;
  cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};
  dialog.onclose=()=>{serial++;file=undefined;result=undefined;dialog.remove();};
  save.onclick=async()=>{
    if(!result||!file||busy)return;busy=true;save.disabled=true;cancel.disabled=true;fileInput.disabled=true;error.hidden=true;
    try{
      const sha256=await contentHash(new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>);
      const saved:TableImport={...result,data:{...result.data,source:{...result.source,sha256}},source:{...result.source,sha256}};
      if(!onSave(saved))throw new Error('The table could not be saved. Your previous project is unchanged; retry Save.');
      dialog.close();
    }catch(e){fail(e);status.textContent='This table has not been added to the project.';}
    finally{busy=false;save.disabled=!result;cancel.disabled=false;fileInput.disabled=false;}
  };
  dialog.showModal();
}

/** Results view: key columns, then the value, with the unit stated or marked unstated. */
/** TWO KEY COLUMNS ARE A MATRIX, and a long list of them is the same data saying less.
 *
 *  A table keyed by (group, measure) printed as six rows is a list; printed as a grid it is the
 *  2x2 a reader came for, and the comparison they are making runs along a row instead of down a
 *  column three rows apart. The practitioner, 2026-10-26, on the rate ratio's output: "still not
 *  quite like the Epi Info AI results" -- whose categorical output cross-tabulates exposure
 *  against outcome rather than listing cells.
 *
 *  Generic rather than epidemiological: ANY table with exactly two key columns pivots this way,
 *  including Snow's Table VIII at sub-district by measure. Declined when the second key has many
 *  values, because a grid wider than a screen is worse than the list it replaced.
 *
 *  TOTALS WHERE THE CELLS ARE COMMENSURABLE, and only there. The epidemiologist's 2x2 is
 *  predictable -- four cells A, B, C, D with categories across the top and down the left, and
 *  totals as a fourth column and a fourth row -- and a reader expects to find N in the corner.
 *  But a measure-keyed table has cells that cannot be added: 1,263 deaths plus 40,046 houses is
 *  not a quantity, and a Total column would invite exactly that reading.
 *
 *  The declaration already distinguishes them. A table that states its `unit` is saying every
 *  value counts the same thing, so totals are meaningful; a table with none is not, and gets no
 *  totals rather than a guess. */
export const CROSSTAB_MAX_COLUMNS=12;
/** How full the grid must be before it is drawn as one. Half is a judgement, not a measurement:
 *  Manila's assignment sits at 0.125 and a 2x2 missing a cell at 0.75, and anything between
 *  those is a table nobody has shown us yet. */
export const CROSSTAB_MIN_DENSITY=0.5;

export function crossTab(table:DataTable,{assertCommensurable=false}={}):{rowKey:string;colKey:string;columns:string[];
  rows:{label:string;cells:(number|null|undefined)[];total:number|null}[];
  columnTotals:(number|null)[];grandTotal:number|null}|null{
  if(table.keys.length!==2)return null;
  const [rowKey,colKey]=table.keys;
  const columns=[...new Set(table.rows.map(r=>String(r.key[colKey])))];
  if(!columns.length||columns.length>CROSSTAB_MAX_COLUMNS)return null;
  const labels=[...new Set(table.rows.map(r=>String(r.key[rowKey])))];
  // BOTH AXES MUST BE CATEGORIES. One column is a list drawn with extra lines: it says nothing
  // a list does not, and it costs the value field its heading -- Manila's 194 facilities all
  // take gauge 145, so the assignment is 194 rows against one column, perfectly dense, and
  // pivoting it hid `distance_m`, which was the column a reader came for. Density alone could
  // not tell that from a tabulation; the shape can. Found by the sea-level example, 2026-10-26.
  if(columns.length<2||labels.length<2)return null;
  // A MATRIX IS FOR A TABULATION, not for any pair of keys. Manila's assignment table is keyed
  // by point and by the site each point was assigned -- 60 points against 8 sites, one cell
  // filled per row -- and pivoting it drew a 480-cell grid holding 60 numbers. Every row of a
  // contingency table exists for every column by construction; an assignment's rows do not.
  //
  // Density tells them apart and needs no declaration. Not completeness: a 2x2 missing one cell
  // is still the table a reader wants, with a gap where nothing was said, and demanding a full
  // grid would send it back to being a list.
  if(table.rows.length<labels.length*columns.length*CROSSTAB_MIN_DENSITY)return null;
  const at=new Map(table.rows.map(r=>[`${r.key[rowKey]}\u0000${r.key[colKey]}`,r.value]));
  // TOTALS NEED A CLAIM THAT THE CELLS COUNT THE SAME THING, and a stated unit is a weak proxy
  // for one: `addable` was any non-empty string, and South London's mortality table states
  // "people or deaths, as the measure says" -- prose DENYING commensurability, read as granting
  // it. The other half of the same hole is a table that has the property and cannot say so:
  // Snow's Table IX states no unit, correctly, because as imported it holds houses beside
  // deaths; selecting `deaths` and `houses without a death` leaves two measures that both count
  // houses, and nothing records that.
  //
  // So the claim is made where a person composes a figure and takes responsibility for it,
  // rather than inferred from a free-text field. Found 2026-10-26; the per-measure unit this
  // really wants is recorded in TODO.md and reaches every consumer of `valueField`.
  const addable=assertCommensurable||Boolean(table.unit?.trim());
  const sum=(values:(number|null|undefined)[]):number|null=>{
    if(!addable)return null;
    const numbers=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
    return numbers.length===values.length?numbers.reduce((a,b)=>a+b,0):null;
  };
  const rows=labels.map(label=>{
    const cells=columns.map(c=>at.get(`${label}\u0000${c}`));
    return {label,cells,total:sum(cells)};
  });
  return {rowKey,colKey,columns,rows,
    columnTotals:columns.map((_,i)=>sum(rows.map(r=>r.cells[i]))),
    grandTotal:sum(rows.flatMap(r=>r.cells))};
}

export function dataTableMarkup(table:DataTable,esc:Escape,{query='',page=0,pageSize=40,assertTotals=false}={}){
  const matching=query?table.rows.filter(row=>Object.values(row.key).some(v=>String(v).toLowerCase().includes(query.toLowerCase()))):table.rows;
  const pages=Math.max(1,Math.ceil(matching.length/pageSize)),shown=matching.slice(page*pageSize,page*pageSize+pageSize);
  const unit=table.unit?esc(table.unit):'<span class="muted">unit unstated</span>';
  // The grid, where the shape allows one and nothing is being searched -- a filter is about
  // finding a row, and a matrix has no rows to page through in the same sense.
  const grid=query?null:crossTab(table,{assertCommensurable:assertTotals});
  if(grid)
    return `<div class="table-meta muted">${table.rowCount} cells · ${esc(grid.rowKey)} by ${esc(grid.colKey)}`
      +` · value in ${unit}</div>`
      +`<table class="crosstab"><thead><tr><th scope="col">${esc(grid.rowKey)}</th>`
      +grid.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')
      +(grid.grandTotal===null?'':'<th scope="col">Total</th>')
      +`</tr></thead><tbody>`
      +grid.rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th>`
        +r.cells.map(v=>`<td>${v===undefined?'<span class="muted">—</span>'
          :v===null?'<span class="muted">unknown</span>':esc(v)}</td>`).join('')
        +(r.total===null?'':`<td class="crosstab-total">${esc(r.total)}</td>`)
        +'</tr>').join('')
      +`</tbody>`
      // The fourth row, where a reader looks for N.
      +(grid.grandTotal===null?'':`<tfoot><tr><th scope="row">Total</th>`
        +grid.columnTotals.map(v=>`<td class="crosstab-total">${v===null?'<span class="muted">—</span>':esc(v)}</td>`).join('')
        +`<td class="crosstab-total">${esc(grid.grandTotal)}</td></tr></tfoot>`)
      +`</table>`
      // WHO SAID THESE COULD BE ADDED. A reader checking a margin is entitled to know whether
      // the table claimed its values count the same thing or a person did, because the two carry
      // different weight -- and because the person can be wrong in a way the file cannot.
      +(grid.grandTotal!==null&&assertTotals&&!table.unit?.trim()
        ?`<p class="table-meta muted">Totals are shown because this step was told these values `
          +`count the same thing. The table states no unit, so nothing here checks that.</p>`:'');
  return `<div class="table-meta muted">${matching.length} of ${table.rowCount} rows${table.missingValueCount?` · ${table.missingValueCount} values absent and kept as unknown`:''} · value in ${unit}</div>`
    +`<table><thead><tr>${table.keys.map(k=>`<th>${esc(k)}</th>`).join('')}<th>${esc(table.valueField)}</th></tr></thead><tbody>`
    +shown.map(row=>`<tr>${table.keys.map(k=>`<td>${esc(row.key[k])}</td>`).join('')}<td>${row.value===null?'<span class="muted">unknown</span>':esc(row.value)}</td></tr>`).join('')
    +`</tbody></table>`+(pages>1?`<div class="table-page-group"><button class="button small" data-table-page="${page-1}" ${page===0?'disabled':''}>Previous rows</button><span role="status">Page ${page+1} of ${pages}</span><button class="button small" data-table-page="${page+1}" ${page+1>=pages?'disabled':''}>Next rows</button></div>`:'');
}
