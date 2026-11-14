import type {DataTable} from './data-table.js';

/** A VALUE EDITED BY HAND, IN DATA QUALITY (experiment 214). The practitioner, 2026-11-10: *"the ability to edit tables
 *  inline"*; 2026-11-13, an empty cell may be filled *"like any edit"*.
 *
 *  An edit is a declared change on the step, as a repair is (117): the records the step holds are never changed, the edit
 *  is applied to a copy when they are handed on, and it says what it replaced. Where the record no longer holds that
 *  value, the edit is not applied and is reported, rather than written over a value nobody saw. */
export interface CellEdit {
  /** A point's id, or a table's row as `row N`, counted from 1 in the order the table holds its rows. */
  record:string;
  column:string;
  /** The value read, as text; null where none was recorded. */
  from:string|null;
  /** The value written, as text; null to empty the cell. */
  to:string|null;
  at:string;
}
export const MAX_EDITS=2000;

/** EDITS ARE VERSIONED, AND NOTHING IS DELETED (the practitioner, 2026-11-13: *"The edit should be reversible and also
 *  versioned"*). The step keeps a log; each entry is a version. An edit adds one; taking an edit back adds one that
 *  revokes it; restoring an earlier version adds one that returns the values to that version. Version 0 is the records
 *  as imported. What the run applies is the log replayed. A log written before versions (plain edits) reads as versions
 *  1, 2, 3 in order. */
export type EditEntry=(CellEdit&{version?:number})|{version:number;revokes:number;at:string}|{version:number;restore:number;at:string};
export const isEdit=(e:EditEntry):e is CellEdit&{version?:number}=>'record' in e;
/** The version each entry is, its place in the log from 1. */
export const versionOf=(log:readonly EditEntry[],index:number)=>log[index]?.version??index+1;
/** The edits in force after the first `upTo` versions (all of them by default), each with the version that made it. */
export function editsAt(log:readonly EditEntry[],upTo=log.length):(CellEdit&{version:number})[]{
  let state:(CellEdit&{version:number})[]=[];
  for(let i=0;i<Math.min(upTo,log.length);i++){
    const e=log[i]!,v=versionOf(log,i);
    if(isEdit(e))state=[...state,{record:e.record,column:e.column,from:e.from,to:e.to,at:e.at,version:v}];
    else if('revokes' in e)state=state.filter(x=>x.version!==e.revokes);
    else state=editsAt(log,e.restore);
  }
  return state;
}
/** In words, for the history: what each version did. */
export function versionWords(log:readonly EditEntry[],index:number):string{
  const e=log[index]!;
  if(isEdit(e))return `${e.column} of ${e.record}: ${e.from===null?'not recorded':`"${e.from}"`} to ${e.to===null?'emptied':`"${e.to}"`}`;
  if('revokes' in e)return `took back version ${e.revokes}`;
  return e.restore===0?'restored the records as imported':`restored version ${e.restore}`;
}

/** A value as an edit compares and records it: absent, empty or null is not recorded. */
export const valueText=(v:unknown):string|null=>v===null||v===undefined||v===''?null:String(v);
/** What an edit writes: a number where it reads as one and the value it replaced was one, or nothing was recorded. */
const written=(to:string|null,before:unknown):unknown=>{
  if(to===null)return null;
  const n=Number(to);
  return to.trim()!==''&&Number.isFinite(n)&&(typeof before==='number'||before===null||before===undefined||before==='')?n:to;
};

export interface EditOutcome {applied:CellEdit[]; stale:CellEdit[]}

/** Point records, by id. Later edits of the same cell read what the earlier ones wrote. */
export function applyFeatureEdits<T extends {id?:string|number;properties?:Record<string,unknown>}>(
  features:readonly T[],edits:readonly CellEdit[]):{features:T[]}&EditOutcome{
  if(!edits.length)return {features:features as T[],applied:[],stale:[]};
  const at=new Map(features.map((f,i)=>[String(f.id),i]));
  const working=features.map(f=>({...f,properties:{...f.properties}}));
  const applied:CellEdit[]=[],stale:CellEdit[]=[];
  for(const edit of edits){
    const i=at.get(edit.record);
    if(i===undefined){stale.push(edit);continue;}
    const before=working[i]!.properties[edit.column];
    if(valueText(before)!==edit.from){stale.push(edit);continue;}
    working[i]!.properties[edit.column]=written(edit.to,before);applied.push(edit);
  }
  return {features:working as T[],applied,stale};
}

