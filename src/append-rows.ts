import {repeatedKeys,type DataTable} from './data-table.js';

/** ROWS OF ONE TABLE AFTER ROWS OF ANOTHER, as pandas `concat` stacks them. Experiment 166.
 *
 *  Columns are lined up by name. A key column one table does not have is empty on that table's rows,
 *  and the result says which column and how many rows, because empty there means not asked, not blank.
 *  Two tables whose value columns or units differ measure different things, and stacking them would
 *  make a column that means two things, so that stops here, naming both. */
export interface AppendParams {
  /** A column naming where each row came from, as `concat(keys=...)`. Absent: no such column. */
  sourceColumn?:string;
  /** One label per table, in port order. `firstLabel` and `secondLabel` are how a two-table workflow saved before
   *  0.3.0 named them, and are read where `labels` has nothing for that table. */
  labels?:string[];
  firstLabel?:string;
  secondLabel?:string;
  /** Whether rows say which table they came from. The column and labels are used only when this is on. */
  nameSource?:boolean;
  /** THE LABELS ARE NUMBERS, in this unit, as the practitioner declares (experiment 181): a lag of 2 weeks is the
   *  number 2, so a chart spaces it as a number. Declared, never read off the labels. A label that is not a number
   *  is a data quality finding, and the row is kept. */
  labelsAreNumbers?:{unit:string};
  /** A NEW PRIMARY KEY, numbered 1 to N across the stacked rows, where the old ones would repeat. The old key
   *  column stays, and with a named source, source and old key are kept as an alternate key. */
  newKey?:string;
}
export interface AppendResult {
  table:DataTable;
  /** Rows from each table, in port order. */
  from:number[];
  fromFirst:number;
  fromSecond:number;
  /** Key columns some tables lack, and how many rows are empty in each because of it. `table` counts from 1. */
  missing:{column:string; rows:number; table:number}[];
}

/** The label of table `index` (from 0): the practitioner's, else the saved two-table names, else its position. */
export function appendLabel(params:AppendParams,index:number):string{
  const given=params.labels?.[index]?.trim()
    ||(index===0?params.firstLabel?.trim():index===1?params.secondLabel?.trim():undefined);
  return given||(index===0?'first':index===1?'second':`table ${index+1}`);
}

/** The port of table `index` (from 0): `records`, then `records_2`, `records_3`, ... as saved workflows name them. */
export const appendPort=(index:number):string=>index===0?'records':`records_${index+1}`;
/** How many tables a node stacks. Absent or malformed is 2, the floor. */
export const appendTableCount=(params:{tableCount?:number}):number=>
  Number.isInteger(params.tableCount)&&params.tableCount!>2?params.tableCount!:2;

/** A NUMBER AS A PERSON WRITES ONE: optional sign, digits, an optional decimal part. "2 weeks" is not one. */
const NUMBER=/^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export function appendRows(first:DataTable,second:DataTable,params:AppendParams={}):AppendResult{
  return appendTables([first,second],params);
}

/** ROWS OF EVERY TABLE, one after another, in port order. One step for any number of tables: the practitioner,
 *  2026-11-06, *"we do not want too many widgets of the same kind chained when 1 will do."* Experiment 181. */
