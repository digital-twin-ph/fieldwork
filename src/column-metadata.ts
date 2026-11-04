/** WHAT THE COLUMNS MEAN: declared by the practitioner, pre-filled from a data dictionary, checked against the table.
 *  Experiment 172.
 *
 *  The practitioner, 2026-11-03: *"The metadata is the responsibility of the user. It may not come with the data set
 *  that he or she receives but that accounting of what the data means is an important step to avoid data quality
 *  downstream."* And 2026-11-04, on a regression table whose terms read `o3_lag02_10`: *"So let's include the data
 *  dictionary work. It's actually critical for data quality work. Which is upstream."*
 *
 *  A COLUMN IS NAMED BY THE FILE AND DESCRIBED BY A PERSON. The name is never replaced; a label is shown beside it.
 *  What a dictionary or a Stata file supplies is a proposal, kept as unconfirmed until accepted, and the record says
 *  where each description came from. Nothing here infers a meaning from a column's name. */
import type {DataTable,TableFinding} from './data-table.js';

export type Origin='practitioner'|'dictionary'|'file';
export interface ColumnMeta {
  label?:string; unit?:string; description?:string;
  /** Who said it: typed here, read from a data dictionary, or carried in the data file itself (Stata's labels). */
  origin:Origin;
  /** A proposal from a dictionary or file is unconfirmed until the practitioner accepts it. */
  confirmed:boolean;
  /** The dictionary or file it came from, as named where it was read. */
  from?:string;
}
export type ColumnDeclarations=Record<string,ColumnMeta>;

/** A data dictionary, as a table of its own: one row per variable. Which of its columns holds what is the
 *  practitioner's mapping, offered with a first guess from its headers. */
export interface DictionaryMapping {name:string; label?:string; description?:string; unit?:string; missing?:string}
export interface DictionaryEntry {label?:string; description?:string; unit?:string; missing?:number}
export interface DictionaryCheck {
  source:string;
  /** Variables the dictionary describes that the file does not have. */
  notInFile:string[];
  /** Columns the file has that the dictionary does not describe. */
  notInDictionary:string[];
  /** Where the dictionary states how many values are missing and the file holds a different number. */
  missingDisagree:{column:string; declared:number; found:number}[];
  checked:number;
}

const blank=(v:string|undefined)=>!v||!v.trim();

/** A first guess at which dictionary column holds what, from its headers. Shown, never applied silently. */
export function guessMapping(headers:readonly string[]):DictionaryMapping{
  // PATTERNS IN ORDER OF PREFERENCE, each tried across every header before the next: `nonmissing_n` also contains
  // "missing", and NYC's dictionary lists it first.
  const find=(...patterns:RegExp[])=>{for(const p of patterns){const hit=headers.find(h=>p.test(h.trim()));if(hit)return hit;}return undefined;};
  return {
    name:find(/^(variable|var|name|column|field)(_name)?$/i,/variable/i,/name/i)??headers[0]??'',
    ...(find(/^(label|title)s?$/i,/label/i)?{label:find(/^(label|title)s?$/i,/label/i)!}:{}),
    ...(find(/^description$/i,/description/i,/meaning|bedeutung/i)?{description:find(/^description$/i,/description/i,/meaning|bedeutung/i)!}:{}),
    ...(find(/^units?$/i,/unit/i)?{unit:find(/^units?$/i,/unit/i)!}:{}),
    ...(find(/^missing(_n)?$/i,/^n_?missing$/i,/(^|_)missing/i)?{missing:find(/^missing(_n)?$/i,/^n_?missing$/i,/(^|_)missing/i)!}:{}),
  };
}

/** The dictionary's rows, by variable name. A name repeated is kept once, the first. */
export function readDictionary(headers:readonly string[],rows:readonly string[][],mapping:DictionaryMapping):Map<string,DictionaryEntry>{
  const at=(column?:string)=>column===undefined?-1:headers.findIndex(h=>h.trim()===column);
  const name=at(mapping.name);
  if(name<0)throw new Error(`The dictionary has no column "${mapping.name}" to read variable names from.`);
  const [label,description,unit,missing]=[at(mapping.label),at(mapping.description),at(mapping.unit),at(mapping.missing)];
  const entries=new Map<string,DictionaryEntry>();
  for(const row of rows){
    const key=(row[name]??'').trim();
    if(!key||entries.has(key))continue;
    const cell=(i:number)=>i<0?undefined:(row[i]??'').trim()||undefined;
    const count=cell(missing);
    entries.set(key,{...(cell(label)?{label:cell(label)}:{}),...(cell(description)?{description:cell(description)}:{}),
      ...(cell(unit)?{unit:cell(unit)}:{}),...(count!==undefined&&Number.isFinite(Number(count))?{missing:Number(count)}:{})});
  }
  return entries;
}

/** THE MECHANICAL MATCH: every column of the file against the dictionary, and every stated missing count against
 *  the file's. The practitioner, 2026-11-03: *"Matching a codebook to the provided tables is a mechanical,
 *  deterministic step"*. Missing is an empty cell or `NA`, as the file's readers count it. */
