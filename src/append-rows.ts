import {fillWords,figureWords} from './figure-words.js';
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
  /** A TABLE'S OWN NAME FOR A COLUMN, stacked under another (2026-11-20): DR Congo's census names its provinces in
   *  "province", the population models in "name". `table` is the port, from 0. */
  stackUnder?:StackUnder[];
}
/** LINED UP WITHOUT ASKING WHERE EVERY NAME MATCHES (2026-11-20, the practitioner: *"The last few errors could have been
 *  prevented with automation instead of consistency checking and hand typing."*). Where the person has made no choice
 *  under Columns, a table's own column whose every name is a name of the column most tables share is stacked under it,
 *  and the step says so; one where only some match is still asked about. Undefined `stackUnder` means no choice made;
 *  an empty one means the person chose to line columns up by their own names only. */
export function automaticStackUnder(tables:DataTable[]):StackUnder[]{
  const complete=completeCandidates(tables);
  // Row by row: two columns are one choice only where they hold the same name on every row.
  const names=(i:number,k:string)=>tables[i]!.rows.map(r=>(r.key[k]??'').trim()).join('\u001f');
  const chosen:StackUnder[]=[];
  for(const u of complete){
    if(chosen.some(c=>c.table===u.table&&c.as===u.as))continue;
    // Two complete candidates for one name are a choice, unless they hold the same names, as Rwanda's census "unit" and
    // "geoboundaries_name" do: then either gives the same table, and the first is taken.
    const rivals=complete.filter(v=>v.table===u.table&&v.as===u.as);
    if(rivals.every(v=>names(v.table,v.column)===names(u.table,u.column)))chosen.push({table:u.table,column:u.column,as:u.as});
  }
  return chosen;
}
/** Every column of a table whose every name is a name of a column most tables share, in the table's own column order. */
function completeCandidates(tables:DataTable[]):UnstackedColumn[]{
  const moved=stackedUnder(tables,{});
  const holders=(k:string)=>moved.filter(t=>t.keys.includes(k)).length;
  const values=(t:DataTable,k:string)=>new Set(t.rows.map(r=>(r.key[k]??'').trim()).filter(Boolean));
  const out:UnstackedColumn[]=[];
  moved.forEach((table,i)=>{
    for(const as of [...new Set(moved.flatMap(t=>t.keys))].filter(k=>!table.keys.includes(k))){
      const held=holders(as),theirs=new Set(moved.filter(t=>t.keys.includes(as)).flatMap(t=>[...values(t,as)]));
      if(!theirs.size)continue;
      for(const column of table.keys.filter(k=>holders(k)<held||(holders(k)===held&&i>0&&moved[0]!.keys.includes(as)&&!moved[0]!.keys.includes(k)))){
        const mine=values(table,column);
        if(mine.size&&[...mine].every(v=>theirs.has(v)))out.push({table:i,column,as,matched:mine.size,of:mine.size});
      }
    }
  });
  return out;
}
/** The line-up a run uses: the person's, or where they made none, the automatic one. */
export const lineUpOf=(tables:DataTable[],params:AppendParams):StackUnder[]=>params.stackUnder??automaticStackUnder(tables);
export interface StackUnder {table:number;column:string;as:string}
/** A column a table lacks, which another of its columns seems to hold: most of that column's names are the first
 *  table's. Found by the values, so a census whose names are another table's names is offered, and one that is not
 *  is not. */
