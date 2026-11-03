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
  firstLabel?:string;
  secondLabel?:string;
  /** Whether rows say which table they came from. The column and labels are used only when this is on. */
  nameSource?:boolean;
  /** A NEW PRIMARY KEY, numbered 1 to N across the stacked rows, where the old ones would repeat. The old key
   *  column stays, and with a named source, source and old key are kept as an alternate key. */
  newKey?:string;
}
export interface AppendResult {
  table:DataTable;
  fromFirst:number;
  fromSecond:number;
  /** Key columns only one table has, and how many rows are empty in each because of it. */
  missing:{column:string; rows:number; from:'first'|'second'}[];
}

export function appendRows(first:DataTable,second:DataTable,params:AppendParams={}):AppendResult{
  if(first.valueField!==second.valueField)
    throw new Error(`The two tables measure different things: "${first.valueField}" and "${second.valueField}". `
      +'Rows can be stacked only where the value column is the same quantity under the same name.');
  if((first.unit??'')!==(second.unit??''))
    throw new Error(`The two tables count in different units: ${first.unit||'unstated'} and ${second.unit||'unstated'}.`);
  const source=params.nameSource?params.sourceColumn?.trim():undefined;
  const newKey=params.newKey?.trim();
  if(newKey&&[...first.keys,...second.keys,first.valueField,source].includes(newKey))
    throw new Error(`"${newKey}" is already a column, so it cannot also be the new key. Choose another name.`);
  const labels=[params.firstLabel?.trim()||'first',params.secondLabel?.trim()||'second'] as const;
  if(source&&[...first.keys,...second.keys,first.valueField].includes(source))
    throw new Error(`"${source}" is already a column, so it cannot also say where each row came from. Choose another name.`);
  if(source&&labels[0]===labels[1])
    throw new Error('The two tables need different labels, or every row would say it came from the same place.');
  const keys=[...(newKey?[newKey]:[]),...new Set([...first.keys,...second.keys]),...(source?[source]:[])];
  const missing:AppendResult['missing']=[];
  for(const column of keys){
    if(column===source||column===newKey)continue;
    if(!first.keys.includes(column))missing.push({column,rows:first.rows.length,from:'first'});
    if(!second.keys.includes(column))missing.push({column,rows:second.rows.length,from:'second'});
  }
  let n=0;
  const lay=(table:DataTable,label:string)=>table.rows.map(row=>({
    key:Object.fromEntries(keys.map(column=>[column,column===newKey?String(++n)
      :column===source?label:row.key[column]??''])),value:row.value}));
  const rows=[...lay(first,labels[0]),...lay(second,labels[1])];
  // WHAT IDENTIFIES A ROW NOW. A primary key both tables declare repeats once they are stacked, so it
  // is qualified by the source, or replaced by the new key with source and old key kept beside it.
  const shared=first.primaryKey?.length&&JSON.stringify(first.primaryKey)===JSON.stringify(second.primaryKey)
    ?first.primaryKey:undefined;
  const sourced=shared&&source?[source,...shared]:undefined;
  const primaryKey=newKey?[newKey]:sourced??shared;
  const alternateKeys=newKey&&sourced?[sourced]:undefined;
  const findings=[...(primaryKey?repeatedKeys(rows.map(r=>r.key),primaryKey):[]),
    ...(alternateKeys??[]).flatMap(columns=>repeatedKeys(rows.map(r=>r.key),columns))];
  return {table:{kind:'data-table',keys,valueField:first.valueField,...(first.unit?{unit:first.unit}:{}),
      ...(primaryKey?{primaryKey}:{}),...(alternateKeys?{alternateKeys}:{}),...(findings.length?{findings}:{}),
      rows,rowCount:rows.length,missingValueCount:rows.filter(row=>row.value===null).length},
    fromFirst:first.rows.length,fromSecond:second.rows.length,missing};
}

/** What the step did, in one sentence for the receipt and the run summary. */
export function appendSentence(result:AppendResult,params:AppendParams):string{
  const said=result.missing.map(m=>`"${m.column}" is empty on the ${m.rows} rows from the ${m.from} table, which has no such column`);
  return `${result.fromFirst} rows from the first table and ${result.fromSecond} from the second, `
    +`${result.fromFirst+result.fromSecond} in all`
    +(params.nameSource&&params.sourceColumn?.trim()?`; "${params.sourceColumn.trim()}" says which`:'')
    +(params.newKey?.trim()?`; "${params.newKey.trim()}" numbers them 1 to ${result.fromFirst+result.fromSecond} as the new key`:'')+'.'
    +(said.length?` ${said.join('; ')}.`:'');
}
