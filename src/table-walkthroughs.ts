/** APPEND ROWS, SELECT ROWS AND TOTAL WITHIN GROUPS, SHOWN ON MADE-UP EXAMPLES (experiment 223), as Relate's is in
 *  `relate-walkthrough.ts`. Small tables fixed here, never read from a port; each step's sentence is computed apart from
 *  the step, and the last step is the table the step's own function makes from the same rows, or its words where it
 *  stops. `expected` is what the sentences said would land, which a unit test holds to that table. */
import type {DataTable} from './data-table.js';
import {appendTables} from './append-rows.js';
import {selectRows,selectRange} from './select-rows.js';
import {groupTable,type Aggregate} from './group-table.js';
import type {Walkthrough,WalkStep} from './table-walkthrough.js';

const made=(keys:string[],valueField:string,rows:[Record<string,string>,number|null][]):DataTable=>
  ({kind:'data-table',keys,valueField,rows:rows.map(([key,value])=>({key,value})),rowCount:rows.length,
    missingValueCount:rows.filter(r=>r[1]===null).length});
const cell=(v:number|null|undefined)=>v===null||v===undefined?'':String(v);
const said=(v:number|null)=>v===null?'empty':String(v);
type Walk=Walkthrough&{expected:string[][]|null};
const outcomeOf=(make:()=>DataTable,columns:string[]):{rows:string[][]}|{refusal:string}=>{
  try{const t=make();return {rows:t.rows.map(r=>columns.map(c=>c===t.valueField?cell(r.value):r.key[c]??''))};}
  catch(error){return {refusal:error instanceof Error?error.message:String(error)};}};
const finalStep=(outcome:{rows:string[][]}|{refusal:string},what:string):WalkStep=>'refusal' in outcome
  ?{text:`With these choices the step stops: ${outcome.refusal}`,marks:[],final:true}
  :{text:`The result: ${outcome.rows.length} row${outcome.rows.length===1?'':'s'}${what}. This is the table the next step would read.`,
    marks:[],final:true,result:outcome.rows};

// ── APPEND ROWS ────────────────────────────────────────────────────────────────────────────────────────────────────
export const APPEND_FIRST=made(['district'],'cases',[[{district:'Alpha'},4],[{district:'Beta'},2]]);
export const APPEND_SECOND=made(['district','sex'],'cases',[[{district:'Alpha',sex:'F'},1],[{district:'Gamma',sex:'M'},3]]);
export interface AppendWalkSettings {nameSource:boolean; sourceColumn:string; labels:string[]}
/** THE EXAMPLE'S OWN NAMES for the column saying where each row came from, and its labels (2026-11-19): the person's are
 *  about their own tables, and on these made-up ones they would mean nothing. The choice to name the source is followed. */
export const EXAMPLE_SOURCE={column:'week',labels:['Week 1','Week 2']} as const;
export function appendOutcome(s:AppendWalkSettings){
  const params=s.nameSource?{nameSource:true,sourceColumn:EXAMPLE_SOURCE.column,labels:[...EXAMPLE_SOURCE.labels]}:{};
  let columns=['district','sex','cases'];
  try{const {table}=appendTables([APPEND_FIRST,APPEND_SECOND],params);columns=[...table.keys,table.valueField];
    return {columns,outcome:outcomeOf(()=>table,columns)};}
  catch(error){return {columns,outcome:{refusal:error instanceof Error?error.message:String(error)}};}
}
export function appendWalkthrough(s:AppendWalkSettings):Walk{
  const {columns,outcome}=appendOutcome(s);
  const source=columns.find(c=>!['district','sex','cases'].includes(c));
  const label=(i:number)=>EXAMPLE_SOURCE.labels[i]!;
  const row=(district:string,sex:string,cases:number|null,i:number)=>columns.map(c=>c==='district'?district:c==='sex'?sex:c==='cases'?cell(cases):label(i));
  const first=APPEND_FIRST.rows.map(r=>row(r.key.district!,'',r.value,0)),second=APPEND_SECOND.rows.map(r=>row(r.key.district!,r.key.sex!,r.value,1));
  const steps:WalkStep[]=[
    {text:'A made-up example. The rows of Cases, week 1 are put first and the rows of Cases, week 2 under them; columns are '
      +'lined up by their names.'+(source?` You chose to say where each row came from; in this example the column is named ${source}.`:''),marks:[]},
    {text:'Week 1’s two rows go first. Week 1 has no sex column, so their sex is left empty: not asked, which is not the same as none.'
      +(source?` Each is labelled "${label(0)}".`:''),
      marks:APPEND_FIRST.rows.map((_,row)=>({table:0,row,state:'kept' as const,word:'added, sex empty'})),result:first},
    {text:'Week 2’s two rows go under them, with their sex as written. Alpha now appears twice, once from each week: '
      +'stacking keeps every row and joins none.'+(source?` Each is labelled "${label(1)}".`:''),
      marks:APPEND_SECOND.rows.map((_,row)=>({table:1,row,state:'kept' as const,word:'added'})),result:second},
    finalStep(outcome,', the first table’s and then the second’s'),
  ];
  return {title:'Append rows, on a made-up example',resultColumns:columns,steps,expected:[...first,...second],
    tables:[{label:'Cases, week 1',columns:['district','cases'],rows:APPEND_FIRST.rows.map(r=>[r.key.district!,cell(r.value)])},
      {label:'Cases, week 2',columns:['district','sex','cases'],rows:APPEND_SECOND.rows.map(r=>[r.key.district!,r.key.sex!,cell(r.value)])}]};
}

