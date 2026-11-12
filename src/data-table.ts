/** Long-format tabular input: rows identified by declared key fields, carrying one declared
 *  value field. A table has no geometry and no CRS; see docs/experiments/48-tabular-input.md. */
import type {Scalar} from './types.js';

/** The parsed-CSV shape this module needs, declared locally rather than imported: the type
 *  graph reaches this file from the worker type-check, which has no DOM, and the CSV reader
 *  lives in a module that uses it. Parsing stays the caller's job. */
export interface TableRows {headers:string[]; rows:string[][]}

/** RAISED FROM 2,000 ON 2026-11-02: Nigeria's 774 LGAs over three years are 2,322 rows once a wide file
 *  is read, and the source holds 19,350. A CSV file is still read up to 2,000 rows by `input-data.ts`. */
/** MEASURED, 2026-11-04 (experiment 175): 250,000 rows is the largest size at which every step the NYC plan uses
 *  worked in Chromium -- import, save, reload, a date range, panel charts, regression, export. At 500,000 the page
 *  stopped answering clicks for over 15 s during the panel chart and the regression; at 1,000,000 the tab crashed.
 *  Raised from 20,000 once tables moved out of the saved workflow. A finding, open to revision. */
export const MAX_TABLE_ROWS=250_000;
/** The file a table is read from. Rows are the measured limit; a 1,000,000-row, 42 MB file was read in 10 s. */
export const MAX_TABLE_FILE_BYTES=40_000_000;
export interface DataTableSource {filename:string; bytes:number; sha256:string; rows:number;
  /** The sheet read, for an Excel workbook (2026-11-08). */ sheet?:string}
/** WHAT IS WRONG WITH A TABLE, FOUND ON READING IT. The practitioner, 2026-11-02: *"We cannot refuse an
 *  upload because of a quality problem."* A refused file cannot be looked at, so the table loads and
 *  these say what to look at. Row numbers are the file's, from 1. Experiment 164. */
export interface TableFinding {
  /** The last three are about the columns' declared meaning, not the rows (experiment 172). */
  kind:'repeated-key'|'missing-key'|'unreadable-value'|'undescribed-column'|'unconfirmed-description'|'dictionary-mismatch'|'trimmed-value';
  rows:number[];
  column?:string;
  /** What the file holds there, as it was written. */
  value?:string;
  text:string;
}
export interface DataTable {
  kind:'data-table'; keys:string[]; valueField:string; unit?:string;
  /** The columns a person declared identify a row. Checked for uniqueness. Absent: all of `keys`. */
  primaryKey?:string[];
  /** Columns that group or link rows and may repeat. */
  secondaryKeys?:string[];
  /** OTHER COLUMN SETS THAT ARE ALSO UNIQUE, checked as the primary key is. Appending two tables under a new
   *  key keeps each row's source and old key as one of these. Experiment 166. */
  alternateKeys?:string[][];
  findings?:TableFinding[];
  /** What the columns mean, as declared on the Table input and carried with the table. Experiment 172. */
  columns?:Record<string,{label?:string;unit?:string;description?:string;origin:'practitioner'|'dictionary'|'file';confirmed:boolean;from?:string}>;
  /** What a value of the first key column means, for a table whose rows name columns of another (a regression's
   *  terms): shown beside the value, never instead of it. */
  meanings?:Record<string,string>;
  /** AN ESTIMATE WITH ITS INTERVAL, held as rows (experiment 181). Inside, a table holds one number per row, so a
   *  regression's ratio and its limits are three rows told apart by `column`. Declared by the step that made them,
   *  so a chart reads the interval from the declaration and never from the names. `ratio` says the estimate is a
   *  ratio, whose no-difference value is 1. */
  interval?:{column:string; estimate:string; lower:string; upper:string; level:number; ratio:boolean};
  /** KEY COLUMNS DECLARED TO HOLD NUMBERS, with each one's unit (experiment 181). A key column is text unless a
   *  person said otherwise; this is where they said it. */
  numericKeys?:Record<string,string>;
  /** COLUMNS BROUGHT AT A SHIFT, and the shift in days (experiment 185): `LST_Day_1km_-14d` → −14. Written by Relate
   *  over several shifts, read by Regression to state each model's shift as a number the lag chart can place. */
  columnShifts?:Record<string,number>;
  /** A TABLE THAT ARRIVED WIDE (experiment 188): which key column holds the variable names, and which columns say
   *  whose row it is. Stated by the Tabular data step that melted it, so a step after it can rebuild one record per
   *  subject, as the file had it, without asking anyone about the long shape inside. */
  /** COLUMNS A RULE CONCLUDED (Apply ruleset): conclusions about each row, never a melted variable's name, however
   *  few values they hold (7-1-7's response verdict, NoVerdict on every MERS case, 2026-11-12). */
  concluded?:string[];
  wide?:{measureKey:string; subjectKeys:string[];
    /** THE KEYS IN THE ORDER TO READ THEM (experiment 191): set by a step whose kept columns were put in order by a
     *  person, so the view shows them so rather than by which has most values. */
    asDeclared?:true};
  rows:{key:Record<string,string>; value:number|null}[];
  rowCount:number; missingValueCount:number; source?:DataTableSource;
}
export interface TableSelection {keys:string[]; valueField:string; unit?:string;
  primaryKey?:string[]; secondaryKeys?:string[]}

