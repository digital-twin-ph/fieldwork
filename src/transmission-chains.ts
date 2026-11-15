/** TRANSMISSION CHAINS, HANDED ON (experiment 216; the practitioner, 2026-11-14: "New step: Transmission chains").
 *
 *  Each row keeps everything it had and gains four columns: `chain`, the id of the case its chain starts with;
 *  `generation`, 0 for that case and one more for each link from it; `offspring`, the cases it is the recorded source
 *  of; `chain_size`, the cases in its chain. Worked out by the computation Chart's tree draws from, so the tree and these
 *  columns cannot disagree. A case in several rows gets the same values in each.
 *
 *  Nothing is dropped. A case naming no source, or a source the table does not hold, starts a chain of its own; cases in
 *  a loop start chains too; each is counted in the sentence. A row with no case id gets no values, and is counted. */
import type {DataTable} from './data-table.js';
import {transmissionTree,type ChainColumns,type TransmissionTree} from './transmission-tree.js';

export const CHAIN_COLUMNS=['chain','generation','offspring','chain_size'] as const;

export interface ChainsResult {table:DataTable; tree:TransmissionTree; unidentified:number; sentence:string}

export function transmissionChains(table:DataTable,columns:ChainColumns):ChainsResult{
  for(const name of CHAIN_COLUMNS)if(table.keys.includes(name))
    throw new Error(`This table already has a column named ${name}. Rename it upstream; this step adds ${CHAIN_COLUMNS.join(', ')}.`);
  const tree=transmissionTree(table,columns);
  const byId=new Map(tree.cases.map(c=>[c.id,c]));
  const offspring=new Map<string,number>();
  for(const c of tree.cases)if(c.generation>0&&c.parent)offspring.set(c.parent,(offspring.get(c.parent)??0)+1);
  const size=new Map(tree.chains.map(c=>[c.root,c.size]));
  let unidentified=0;
  const rows=table.rows.map(row=>{
    const id=String(row.key[columns.id]??'').trim();
    const c=id?byId.get(id):undefined;
    if(!c){unidentified++;return {...row,key:{...row.key,chain:'',generation:'',offspring:'',chain_size:''}};}
    return {...row,key:{...row.key,chain:c.chain,generation:String(c.generation),offspring:String(offspring.get(c.id)??0),
      chain_size:String(size.get(c.chain)??1)}};
  });
  const n=(v:number,one:string,many=one+'s')=>`${v.toLocaleString('en')} ${v===1?one:many}`;
  const counts=tree.counts;
  const largest=[...tree.chains].sort((a,b)=>b.size-a.size)[0];
  const single=tree.chains.filter(c=>c.size===1).length;
  const sentence=`${n(counts.cases,'case')} in ${n(counts.chains,'chain')}, followed through ${columns.parent} to the case each `
    +`chain starts with`
    +(largest?`; the largest starts with ${largest.root} and holds ${n(largest.size,'case')} over ${n(largest.generations,'generation')}`:'')
    +(single?`; ${n(single,'case')} ${single===1?'is a chain':'are chains'} of one`:'')
    +(counts.unknownInfector?`; ${n(counts.unknownInfector,'case')} name${counts.unknownInfector===1?'s':''} a source the table does not hold, and start${counts.unknownInfector===1?'s':''} a chain`:'')
    +(counts.inLoop?`; ${n(counts.inLoop,'case')} in a loop of sources, each starting a chain`:'')
    +(counts.severalSources?`; ${n(counts.severalSources,'case')} record${counts.severalSources===1?'s':''} more than one source, placed under the first`:'')
    +(unidentified?`; ${n(unidentified,'row')} with no case id, left without a chain`:'')+'.';
  // The three counts are numbers, declared so: a curve can be split by generation and a chart can order by size.
  return {table:{...table,keys:[...table.keys,...CHAIN_COLUMNS],rows,
    numericKeys:{...(table.numericKeys??{}),generation:'links from the first case',offspring:'cases',chain_size:'cases'}},
    tree,unidentified,sentence};
}

/** The step's facts, typed fw:TransmissionChains: the columns it followed and what it found, every count stated. */
export function chainsFacts(subject:string,columns:{id:string;parent:string},result:ChainsResult):string{
  const q=(v:string)=>JSON.stringify(v),n=(v:number)=>`"${v}"^^xsd:integer`,c=result.tree.counts;
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${subject} a fw:TransmissionChains; fw:caseIdColumn ${q(columns.id)}; fw:infectorColumn ${q(columns.parent)};\n`
    +`  fw:chainsFound ${n(c.chains)}; fw:casesNoInfector ${n(c.noInfector)}; fw:casesInfectorNotFound ${n(c.unknownInfector)};\n`
    +`  fw:casesInLoop ${n(c.inLoop)}; fw:rowsWithoutCaseId ${n(result.unidentified)}.\n`;
}