// ── SELECT ROWS ────────────────────────────────────────────────────────────────────────────────────────────────────
export const SELECT_TABLE=made(['district','region','week'],'cases',[
  [{district:'Alpha',region:'North',week:'1'},4],[{district:'Beta',region:'South',week:'2'},2],
  [{district:'Gamma',region:'',week:'3'},1],[{district:'Delta',region:'East',week:''},5],[{district:'Epsilon',region:'North',week:'5'},3]]);
export type SelectWalkMode='values'|'leave-out'|'range';
const SELECT_COLUMNS=['district','region','week','cases'];
export function selectOutcome(mode:SelectWalkMode){
  return outcomeOf(()=>(mode==='range'?selectRange(SELECT_TABLE,'week','2','4')
    :selectRows(SELECT_TABLE,'region',mode==='values'?['North','East']:['North'],mode==='leave-out')).table,SELECT_COLUMNS);
}
export function selectWalkthrough(mode:SelectWalkMode):Walk{
  const rule=mode==='values'?'Say you keep the regions North and East.':mode==='leave-out'?'Say you leave out the region North.'
    :'Say you keep weeks 2 to 4, both ends included.';
  const steps:WalkStep[]=[{text:`A made-up example, with the way of choosing you have picked. ${rule} Each row is checked in turn.`,marks:[]}];
  const kept:{row:string[];rank:number}[]=[];
  SELECT_TABLE.rows.forEach((r,i)=>{
    const region=r.key.region!,week=r.key.week!,row=SELECT_COLUMNS.map(c=>c==='cases'?cell(r.value):r.key[c]!);
    let keep:boolean,why:string;
    if(mode==='range'){
      keep=week!==''&&Number(week)>=2&&Number(week)<=4;
      why=week===''?`${r.key.district} has no week written, so it is in no range: set aside.`
        :`${r.key.district} is week ${week}, ${keep?'inside 2 to 4: kept':'outside 2 to 4: set aside'}.`;
    }else if(mode==='values'){
      keep=region==='North'||region==='East';
      why=region===''?`${r.key.district} has no region written, so it is neither North nor East: set aside.`
        :`${r.key.district} is ${region}: ${keep?'kept':'set aside'}.`;
    }else{
      keep=region!=='North';
      why=region===''?`${r.key.district} has no region written. It is not North, so leaving out North keeps it.`
        :`${r.key.district} is ${region}: ${keep?'kept':'left out'}.`;
    }
    if(keep)kept.push({row,rank:mode==='values'?(region==='North'?0:1):i});
    steps.push({text:why,marks:[{table:0,row:i,state:keep?'kept':'unmatched',word:keep?'kept':mode==='leave-out'?'left out':'set aside'}],
      ...(keep&&mode!=='values'?{result:[row]}:{})});
  });
  // KEPT VALUES COME IN THE ORDER THEY WERE NAMED, North's rows before East's, so the result is laid out once the rows are checked.
  const ordered=[...kept].sort((a,b)=>a.rank-b.rank).map(k=>k.row);
  if(mode==='values')steps.push({text:'The kept rows are put in the order the values were named: North’s rows, then East’s.',marks:[],result:ordered});
  steps.push(finalStep(selectOutcome(mode),''));
  return {title:'Select rows by value, on a made-up example',resultColumns:SELECT_COLUMNS,steps,expected:ordered,
    tables:[{label:'Cases by district',columns:SELECT_COLUMNS,rows:SELECT_TABLE.rows.map(r=>SELECT_COLUMNS.map(c=>c==='cases'?cell(r.value):r.key[c]!))}]};
}

