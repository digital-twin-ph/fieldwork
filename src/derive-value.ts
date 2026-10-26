/** Arithmetic over a long-format table, and the selection that usually follows it.
 *
 *  Epi Info separates `DEFINE` and `ASSIGN` from `IF`, and this project had only the `IF`:
 *  rules read a record's attributes and conclude a TERM about it, so a column could be brought
 *  into existence and given a label but never a number computed from other numbers
 *  (`authoredProjection`: "the value field is untouched"). Experiment 65 recorded that gap; the
 *  0.12.0 release notes recorded its cost, that South London's contingency table is "prepared
 *  outside the application because nothing ... derives a column from others".
 *
 *  THE SHAPE THE DATA FORCES. A `DataTable` here is long: key columns and one value. So there
 *  are never two numeric columns to combine, and an `ASSIGN` cannot be column arithmetic. What
 *  there are instead are two ROWS that agree on every key but one -- Table IX holds
 *  `(Southwark, houses) = 40046` and `(Southwark, deaths) = 1263` -- and the arithmetic is
 *  between them. So the operand is a VALUE OF A KEY COLUMN, the grouping is every other key,
 *  and the result is a new row rather than a new column.
 *
 *  That is also why `keepRows` sits beside it rather than inside it. Deriving
 *  `houses without a death` from `houses - deaths` leaves `houses` in the table, and `houses` is
 *  the total that the other two partition: a grid of all three double-counts, and its totals row
 *  is wrong. Removing it is a SELECTION, which is a different operation from arithmetic and is
 *  useful wherever a table carries more rows than a figure should show. Keeping them apart was
 *  the practitioner's call, 2026-10-26, against welding the selection into the arithmetic.
 */
import type {DataTable} from './data-table.js';

export const OPERATORS={
  minus:{label:'minus',apply:(a:number,b:number)=>a-b},
  plus:{label:'plus',apply:(a:number,b:number)=>a+b},
  times:{label:'times',apply:(a:number,b:number)=>a*b},
  dividedBy:{label:'divided by',apply:(a:number,b:number)=>b===0?null:a/b},
} as const;
export type Operator=keyof typeof OPERATORS;

export interface DeriveRequest {
  /** The key column whose values name the operands, e.g. `measure`. */
  keyColumn:string;
  left:string; operator:Operator; right:string;
  /** The value this key column takes on the derived row, e.g. `houses without a death`. */
  name:string;
}
/** A group that could not be computed, named rather than dropped. */
export interface DeriveGap {group:string; missing:string[]}
export interface DeriveResult {table:DataTable; derived:number; gaps:DeriveGap[]}

const groupKey=(key:Record<string,string>,except:string)=>
  JSON.stringify(Object.entries(key).filter(([k])=>k!==except).sort());
const groupLabel=(key:Record<string,string>,except:string)=>
  Object.entries(key).filter(([k])=>k!==except).map(([,v])=>v).join(' · ')||'the table';

/** Derives one new row per group, from two rows of that group.
 *
 *  A group missing either operand yields NO row and is reported by name. It is not a zero: a
 *  group whose `houses` nobody recorded has an unknown number of houses without a death, and
 *  writing zero there would be a measurement this table never made. Same for a value that is
 *  null, which is this table's way of saying the cell was empty. */
export function deriveValue(table:DataTable,request:DeriveRequest):DeriveResult {
  const {keyColumn,left,operator,right,name}=request;
  if(!table.keys.includes(keyColumn))
    throw new Error(`This table has no "${keyColumn}" column. Its columns are ${table.keys.join(', ')}.`);
  if(!OPERATORS[operator])throw new Error(`"${operator}" is not an operation this step knows.`);
  for(const [role,operand] of [['first',left],['second',right]] as const)
    if(!operand.trim())throw new Error(`Name the ${role} value of "${keyColumn}" to compute from.`);
  // Deriving a value that is already in the column would put two rows on the same key, and a
  // table with two values for one key is one nobody can read.
  if(table.rows.some(row=>row.key[keyColumn]===name))
    throw new Error(`"${name}" is already a value of "${keyColumn}" in this table. `
      +`A derived row cannot take a name the table already uses, because the two would share a key.`);

  const groups=new Map<string,{label:string; key:Record<string,string>; held:Map<string,number|null>}>();
  for(const row of table.rows){
    const id=groupKey(row.key,keyColumn);
    const group=groups.get(id)??{label:groupLabel(row.key,keyColumn),key:row.key,held:new Map()};
    group.held.set(row.key[keyColumn],row.value);
    groups.set(id,group);
  }

  const derivedRows:DataTable['rows']=[];
  const gaps:DeriveGap[]=[];
  for(const group of groups.values()){
    const a=group.held.get(left)??null,b=group.held.get(right)??null;
    const missing=[...(a===null?[left]:[]),...(b===null?[right]:[])];
    if(a===null||b===null){gaps.push({group:group.label,missing});continue;}
    derivedRows.push({key:{...group.key,[keyColumn]:name},value:OPERATORS[operator].apply(a,b)});
  }
  const rows=[...table.rows,...derivedRows];
  return {table:{...table,rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length},
    derived:derivedRows.length,gaps};
}

export interface KeepResult {table:DataTable; kept:number; dropped:number; absent:string[]}

/** Keeps the rows whose `keyColumn` holds one of `values`, in the order named.
 *
 *  A named value the table does not have is reported rather than ignored: asking for a row that
 *  is not there is usually a typo or a changed upstream table, and silently returning fewer rows
 *  than asked for is how a figure ends up missing a category nobody noticed. */
export function keepRows(table:DataTable,keyColumn:string,values:string[]):KeepResult {
  if(!table.keys.includes(keyColumn))
    throw new Error(`This table has no "${keyColumn}" column. Its columns are ${table.keys.join(', ')}.`);
  const wanted=values.map(value=>value.trim()).filter(Boolean);
  if(!wanted.length)throw new Error(`Name at least one value of "${keyColumn}" to keep.`);
  const present=new Set(table.rows.map(row=>row.key[keyColumn]));
  const absent=wanted.filter(value=>!present.has(value));
  if(absent.length===wanted.length)
    throw new Error(`None of ${wanted.map(v=>`"${v}"`).join(', ')} is a value of "${keyColumn}" in this `
      +`table, which holds ${[...present].map(v=>`"${v}"`).join(', ')}. Nothing would be left to show.`);
  // Ordered by the values as named, so a 2x2 reads in the order the practitioner asked for
  // rather than the order the file happened to be written in.
  const rank=new Map(wanted.map((value,index)=>[value,index]));
  const rows=table.rows.filter(row=>rank.has(row.key[keyColumn]))
    .sort((x,y)=>(rank.get(x.key[keyColumn])??0)-(rank.get(y.key[keyColumn])??0));
  return {table:{...table,rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length},
    kept:rows.length,dropped:table.rows.length-rows.length,absent};
}
