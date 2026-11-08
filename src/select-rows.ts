/** Keeping some rows of a table: by the values of a key column, every value but some, or a range of dates or numbers.
 *
 *  Selection is a different operation from arithmetic, useful wherever a table carries more rows than a figure should
 *  show. It sat beside Derive a value until that widget was retired into Apply ruleset (experiment 188, 2026-11-08).
 */
import type {DataTable} from './data-table.js';

export interface SelectResult {table:DataTable; kept:number; dropped:number; absent:string[]}

/** Keeps the rows whose `keyColumn` holds one of `values`, in the order named.
 *
 *  A named value the table does not have is reported rather than ignored: asking for a row that
 *  is not there is usually a typo or a changed upstream table, and silently returning fewer rows
 *  than asked for is how a figure ends up missing a category nobody noticed. */
export function selectRows(table:DataTable,keyColumn:string,values:string[],leaveOut=false):SelectResult {
  if(!table.keys.includes(keyColumn))
    throw new Error(`This table has no "${keyColumn}" column. Its columns are ${table.keys.join(', ')}.`);
  const wanted=values.map(value=>value.trim()).filter(Boolean);
  if(!wanted.length)throw new Error(`Name at least one value of "${keyColumn}" to ${leaveOut?'leave out':'keep'}.`);
  // EVERY VALUE BUT THESE (experiment 182): twelve doubled weeks out of 833, which a list of values to keep would need
  // 821 ticks to say. Rows keep the table's order; a value named and not present is reported, as for keeping.
  if(leaveOut){
    const present=new Set(table.rows.map(row=>row.key[keyColumn]));
    const absent=wanted.filter(value=>!present.has(value)),out=new Set(wanted);
    const rows=table.rows.filter(row=>!out.has(row.key[keyColumn]??''));
    if(!rows.length)throw new Error(`Leaving out ${wanted.length===1?`"${wanted[0]}"`:`those ${wanted.length} values`} of "${keyColumn}" leaves no rows.`);
    return {table:{...table,rows,rowCount:rows.length,missingValueCount:rows.filter(row=>row.value===null).length},
      kept:rows.length,dropped:table.rows.length-rows.length,absent};
  }
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

/** WHETHER A COLUMN'S VALUES HAVE AN ORDER TO COMPARE BY, and which. The practitioner, 2026-11-03,
 *  ticking fourteen days out of 3,653: *"this is not frictionless"*. A range is two values instead
 *  of a list, but only where "between" means something: every value an ISO date, or every value a
 *  number. A column mixing the two, or holding text, is offered no range, because any order picked
 *  for it would be one this application invented. Empty cells do not decide it. */
export type ValueOrder='date'|'number';
const ISO_DATE=/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
export function orderOf(values:string[]):ValueOrder|undefined {
  const held=values.filter(value=>value!=='');
  if(!held.length)return undefined;
  if(held.every(value=>ISO_DATE.test(value)))return 'date';
  if(held.every(value=>value.trim()!==''&&Number.isFinite(Number(value))))return 'number';
  return undefined;
}

/** Inside `from` to `to`, both included; an empty end is open. ISO dates compare as text, which is
 *  their order; numbers as numbers, so 9 comes before 10. */
export function inRange(value:string,order:ValueOrder,from:string,to:string):boolean {
  if(value==='')return false;
  if(order==='number'){
    const n=Number(value);
    return (from===''||n>=Number(from))&&(to===''||n<=Number(to));
  }
  return (from===''||value>=from)&&(to===''||value<=to);
}

/** Keeps the rows whose `keyColumn` lies from `from` to `to`, both included, in the table's own
 *  order. A row with no value in the column is outside every range, so it is dropped and counted. */
export function selectRange(table:DataTable,keyColumn:string,from:string,to:string):SelectResult {
  if(!table.keys.includes(keyColumn))
    throw new Error(`This table has no "${keyColumn}" column. Its columns are ${table.keys.join(', ')}.`);
  from=from.trim();to=to.trim();
  if(!from&&!to)throw new Error(`Give "${keyColumn}" a from, a to, or both.`);
  const values=table.rows.map(row=>String(row.key[keyColumn]??''));
  const order=orderOf(values);
  if(!order)throw new Error(`"${keyColumn}" holds values that are not all dates or all numbers, so it has no order `
    +'to take a range of. Choose the values to keep instead.');
  if(order==='number')for(const end of [from,to])if(end&&!Number.isFinite(Number(end)))
    throw new Error(`"${end}" is not a number, and "${keyColumn}" holds numbers.`);
  if(order==='date')for(const end of [from,to])if(end&&!ISO_DATE.test(end))
    throw new Error(`"${end}" is not a date written as year-month-day, and "${keyColumn}" holds dates.`);
  if(from&&to&&!inRange(to,order,from,''))
    throw new Error(`The range runs from ${from} to ${to}, which is backwards.`);
  const rows=table.rows.filter((_,index)=>inRange(values[index]!,order,from,to));
  if(!rows.length){
    const held=values.filter(Boolean).sort(order==='number'?(a,b)=>Number(a)-Number(b):undefined);
    throw new Error(`No row of "${keyColumn}" lies from ${from||'the start'} to ${to||'the end'}. `
      +`The column runs from ${held[0]} to ${held.at(-1)}. Nothing would be left to show.`);
  }
  return {table:{...table,rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length},
    kept:rows.length,dropped:table.rows.length-rows.length,absent:[]};
}

/** What a range says in a receipt and on a node: the ends as given, an open end said as open. */
export const rangeSentence=(keyColumn:string,from:string,to:string)=>
  from&&to?`${keyColumn} from ${from} to ${to}`:from?`${keyColumn} from ${from} on`:`${keyColumn} up to ${to}`;
