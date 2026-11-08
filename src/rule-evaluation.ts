/** THE AUTHORED RULES, EVALUATED DIRECTLY (experiment 188).
 *
 *  The practitioner, 2026-11-07: *"But we cannot let N3 be an obstacle to functionality."* The tree a practitioner
 *  builds in the rules dialog is what a step runs. Where every rule can be written in N3 it is compiled and the reasoner
 *  runs it, as before; where a rule computes a value, this runs the same tree, and a test holds the two to the same
 *  answers on the rules both can run.
 *
 *  It reads a record as `authoredFacts` writes it, so a condition means here exactly what it means to the reasoner: a
 *  bound attribute becomes its predicate and a `…Known` fact; a term is compared as the term N3 would see; a number by
 *  value. Rules are applied until nothing new is concluded, as forward chaining does, so a value one rule computes can
 *  be read by another (deaths ÷ houses, then × 10,000).
 *
 *  What N3 would leave silent is said here. A division by zero gives an empty value, as Derive a value does, and is
 *  counted. An operand with no value gives no value, and is named. Two rules giving one record different values give
 *  it none, and the conflict is reported, never settled by whichever rule came first.
 */
import {knownPredicate,readValue,termFor,type FieldBinding,type SubjectRecord} from './authored-application.js';
import {isComputed,isSettingReference,settingNamed,readsPrevious,readsPreviousRows,type AuthoredRule,type ComputeOperator,
  type Operand,type AuthoredOrder} from './authored-rules.js';
import {orderOf} from './select-rows.js';
import type {Scalar} from './types.js';
import type {DataTable} from './data-table.js';
import {isWide,wideSubjects} from './authored-application.js';

export const OPERATOR_WORDS:Record<ComputeOperator,string>={minus:'minus',plus:'plus',times:'times',dividedBy:'divided by'};
const apply:Record<ComputeOperator,(a:number,b:number)=>number|null>={
  minus:(a,b)=>a-b,plus:(a,b)=>a+b,times:(a,b)=>a*b,dividedBy:(a,b)=>b===0?null:a/b};

/** A predicate's local name, the column a conclusion becomes: `fwa:band` → `band`. */
export const localName=(curie:string)=>curie.includes(':')?curie.slice(curie.indexOf(':')+1):curie;

export interface RecordOutcome {
  /** What was concluded, by the predicate's local name: a category's term, or a computed number. Null is a division
   *  by zero, as Derive a value writes it. */
  values:Record<string,string|number|null>;
  /** The rules that fired, numbered from 1 as the dialog numbers them. */
  rules:number[];
  divisionsByZero:string[];
  missing:{column:string; operands:string[]}[];
  conflicts:{column:string; values:(string|number|null)[]; rules:number[]}[];
  /** A column that reads the previous row and got no value, because there was no single previous row, and why. */
  noPrevious:{column:string; why:NoPrevious}[];
  /** A column whose value read below the previous row's: a cumulative count that fell. Kept as computed, and said. */
  fell:string[];
}
/** WHY A ROW HAS NO PREVIOUS ONE. The first of its group; no row for the period before; one of two rows for one period;
 *  after such a pair, where every later row's previous one is uncertain; or no value to order it by. */
export type NoPrevious='first'|'period-missing'|'repeated'|'after-repeated'|'unordered';
export interface Evaluation {
  records:RecordOutcome[];
  /** Records each rule fired for, by rule number. */
  matchedByRule:number[];
  unmatched:number;
  /** The columns that hold computed numbers, as against categories. */
  computedColumns:string[];
  /** What each computed column measures and its unit, where stated. */
  computedMeta?:Record<string,{meaning?:string; unit?:string}>;
  /** The records in the order the rules read them: the step's sort, or as they arrived. Indices into `records`. */
  sequence:number[];
  order?:AuthoredOrder;
}