/** Rows sharing the columns that should identify one, gathered into one finding per value. */
export function repeatedKeys(rows:readonly Record<string,string>[],columns:readonly string[]):TableFinding[]{
  const groups=new Map<string,number[]>();
  rows.forEach((row,position)=>{
    const signature=columns.map(name=>row[name]).join('\u0000');
    groups.set(signature,[...(groups.get(signature)??[]),position+1]);
  });
  const named=(at:number)=>columns.map(name=>`${name}=${rows[at]![name]}`).join(', ');
  return [...groups.values()].filter(found=>found.length>1).map(found=>({kind:'repeated-key',rows:found,
    value:named(found[0]!-1),text:`Rows ${found.join(', ')} repeat ${named(found[0]!-1)}.`}));
}
const declaredKeys=(selection:TableSelection,keys:readonly string[])=>{
  const inKeys=(names?:string[])=>(names??[]).map(trimmed).filter(name=>keys.includes(name));
  const primaryKey=inKeys(selection.primaryKey),secondaryKeys=inKeys(selection.secondaryKeys);
  return {...(primaryKey.length?{primaryKey}:{}),...(secondaryKeys.length?{secondaryKeys}:{})};
};
const summed=(findings:TableFinding[])=>findings.length?{findings}:{};
/** One sentence for the Inspector and the write-up, or nothing. */
export function findingsSummary(table:Pick<DataTable,'findings'>):string{
  const held=table.findings??[];
  const count=(kind:TableFinding['kind'])=>held.filter(f=>f.kind===kind).length;
  const parts=[[count('repeated-key'),'repeated key value'],[count('missing-key'),'row with no key value'],
    [count('unreadable-value'),'value that is not a number'],[count('trimmed-value'),'column whose values were read without spaces around them']] as const;
  return parts.filter(([n])=>n).map(([n,word])=>`${n} ${n===1?word:word.replace('row','rows').replace('value that is','values that are').replace('repeated key value','repeated key values')}`).join(', ');
}

const trimmed=(value:string)=>value.trim();
/** KEY VALUES READ WITHOUT THE SPACES AROUND THEM, said (the practitioner, 2026-11-12: "Trim, and say so"). Trimming
 *  keeps "Family member" and "Family member " one group, as MERS's contacts need; one finding per column counts the
 *  values it changed and names the first, so the change is on the Data quality tab and in the receipt, not silent. */
