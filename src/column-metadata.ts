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
/** THE MEASUREMENT SCALE (experiment 211): categories in no order, categories in an order, numbers with no true zero,
 *  amounts counted from zero. Declared, never inferred: a column of 0, 1 and 2 may be any of the four. */
export type Scale='nominal'|'ordinal'|'interval'|'ratio';
export const SCALES:readonly Scale[]=['nominal','ordinal','interval','ratio'];
/** Each scale in the words the Columns dialog and the profile use. */
export const SCALE_WORDS:Record<Scale,string>={nominal:'Categories, in no order',ordinal:'Categories in an order',
  interval:'Numbers with no true zero',ratio:'Amounts counted from zero'};
/** A value as the file writes it and what it means. For an ordinal column the list is the order. */
export interface Code {value:string; label:string}
export interface ColumnMeta {
  label?:string; unit?:string; description?:string;
  scale?:Scale; codes?:Code[];
  /** Who said it: typed here, read from a data dictionary, or carried in the data file itself (Stata's labels). */
  origin:Origin;
  /** A proposal from a dictionary or file is unconfirmed until the practitioner accepts it. */
  confirmed:boolean;
  /** The dictionary or file it came from, as named where it was read. */
  from?:string;
}
export type ColumnDeclarations=Record<string,ColumnMeta>;

/** A DATA DICTIONARY AS AN ASSET (experiment 211). The practitioner, 2026-11-13: *"The data dictionary as a first class
 *  asset should be importable and viewable with the table input that first imports the two."* The file as read, so it
 *  can be viewed as it was published; what it proposes is in the column declarations, accepted or not. */
export interface TableDictionary {name:string; sha256:string; sheets:{name:string;headers:string[];rows:string[][]}[]; readAt:string}
export const dictionaryKeyOf=(sha256:string)=>`dictionary:${sha256}`;
/** Read back, or undefined: a dictionary that is not one is dropped, never half kept. */
export function readTableDictionary(raw:unknown):TableDictionary|undefined{
  const r=raw as Partial<TableDictionary>|null;
  if(!r||typeof r!=='object'||typeof r.name!=='string'||typeof r.sha256!=='string'||!/^[0-9a-f]{64}$/.test(r.sha256)
    ||typeof r.readAt!=='string'||!Array.isArray(r.sheets))return undefined;
  const text=(v:unknown)=>Array.isArray(v)&&v.every(c=>typeof c==='string');
  if(!r.sheets.every(s=>s&&typeof s.name==='string'&&text(s.headers)&&Array.isArray(s.rows)&&s.rows.every(text)))return undefined;
  return r as TableDictionary;
}

/** A data dictionary, as a table of its own: one row per variable. Which of its columns holds what is the
 *  practitioner's mapping, offered with a first guess from its headers. */
export interface DictionaryMapping {name:string; label?:string; description?:string; unit?:string; missing?:string; scale?:string; codes?:string}
export interface DictionaryEntry {label?:string; description?:string; unit?:string; missing?:number; scale?:Scale; codes?:Code[]}

/** Codes as a person writes them: `0 = pre-school; 1 = first class`, one per line or separated by semicolons. A value
 *  with no meaning given is kept with an empty one. */
export function readCodes(text:string):Code[]{
  return text.split(/[;\n]/).map(part=>part.trim()).filter(Boolean).map(part=>{
    const at=part.indexOf('=');
    return at<0?{value:part,label:''}:{value:part.slice(0,at).trim(),label:part.slice(at+1).trim()};
  }).filter(c=>c.value!=='');
}
export const writeCodes=(codes?:readonly Code[])=>(codes??[]).map(c=>c.label?`${c.value} = ${c.label}`:c.value).join('; ');

/** WHAT AN R DICTIONARY SAYS: *School class (factor: 0, preschool; 1, 1st class; 2, 2nd class)*, as the outbreaks
 *  package documents Hagelloch. A factor is R's category with no order, so the scale proposed is nominal; R writes an
 *  ordered one as `ordered`, and only then is ordinal proposed. Codes as `value, meaning` separated by semicolons, or
 *  bare values separated by commas (`factor: f, m`). */
export function codesInDescription(description:string):{scale:Scale;codes:Code[]}|undefined{
  const found=/\((factor|ordered)\s*:\s*([^)]*)\)/i.exec(description);
  if(!found)return undefined;
  const body=found[2]!.trim();
  const codes=body.includes(';')
    ?body.split(';').map(p=>p.trim()).filter(Boolean).map(p=>{const at=p.indexOf(',');
      return at<0?{value:p,label:''}:{value:p.slice(0,at).trim(),label:p.slice(at+1).trim()};})
    :body.split(',').map(v=>v.trim()).filter(Boolean).map(value=>({value,label:''}));
  return codes.length?{scale:found[1]!.toLowerCase()==='ordered'?'ordinal':'nominal',codes}:undefined;
}
const readScale=(text?:string):Scale|undefined=>{const t=(text??'').trim().toLowerCase();return (SCALES as readonly string[]).includes(t)?t as Scale:undefined;};
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
    ...(find(/^(measurement_?)?scale$/i)?{scale:find(/^(measurement_?)?scale$/i)!}:{}),
    ...(find(/^(codes|value_?labels|values)$/i)?{codes:find(/^(codes|value_?labels|values)$/i)!}:{}),
  };
}