const DAY=86_400_000;
const ISO=/^\d{4}-\d{2}-\d{2}$/;
/** The date one period before, written as the column writes it, year-month-day. */
function periodBefore(date:string,previous:'day'|'week'|'month'):string{
  const t=Date.parse(`${date}T00:00:00Z`);
  if(previous==='day')return new Date(t-DAY).toISOString().slice(0,10);
  if(previous==='week')return new Date(t-7*DAY).toISOString().slice(0,10);
  const d=new Date(t);d.setUTCMonth(d.getUTCMonth()-1);
  // 31 March has no 31 February: the month before is the month before, not 3 March.
  if(d.getUTCDate()!==new Date(t).getUTCDate())d.setUTCDate(0);
  return d.toISOString().slice(0,10);
}

/** THE STEP'S SORT, AND EACH ROW'S PREVIOUS ONE (experiment 188, stage 4). Groups keep the order their first row
 *  arrived in; within a group, rows are ordered by `by`, as dates or as numbers where every value is one, else as
 *  text. A row's previous one is the row before it in its group, or the row one period earlier. Two rows for one value
 *  of `by` have no single previous row, and nor does any row after them in their group: a guessed one would be worse. */
export function orderRecords(records:SubjectRecord[],order:AuthoredOrder):{sequence:number[]; previous:{index:number|null; why?:NoPrevious}[]}{
  const text=(v:unknown)=>v===null||v===undefined?'':String(v);
  const byValues=records.map(r=>text(r.properties[order.by]));
  const kind=orderOf(byValues);
  if(order.previous!=='row'&&kind!=='date')
    throw new Error(`"Previous ${order.previous}" needs ${order.by} to hold dates, written year-month-day. `
      +'Choose a date column to sort by, or read the previous row recorded.');
  const groups=new Map<string,number[]>();
  records.forEach((r,i)=>{const key=order.within.map(c=>text(r.properties[c])).join('\u0000');
    groups.set(key,[...(groups.get(key)??[]),i]);});
  const compare=(a:number,b:number)=>{const x=byValues[a]!,y=byValues[b]!;
    if(x===''||y==='')return x===y?a-b:x===''?1:-1;
    if(kind==='number')return Number(x)-Number(y)||a-b;
    return x<y?-1:x>y?1:a-b;};
  const sequence:number[]=[];
  const previous:{index:number|null; why?:NoPrevious}[]=records.map(()=>({index:null}));
  for(const members of groups.values()){
    const sorted=[...members].sort(compare);
    sequence.push(...sorted);
    const counts=new Map<string,number>();
    for(const i of sorted)if(byValues[i])counts.set(byValues[i]!,(counts.get(byValues[i]!)??0)+1);
    const firstRepeat=sorted.findIndex(i=>(counts.get(byValues[i]!)??0)>1);
    const at=new Map(sorted.filter(i=>byValues[i]).map(i=>[byValues[i]!,i]));
    sorted.forEach((i,position)=>{
      if(!byValues[i]){previous[i]={index:null,why:'unordered'};return;}
      if(firstRepeat>=0&&position>=firstRepeat){
        previous[i]={index:null,why:(counts.get(byValues[i]!)??0)>1?'repeated':'after-repeated'};return;}
      if(position===0){previous[i]={index:null,why:'first'};return;}
      if(order.previous==='row'){previous[i]={index:sorted[position-1]!};return;}
      const before=at.get(periodBefore(byValues[i]!,order.previous));
      previous[i]=before===undefined?{index:null,why:'period-missing'}:{index:before};
    });
  }
  return {sequence,previous};
}

/** A fact as N3 would write it, so equality is the reasoner's term equality. */
type Fact={text:string; number?:number};

function factsOf(record:SubjectRecord,bindings:FieldBinding[]):Map<string,Fact>{
  const facts=new Map<string,Fact>();
  for(const binding of bindings){
    const raw=record.properties?.[binding.attribute];
    const known=readValue(raw,binding.kind).known;
    facts.set(knownPredicate(binding.predicate),{text:String(known)});
    if(!known)continue;
    if(binding.kind==='number'){const n=Number(raw);facts.set(binding.predicate,{text:String(n),number:n});}
    else if(binding.kind==='boolean')facts.set(binding.predicate,{text:String(raw===true||raw==='true')});
    else facts.set(binding.predicate,{text:termFor(raw as Scalar)});
  }
  return facts;
}

