/** `GROUP`: totals within the key columns you keep.
 *
 *  The operation the Snow chain needed and nothing could do. `rate` groups and sums internally --
 *  `computeRate` accumulates a numerator and a denominator per group -- but it emits a RATE, so
 *  the totals are consumed on the way out and no other step can use them. A stratified
 *  contingency table needs those totals and no rate: 32 sub-districts summed within three water
 *  supply categories, which is how Snow's Table VIII and Table XII become a table of people by
 *  supply and outcome. Before this, that table was computed by hand and inlined into the example
 *  project with an empty digest.
 *
 *  THE KEPT COLUMNS ARE NAMED, not the dropped ones, for the reason `wideDataTable` names its
 *  value columns explicitly: a column added to a file later must not silently change an analysis
 *  somebody has already read. Name what is kept and a new column is dropped, leaving the same
 *  groups; name what is dropped and a new column silently becomes a grouping key.
 *
 *  SUM AND NOTHING ELSE, deliberately. Epi Info separates `MEANS` from `GROUP`, and the
 *  separation is not bureaucratic: summing counts gives a count, while summing rates gives a
 *  number with no referent -- deaths per 1,000 in three sub-districts do not add to deaths per
 *  3,000 in one. This step cannot tell a count from a rate, so it offers the operation that is
 *  right for the counts a contingency table is made of and leaves the other command unbuilt
 *  rather than offering a choice it cannot police.
 *
 *  A NULL IS NOT A ZERO, which is the whole risk of this operation. Every long table here can
 *  hold a null, meaning the cell was empty, and summing over one quietly produces a total that
 *  is too small by an unknown amount -- a stratum whose population nobody recorded coming out
 *  smaller rather than coming out unknown. So a group holding any null totals to NULL and is
 *  reported by name, which is the same choice `deriveValue` makes about a missing operand.
 */
import type {DataTable} from './data-table.js';

export interface GroupRequest {
  /** The key columns to keep. Rows agreeing on all of them become one row. */
  by:string[];
}
/** A group that held an empty cell, so its total is unknown rather than smaller. */
export interface GroupGap {group:string; rowsSummed:number; rowsEmpty:number}
export interface GroupResult {
  table:DataTable; groups:number; collapsedFrom:number; dropped:string[]; gaps:GroupGap[];
}

export function groupTable(table:DataTable,request:GroupRequest):GroupResult {
  const by=request.by.map(name=>name.trim()).filter(Boolean);
  if(!by.length)throw new Error('Name at least one key column to total within. '
    +'Grouping by nothing would give one number, which a table cannot hold a key for.');
  if(new Set(by).size!==by.length)throw new Error('The key columns to keep must be distinct.');
  for(const name of by)
    if(!table.keys.includes(name))
      throw new Error(`This table has no "${name}" column. Its columns are ${table.keys.join(', ')}.`);
  const dropped=table.keys.filter(name=>!by.includes(name));
  if(!dropped.length)
    throw new Error('Those are all of this table\'s key columns, so every row is already its own '
      +'group and totalling would change nothing. Leave out the column whose rows should be added up.');

  const groups=new Map<string,{key:Record<string,string>; label:string;
    total:number; summed:number; empty:number}>();
  for(const row of table.rows){
    const key=Object.fromEntries(by.map(name=>[name,row.key[name]??'']));
    const id=by.map(name=>key[name]).join('\u0000');
    const group=groups.get(id)??{key,label:by.map(name=>key[name]).join(' · '),
      total:0,summed:0,empty:0};
    if(row.value===null)group.empty++;else{group.total+=row.value;group.summed++;}
    groups.set(id,group);
  }
  const rows=[...groups.values()].map(group=>({key:group.key,
    value:group.empty?null:group.total}));
  const gaps=[...groups.values()].filter(group=>group.empty)
    .map(group=>({group:group.label,rowsSummed:group.summed,rowsEmpty:group.empty}));
  return {table:{...table,keys:by,rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length},
    groups:rows.length,collapsedFrom:table.rows.length,dropped,gaps};
}