export interface UnstackedColumn extends StackUnder {matched:number;of:number}
export interface AppendResult {
  table:DataTable;
  /** Columns stacked under another name without asking, every name matching (automaticStackUnder). */
  automatic?:StackUnder[];
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
  // Words from the workflow, {census} among them (figure-words.ts).
  return (given?fillWords(given,figureWords()):undefined)||(index===0?'first':index===1?'second':`table ${index+1}`);
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
/** WHICH STEP MEASURES SOMETHING ELSE, by name (2026-11-20). The refusal said "Table 2 measures something different from the
 *  first" when the first was the odd one: a DR Congo census read with "level" as its value, beside three population
 *  rasters. It now names each step and its value column, singles out the one that differs from the rest, and says
 *  where to change it. `names` are the steps feeding the ports, in port order; without them, tables are numbered. */
export function valueMismatch(tables:readonly {valueField:string}[],names?:readonly string[]):string|null{
  const fields=tables.map(t=>t.valueField);
  if(new Set(fields).size<=1)return null;
  const called=(i:number)=>names?.[i]?`"${names[i]}"`:tables.length===2?(i===0?'the first table':'the second table'):`table ${i+1}`;
  const counts=new Map<string,number>();for(const f of fields)counts.set(f,(counts.get(f)??0)+1);
  const top=Math.max(...counts.values()),most=[...counts].filter(([,n])=>n===top).map(([f])=>f);
  const usual=most.length===1?most[0]!:fields[0]!;
  const odd=fields.flatMap((f,i)=>f===usual?[]:[i]),even=fields.flatMap((f,i)=>f===usual?[i]:[]);
  const list=(ix:number[])=>ix.map(called).join(ix.length>2?', ':' and ').replace(/, ([^,]*)$/,', and $1');
  return `${list(odd)} ${odd.length===1?'has':'have'} ${[...new Set(odd.map(i=>`"${fields[i]}"`))].join(' and ')} as the value column, `
    +`where ${list(even)} ${even.length===1?'has':'have'} "${usual}". Rows can be stacked only where the value column is the same quantity `
    +`under the same name: open ${called(odd[0]!)}'s Configure… and choose the column holding the same quantity as its value, named "${usual}".`;
}
/** WHICH STEP COUNTS IN ANOTHER UNIT, by name (2026-11-20), as for the value column: the odd one, its unit or none, the
 *  rest's, and where to say it. "Table 2 counts in an unstated unit" left DR Congo's workflow to be searched by hand. */
function unitDifference(tables:readonly DataTable[],names?:readonly string[]):string{
  // Compared as one unit where they say the same thing (sameUnit), said as each table wrote it.
  const written=tables.map(t=>t.unit?.trim()||''),units=tables.map(t=>sameUnit(t.unit));
  const called=(i:number)=>names?.[i]?`"${names[i]}"`:tables.length===2?(i===0?'the first table':'the second table'):`table ${i+1}`;
  const counts=new Map<string,number>();for(const u of units)counts.set(u,(counts.get(u)??0)+1);
  const top=Math.max(...counts.values()),most=[...counts].filter(([,n])=>n===top).map(([u])=>u);
  const usual=most.length===1?most[0]!:(units.find(Boolean)??units[0]!);
  const odd=units.flatMap((u,i)=>u===usual?[]:[i]),even=units.flatMap((u,i)=>u===usual?[i]:[]);
  const list=(ix:number[])=>ix.map(called).join(ix.length>2?', ':' and ').replace(/, ([^,]*)$/,', and $1');
  const say=(u:string)=>u?`"${u}"`:'no unit';
  return `${list(odd)} ${odd.length===1?'counts':'count'} in ${[...new Set(odd.map(i=>say(written[i]!)))].join(' and ')}, `
    +`where ${list(even)} ${even.length===1?'counts':'count'} in ${say(usual)}. Rows can be stacked only in one unit: `
    +(usual?`open ${called(odd[0]!)}'s Configure… and state its unit as "${usual}", if that is what it counts.`
      :`state the same unit on every table, or none on any.`);
}
/** Each table's columns as the step stacks them: a column named under `stackUnder` takes the name given there. */
export function stackedUnder(tables:DataTable[],params:AppendParams,names?:readonly string[]):DataTable[]{
  const called=(i:number)=>names?.[i]?`"${names[i]}"`:`table ${i+1}`;
  return tables.map((table,i)=>{
    const moves=(params.stackUnder??[]).filter(m=>m.table===i&&m.column!==m.as);
    if(!moves.length)return table;
    for(const m of moves){
      if(!table.keys.includes(m.column))throw new Error(`${called(i)} has no "${m.column}" column to stack under "${m.as}". Its columns are ${table.keys.join(', ')}.`);
      if(table.keys.includes(m.as))throw new Error(`${called(i)} already has a "${m.as}" column, so its "${m.column}" cannot be stacked under it.`);
    }
    const to=new Map(moves.map(m=>[m.column,m.as]));
    const rename=(k:string)=>to.get(k)??k;
    return {...table,keys:table.keys.map(rename),...(table.primaryKey?{primaryKey:table.primaryKey.map(rename)}:{}),
      rows:table.rows.map(r=>({...r,key:Object.fromEntries(Object.entries(r.key).map(([k,v])=>[rename(k),v]))}))};
  });
}
/** A TABLE'S OWN NAME FOR A COLUMN MOST OF THE OTHERS SHARE (2026-11-20). For each table, each column held by more of
 *  the tables than any of its own, which it lacks, and the one of its own (held by fewer tables) whose distinct values are
 *  most often values of that column in the others: offered where at least half are. The name most tables use wins, so
 *  the order of the ports does not decide it: DR Congo's census, the first of four tables, holds "province" where three
 *  population models hold "name", and it is the census that is stacked under "name". A tie goes to the first table. */
export function unstackedColumns(tables:DataTable[],params:AppendParams={}):UnstackedColumn[]{
  const moved=stackedUnder(tables,params);
  const holders=(k:string)=>moved.filter(t=>t.keys.includes(k)).length;
  const values=(t:DataTable,k:string)=>new Set(t.rows.map(r=>(r.key[k]??'').trim()).filter(Boolean));
  const found:UnstackedColumn[]=[];
  moved.forEach((table,i)=>{
    const lacking=[...new Set(moved.flatMap(t=>t.keys))].filter(k=>!table.keys.includes(k));
    for(const as of lacking){
      const held=holders(as),theirs=new Set(moved.filter(t=>t.keys.includes(as)).flatMap(t=>[...values(t,as)]));
      if(!theirs.size)continue;
      let best:UnstackedColumn|undefined;
      // A TIE, as with two tables, goes to the first table's name: the order of the inputs decides only then.
      const fewer=(k:string)=>holders(k)<held||(holders(k)===held&&i>0&&moved[0]!.keys.includes(as)&&!moved[0]!.keys.includes(k));
      for(const column of table.keys.filter(fewer)){
        const mine=values(table,column);if(!mine.size)continue;
        const matched=[...mine].filter(v=>theirs.has(v)).length;
        if(matched*2>=mine.size&&(!best||matched>best.matched))best={table:i,column,as,matched,of:mine.size};
      }
      if(best&&!found.some(f=>f.table===i&&f.column===best!.column))found.push(best);
    }
  });
  return found;
}
/** UNITS THAT SAY THE SAME THING (2026-11-20): a census dictionary's "persons" and a population raster's "people" are one
 *  unit, so their counts stack. Only these spellings of a head count; anything else is compared as written. */
const HEADS=new Set(['people','persons','person','inhabitants','individuals']);
export const sameUnit=(unit:string|undefined)=>{const u=unit?.trim().toLowerCase()??'';return HEADS.has(u)?'people':u;};
export function appendTables(given:DataTable[],params:AppendParams={},names?:readonly string[]):AppendResult{
  if(given.length<2)throw new Error('Connect at least two tables: this step stacks their rows.');
  const automatic=params.stackUnder===undefined?automaticStackUnder(given):[];
  const tables=stackedUnder(given,{...params,stackUnder:lineUpOf(given,params)},names);
  // ONE TABLE'S NAMES IN ANOTHER COLUMN would be stacked beside the first's, each table's rows empty in the other's
  // column, and every step after reading the first's column would find nothing for them (2026-11-20, DR Congo's census
  // "province" beside the models' "name"). Said here, with the column to stack it under, as a refusal.
  const unstacked=unstackedColumns(tables);
  if(unstacked.length){
    const called=(i:number)=>names?.[i]?`"${names[i]}"`:tables.length===2?(i===0?'the first table':'the second table'):`table ${i+1}`;
    const u=unstacked[0]!,others=tables.filter(t=>t.keys.includes(u.as)).length;
    throw new Error(`${called(u.table)} has no "${u.as}" column, so its rows would have none, and its "${u.column}" seems to hold `
      +`the same kind of names: ${u.matched} of its ${u.of} are names in "${u.as}" of the ${others===1?'other table':`${others} other tables`}. `
      +`Under Configure…, stack its "${u.column}" under "${u.as}"`
      +(u.matched<u.of?`, and check the ${u.of-u.matched} that are not: they may be spelled another way, or held in another column`:'')
      +'.'+(unstacked.length>1?` ${unstacked.length-1} other column${unstacked.length===2?' is':'s are'} offered the same way there.`:''));
  }
  const [first]=tables as [DataTable,...DataTable[]];
  const mismatch=valueMismatch(tables,names);if(mismatch)throw new Error(mismatch);
  const unitMismatch=valueMismatch(tables.map(t=>({valueField:sameUnit(t.unit)})),names);
  if(unitMismatch)throw new Error(unitDifference(tables,names));
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
    from,fromFirst:from[0]!,fromSecond:from[1]!,missing,...(automatic.length?{automatic}:{})};
}