/** A condition's value as the term the compiler writes, with a setting bound to its number. */
function valueTerm(value:unknown,settings:Record<string,number>):Fact|undefined{
  const setting=settingNamed(value);
  if(setting!==undefined){const n=settings[setting];return n===undefined?undefined:{text:String(n),number:n};}
  if(typeof value==='number')return {text:String(value),number:value};
  if(typeof value==='boolean')return {text:String(value)};
  const text=String(value);
  return {text:/^[a-zA-Z][a-zA-Z0-9_-]*:[^\s]*$/.test(text)?text:JSON.stringify(text)};
}

function holds(condition:AuthoredRule['any'][number]['all'][number],facts:Map<string,Fact>,settings:Record<string,number>):boolean{
  const fact=facts.get(condition.field);
  const against=valueTerm(condition.value,settings);
  if(!fact||!against)return false;
  if(condition.comparator==='equals')return fact.text===against.text;
  if(fact.number===undefined||against.number===undefined)return false;
  switch(condition.comparator){
    case 'greaterThan':return fact.number>against.number;
    case 'notGreaterThan':return !(fact.number>against.number);
    case 'lessThan':return fact.number<against.number;
    case 'notLessThan':return !(fact.number<against.number);
  }
  return false;
}

function operandValue(operand:Operand,facts:Map<string,Fact>,settings:Record<string,number>,
  previousFacts?:Map<string,Fact>):number|undefined{
  if(typeof operand==='number')return operand;
  if(isSettingReference(operand))return settings[operand.setting];
  if(readsPrevious(operand))return previousFacts?.get(operand.field)?.number;
  return facts.get(operand.field)?.number;
}
const operandLabel=(operand:Operand,labelOf:(predicate:string)=>string)=>
  typeof operand==='number'?String(operand):isSettingReference(operand)?operand.setting
    :readsPrevious(operand)?`${labelOf(operand.field)} in the previous row`:labelOf(operand.field);

