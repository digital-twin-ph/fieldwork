/** WHO INFECTED WHOM, DRAWN AS CHAINS OVER TIME (experiment 200, step 5).
 *
 *  The practitioner, 2026-11-09, asking whether a chart draws a contact tracing network, and then: *"I still don't see
 *  the transmission chain chart for hagelloch."* No chart or map in Fieldwork drew a link between two records.
 *
 *  Each case is a dot at its date, on a row of its own; a line runs from its infector, at the infector's date, down to
 *  its row and across to its own date, so the length across is the serial interval. Rows follow the chains: a case
 *  that names no infector starts a chain, and each case's children are drawn directly beneath it, earliest first. So
 *  generations read left to right and chains top to bottom. Ordered by time, not by a free network layout, which places
 *  nodes arbitrarily and is hard to read.
 *
 *  Nothing is dropped. A case naming no infector starts a chain and is counted; one naming an infector the table does
 *  not hold starts a chain too, and is counted apart, because "no infector recorded" and "an infector we cannot find"
 *  are different findings. A case with no readable date is drawn at its infector's date, marked, and counted. A loop
 *  (A infected B infected A) cannot be a transmission chain; its cases are counted and drawn as chains of their own. */
import type {DataTable} from './data-table.js';
import {dayNumber} from './authored-application.js';

export interface TreeColumns {id:string; parent:string; date:string}
export interface TreeCase {
  id:string; parent:string|null; date:string; day:number|null;
  /** 0 for a case that starts a chain. */
  generation:number; row:number; chain:string;
  /** Why this case starts a chain, where it does. */
  starts?:'no infector recorded'|'infector not in the table'|'in a loop';
}
export interface TransmissionTree {
  columns:TreeColumns; cases:TreeCase[];
  chains:{root:string;size:number;generations:number}[];
  counts:{cases:number;chains:number;noInfector:number;unknownInfector:number;undated:number;inLoop:number;links:number};
  firstDay:number|null; lastDay:number|null;
}

const valueOf=(row:DataTable['rows'][number],column:string,table:DataTable):string=>{
  if(column in row.key)return String(row.key[column]??'').trim();
  return column===table.valueField&&row.value!==null&&row.value!==undefined?String(row.value):'';
};

export function transmissionTree(table:DataTable,columns:TreeColumns):TransmissionTree{
  for(const [what,column] of [['case id',columns.id],['infector',columns.parent],['date',columns.date]] as const)
    if(!column||(!table.keys.includes(column)&&table.valueField!==column))
      throw new Error(`Choose the ${what} column in Configure…: this table has ${[...table.keys,table.valueField].filter(Boolean).join(', ')}.`);
  const seen=new Map<string,{id:string;parent:string;date:string;day:number|null;order:number}>();
  table.rows.forEach((row,order)=>{
    const id=valueOf(row,columns.id,table);
    if(!id)return;
    if(seen.has(id))throw new Error(`The case id "${id}" appears twice in ${columns.id}. A transmission tree needs one row per case.`);
    const date=valueOf(row,columns.date,table);
    seen.set(id,{id,parent:valueOf(row,columns.parent,table),date,day:dayNumber(date)??null,order});
  });
  const children=new Map<string,string[]>();
  for(const c of seen.values())if(c.parent&&seen.has(c.parent)&&c.parent!==c.id)
    (children.get(c.parent)??children.set(c.parent,[]).get(c.parent)!).push(c.id);
  const byTime=(a:string,b:string)=>{const x=seen.get(a)!,y=seen.get(b)!;
    return (x.day??Infinity)-(y.day??Infinity)||x.order-y.order;};
  for(const list of children.values())list.sort(byTime);

  // Which cases reach a root by following infectors; the rest sit in a loop.
  const reachesRoot=new Map<string,boolean>();
  const rootward=(id:string):boolean=>{
    const path:string[]=[];let at:string|undefined=id;const onPath=new Set<string>();
    while(at!==undefined){
      if(reachesRoot.has(at)){const r=reachesRoot.get(at)!;path.forEach(p=>reachesRoot.set(p,r));return r;}
      if(onPath.has(at)){path.forEach(p=>reachesRoot.set(p,false));return false;}
      onPath.add(at);path.push(at);
      const c:{parent:string}=seen.get(at)!;
      at=c.parent&&seen.has(c.parent)&&c.parent!==at?c.parent:undefined;
    }
    path.forEach(p=>reachesRoot.set(p,true));return true;
  };
  const roots:{id:string;starts:NonNullable<TreeCase['starts']>}[]=[];
  for(const c of seen.values()){
    if(!rootward(c.id)){roots.push({id:c.id,starts:'in a loop'});continue;}
    if(!c.parent)roots.push({id:c.id,starts:'no infector recorded'});
    else if(!seen.has(c.parent)||c.parent===c.id)roots.push({id:c.id,starts:'infector not in the table'});
  }
  roots.sort((a,b)=>byTime(a.id,b.id));

  const placed=new Map<string,TreeCase>();
  const chains:TransmissionTree['chains']=[];
  let row=0;
  for(const root of roots){
    if(placed.has(root.id))continue;
    let size=0,deepest=0;
    const stack:{id:string;generation:number}[]=[{id:root.id,generation:0}];
    while(stack.length){
      const {id,generation}=stack.pop()!;
      if(placed.has(id))continue;
      const c=seen.get(id)!;
      placed.set(id,{id,parent:c.parent&&seen.has(c.parent)&&generation>0?c.parent:c.parent||null,date:c.date,day:c.day,
        generation,row:row++,chain:root.id,...(generation===0?{starts:root.starts}:{})});
      size++;deepest=Math.max(deepest,generation);
      const kids=(children.get(id)??[]).filter(k=>!placed.has(k)&&reachesRoot.get(k)!==false);
      for(let i=kids.length-1;i>=0;i--)stack.push({id:kids[i]!,generation:generation+1});
    }
    chains.push({root:root.id,size,generations:deepest+1});
  }
  const cases=[...placed.values()].sort((a,b)=>a.row-b.row);
  const days=cases.map(c=>c.day).filter((d):d is number=>d!==null);
  return {columns,cases,chains,
    counts:{cases:cases.length,chains:chains.length,
      noInfector:roots.filter(r=>r.starts==='no infector recorded').length,
      unknownInfector:roots.filter(r=>r.starts==='infector not in the table').length,
      undated:cases.filter(c=>c.day===null).length,
      inLoop:roots.filter(r=>r.starts==='in a loop').length,
      links:cases.filter(c=>c.generation>0).length},
    firstDay:days.length?Math.min(...days):null,lastDay:days.length?Math.max(...days):null};
}

