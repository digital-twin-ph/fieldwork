/** Long-format tabular input: rows identified by declared key fields, carrying one declared
 *  value field. A table has no geometry and no CRS; see docs/experiments/48-tabular-input.md. */
import type {Scalar} from './types.js';

/** The parsed-CSV shape this module needs, declared locally rather than imported: the type
 *  graph reaches this file from the worker type-check, which has no DOM, and the CSV reader
 *  lives in a module that uses it. Parsing stays the caller's job. */
export interface TableRows {headers:string[]; rows:string[][]}

export const MAX_TABLE_ROWS=2000;
export interface DataTableSource {filename:string; bytes:number; sha256:string; rows:number}
export interface DataTable {
  kind:'data-table'; keys:string[]; valueField:string; unit?:string;
  rows:{key:Record<string,string>; value:number|null}[];
  rowCount:number; missingValueCount:number; source?:DataTableSource;
}
export interface TableSelection {keys:string[]; valueField:string; unit?:string}

const trimmed=(value:string)=>value.trim();

/** Builds a table from a parsed CSV and an explicit column selection. Nothing is inferred:
 *  the caller names the key fields and the value field, and an absent column is an error
 *  rather than a silently empty column. */
export function dataTable(table:TableRows,selection:TableSelection):DataTable {
  const headers=table.headers.map(trimmed);
  const keys=selection.keys.map(trimmed).filter(Boolean);
  const valueField=trimmed(selection.valueField);
  if(!keys.length)throw new Error('Choose at least one key column. A table without a key cannot identify its rows.');
  if(new Set(keys).size!==keys.length)throw new Error('Key columns must be distinct.');
  if(!valueField)throw new Error('Choose the column holding the value.');
  if(keys.includes(valueField))throw new Error('The value column cannot also be a key column.');
  for(const name of [...keys,valueField]){
    if(!headers.includes(name))throw new Error(`The file has no column named ${JSON.stringify(name)}.`);
  }
  if(!table.rows.length)throw new Error('The selected file contains no rows.');
  if(table.rows.length>MAX_TABLE_ROWS)throw new Error(`Tabular input supports at most ${MAX_TABLE_ROWS.toLocaleString()} rows.`);
  const index=(name:string)=>headers.indexOf(name);
  const seen=new Map<string,number>();
  let missingValueCount=0;
  const rows=table.rows.map((row,position)=>{
    const key=Object.fromEntries(keys.map(name=>[name,trimmed(row[index(name)]??'')]));
    for(const name of keys)if(!key[name])throw new Error(`Row ${position+1} has no value in key column ${JSON.stringify(name)}.`);
    // A long table's key must be unique. A duplicate is the signature of a wide table, or of a
    // long one missing a key column, where one value would silently overwrite another.
    const signature=keys.map(name=>key[name]).join('\u0000');
    const earlier=seen.get(signature);
    if(earlier!==undefined)throw new Error(`Rows ${earlier+1} and ${position+1} share the key ${keys.map(name=>`${name}=${key[name]}`).join(', ')}. A long-format table needs one row per key; check whether a key column is missing.`);
    seen.set(signature,position);
    const raw=trimmed(row[index(valueField)]??'');
    if(!raw){missingValueCount++;return {key,value:null};}
    const value=Number(raw);
    if(!Number.isFinite(value))throw new Error(`Row ${position+1} has a nonnumeric value ${JSON.stringify(raw)} in ${JSON.stringify(valueField)}.`);
    return {key,value};
  });
  return {kind:'data-table',keys,valueField,...(selection.unit?{unit:trimmed(selection.unit)}:{}),
    rows,rowCount:rows.length,missingValueCount};
}

/** A wide file, which is how a table arrives.
 *
 *  THE DEFAULT, by the practitioner's instruction, 2026-10-26: *"We have to assume wide in as
 *  default, that's the epidemiology mindset."* One row per subject and a column per variable is
 *  what a case line list, a surveillance export and a published table all look like -- Snow's
 *  Table IX is `supplier, houses, deaths, deaths_per_10000_houses` -- and until now this
 *  application refused that shape outright, telling the reader a repeated key was "the signature
 *  of a wide table". Every long table it holds had therefore been melted by hand somewhere else,
 *  including the ones its own worked examples ship.
 *
 *  The internal table stays long, and that is not a compromise. `rate.fromTable` already turns a
 *  long table back into wide RECORDS -- subject keys, one property per measure -- which is how
 *  `rate` reads a numerator and a denominator from one subject. So the two shapes already round
 *  trip; what was missing was this direction, at the door.
 *
 *  `measureKey` names the column that will hold the variable names, and `valueField` the column
 *  that will hold their values. Both are the practitioner's words, because every downstream step
 *  names them: a Rate takes its measure key, and a derived value names two of its values. */
