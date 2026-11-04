/** THE COLUMNS DIALOG: what each kept column means, typed or proposed by a data dictionary and accepted. Experiment 172.
 *
 *  Opened from the Table input's Inspector after import, so meanings can be written and corrected at any time without
 *  reading the file again. A dictionary can be a CSV, an Excel workbook or a Stata file (the practitioner, 2026-11-04),
 *  chosen from disk or, for a table fetched from a zip, from the same archive on this device. */
import {parseCSV} from './input-data.js';
import {readXlsx,type Sheet} from './xlsx.js';
import {readStata} from './stata.js';
import {guessMapping,readDictionary,checkDictionary,proposeFrom,isDescribed,
  type ColumnDeclarations,type DictionaryCheck,type DictionaryMapping} from './column-metadata.js';

type Escape=(text:string)=>string;
export interface ColumnsDialogOptions {
  title:string;
  /** The columns the table keeps, in order. */
  columns:string[];
  held:ColumnDeclarations;
  /** The table's rows as text, for checking a dictionary's missing counts against the columns it keeps. */
  rows:string[][];
  /** Files inside the archive a fetched table came from, readable from this device. */
  archive?:{entries:string[]; read:(entry:string)=>Promise<Uint8Array>};
  onSave:(declared:ColumnDeclarations,check?:DictionaryCheck)=>boolean;
}

/** A dictionary file as sheets of headers and rows: one sheet for CSV and Stata, each sheet of a workbook. */
export function dictionarySheets(name:string,bytes:Uint8Array):Sheet[]{
  if(/\.xlsx$/i.test(name))return readXlsx(bytes);
  if(/\.dta$/i.test(name)){const t=readStata(bytes);return [{name,headers:t.headers,rows:t.rows}];}
  const t=parseCSV(new TextDecoder().decode(bytes),20000);
  return [{name,headers:t.headers.map(h=>h.trim()),rows:t.rows}];
}