const dateOf=(day:number)=>new Date(day*86400000).toISOString().slice(0,10);

/** One sentence of what the tree shows, for the result and the receipt. */
export function treeSentence(t:TransmissionTree):string{
  const c=t.counts,n=(v:number,one:string,many=one+'s')=>`${v.toLocaleString('en-US')} ${v===1?one:many}`;
  const big=[...t.chains].sort((a,b)=>b.size-a.size)[0];
  return `${n(c.cases,'case')} in ${n(c.chains,'chain')}, joined by ${n(c.links,'link')} from infector to case`
    +(t.firstDay!==null?`, from ${dateOf(t.firstDay)} to ${dateOf(t.lastDay!)}`:'')+'. '
    +(big?`The largest chain starts with ${big.root} and holds ${n(big.size,'case')} over ${n(big.generations,'generation')}. `:'')
    +`${n(c.noInfector,'case')} ${c.noInfector===1?'names':'name'} no infector`
    +(c.unknownInfector?`; ${n(c.unknownInfector,'case')} ${c.unknownInfector===1?'names an infector':'name infectors'} the table does not hold`:'')
    +(c.inLoop?`; ${n(c.inLoop,'case')} ${c.inLoop===1?'sits':'sit'} in a loop, which no chain can be`:'')
    +(c.undated?`; ${n(c.undated,'case')} without a readable date, drawn at the infector's date and marked`:'')
    +`. Each line runs across from the infector's ${t.columns.date} to the case's: its length is the serial interval.`;
}

/** THE FIGURE, as SVG. Text at 14 px and over: the practitioner reads at that size. */
export function treeSvg(t:TransmissionTree,esc:(s:string)=>string,title=''):string{
  const rowH=9,top=title?64:40,left=16,right=24,width=960,plotW=width-left-right;
  const first=t.firstDay??0,last=Math.max(t.lastDay??first+1,first+1);
  const x=(day:number)=>left+(day-first)/(last-first)*plotW;
  const at=new Map(t.cases.map(c=>[c.id,c]));
  const dayOf=(c:TreeCase):number=>c.day??(c.parent&&at.get(c.parent)?dayOf(at.get(c.parent)!):first);
  const y=(row:number)=>top+row*rowH+rowH/2;
  const height=top+t.cases.length*rowH+56;
  const links=t.cases.filter(c=>c.generation>0&&c.parent&&at.has(c.parent)).map(c=>{
    const p=at.get(c.parent!)!,px=x(dayOf(p)),py=y(p.row),cx=x(dayOf(c)),cy=y(c.row);
    return `<path d="M${px.toFixed(1)} ${py.toFixed(1)}V${cy.toFixed(1)}H${cx.toFixed(1)}" class="tree-link"/>`;}).join('');
  const dots=t.cases.map(c=>`<circle cx="${x(dayOf(c)).toFixed(1)}" cy="${y(c.row).toFixed(1)}" r="3.5" class="tree-case${c.generation===0?' tree-start':''}${c.day===null?' tree-undated':''}">`
    +`<title>${esc(`Case ${c.id}, ${c.date||'no date'}${c.generation?`, infected by ${c.parent}, generation ${c.generation+1}`:`, ${c.starts}`}`)}</title></circle>`).join('');
  // A tick on the first of each month, labelled at 14 px.
  const ticks:string[]=[];
  // The first day is labelled only where no month's first day falls within 90 px of it, so labels never overlap.
  const monthStarts=[...Array(last-first+1).keys()].map(i=>first+i).filter(d=>dateOf(d).endsWith('-01'));
  const labelFirst=!monthStarts.some(d=>x(d)-x(first)<90);
  for(let d=first;d<=last;d++){const iso=dateOf(d);if(iso.endsWith('-01')||(d===first&&labelFirst))
    ticks.push(`<g><line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${top-6}" y2="${height-48}" class="tree-grid"/>`
      +`<text x="${x(d).toFixed(1)}" y="${height-26}" class="tree-axis" text-anchor="middle">${iso}</text></g>`);}
  return `<svg class="transmission-tree" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(treeSentence(t))}" xmlns="http://www.w3.org/2000/svg">`
    +(title?`<text x="${left}" y="28" class="tree-title">${esc(title)}</text>`:'')
    +`<text x="${left}" y="${top-14}" class="tree-axis">One row per case; chains top to bottom, ${esc(t.columns.date)} left to right</text>`
    +ticks.join('')+links+dots+'</svg>';
}