function trimFindings(rows:readonly (readonly string[])[],keys:readonly string[],index:(name:string)=>number):TableFinding[]{
  return keys.flatMap(name=>{
    const at=rows.flatMap((row,position)=>{const raw=row[index(name)]??'';return raw.trim()&&raw!==raw.trim()?[position+1]:[];});
    if(!at.length)return [];
    const first=rows[at[0]!-1]![index(name)]!;
    return [{kind:'trimmed-value' as const,rows:at,column:name,value:first,
      text:`${at.length===1?'1 value':`${at.length} values`} in ${JSON.stringify(name)} had spaces around ${at.length===1?'it':'them'}, read without: `
        +`${JSON.stringify(first)} at row ${at[0]} is ${JSON.stringify(first.trim())}.`}];
  });
}

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
  const findings:TableFinding[]=[];
  let missingValueCount=0;
  const rows=table.rows.map((row,position)=>{
    const key=Object.fromEntries(keys.map(name=>[name,trimmed(row[index(name)]??'')]));
    for(const name of keys)if(!key[name])findings.push({kind:'missing-key',rows:[position+1],column:name,
      text:`Row ${position+1} has no value in key column ${JSON.stringify(name)}.`});
    const raw=trimmed(row[index(valueField)]??'');
    if(!raw){missingValueCount++;return {key,value:null};}
    const value=Number(raw);
    if(!Number.isFinite(value)){
      missingValueCount++;
      findings.push({kind:'unreadable-value',rows:[position+1],column:valueField,value:raw,
        text:`Row ${position+1} has a nonnumeric value ${JSON.stringify(raw)} in ${JSON.stringify(valueField)}. It is kept as unknown.`});
      return {key,value:null};
    }
    return {key,value};
  });
  findings.push(...trimFindings(table.rows,keys,index));
  const declared=declaredKeys(selection,keys);
  findings.push(...repeatedKeys(rows.map(row=>row.key),declared.primaryKey??keys));
  return {kind:'data-table',keys,valueField,...declared,...summed(findings),...(selection.unit?{unit:trimmed(selection.unit)}:{}),
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
  primaryKey?:string[]; secondaryKeys?:string[];
  /** WHAT A VALUE COLUMN IS CALLED IN THE ANALYSIS, where that is not what the file calls it.
   *  Keyed by column name; a column absent here keeps its own.
   *
   *  A published file's header is a machine name and an analysis has its own vocabulary. Snow's
   *  Table VIII ships `deaths_southwark_vauxhall` and the South London workflows say "deaths
   *  Southwark and Vauxhall"; four of its six table inputs were melted by hand for that reason
   *  alone and could not be converted on run, because a melt forced the file's names onto every
   *  downstream step at once -- a Rate's measure key, a derived value's two operands, a selection's
   *  values.
   *
   *  NOT INFERRED FROM THE COLUMN NAME. Replacing underscores with spaces gives "deaths 1849"
   *  correctly and "deaths pump wells" where the analysis says "deaths pump-wells", and the
   *  difference is not something a rule can know. A guess that is usually right is worse here than
   *  a name the author states, because the wrong ones are the quiet ones -- and an inferred name
   *  would change under the author when a publisher reformatted a header. */
  measureNames?:Record<string,string>;
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
  // A rename is checked against the SELECTION, not the file: renaming a column that is not being
  // melted does nothing, and silently doing nothing is how a typo survives a review.
  const renames=selection.measureNames??{};
  const measureOf=(column:string)=>trimmed(renames[column]??'')||column;
  for(const column of Object.keys(renames)){
    if(!valueFields.includes(trimmed(column)))
      throw new Error(`${JSON.stringify(column)} is named as a measure but is not one of the value `
        +'columns being melted, so the name would have no effect.');
    if(!trimmed(renames[column]))
      throw new Error(`${JSON.stringify(column)} is given an empty measure name. Leave it out to `
        +'keep the column\'s own name.');
  }
  // Two columns under one measure would merge two variables into one set of rows, and the melt
  // would report a plausible row count for a table that had quietly lost a variable.
  const measures=valueFields.map(measureOf);
  if(new Set(measures).size!==measures.length){
    // `Set.add` returns the set, so `!seen.add(name)` is never true: the first version of this
    // named the clash as `undefined` and the message said so. Found by its own test.
    const seenNames=new Set<string>();
    const clash=measures.find(name=>seenNames.has(name)||(seenNames.add(name),false));
    throw new Error(`Two value columns would both be called ${JSON.stringify(clash)}. Each measure `
      +'names one variable, so two columns cannot share a name.');
  }
  if(!table.rows.length)throw new Error('The selected file contains no rows.');
  const melted=table.rows.length*valueFields.length;
  if(melted>MAX_TABLE_ROWS)throw new Error(`${table.rows.length.toLocaleString()} rows across `
    +`${valueFields.length} value columns is ${melted.toLocaleString()} values, and tabular input `
    +`supports at most ${MAX_TABLE_ROWS.toLocaleString()}. Choose fewer value columns.`);

  const index=(name:string)=>headers.indexOf(name);
  const findings:TableFinding[]=[],subjects:Record<string,string>[]=[];
  const rows:DataTable['rows']=[];
  let missingValueCount=0;
  table.rows.forEach((row,position)=>{
    const key=Object.fromEntries(keys.map(name=>[name,trimmed(row[index(name)]??'')]));
    subjects.push(key);
    for(const name of keys)if(!key[name])findings.push({kind:'missing-key',rows:[position+1],column:name,
      text:`Row ${position+1} has no value in key column ${JSON.stringify(name)}.`});
    for(const name of valueFields){
      const raw=trimmed(row[index(name)]??'');
      if(!raw){missingValueCount++;rows.push({key:{...key,[measureKey]:measureOf(name)},value:null});continue;}
      const value=Number(raw);
      if(!Number.isFinite(value)){
        missingValueCount++;
        findings.push({kind:'unreadable-value',rows:[position+1],column:name,value:raw,
          text:`Row ${position+1} has a nonnumeric value ${JSON.stringify(raw)} in ${JSON.stringify(name)}. It is kept as unknown.`});
        rows.push({key:{...key,[measureKey]:measureOf(name)},value:null});continue;
      }
      rows.push({key:{...key,[measureKey]:measureOf(name)},value});
    }
  });
  // In a wide file one row IS one subject, so a repeat is a duplicate record rather than the long
  // shape: the opposite diagnosis from the long reader's, and why these are two readers.
  findings.push(...trimFindings(table.rows,keys,index));
  const declared=declaredKeys(selection,keys);
  findings.push(...repeatedKeys(subjects,declared.primaryKey??keys));
  return {kind:'data-table',keys:[...keys,measureKey],valueField,
    ...(selection.unit?{unit:trimmed(selection.unit)}:{}),...declared,...summed(findings),
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
  wide?:{keys:string[];valueFields:string[];measureKey:string;
    measureNames?:Record<string,string>}}},table:DataTable,runId:string){
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
        // A RENAME IS RECORDED, NOT JUST APPLIED. "population" in this analysis is
        // `population_1851` in the file, and a reader who cannot see that cannot check the
        // numbers against the source. One statement per renamed column, naming both.
        +Object.entries(node.params.wide.measureNames??{})
          .map(([column,measure])=>`; fw:measureRenaming [ fw:fromColumn ${quote(column)}; `
            +`fw:toMeasure ${quote(measure)} ]`).join('')
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

/** THE WIDE MARK, as the Tabular data step that melted the table states it (experiment 188): one function, so the run
 *  and the Inspector's previews read the same subjects. */
export function declaredWide(table:DataTable,wide?:{keys:string[];measureKey?:string}):DataTable{
  const measureKey=wide?.measureKey||'measure';
  return wide&&table.keys.includes(measureKey)
    ?{...table,wide:{measureKey,subjectKeys:wide.keys.filter(k=>table.keys.includes(k))}}:table;
}