export function openColumnsDialog(options:ColumnsDialogOptions,esc:Escape):void{
  document.getElementById('columns-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='columns-dialog';dialog.className='wide-dialog columns-dialog';
  document.body.append(dialog);
  let declared:ColumnDeclarations=structuredClone(options.held);
  let check:DictionaryCheck|undefined;
  let sheets:Sheet[]=[],sheetName='',source='';

  const row=(column:string)=>{
    const meta=declared[column];
    const status=!meta?'<span class="pill muted">Not described</span>'
      :meta.confirmed?`<span class="pill">${meta.origin==='practitioner'?'Yours':`Accepted from ${esc(meta.from??meta.origin)}`}</span>`
      :`<span class="pill warning">Proposed by ${esc(meta.from??meta.origin)} · not yet accepted</span>`;
    const id=(part:string)=>`column-${part}-${esc(column)}`;
    return `<fieldset class="column-meaning" data-column="${esc(column)}"><legend><code>${esc(column)}</code> ${status}</legend>`
      +`<label class="field-label" for="${id('label')}">Label</label><input id="${id('label')}" data-meaning="label" maxlength="120" value="${esc(meta?.label??'')}">`
      +`<label class="field-label" for="${id('unit')}">Unit</label><input id="${id('unit')}" data-meaning="unit" maxlength="40" value="${esc(meta?.unit??'')}">`
      +`<label class="field-label" for="${id('description')}">Description</label><textarea id="${id('description')}" data-meaning="description" rows="2" maxlength="600">${esc(meta?.description??'')}</textarea>`
      +(meta&&!meta.confirmed?`<label class="check"><input type="checkbox" data-accept> Accept this description</label>`:'')
      +`</fieldset>`;
  };
  const sourcePicker=()=>`<details class="columns-dictionary"${sheets.length?' open':''}><summary>Propose from a data dictionary</summary>`
    +`<p class="description">A CSV, Excel workbook or Stata file with one row per variable. Its descriptions are proposals until you accept them.</p>`
    +`<label class="field-label" for="columns-dictionary-file">Dictionary file</label><input id="columns-dictionary-file" type="file" accept=".csv,.xlsx,.dta,text/csv">`
    +(options.archive?.entries.length?`<label class="field-label" for="columns-dictionary-entry">Or a file in the same archive</label>`
      +`<select id="columns-dictionary-entry"><option value="">Choose a file…</option>`
      +options.archive.entries.map(e=>`<option value="${esc(e)}" ${e===source?'selected':''}>${esc(e)}</option>`).join('')+`</select>`:'')
    +(sheets.length?mappingFields():'')+`</details>`;
  const mappingFields=()=>{
    const sheet=sheets.find(s=>s.name===sheetName)??sheets[0]!;
    const guess=guessMapping(sheet.headers);
    const pick=(key:keyof DictionaryMapping,label:string,optional:boolean)=>`<label class="field-label" for="columns-map-${key}">${label}</label>`
      +`<select id="columns-map-${key}" data-map="${key}">${optional?'<option value="">None</option>':''}`
      +sheet.headers.map(h=>`<option value="${esc(h)}" ${guess[key]===h?'selected':''}>${esc(h)}</option>`).join('')+`</select>`;
    return (sheets.length>1?`<label class="field-label" for="columns-sheet">Sheet</label><select id="columns-sheet">`
        +sheets.map(s=>`<option value="${esc(s.name)}" ${s.name===sheet.name?'selected':''}>${esc(s.name)}</option>`).join('')+`</select>`:'')
      +`<p class="description">${sheet.rows.length} variables in ${esc(source)}. Which of its columns holds what:</p>`
      +pick('name','Variable name',false)+pick('label','Label',true)+pick('description','Description',true)
      +pick('unit','Unit',true)+pick('missing','Missing count',true)
      +`<button type="button" class="button" id="columns-propose">Propose descriptions</button>`;
  };
  const summary=()=>{
    if(!check)return '';
    const kept=check.notInDictionary.filter(c=>options.columns.includes(c));
    return `<div class="notice" id="columns-check"><strong>Checked against ${esc(check.source)}.</strong> `
      +(kept.length?`It does not describe ${esc(kept.join(', '))}. `:'It describes every kept column. ')
      +(check.missingDisagree.length?check.missingDisagree.map(d=>`${esc(d.column)}: it says ${d.declared} missing, the table has ${d.found}.`).join(' ')
        :'Every missing count it states agrees with the table.')+`</div>`;
  };
  const render=()=>{
    const described=options.columns.filter(c=>isDescribed(declared[c])).length;
    dialog.innerHTML=`<div class="dialog-heading"><h2>What the columns mean</h2></div>`
      +`<p class="description">${esc(options.title)}: ${options.columns.length} kept columns. The name stays as the file spells it; a label is shown beside it. Describing what each column means is your step, and a data quality check: a column nobody has described is a finding.</p>`
      +sourcePicker()+summary()
      +`<p class="muted" id="columns-count">${described} of ${options.columns.length} described.</p>`
      +(Object.values(declared).some(m=>!m.confirmed)?`<button type="button" class="button small" id="columns-accept-all">Accept every proposal</button>`:'')
      +options.columns.map(row).join('')
      +`<p id="columns-error" role="alert" hidden></p><div class="package-actions"><button type="button" class="button" id="columns-cancel">Cancel</button>`
      +`<button type="button" class="button primary" id="columns-save">Save</button></div>`;
    wire();
  };
  const readSource=async(name:string,bytes:Uint8Array)=>{
    try{sheets=dictionarySheets(name,bytes);sheetName=sheets[0]?.name??'';source=name.split('/').at(-1)!;}
    catch(error){sheets=[];showError(error);return;}
    if(!sheets.length||!sheets[0]!.headers.length){sheets=[];showError(new Error(`${name} holds no table to read.`));return;}
    render();
  };
  const showError=(error:unknown)=>{const at=dialog.querySelector<HTMLElement>('#columns-error');
    if(at){at.hidden=false;at.textContent=error instanceof Error?error.message:String(error);}};
  const wire=()=>{
    const q=<T extends HTMLElement>(s:string)=>dialog.querySelector<T>(s);
    q<HTMLInputElement>('#columns-dictionary-file')?.addEventListener('change',async e=>{
      const file=(e.target as HTMLInputElement).files?.[0];if(file)await readSource(file.name,new Uint8Array(await file.arrayBuffer()));});
    q<HTMLSelectElement>('#columns-dictionary-entry')?.addEventListener('change',async e=>{
      const entry=(e.target as HTMLSelectElement).value;if(!entry||!options.archive)return;
      try{await readSource(entry,await options.archive.read(entry));}catch(error){showError(error);}});
    q<HTMLSelectElement>('#columns-sheet')?.addEventListener('change',e=>{sheetName=(e.target as HTMLSelectElement).value;render();});
    q<HTMLButtonElement>('#columns-propose')?.addEventListener('click',()=>{
      const sheet=sheets.find(s=>s.name===sheetName)??sheets[0]!;
      const mapping=Object.fromEntries([...dialog.querySelectorAll<HTMLSelectElement>('[data-map]')]
        .filter(s=>s.value).map(s=>[s.dataset.map,s.value])) as unknown as DictionaryMapping;
      try{
        const entries=readDictionary(sheet.headers,sheet.rows,mapping);
        declared=proposeFrom(entries,source,options.columns,declared);
        check=checkDictionary(source,entries,{headers:options.columns,rows:options.rows});
        render();
      }catch(error){showError(error);}
    });
    q<HTMLButtonElement>('#columns-accept-all')?.addEventListener('click',()=>{
      for(const m of Object.values(declared))m.confirmed=true;render();});
    dialog.querySelectorAll<HTMLFieldSetElement>('[data-column]').forEach(set=>{
      const column=set.dataset.column!;
      // TYPING IS DECLARING: an edited description is the practitioner's, and accepted.
      set.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-meaning]').forEach(field=>field.addEventListener('change',()=>{
        const key=field.dataset.meaning as 'label'|'unit'|'description';
        const meta={...(declared[column]??{origin:'practitioner' as const,confirmed:true})};
        const value=field.value.trim();
        if(value)meta[key]=value;else delete meta[key];
        declared[column]={...meta,origin:'practitioner',confirmed:true};delete declared[column]!.from;
      }));
      set.querySelector<HTMLInputElement>('[data-accept]')?.addEventListener('change',e=>{
        if((e.target as HTMLInputElement).checked&&declared[column]){declared[column]!.confirmed=true;render();}});
    });
    q<HTMLButtonElement>('#columns-cancel')?.addEventListener('click',()=>dialog.close());
    q<HTMLButtonElement>('#columns-save')?.addEventListener('click',()=>{
      // An emptied declaration is no declaration.
      for(const [c,m] of Object.entries(declared))if(!m.label&&!m.unit&&!m.description)delete declared[c];
      if(options.onSave(declared,check))dialog.close();else showError(new Error('The descriptions could not be saved.'));
    });
  };
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  render();dialog.showModal();
}