/** Every record's outcome under these rules. Settings are the step's bound numbers, by name. */
export function evaluateAuthored(records:SubjectRecord[],bindings:FieldBinding[],rules:AuthoredRule[],
  settings:Record<string,number>={},order?:AuthoredOrder):Evaluation{
  // A RULE BETWEEN ROWS NEEDS AN ORDER, named on the step. A file's row order is not a declaration.
  if(readsPreviousRows({rules})&&!order?.by)
    throw new Error('A rule reads the previous row, so the records need an order: choose the column to sort them by.');
  if(order?.by&&records.length&&!records.some(r=>order.by in r.properties))
    throw new Error(`These records have no "${order.by}" column to sort by.`);
  const sorted=order?.by?orderRecords(records,order):null;
  const sequence=sorted?.sequence??records.map((_,i)=>i);
  const finalFacts:(Map<string,Fact>|undefined)[]=[];
  const labelOf=(predicate:string)=>{const b=bindings.find(x=>x.predicate===predicate);return b?.attribute??localName(predicate);};
  const matchedByRule=rules.map(()=>0);
  const computedColumns=[...new Set(rules.flatMap(r=>r.then.filter(isComputed).map(c=>c.column?.trim()||localName(c.predicate))))];
  let unmatched=0;
  const outcomes:RecordOutcome[]=[];
  // IN THE STEP'S ORDER, so a row's previous one has been evaluated, and its computed values can be read too.
  for(const recordIndex of sequence){
    const record=records[recordIndex]!;
    const facts=factsOf(record,bindings);
    finalFacts[recordIndex]=facts;
    const before=sorted?.previous[recordIndex];
    const previousFacts=before?.index!=null?finalFacts[before.index]:undefined;
    const outcome:RecordOutcome={values:{},rules:[],divisionsByZero:[],missing:[],conflicts:[],noPrevious:[],fell:[]};
    // What each rule concluded for each predicate, so a conflict names both rules.
    const given=new Map<string,{value:string|number|null; rule:number}[]>();
    const fired=new Set<number>();
    // FORWARD CHAINING: apply every rule until a pass concludes nothing new. Bounded by the rule count, since each pass
    // that changes anything fires at least one rule that had not fired.
    // A rule whose computed operand another rule concludes waits for it. When a pass changes nothing and a rule is still
    // waiting, one last pass runs it, so an operand that never came (a division by zero upstream) is named, not lost.
    let last=false;
    for(let pass=0;pass<=rules.length+1;pass++){
      let changed=false,waiting=false;
      rules.forEach((rule,index)=>{
        if(fired.has(index))return;
        if(!rule.any.some(group=>group.all.every(c=>holds(c,facts,settings))))return;
        // A computed value whose operands are not known yet waits for a later pass, as a rule waits for its premises.
        const pending=rule.then.filter(isComputed).some(c=>[c.compute.left,c.compute.right]
          .some(o=>typeof o==='object'&&!isSettingReference(o)&&!readsPrevious(o)&&rules.some(r=>r.then.some(t=>t.predicate===o.field))
            &&!facts.has(o.field)));
        if(pending&&!last){waiting=true;return;}
        fired.add(index);changed=true;
        for(const conclusion of rule.then){
          const column=conclusion.column?.trim()||localName(conclusion.predicate);
          let value:string|number|null;
          if(isComputed(conclusion)){
            const {left,operator,right}=conclusion.compute;
            // NO SINGLE PREVIOUS ROW: no value, and why, rather than a value from whichever row happened to come first.
            if((readsPrevious(left)||readsPrevious(right))&&before&&before.index===null){
              outcome.noPrevious.push({column,why:before.why??'first'});continue;}
            const a=operandValue(left,facts,settings,previousFacts),b=operandValue(right,facts,settings,previousFacts);
            if(a===undefined||b===undefined){
              outcome.missing.push({column,operands:[...(a===undefined?[operandLabel(left,labelOf)]:[]),
                ...(b===undefined?[operandLabel(right,labelOf)]:[])]});
              continue;
            }
            value=apply[operator](a,b);
            // A VALUE THAT FELL from the previous row's, such as a cumulative count corrected down. Kept, and said.
            for(const side of [left,right])if(readsPrevious(side)){
              const now=facts.get(side.field)?.number,then=previousFacts?.get(side.field)?.number;
              if(now!==undefined&&then!==undefined&&now<then&&!outcome.fell.includes(column))outcome.fell.push(column);}
            if(value===null)outcome.divisionsByZero.push(column);
            else facts.set(conclusion.predicate,{text:String(value),number:value});
          }else{
            const term=valueTerm(conclusion.value,settings);
            value=localName(conclusion.value??'');
            if(term)facts.set(conclusion.predicate,term);
          }
          given.set(column,[...(given.get(column)??[]),{value,rule:index+1}]);
        }
      });
      if(!changed){if(waiting&&!last){last=true;continue;}break;}
    }
    for(const [column,list] of given){
      const distinct=[...new Set(list.map(g=>g.value))];
      if(distinct.length>1){outcome.conflicts.push({column,values:distinct,rules:list.map(g=>g.rule)});continue;}
      outcome.values[column]=distinct[0]!;
    }
    outcome.rules=[...fired].sort((a,b)=>a-b).map(i=>i+1);
    for(const i of fired)matchedByRule[i]!++;
    if(!fired.size)unmatched++;
    outcomes[recordIndex]=outcome;
  }
  const computedMeta=Object.fromEntries(rules.flatMap(r=>r.then.filter(isComputed)).map(c=>[c.column?.trim()||localName(c.predicate),
    {...(c.meaning?.trim()?{meaning:c.meaning.trim()}:{}),...(c.unit?.trim()?{unit:c.unit.trim()}:{})}]));
  return {records:outcomes,matchedByRule,unmatched,computedColumns,computedMeta,sequence,...(order?.by?{order}:{})};
}

/** The records with what was concluded: new key columns on a table's rows, new properties on points. A computed number
 *  is written as its digits, an empty value as nothing, as a key column holds text. */