export interface WideSelection {
  keys:string[]; valueFields:string[]; measureKey:string; valueField:string; unit?:string;
}
export function wideDataTable(table:TableRows,selection:WideSelection):DataTable {
  const headers=table.headers.map(trimmed);
  const keys=selection.keys.map(trimmed).filter(Boolean);
  const measureKey=trimmed(selection.measureKey)||'measure';
  const valueField=trimmed(selection.valueField)||'value';
  // Named explicitly rather than "everything else", so that adding a column to a file does not
  // silently add a variable to an analysis somebody has already read.
  const valueFields=selection.valueFields.map(trimmed).filter(Boolean);
  if(!keys.length)throw new Error('Choose at least one column identifying the subject of a row. '
    +'A wide table has one row per subject, and something has to say which subject.');
  if(new Set(keys).size!==keys.length)throw new Error('Key columns must be distinct.');
  if(!valueFields.length)throw new Error('Choose at least one column holding a value.');
  if(new Set(valueFields).size!==valueFields.length)throw new Error('Value columns must be distinct.');
  for(const name of valueFields)
    if(keys.includes(name))throw new Error(`${JSON.stringify(name)} cannot be both a key column and a value column.`);
  if(keys.includes(measureKey))throw new Error(`${JSON.stringify(measureKey)} is already a key column, `
    +'so it cannot also name the column holding the variable names.');
  for(const name of [...keys,...valueFields])
    if(!headers.includes(name))throw new Error(`The file has no column named ${JSON.stringify(name)}.`);
  if(!table.rows.length)throw new Error('The selected file contains no rows.');
  const melted=table.rows.length*valueFields.length;
  if(melted>MAX_TABLE_ROWS)throw new Error(`${table.rows.length.toLocaleString()} rows across `
    +`${valueFields.length} value columns is ${melted.toLocaleString()} values, and tabular input `
    +`supports at most ${MAX_TABLE_ROWS.toLocaleString()}. Choose fewer value columns.`);

  const index=(name:string)=>headers.indexOf(name);
  const seen=new Map<string,number>();
  const rows:DataTable['rows']=[];
  let missingValueCount=0;
  table.rows.forEach((row,position)=>{
    const key=Object.fromEntries(keys.map(name=>[name,trimmed(row[index(name)]??'')]));
    for(const name of keys)
      if(!key[name])throw new Error(`Row ${position+1} has no value in key column ${JSON.stringify(name)}.`);
    // In a wide file one row IS one subject, so a repeated key is a duplicate record rather than
    // the long shape -- the opposite diagnosis from the one the long reader gives, and the
    // reason these are two readers instead of one with a flag.
    const signature=keys.map(name=>key[name]).join('\u0000');
    const earlier=seen.get(signature);
    if(earlier!==undefined)throw new Error(`Rows ${earlier+1} and ${position+1} both describe `
      +`${keys.map(name=>`${name}=${key[name]}`).join(', ')}. A wide table has one row per subject; `
      +'check whether a column identifying the subject is missing.');
    seen.set(signature,position);
    for(const name of valueFields){
      const raw=trimmed(row[index(name)]??'');
      if(!raw){missingValueCount++;rows.push({key:{...key,[measureKey]:name},value:null});continue;}
      const value=Number(raw);
      if(!Number.isFinite(value))throw new Error(`Row ${position+1} has a nonnumeric value `
        +`${JSON.stringify(raw)} in ${JSON.stringify(name)}.`);
      rows.push({key:{...key,[measureKey]:name},value});
    }
  });
  return {kind:'data-table',keys:[...keys,measureKey],valueField,
    ...(selection.unit?{unit:trimmed(selection.unit)}:{}),
    rows,rowCount:rows.length,missingValueCount};
}

/** Distinct values per key, in first-seen order: what a reader needs to understand the shape
 *  of a table before reading its rows. */
export function keyDomains(table:DataTable):Record<string,Scalar[]> {
  return Object.fromEntries(table.keys.map(name=>[name,[...new Set(table.rows.map(row=>row.key[name]))]]));
}

