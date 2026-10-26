/** `RELATE`: bringing a column from one table onto the rows of another, on a shared key.
 *
 *  Epi Info has three join commands -- `MERGE`, `RELATE` and `MATCH` -- and this project had
 *  none, which the 0.12.0 release notes recorded as the reason South London's contingency table
 *  is "prepared outside the application". It was carried as one missing capability. It is not
 *  one: the three differ in what they bring across and in how they match, and the one the Snow
 *  chain needs is the narrowest of them.
 *
 *  THE SHAPE THE DATA FORCES, again, and differently from `derive-value.ts`. A `DataTable` here
 *  is long: key columns and one value. So there are two distinct things a join could do, and
 *  they are not variants of one operation.
 *
 *    - Bring a CATEGORY across. Snow's Table XII says which company supplied each of 32
 *      sub-districts; Table VIII gives each sub-district's population and deaths. The thing
 *      being brought is `water_supply`, which is not a number and can never be a value in a long
 *      table. It is a KEY COLUMN, and relating adds it to every row of the left table. The row
 *      count does not change.
 *    - Bring MEASURES across, which adds ROWS -- new values of the measure column -- and is a
 *      different operation with a different failure mode (two tables disagreeing about the same
 *      measure, rather than one table being ambiguous about a category). Not built here, and
 *      named so that this module is not later widened into it by accident.
 *
 *  So this is `RELATE` and not `MERGE`, and the widget says so.
 *
 *  WHAT IT REFUSES. A right table holding two different values of the related column for one key
 *  is ambiguous, and the ambiguity is the interesting case rather than an edge case: it is what a
 *  table looks like when the key does not identify what the practitioner thinks it identifies.
 *  Picking the first would produce a stratification that is quietly wrong in a way no total
 *  reveals. A left key the right table does not carry is reported by name and its rows are
 *  dropped, because a row with an absent category cannot be grouped by that category and
 *  inventing "unknown" for it would put a stratum in the table that the data never measured.
 */
import type {DataTable} from './data-table.js';

export interface RelateRequest {
  /** The key column both tables carry, matched exactly after trimming. */
  on:string;
  /** The right table's key column to add to the left table's rows. */
  bring:string;
}
/** A left key the right table had no row for. Reported, never defaulted. */
export interface RelateGap {key:string; rows:number}
export interface RelateResult {
  table:DataTable; related:number; dropped:number; gaps:RelateGap[];
  /** Distinct values of the brought column that actually landed, in first-seen order: what a
   *  practitioner needs to see before grouping by it. */
  values:string[];
}

export function relateTable(left:DataTable,right:DataTable,request:RelateRequest):RelateResult {
  const on=request.on.trim(),bring=request.bring.trim();
  if(!on)throw new Error('Name the column both tables share.');
  if(!bring)throw new Error('Name the column to bring across.');
  if(!left.keys.includes(on))
    throw new Error(`The first table has no "${on}" column. Its columns are ${left.keys.join(', ')}.`);
  if(!right.keys.includes(on))
    throw new Error(`The second table has no "${on}" column. Its columns are ${right.keys.join(', ')}.`);
  if(!right.keys.includes(bring))
    throw new Error(`The second table has no "${bring}" column. Its columns are ${right.keys.join(', ')}.`);
  if(on===bring)
    throw new Error(`"${on}" is the column being matched on, so bringing it across would add nothing.`);
  if(left.keys.includes(bring))
    throw new Error(`The first table already has a "${bring}" column. Relating would give its rows two `
      +'values for one key, which is a table nobody can read.');

  // Built before anything is joined, so an ambiguous key is reported as ambiguity rather than as
  // a number that came out wrong.
  const lookup=new Map<string,string>();
  const ambiguous=new Map<string,Set<string>>();
  for(const row of right.rows){
    const key=row.key[on],value=row.key[bring];
    if(key===undefined||value===undefined)continue;
    const held=lookup.get(key);
    if(held===undefined){lookup.set(key,value);continue;}
    if(held!==value)(ambiguous.get(key)??ambiguous.set(key,new Set([held])).get(key)!).add(value);
  }
  if(ambiguous.size){
    const [key,values]=[...ambiguous.entries()][0];
    throw new Error(`The second table gives "${key}" more than one "${bring}": `
      +`${[...values].map(v=>`"${v}"`).join(' and ')}`
      +(ambiguous.size>1?`, and ${ambiguous.size-1} other ${ambiguous.size===2?'key does':'keys do'} the same`:'')
      +`. Relating cannot choose between them, and choosing would put a value on these rows that `
      +`the table does not support. Check whether "${on}" identifies one row of the second table.`);
  }

  const gapRows=new Map<string,number>();
  const rows:DataTable['rows']=[];
  const values:string[]=[];
  const seen=new Set<string>();
  for(const row of left.rows){
    const value=lookup.get(row.key[on]);
    if(value===undefined){gapRows.set(row.key[on],(gapRows.get(row.key[on])??0)+1);continue;}
    if(!seen.has(value)){seen.add(value);values.push(value);}
    rows.push({key:{...row.key,[bring]:value},value:row.value});
  }
  if(!rows.length)
    throw new Error(`No key in the first table's "${on}" column appears in the second table's, so `
      +'nothing could be related. Check that the two columns hold the same kind of key.');
  return {table:{...left,keys:[...left.keys,bring],rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length},
    related:rows.length,dropped:left.rows.length-rows.length,
    gaps:[...gapRows.entries()].map(([key,count])=>({key,rows:count})),values};
}