/** The dictionary's rows, by variable name. A name repeated is kept once, the first. */
export function readDictionary(headers:readonly string[],rows:readonly string[][],mapping:DictionaryMapping):Map<string,DictionaryEntry>{
  const at=(column?:string)=>column===undefined?-1:headers.findIndex(h=>h.trim()===column);
  const name=at(mapping.name);
  if(name<0)throw new Error(`The dictionary has no column "${mapping.name}" to read variable names from.`);
  const [label,description,unit,missing,scale,codes]=[at(mapping.label),at(mapping.description),at(mapping.unit),at(mapping.missing),at(mapping.scale),at(mapping.codes)];
  const entries=new Map<string,DictionaryEntry>();
  for(const row of rows){
    const key=(row[name]??'').trim();
    if(!key||entries.has(key))continue;
    const cell=(i:number)=>i<0?undefined:(row[i]??'').trim()||undefined;
    const count=cell(missing);
    entries.set(key,{...(cell(label)?{label:cell(label)}:{}),...(cell(description)?{description:cell(description)}:{}),
      ...(cell(unit)?{unit:cell(unit)}:{}),...(count!==undefined&&Number.isFinite(Number(count))?{missing:Number(count)}:{}),
      ...(readScale(cell(scale))?{scale:readScale(cell(scale))}:{}),...(cell(codes)&&readCodes(cell(codes)!).length?{codes:readCodes(cell(codes)!)}:{})});
  }
  return entries;
}

/** WHICH DICTIONARY VARIABLE DESCRIBES WHICH COLUMN: the practitioner's connection, column to variable. The
 *  practitioner, 2026-11-04: *"we need an explicit user focused mapping tool so the dictionary actually gets connected
 *  to the data set."* A column absent here, or connected to '', is not described by the dictionary. */
export type Connections=Record<string,string>;
export interface Suggestion {variable:string; how:'same name'|'suggested'}

/** A name reduced to what a person would see as the same variable: case, spaces and the marks a codebook adds
 *  (`sex*`) removed. */
const plain=(name:string)=>name.toLowerCase().replace(/[\s*]+/g,'');
/** A column's name without the suffix a data file adds to a codebook variable for a period or a wave: `galiamelo_apr2`
 *  and `galiamelo2` are both `galiamelo`. Suggested only, never connected without the practitioner. */
const stem=(name:string)=>plain(name).replace(/(_[a-z]{3}\d+|_\d+|\d+)$/,'');

/** SUGGESTIONS, MARKED AS SUCH. The same name connects; a plain or stemmed match is suggested and waits to be confirmed. */
export function suggestConnections(columns:readonly string[],variables:readonly string[]):Record<string,Suggestion>{
  const out:Record<string,Suggestion>={};
  for(const column of columns){
    if(variables.includes(column)){out[column]={variable:column,how:'same name'};continue;}
    const byPlain=variables.find(v=>plain(v)===plain(column));
    const byStem=byPlain??variables.find(v=>plain(v)===stem(column))??variables.find(v=>stem(v)===stem(column)&&stem(v).length>2);
    if(byStem)out[column]={variable:byStem,how:'suggested'};
  }
  return out;
}
/** Connections as the identity, for a dictionary whose names are the file's. */
export const sameNames=(columns:readonly string[],entries:Map<string,DictionaryEntry>):Connections=>
  Object.fromEntries(columns.filter(c=>entries.has(c)).map(c=>[c,c]));

/** THE MECHANICAL MATCH: every column of the file against the dictionary, and every stated missing count against
 *  the file's. The practitioner, 2026-11-03: *"Matching a codebook to the provided tables is a mechanical,
 *  deterministic step"*. Missing is an empty cell or `NA`, as the file's readers count it. */
export function checkDictionary(source:string,entries:Map<string,DictionaryEntry>,
    file:{headers:readonly string[];rows:readonly string[][]},connections?:Connections):DictionaryCheck{
  const headers=file.headers.map(h=>h.trim());
  const linked=connections??sameNames(headers,entries);
  const missingDisagree:DictionaryCheck['missingDisagree']=[];
  headers.forEach((column,i)=>{
    const declared=linked[column]?entries.get(linked[column]!)?.missing:undefined;
    if(declared===undefined)return;
    const found=file.rows.filter(row=>{const v=(row[i]??'').trim();return v===''||v.toUpperCase()==='NA';}).length;
    if(found!==declared)missingDisagree.push({column,declared,found});
  });
  const used=new Set(Object.values(linked).filter(Boolean));
  return {source,notInFile:[...entries.keys()].filter(name=>!used.has(name)),
    notInDictionary:headers.filter(name=>!linked[name]||!entries.has(linked[name]!)),missingDisagree,checked:headers.length};
}

