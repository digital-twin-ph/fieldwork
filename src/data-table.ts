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

/** Distinct values per key, in first-seen order: what a reader needs to understand the shape
 *  of a table before reading its rows. */
export function keyDomains(table:DataTable):Record<string,Scalar[]> {
  return Object.fromEntries(table.keys.map(name=>[name,[...new Set(table.rows.map(row=>row.key[name]))]]));
}

/** Run evidence for one import. Records the declared key and value fields, whether a unit was
 *  stated, and how many values were absent, so a reader can tell shape from meaning. */
export function tableReceipt(node:{id:string;params:{label:string;unit?:string}},table:DataTable,runId:string){
  const entity=`<urn:fieldwork:run:${runId}:table:${node.id}>`,activity=`<urn:fieldwork:run:${runId}:tableinput:${node.id}>`;
  const quote=(value:string)=>JSON.stringify(value);
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcat: <http://www.w3.org/ns/dcat#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:TabularInput, prov:Activity; prov:generated ${entity}`
    +(table.source?`; fw:sourceFile ${quote(table.source.filename)}; fw:sourceDigest ${quote(table.source.sha256)}`:'')+`.\n`
    +`${entity} a fw:DataTable, dcat:Dataset, prov:Entity; prov:wasGeneratedBy ${activity}; `
    +table.keys.map(name=>`fw:keyField ${quote(name)}`).join('; ')+'; '
    +`fw:valueField ${quote(table.valueField)}; fw:valueUnitStatus ${quote(table.unit?'stated':'unstated')}`
    +(table.unit?`; fw:valueUnit ${quote(table.unit)}`:'')
    +`; fw:tableRowCount "${table.rowCount}"^^xsd:integer; fw:tableMissingValueCount "${table.missingValueCount}"^^xsd:integer.\n`;
  return {value:table,receipt:{nodeId:node.id,kind:'computation' as const,facts,rules:'',input:facts,conclusions:[]}};
}