/** Run evidence for one import. Records the declared key and value fields, whether a unit was
 *  stated, and how many values were absent, so a reader can tell shape from meaning. */
/** The distinct values of each declared column, sorted, with the column that has none named.
 *
 *  P3 of experiment 115. The extract widget derived this in the middle of the graph -- operation
 *  5 of five, annotated onto a value in transit -- and it belongs at the input, where a
 *  practitioner can still act on what it tells them.
 *
 *  Sorted with `localeCompare` so the order is the one a reader would put them in, and stable
 *  across runs: a distinct set whose order changed between runs would make two identical
 *  extracts look different. */
export function distinctValues(table:DataTable,columns:readonly string[]):Record<string,string[]>{
  const out:Record<string,string[]>={};
  for(const column of columns){
    if(!table.keys.includes(column))
      throw new Error(`"${column}" is not a key column of this table, so it has no distinct values to take. `
        +`Its key columns are: ${table.keys.join(', ')}.`);
    const seen=new Set<string>();
    for(const row of table.rows){
      const value=row.key[column];
      if(value!==undefined&&value!==null&&String(value).trim())seen.add(String(value));
    }
    out[column]=[...seen].sort((a,b)=>a.localeCompare(b));
  }
  return out;
}

export function tableReceipt(node:{id:string;params:{label:string;unit?:string;distinctValuesFor?:string[];
  wide?:{keys:string[];valueFields:string[];measureKey:string}}},table:DataTable,runId:string){
  const entity=`<urn:fieldwork:run:${runId}:table:${node.id}>`,activity=`<urn:fieldwork:run:${runId}:tableinput:${node.id}>`;
  const quote=(value:string)=>JSON.stringify(value);
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcat: <http://www.w3.org/ns/dcat#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:TabularInput, prov:Activity; prov:generated ${entity}`
    +(table.source?`; fw:sourceFile ${quote(table.source.filename)}; fw:sourceDigest ${quote(table.source.sha256)}`:'')+`.\n`
    +`${entity} a fw:DataTable, dcat:Dataset, prov:Entity; prov:wasGeneratedBy ${activity}; `
    +table.keys.map(name=>`fw:keyField ${quote(name)}`).join('; ')+'; '
    +`fw:valueField ${quote(table.valueField)}; fw:valueUnitStatus ${quote(table.unit?'stated':'unstated')}`
    +(table.unit?`; fw:valueUnit ${quote(table.unit)}`:'')
    +`; fw:tableRowCount "${table.rowCount}"^^xsd:integer; fw:tableMissingValueCount "${table.missingValueCount}"^^xsd:integer.\n`
    // THE SHAPE THE FILE WAS IN, and the columns taken from it.
    //
    // A wide file is MELTED on the way in, which is something done to the data the practitioner
    // supplied: one row per subject becomes one row per subject per variable, and the variables
    // are NAMED rather than taken as whatever was left over. A receipt that recorded only the
    // long result would describe a table the file does not contain and say nothing about the
    // columns that were and were not taken. `fw:readAs` is asserted either way, because "this
    // file was already long" is as much a fact about the reading as the melt is.
    +`${activity} fw:readAs ${quote(node.params.wide?'wide':'long')}`
    +(node.params.wide
      ?'; '+node.params.wide.keys.map(name=>`fw:subjectKeyField ${quote(name)}`).join('; ')
        +'; '+node.params.wide.valueFields.map(name=>`fw:meltedValueField ${quote(name)}`).join('; ')
        +`; fw:measureKeyField ${quote(node.params.wide.measureKey)}`
        +`; fw:meltedValueFieldCount "${node.params.wide.valueFields.length}"^^xsd:integer`
      :'')
    +`.\n`;
  const declared=node.params.distinctValuesFor??[];
  const distinct=declared.length?distinctValues(table,declared):undefined;
  const distinctFacts=distinct
    ?Object.entries(distinct).map(([column,values])=>
      `${entity} fw:distinctValuesOf [ fw:boundAttribute ${quote(column)}; `
      +`fw:distinctValueCount "${values.length}"^^xsd:integer; `
      +values.map(v=>`fw:distinctValue ${quote(v)}`).join('; ')+' ].\n').join('')
    :'';
  return {value:distinct?{...table,distinct}:table,
    receipt:{nodeId:node.id,kind:'computation' as const,facts:facts+distinctFacts,rules:'',
      input:facts+distinctFacts,conclusions:[]}};
}