// ── TOTAL WITHIN GROUPS ────────────────────────────────────────────────────────────────────────────────────────────
export const GROUP_TABLE=made(['district','region'],'cases',[
  [{district:'Alpha',region:'North'},4],[{district:'Beta',region:'South'},2],[{district:'Gamma',region:'North'},null],
  [{district:'Delta',region:'South'},5],[{district:'Epsilon',region:'North'},3]]);
export interface GroupWalkSettings {aggregate:Aggregate; excludeMissing:boolean}
const WORDS:Record<Aggregate,string>={sum:'total',count:'count of rows',mean:'mean',median:'median',minimum:'smallest',maximum:'largest'};
export function groupOutcome(s:GroupWalkSettings){
  return outcomeOf(()=>groupTable(GROUP_TABLE,{by:['region'],aggregate:s.aggregate,excludeMissing:s.excludeMissing}).table,
    ['region',s.aggregate==='count'?'rows':'cases']);
}
const aggregateOf=(values:number[],how:Aggregate):number=>{
  const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return how==='sum'?values.reduce((a,b)=>a+b,0):how==='mean'?values.reduce((a,b)=>a+b,0)/values.length
    :how==='median'?(sorted.length%2?sorted[mid]!:(sorted[mid-1]!+sorted[mid]!)/2):how==='minimum'?sorted[0]!:sorted.at(-1)!;
};
export function groupWalkthrough(s:GroupWalkSettings):Walk{
  const column=s.aggregate==='count'?'rows':'cases';
  const steps:WalkStep[]=[{text:`A made-up example. The rows are gathered by region, and each region becomes one row holding the `
    +`${WORDS[s.aggregate]} of its cases, as you have chosen. district is not kept, so it is gone from the result.`,marks:[]}];
  const expected:string[][]=[];
  for(const region of [...new Set(GROUP_TABLE.rows.map(r=>r.key.region!))]){
    const members=GROUP_TABLE.rows.map((r,i)=>({r,i})).filter(({r})=>r.key.region===region);
    const values=members.map(({r})=>r.value),present=values.filter((v):v is number=>v!==null);
    const listed=members.map(({r})=>`${r.key.district} ${said(r.value)}`).join(', ');
    let value:number|null,text:string;
    if(s.aggregate==='count'){value=members.length;
      text=`${region} gathers ${listed}. Counting rows counts all ${members.length}, ${present.length<members.length?'the empty cell too':'each one'}: ${value}.`;}
    else if(present.length<members.length&&!s.excludeMissing){value=null;
      text=`${region} gathers ${listed}. One cell is empty, so its ${WORDS[s.aggregate]} is unknown, not smaller: left empty. `
        +'Choose to leave empty cells out to compute it from the rest.';}
    else{value=aggregateOf(present,s.aggregate);
      text=`${region} gathers ${listed}.${present.length<members.length?' You chose to leave empty cells out, not to count them as zero, so':''} `
        +`Its ${WORDS[s.aggregate]} is ${value}${present.length<members.length?`, from the ${present.length} written`:''}.`;}
    expected.push([region,cell(value)]);
    steps.push({text,marks:members.map(({r,i})=>({table:0,row:i,state:r.value===null?(value===null?'stopped' as const:'unmatched' as const):'several' as const,
      word:r.value===null?(s.aggregate==='count'?'counted, empty':value===null?'empty':'left out'):region})),result:[[region,cell(value)]]});
  }
  steps.push(finalStep(groupOutcome(s),', one per region'));
  return {title:'Total within groups, on a made-up example',resultColumns:['region',column],steps,expected,
    tables:[{label:'Cases by district',columns:['district','region','cases'],rows:GROUP_TABLE.rows.map(r=>[r.key.district!,r.key.region!,cell(r.value)])}]};
}