/** A table's rows, by position: a key column's value or the value column's. */
/** WHICH CELLS OF A ROW WERE EDITED BY HAND, carried on the row so a table shows it (the practitioner, 2026-11-13: "Can
 *  edited cells show up differently when viewing tables?"). A step that passes rows on keeps it; one that computes new
 *  rows has none, because a total over edited values is computed, not edited. */
export type EditedCells=Record<string,{from:string|null;version?:number}>;
export function applyTableEdits(table:DataTable,edits:readonly (CellEdit&{version?:number})[]):{table:DataTable}&EditOutcome{
  if(!edits.length)return {table,applied:[],stale:[]};
  const rows=table.rows.map(r=>({...r,key:{...r.key}}));
  const applied:CellEdit[]=[],stale:CellEdit[]=[];
  for(const edit of edits){
    const m=/^row (\d+)$/.exec(edit.record),i=m?Number(m[1])-1:-1,row=rows[i];
    const isValue=edit.column===table.valueField,isKey=table.keys.includes(edit.column);
    if(!row||!(isValue||isKey)){stale.push(edit);continue;}
    const before=isValue?row.value:row.key[edit.column];
    if(valueText(before)!==edit.from){stale.push(edit);continue;}
    if(isValue){
      const n=edit.to===null?null:Number(edit.to);
      // The value column holds numbers: a value that is not one is kept unknown, as the import keeps one.
      (row as {value:number|null}).value=n!==null&&Number.isFinite(n)?n:null;
    }else row.key[edit.column]=edit.to??'';
    const marked=row as {edited?:EditedCells};
    // The first value read is what the cell was; a later edit of the same cell keeps it, and its own version.
    marked.edited={...marked.edited,[edit.column]:{from:marked.edited?.[edit.column]?.from??edit.from,...(edit.version!==undefined?{version:edit.version}:{})}};
    applied.push(edit);
  }
  const missing=rows.filter(r=>r.value===null||r.value===undefined).length;
  return {table:{...table,rows,missingValueCount:missing},applied,stale};
}

/** What the run says of the edits, in one sentence. */
export function editsSentence(o:EditOutcome,version?:number):string{
  const n=o.applied.length,filled=o.applied.filter(e=>e.from===null).length;
  return (version!==undefined?`Version ${version} of this step's edits. `:'')+(n?`${n} value${n===1?'':'s'} edited by hand${filled?`, ${filled} of them filling an empty cell`:''}.`:'')
    +(o.stale.length?` ${o.stale.length} edit${o.stale.length===1?' was':'s were'} not applied: the value ${o.stale.length===1?'it was':'they were'} made against is no longer there.`:'');
}

/** The edits as facts: each a revision of the records handed on, with the values before and after. */
export function editsFacts(entity:string,o:EditOutcome,version?:number):string{
  const q=(v:string|null)=>v===null?'""':JSON.stringify(v);
  const one=(e:CellEdit,state:'applied'|'stale')=>`${entity} prov:qualifiedRevision [ a fw:CellEdit; fw:editedRecord ${JSON.stringify(e.record)}; `
    +`fw:boundAttribute ${JSON.stringify(e.column)}; fw:valueBefore ${q(e.from)}; fw:valueAfter ${q(e.to)}; `
    +`fw:filledEmptyCell "${e.from===null}"^^xsd:boolean; fw:editApplied "${state==='applied'}"^^xsd:boolean; fw:editedAt ${JSON.stringify(e.at)} ].`;
  return `@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +(version!==undefined?`${entity} fw:editVersion "${version}"^^xsd:integer.\n`:'')
    +[...o.applied.map(e=>one(e,'applied')),...o.stale.map(e=>one(e,'stale'))].join('\n')+'\n';
}

/** Checked as it arrives, as every parameter is. */
export function validEdits(edits:unknown):boolean{
  return Array.isArray(edits)&&edits.length<=MAX_EDITS&&edits.every((e,i)=>
    (e?.version===undefined||Number.isInteger(e.version)&&e.version===i+1)&&typeof e?.at==='string'&&e.at.length<=40&&(
    typeof e.record==='string'&&e.record.length<=200
    &&typeof e.column==='string'&&e.column.length<=200&&(e.from===null||typeof e.from==='string'&&e.from.length<=2000)
    &&(e.to===null||typeof e.to==='string'&&e.to.length<=2000)
    ||Number.isInteger(e.revokes)&&e.revokes>=1&&e.revokes<=i
    ||Number.isInteger(e.restore)&&e.restore>=0&&e.restore<=i));
}

/** The words a marked cell carries on hover. */
export const editedTitle=(e:{from:string|null;version?:number})=>
  `Edited by hand${e.version!==undefined?`, version ${e.version}`:''}: was ${e.from===null?'not recorded':`\u201c${e.from}\u201d`}`;