export function checkDictionary(source:string,entries:Map<string,DictionaryEntry>,
    file:{headers:readonly string[];rows:readonly string[][]}):DictionaryCheck{
  const headers=file.headers.map(h=>h.trim());
  const missingDisagree:DictionaryCheck['missingDisagree']=[];
  headers.forEach((column,i)=>{
    const declared=entries.get(column)?.missing;
    if(declared===undefined)return;
    const found=file.rows.filter(row=>{const v=(row[i]??'').trim();return v===''||v.toUpperCase()==='NA';}).length;
    if(found!==declared)missingDisagree.push({column,declared,found});
  });
  return {source,notInFile:[...entries.keys()].filter(name=>!headers.includes(name)),
    notInDictionary:headers.filter(name=>!entries.has(name)),missingDisagree,checked:headers.length};
}

/** A dictionary's entries as declarations for the kept columns, unconfirmed, keeping anything already confirmed. */
export function proposeFrom(entries:Map<string,DictionaryEntry>,source:string,columns:readonly string[],
    held:ColumnDeclarations={}):ColumnDeclarations{
  const next:ColumnDeclarations={...held};
  for(const column of columns){
    const entry=entries.get(column);
    if(!entry||held[column]?.confirmed)continue;
    next[column]={...(entry.label?{label:entry.label}:{}),...(entry.description?{description:entry.description}:{}),
      ...(entry.unit?{unit:entry.unit}:{}),origin:'dictionary',confirmed:false,from:source};
  }
  return next;
}

/** The columns a table keeps: its key columns and its value field. */
export const keptColumns=(table:Pick<DataTable,'keys'|'valueField'>)=>[...table.keys,...(table.keys.includes(table.valueField)?[]:[table.valueField])];

/** A WIDE READ'S COLUMNS ARE THE FILE'S: its subject columns and the value columns it melted. The melted table's
 *  variable and value columns are names Fieldwork gave it, not columns anyone has to describe. */
export interface WideRead {keys:string[]; valueFields:string[]; measureKey:string}
export const describableColumns=(table:Pick<DataTable,'keys'|'valueField'>,wide?:WideRead)=>
  wide?[...wide.keys,...wide.valueFields]:keptColumns(table);
/** The table's rows as the file had them, for the columns above: a wide read is regrouped one row per subject, so a
 *  dictionary's missing count is compared with the file's. */
export function fileRows(table:Pick<DataTable,'keys'|'valueField'|'rows'>,wide?:WideRead):string[][]{
  const text=(v:unknown)=>v===null||v===undefined?'':String(v);
  if(!wide){const columns=keptColumns(table);
    return table.rows.map(r=>columns.map(c=>c===table.valueField?text(r.value):text(r.key[c])));}
  const subjects=new Map<string,Record<string,string>>();
  for(const r of table.rows){
    const id=wide.keys.map(k=>text(r.key[k])).join('\u0000');
    const row=subjects.get(id)??Object.fromEntries(wide.keys.map(k=>[k,text(r.key[k])]));
    row[text(r.key[wide.measureKey])]=text(r.value);subjects.set(id,row);
  }
  return [...subjects.values()].map(row=>[...wide.keys,...wide.valueFields].map(c=>row[c]??''));
}

/** A column is described when someone has confirmed a label or a description for it. */
export const isDescribed=(meta?:ColumnMeta)=>!!meta&&meta.confirmed&&!(blank(meta.label)&&blank(meta.description));

/** How a column reads beside its name: the label, and the unit in brackets. Empty when nothing is confirmed. */
export function meaningOf(meta?:ColumnMeta):string{
  if(!meta?.confirmed)return '';
  const text=meta.label?.trim()||meta.description?.trim()||'';
  return text?`${text}${meta.unit?.trim()?` (${meta.unit.trim()})`:''}`:'';
}

/** FINDINGS, NEVER REFUSALS. An undescribed column, a proposal not yet accepted, and a dictionary that disagrees with
 *  the file are each something to look at; the table still loads and runs. */
export function metadataFindings(table:Pick<DataTable,'keys'|'valueField'>,declared?:ColumnDeclarations,
    check?:DictionaryCheck,wide?:WideRead):TableFinding[]{
  const columns=describableColumns(table,wide),held=declared??{};
  const findings:TableFinding[]=[];
  // No declaration at all, or one accepted with nothing in it.
  const undescribed=columns.filter(c=>!held[c]||(held[c]!.confirmed&&!isDescribed(held[c])));
  const unconfirmed=columns.filter(c=>held[c]&&!held[c]!.confirmed);
  if(undescribed.length)findings.push({kind:'undescribed-column',rows:[],
    text:`${undescribed.length} of ${columns.length} kept column${columns.length===1?' has':'s have'} no stated meaning: ${undescribed.join(', ')}.`});
  if(unconfirmed.length)findings.push({kind:'unconfirmed-description',rows:[],
    text:`${unconfirmed.length} description${unconfirmed.length===1?' is':'s are'} proposed by a dictionary or the file and not yet accepted: ${unconfirmed.join(', ')}.`});
  if(check){
    for(const d of check.missingDisagree)findings.push({kind:'dictionary-mismatch',rows:[],column:d.column,
      text:`${check.source} says ${d.column} is missing ${d.declared} time${d.declared===1?'':'s'}; the file has ${d.found}.`});
    const kept=check.notInDictionary.filter(c=>columns.includes(c));
    if(kept.length)findings.push({kind:'dictionary-mismatch',rows:[],
      text:`${check.source} does not describe ${kept.length===1?'this kept column':'these kept columns'}: ${kept.join(', ')}.`});
  }
  return findings;
}
