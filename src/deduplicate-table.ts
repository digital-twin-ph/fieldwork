import type {DataTable,TableFinding} from './data-table.js';
import type {Candidate,CandidateRecord,NameMatch,PairDecision} from './deduplicate-points.js';
import {jaroWinkler,normaliseName,pairSignature} from './deduplicate-points.js';

/** THE SAME WIDGET OVER A TABLE. Experiment 164; the practitioner, 2026-11-02: *"I would rather use
 *  the deduplicate widget, generalized to handle different formats, points, polygons, text columns."*
 *
 *  What carries over from points unchanged: candidates are blocked before they are compared, every
 *  comparison is reported, a pair that disagrees waits for a person, and the input is not changed.
 *
 *  What differs, and why:
 *  - ONE SOURCE. A repeated primary key is a problem inside one table.
 *  - BLOCKED BY KEY, NOT DISTANCE. Only rows sharing the blocking columns are candidates, by default
 *    the table's declared primary key: exactly the rows Data quality reported.
 *  - EVERY COMPARED COLUMN MUST AGREE TO MERGE ON ITS OWN. Rows identical on all of them are one record
 *    entered twice. Any disagreement goes to a person, who also says WHICH row to keep, because keeping
 *    the first would silently delete a case. */
export interface TableDeduplicateParams {
  blockColumns?:string[];
  compareColumns?:string[];
  nameMatch:NameMatch;
  fuzzyThreshold:number;
}
export interface TableDeduplicateResult {
  table:DataTable; candidates:Candidate[]; compared:number; blocked:number;
  matched:number; awaiting:number; merged:number; inputCount:number;
  /** File row numbers, from 1, that the output does not carry. */
  removedRows:number[];
}

const cell=(table:DataTable,row:DataTable['rows'][number],column:string)=>
  column===table.valueField?(row.value===null?null:String(row.value)):row.key[column]??null;

export function deduplicateTable(table:DataTable,sourceNodeId:string,sourceLabel:string,
  params:TableDeduplicateParams,decisions:PairDecision[]=[]):TableDeduplicateResult{
  const columns=[...table.keys,table.valueField];
  const blocking=(params.blockColumns?.length?params.blockColumns:table.primaryKey??[]).filter(c=>columns.includes(c));
  if(!blocking.length)throw new Error('Choose the columns that should identify a row, or declare a primary key '
    +'on the table. Rows are compared only when they share those columns.');
  const comparing=(params.compareColumns?.length?params.compareColumns:columns.filter(c=>!blocking.includes(c)))
    .filter(c=>columns.includes(c)&&!blocking.includes(c));
  const record=(at:number):CandidateRecord=>{
    const row=table.rows[at]!;
    return {sourceNodeId,sourceLabel,id:String(at+1),coordinates:[0,0],
      name:blocking.map(c=>`${c}=${cell(table,row,c)}`).join(', '),
      attributes:Object.fromEntries(columns.map(c=>[c,cell(table,row,c)]))};
  };
  const groups=new Map<string,number[]>();
  table.rows.forEach((row,at)=>{
    const signature=blocking.map(c=>cell(table,row,c)).join('\u0000');
    groups.set(signature,[...(groups.get(signature)??[]),at]);
  });
  const byKey=new Map(decisions.map(d=>[d.key,d]));
  const candidates:Candidate[]=[];
  let compared=0;
  for(const members of groups.values())
    for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
      compared++;
      const a=record(members[i]!),b=record(members[j]!);
      const differs=comparing.filter(c=>{
        const left=normaliseName(a.attributes[c],params.nameMatch),right=normaliseName(b.attributes[c],params.nameMatch);
        const raw=(v:unknown)=>v===null?'':String(v);
        if(!left&&!right)return raw(a.attributes[c])!==raw(b.attributes[c]);
        return params.nameMatch==='exact'||!left||!right?left!==right:jaroWinkler(left,right)<params.fuzzyThreshold;
      });
      const candidate:Candidate={key:`${sourceNodeId}:${a.id}|${sourceNodeId}:${b.id}`,a,b,
        nameSimilarity:null,metres:0,nameAgrees:true,nearAgrees:true,
        score:comparing.length-differs.length,classification:differs.length?'review':'match',differs};
      const decision=byKey.get(candidate.key);
      if(decision&&decision.signature===pairSignature(candidate)&&candidate.classification==='review'){
        candidate.decided=decision.decision;candidate.reason=decision.reason;
        if(decision.keep)candidate.keep=decision.keep;
      }
      candidates.push(candidate);
    }
  // A REMOVED ROW IS ONE A PERSON OR AN EXACT COPY ACCOUNTS FOR. An exact copy drops the later row;
  // a decided pair drops the row the person did not keep.
  const removed=new Set<number>();
  for(const c of candidates){
    if(c.classification==='match')removed.add(Math.max(Number(c.a.id),Number(c.b.id)));
    else if(c.decided==='match')removed.add(Number(c.keep==='b'?c.a.id:c.b.id));
  }
  const kept=table.rows.filter((_,at)=>!removed.has(at+1));
  const positions=table.rows.map((_,at)=>at+1).filter(n=>!removed.has(n));
  // WHAT IS STILL WRONG, in the file's row numbers so it matches Data quality on the input.
  const repeats=new Map<string,number[]>();
  kept.forEach((row,at)=>{const s=blocking.map(c=>cell(table,row,c)).join('\u0000');repeats.set(s,[...(repeats.get(s)??[]),positions[at]!]);});
  const findings:TableFinding[]=[
    ...(table.findings??[]).filter(f=>f.kind!=='repeated-key'&&f.rows.every(n=>!removed.has(n))),
    ...[...repeats.values()].filter(r=>r.length>1).map(rows=>({kind:'repeated-key' as const,rows,
      text:`Rows ${rows.join(', ')} still repeat ${record(rows[0]!-1).name}, awaiting a decision.`}))];
  const {findings:_was,...rest}=table;
  return {table:{...rest,rows:kept,rowCount:kept.length,missingValueCount:kept.filter(r=>r.value===null).length,
      ...(findings.length?{findings}:{})},
    candidates,compared,blocked:table.rows.length*(table.rows.length-1)/2-compared,
    matched:candidates.filter(c=>c.classification==='match').length,
    awaiting:candidates.filter(c=>c.classification==='review'&&!c.decided).length,
    merged:removed.size,inputCount:table.rows.length,removedRows:[...removed].sort((x,y)=>x-y)};
}