export function evaluatedTable(table:DataTable,evaluation:Evaluation):DataTable{
  if(isWide(table))return evaluatedWideTable(table,evaluation);
  // IN THE STEP'S ORDER: a table sorted for its rules comes out sorted, as the preview's Sorted table shows it.
  const rows=evaluation.sequence.map(i=>{const row=table.rows[i]!;return {...row,key:{...row.key,...Object.fromEntries(
    Object.entries(evaluation.records[i]?.values??{}).map(([k,v])=>[k,v===null?'':String(v)]))}};});
  const added=[...new Set(rows.flatMap(r=>Object.keys(r.key)))].filter(k=>!table.keys.includes(k));
  // Every row carries every new column, empty where nothing was concluded, so a column is never missing from a row.
  for(const row of rows)for(const k of added)if(!(k in row.key))row.key[k]='';
  return {...table,rows,keys:[...table.keys,...added],...described(table,evaluation)};
}

/** THE NEW COLUMNS' DESCRIPTIONS, where their author stated them, beside the table's own. */
function described(table:DataTable,evaluation:Evaluation):Pick<DataTable,'columns'>|object{
  const stated=Object.entries(evaluation.computedMeta??{}).filter(([,m])=>m.meaning||m.unit);
  if(!stated.length)return {};
  return {columns:{...(table.columns??{}),...Object.fromEntries(stated.map(([column,m])=>[column,
    {...(m.meaning?{label:m.meaning}:{label:column}),...(m.unit?{unit:m.unit}:{}),origin:'practitioner' as const,confirmed:true}]))}};
}

/** WHAT THE RULES DID, in words, for the run's method and the receipt. Divisions by zero, missing operands and
 *  conflicts are each counted and named, because none of them leaves a mark in the table but an empty cell. */
export function evaluationSentence(evaluation:Evaluation,labels:string[]):string{
  const n=evaluation.records.length;
  const named=(list:number[])=>list.slice(0,5).map(i=>labels[i]).join(', ')+(list.length>5?` and ${list.length-5} more`:'');
  const where=(test:(r:RecordOutcome)=>boolean)=>evaluation.records.flatMap((r,i)=>test(r)?[i]:[]);
  const zero=where(r=>r.divisionsByZero.length>0),missing=where(r=>r.missing.length>0),conflict=where(r=>r.conflicts.length>0);
  const unmatched=where(r=>!r.rules.length);
  const records=(k:number)=>`${k.toLocaleString('en')} record${k===1?'':'s'}`,has=(k:number)=>k===1?'has':'have';
  return `Rules evaluated directly over ${n.toLocaleString('en')} record${n===1?'':'s'}, because a rule computes a value. `
    +(evaluation.order?orderSentence(evaluation.order)+' '+previousSentence(evaluation,labels)+' ':'')
    +evaluation.matchedByRule.map((c,i)=>`Rule ${i+1}: ${c.toLocaleString('en')}`).join('; ')+'. '
    +(unmatched.length?`${records(unmatched.length)} matched no rule: ${named(unmatched)}. `:'Every record matched a rule. ')
    +(zero.length?`${records(zero.length)} ${has(zero.length)} an empty value, from a division by zero: ${named(zero)}. `:'')
    +(missing.length?`${records(missing.length)} ${has(missing.length)} no value, because a value to compute from is missing: ${named(missing)}. `:'')
    +(conflict.length?`${records(conflict.length)} ${has(conflict.length)} no value, because two rules gave different values: ${named(conflict)}. `:'')
    +undescribedSentence(evaluation);
}

/** A WIDE TABLE, FOLDED BACK (experiment 188). A category is a key column on every row of its subject. A computed value
 *  is a new measure: one row per subject, named for the column, after the table's own rows and in subject order, which
 *  is the row Derive a value adds. A division by zero is a row with an empty value, as Derive a value writes it; a value
 *  that could not be computed, or that two rules disagree on, is no row, and is in the run's method. */