/** A dictionary's entries as declarations for the kept columns, unconfirmed, keeping anything already confirmed. */
export function proposeFrom(entries:Map<string,DictionaryEntry>,source:string,columns:readonly string[],
    held:ColumnDeclarations={},connections?:Connections):ColumnDeclarations{
  const next:ColumnDeclarations={...held};
  const linked=connections??sameNames(columns,entries);
  for(const column of columns){
    const entry=linked[column]?entries.get(linked[column]!):undefined;
    if(!entry||held[column]?.confirmed)continue;
    // A scale or codes the dictionary states in their own columns win over what its description says in R's words.
    const said=entry.description?codesInDescription(entry.description):undefined;
    const scale=entry.scale??said?.scale,codes=entry.codes??said?.codes;
    next[column]={...(entry.label?{label:entry.label}:{}),...(entry.description?{description:entry.description}:{}),
      ...(entry.unit?{unit:entry.unit}:{}),...(scale?{scale}:{}),...(codes?.length?{codes}:{}),origin:'dictionary',confirmed:false,from:source};
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

/** The scales and codes the practitioner has accepted, for the profile to follow (experiment 211). A proposal is not
 *  followed until accepted. */
export function scalesOf(declared?:ColumnDeclarations):Record<string,{scale?:Scale;codes?:Code[]}>{
  return Object.fromEntries(Object.entries(declared??{}).filter(([,m])=>m.confirmed&&(m.scale||m.codes?.length))
    .map(([c,m])=>[c,{...(m.scale?{scale:m.scale}:{}),...(m.codes?.length?{codes:m.codes}:{})}]));
}

/** WHAT THE SOURCES SAID, FOLLOWED DOWNSTREAM (experiment 211). A step's table keeps a source's column under the same
 *  name when it groups, relates or selects by it, so a declaration accepted on Tabular data or Point data is read by
 *  name wherever that column arrives. A column a step computes, such as a count, has no declaration, and is given none.
 *  The nearest source wins where two declare one name. */
export function declaredUpstream(nodes:readonly {id:string;params:unknown}[],edges:readonly {from:string;to:string}[],
    nodeId:string):ColumnDeclarations{
  const out:ColumnDeclarations={},seen=new Set<string>([nodeId]),queue=[nodeId];
  while(queue.length){
    const at=queue.shift()!;
    for(const edge of edges.filter(e=>e.to===at)){
      if(seen.has(edge.from))continue;seen.add(edge.from);queue.push(edge.from);
      const held=(nodes.find(n=>n.id===edge.from)?.params as {columns?:ColumnDeclarations}|undefined)?.columns;
      for(const [column,meta] of Object.entries(held??{}))if(meta.confirmed&&!(column in out))out[column]=meta;
    }
  }
  return out;
}
/** Values in their declared order, an ordinal column's codes first in order and anything else after, as it came. */
export function inDeclaredOrder<T>(items:readonly T[],valueOf:(item:T)=>string,said?:{scale?:Scale;codes?:readonly Code[]}):T[]{
  if(said?.scale!=='ordinal'||!said.codes?.length)return [...items];
  const rank=(v:string)=>{const at=said.codes!.findIndex(c=>c.value===v);return at<0?said.codes!.length:at;};
  return [...items].map((item,at)=>({item,at})).sort((a,b)=>rank(valueOf(a.item))-rank(valueOf(b.item))||a.at-b.at).map(x=>x.item);
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

/** A DICTIONARY MADE FROM THE DECLARATIONS, when the source came without one. The practitioner, 2026-11-04: *"if there
 *  is no data dictionary that the user is able to create one for the data source."* Accepted descriptions only; as a
 *  CSV a person can open, share or publish beside the data. */
export function dictionaryCsv(declared:ColumnDeclarations,columns:readonly string[]):string{
  const cell=(v?:string)=>{const t=v??'';return /[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t;};
  return ['variable,label,unit,description,scale,codes',...columns.filter(c=>isDescribed(declared[c])).map(c=>{
    const m=declared[c]!;return [c,m.label,m.unit,m.description,m.scale,writeCodes(m.codes)].map(cell).join(',');})].join('\n')+'\n';
}
/** The same, as entries, for offering to another table that reads the same source. */
export function entriesFrom(declared:ColumnDeclarations):Map<string,DictionaryEntry>{
  return new Map(Object.entries(declared).filter(([,m])=>isDescribed(m)).map(([c,m])=>[c,
    {...(m.label?{label:m.label}:{}),...(m.unit?{unit:m.unit}:{}),...(m.description?{description:m.description}:{}),
      ...(m.scale?{scale:m.scale}:{}),...(m.codes?.length?{codes:m.codes}:{})}]));
}