export function appendTables(tables:DataTable[],params:AppendParams={}):AppendResult{
  if(tables.length<2)throw new Error('Connect at least two tables: this step stacks their rows.');
  const [first]=tables as [DataTable,...DataTable[]];
  tables.forEach((table,i)=>{
    if(i===0)return;
    if(first.valueField!==table.valueField)
      throw new Error(tables.length===2
        ?`The two tables measure different things: "${first.valueField}" and "${table.valueField}". `
          +'Rows can be stacked only where the value column is the same quantity under the same name.'
        :`Table ${i+1} measures something different from the first: "${table.valueField}", not "${first.valueField}". `
          +'Rows can be stacked only where the value column is the same quantity under the same name.');
    if((first.unit??'')!==(table.unit??''))
      throw new Error(tables.length===2
        ?`The two tables count in different units: ${first.unit||'unstated'} and ${table.unit||'unstated'}.`
        :`Table ${i+1} counts in ${table.unit||'an unstated unit'}, and the first in ${first.unit||'an unstated unit'}.`);
  });
  const source=params.nameSource?params.sourceColumn?.trim():undefined;
  const newKey=params.newKey?.trim();
  const allKeys=tables.flatMap(t=>t.keys);
  if(newKey&&[...allKeys,first.valueField,source].includes(newKey))
    throw new Error(`"${newKey}" is already a column, so it cannot also be the new key. Choose another name.`);
  const labels=tables.map((_,i)=>appendLabel(params,i));
  if(source&&[...allKeys,first.valueField].includes(source))
    throw new Error(`"${source}" is already a column, so it cannot also say where each row came from. Choose another name.`);
  if(source&&new Set(labels).size!==labels.length)
    throw new Error(tables.length===2
      ?'The two tables need different labels, or every row would say it came from the same place.'
      :`Each table needs its own label, and ${labels.filter((l,i)=>labels.indexOf(l)!==i).map(l=>`"${l}"`).join(', ')} is used twice.`);
  const keys=[...(newKey?[newKey]:[]),...new Set(allKeys),...(source?[source]:[])];
  const missing:AppendResult['missing']=[];
  for(const column of keys){
    if(column===source||column===newKey)continue;
    tables.forEach((table,i)=>{if(!table.keys.includes(column))missing.push({column,rows:table.rows.length,table:i+1});});
  }
  let n=0;
  const lay=(table:DataTable,label:string)=>table.rows.map(row=>({
    key:Object.fromEntries(keys.map(column=>[column,column===newKey?String(++n)
      :column===source?label:row.key[column]??''])),value:row.value}));
  const rows=tables.flatMap((table,i)=>lay(table,labels[i]!));
  // WHAT IDENTIFIES A ROW NOW. A primary key every table declares repeats once they are stacked, so it is qualified
  // by the source, or replaced by the new key with source and old key kept beside it.
  const shared=first.primaryKey?.length&&tables.every(t=>JSON.stringify(t.primaryKey)===JSON.stringify(first.primaryKey))
    ?first.primaryKey:undefined;
  const sourced=shared&&source?[source,...shared]:undefined;
  const primaryKey=newKey?[newKey]:sourced??shared;
  const alternateKeys=newKey&&sourced?[sourced]:undefined;
  // A LABEL DECLARED A NUMBER THAT IS NOT ONE is a finding on the rows it labels, which are kept.
  const numeric=source&&params.labelsAreNumbers?{unit:params.labelsAreNumbers.unit.trim()}:undefined;
  const notNumbers=numeric?labels.filter(label=>!NUMBER.test(label)):[];
  const labelFindings=notNumbers.map(label=>{
    const at=rows.flatMap((row,i)=>row.key[source!]===label?[i+1]:[]);
    return {kind:'unreadable-value' as const,rows:at,column:source!,value:label,
      text:`"${label}" labels ${at.length} row${at.length===1?'':'s'} of "${source}", declared a number${numeric!.unit?` in ${numeric!.unit}`:''}, `
        +'and is not one. The rows are kept; a chart cannot place them on a numeric axis.'};
  });
  const findings=[...(primaryKey?repeatedKeys(rows.map(r=>r.key),primaryKey):[]),
    ...(alternateKeys??[]).flatMap(columns=>repeatedKeys(rows.map(r=>r.key),columns)),...labelFindings];
  // AN INTERVAL EVERY TABLE DECLARES THE SAME WAY survives the stacking, so a chart of the stack can still draw it.
  const interval=first.interval&&tables.every(t=>JSON.stringify(t.interval)===JSON.stringify(first.interval))
    ?{interval:first.interval}:{};
  const numericKeys={...Object.assign({},...tables.map(t=>t.numericKeys??{})),
    ...(numeric?{[source!]:numeric.unit}:{})};
  const from=tables.map(t=>t.rows.length);
  return {table:{kind:'data-table',keys,valueField:first.valueField,...(first.unit?{unit:first.unit}:{}),
      ...(primaryKey?{primaryKey}:{}),...(alternateKeys?{alternateKeys}:{}),...(findings.length?{findings}:{}),
      ...interval,...(Object.keys(numericKeys).length?{numericKeys}:{}),
      rows,rowCount:rows.length,missingValueCount:rows.filter(row=>row.value===null).length},
    from,fromFirst:from[0]!,fromSecond:from[1]!,missing};
}

/** What the step did, in one sentence for the receipt and the run summary. */
export function appendSentence(result:AppendResult,params:AppendParams):string{
  const two=result.from.length===2,total=result.from.reduce((a,b)=>a+b,0);
  const which=(table:number)=>two?`the ${table===1?'first':'second'} table`:`table ${table}`;
  const said=result.missing.map(m=>`"${m.column}" is empty on the ${m.rows} rows from ${which(m.table)}, which has no such column`);
  const source=params.nameSource&&params.sourceColumn?.trim();
  return (two?`${result.from[0]} rows from the first table and ${result.from[1]} from the second, `
      :`${result.from.map((n,i)=>`${n} from table ${i+1}`).join(', ')}: `)
    +`${total} in all`
    +(source?`; "${source}" says which`:'')
    +(source&&params.labelsAreNumbers?`, as a number${params.labelsAreNumbers.unit.trim()?` in ${params.labelsAreNumbers.unit.trim()}`:''}`:'')
    +(params.newKey?.trim()?`; "${params.newKey.trim()}" numbers them 1 to ${total} as the new key`:'')+'.'
    +(said.length?` ${said.join('; ')}.`:'');
}