function evaluatedWideTable(table:DataTable&{wide:NonNullable<DataTable['wide']>},evaluation:Evaluation):DataTable{
  const {rowSubject,subjectKey}=wideSubjects(table);
  const computed=new Set(evaluation.computedColumns);
  const categoriesOf=(s:number)=>Object.fromEntries(Object.entries(evaluation.records[s]?.values??{})
    .filter(([k])=>!computed.has(k)).map(([k,v])=>[k,v===null?'':String(v)]));
  const categoryColumns=[...new Set(evaluation.records.flatMap(r=>Object.keys(r.values).filter(k=>!computed.has(k))))];
  const withCategories=(key:Record<string,string>,s:number)=>{const c=categoriesOf(s);
    return {...key,...Object.fromEntries(categoryColumns.map(k=>[k,c[k]??'']))};};
  const rows=table.rows.map((row,i)=>({...row,key:withCategories(row.key,rowSubject[i]!)}));
  for(const column of evaluation.computedColumns)
    subjectKey.forEach((key,s)=>{
      const values=evaluation.records[s]?.values??{};
      if(!(column in values))return;
      const v=values[column];
      rows.push({key:withCategories({...key,[table.wide.measureKey]:column},s),value:typeof v==='number'?v:null});
    });
  return {...table,rows,rowCount:rows.length,keys:[...table.keys,...categoryColumns.filter(k=>!table.keys.includes(k))],
    missingValueCount:rows.filter(r=>r.value===null).length,...described(table,evaluation)};
}

/** The step's sort, in words: "Sorted by week_start within place; the previous row is the previous week's." */
export function orderSentence(order:AuthoredOrder):string{
  return `Sorted by ${order.by}${order.within.length?` within each ${order.within.join(' and ')}`:''}; `
    +(order.previous==='row'?'the previous row is the row recorded before.':`the previous row is the previous ${order.previous}'s.`);
}

/** WHERE THERE WAS NO SINGLE PREVIOUS ROW, and where a value fell, counted and named: each leaves only an empty or a
 *  negative cell in the table, which says nothing about why. */
export function previousSentence(evaluation:Evaluation,labels:string[]):string{
  const order=evaluation.order;
  if(!order)return '';
  const named=(list:number[])=>list.slice(0,5).map(i=>labels[i]).join(', ')+(list.length>5?` and ${list.length-5} more`:'');
  const where=(why:NoPrevious)=>evaluation.records.flatMap((r,i)=>r.noPrevious.some(x=>x.why===why)?[i]:[]);
  const group=order.within.length?order.within.join(' and '):'table';
  const period=order.previous==='row'?'row':order.previous;
  const parts=([
    ['first',`the first of their ${group}`],
    ['period-missing',`no row for the previous ${period}`],
    ['repeated',`one ${order.by} recorded twice in their ${group}`],
    ['after-repeated',`after a ${order.by} recorded twice`],
    ['unordered',`no ${order.by} to sort by`],
  ] as [NoPrevious,string][]).map(([why,words])=>{const list=where(why);
    return list.length?`${list.length.toLocaleString('en')} ${words}: ${named(list)}`:'';}).filter(Boolean);
  const total=evaluation.records.filter(r=>r.noPrevious.length).length;
  const fell=evaluation.records.flatMap((r,i)=>r.fell.length?[i]:[]);
  return (total?`${total.toLocaleString('en')} record${total===1?' has':'s have'} no value from the previous row, because there is no single previous row (${parts.join('; ')}).`:'Every record had a previous row.')
    +(fell.length?` ${fell.length.toLocaleString('en')} record${fell.length===1?'':'s'} fell below the previous row, and ${fell.length===1?'is':'are'} kept as computed: ${named(fell)}.`:'');
}

/** NEW COLUMNS NOBODY DESCRIBED, named: a finding, as an undescribed column of an imported table is. */
export function undescribedSentence(evaluation:Evaluation):string{
  const none=evaluation.computedColumns.filter(c=>!evaluation.computedMeta?.[c]?.unit);
  return none.length?`The new column${none.length===1?'':'s'} ${none.join(', ')} ${none.length===1?'states':'state'} no unit.`:'';
}