/** What the step did, in one sentence for the receipt and the run summary. */
export function appendSentence(result:AppendResult,params:AppendParams):string{
  const two=result.from.length===2,total=result.from.reduce((a,b)=>a+b,0);
  const which=(table:number)=>two?`the ${table===1?'first':'second'} table`:`table ${table}`;
  // ONE SENTENCE PER TABLE, naming its missing columns together (2026-11-14: eleven zonal-statistics columns, each said
  // apart for the census table that has none of them, made a paragraph nobody would read).
  const byTable=new Map<number,{rows:number;columns:string[]}>();
  for(const m of result.missing){const t=byTable.get(m.table)??{rows:m.rows,columns:[]};t.columns.push(m.column);byTable.set(m.table,t);}
  const said=[...byTable].map(([table,{rows,columns}])=>columns.length===1
    ?`"${columns[0]}" is empty on the ${rows} rows from ${which(table)}, which has no such column`
    :`${columns.length} columns are empty on the ${rows} rows from ${which(table)}, which has none of them: ${columns.map(c=>`"${c}"`).join(', ')}`);
  const source=params.nameSource&&params.sourceColumn?.trim();
  return (two?`${result.from[0]} rows from the first table and ${result.from[1]} from the second, `
      :`${result.from.map((n,i)=>`${n} from table ${i+1}`).join(', ')}: `)
    +`${total} in all`
    +(source?`; "${source}" says which`:'')
    +(source&&params.labelsAreNumbers?`, as a number${params.labelsAreNumbers.unit.trim()?` in ${params.labelsAreNumbers.unit.trim()}`:''}`:'')
    +(params.newKey?.trim()?`; "${params.newKey.trim()}" numbers them 1 to ${total} as the new key`:'')+'.'
    +(said.length?` ${said.join('; ')}.`:'')
    +(result.automatic?.length?` Lined up without asking, every name matching: ${result.automatic.map(m=>`${which(m.table+1)}'s "${m.column}" under "${m.as}"`).join('; ')}.`:'');
}

/** THE COLUMNS AS A GRID (2026-11-20). The practitioner: *"what matters more is column sync and alignment than
 *  summarization."* One row per column of the stacked table, one cell per table naming which of its columns fills it,
 *  or none; the step's `stackUnder` is the only state, and the grid is read from it and written back to it. */
export interface GridCell {column:string|null;suggested?:{column:string;matched:number;of:number}}
export interface GridRow {as:string;cells:GridCell[]}
const placedOf=(tables:DataTable[],under:StackUnder[])=>tables.map((t,i)=>new Map(t.keys.map(k=>{
  const m=under.find(x=>x.table===i&&x.column===k);return [k,m?m.as:k] as const;})));
export function columnGrid(tables:DataTable[],under:StackUnder[]=[]):GridRow[]{
  const placed=placedOf(tables,under);
  const order:string[]=[];for(const p of placed)for(const as of p.values())if(!order.includes(as))order.push(as);
  const hints=unstackedColumns(tables,{stackUnder:under});
  return order.map(as=>({as,cells:placed.map((p,i)=>{
    const column=[...p].find(([,a])=>a===as)?.[0]??null;
    const hint=column===null?hints.find(h=>h.table===i&&h.as===as):undefined;
    return {column,...(hint?{suggested:{column:hint.column,matched:hint.matched,of:hint.of}}:{})};})}));
}
/** Table `table`'s column `column` (or none) under the stacked column `as`. */
export function placeColumn(under:StackUnder[],table:number,as:string,column:string|null):StackUnder[]{
  const kept=under.filter(m=>!(m.table===table&&(m.as===as||m.column===column)));
  return column===null||column===as?kept:[...kept,{table,column,as}];
}
/** The stacked column `as` called `to`, for every table filling it. */
export function renameStacked(tables:DataTable[],under:StackUnder[],as:string,to:string):StackUnder[]{
  const name=to.trim();if(!name||name===as)return under;
  const placed=placedOf(tables,under);
  let next=under;
  placed.forEach((p,i)=>{const column=[...p].find(([,a])=>a===as)?.[0];if(column!==undefined)next=placeColumn(next,i,name,column);});
  return next;
}
