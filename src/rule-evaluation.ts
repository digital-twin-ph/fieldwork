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
import {isComputed,isSettingReference,settingNamed,type AuthoredRule,type ComputeOperator,type Operand}
  from './authored-rules.js';
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
}
export interface Evaluation {
  records:RecordOutcome[];
  /** Records each rule fired for, by rule number. */
  matchedByRule:number[];
  unmatched:number;
  /** The columns that hold computed numbers, as against categories. */
  computedColumns:string[];
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

function operandValue(operand:Operand,facts:Map<string,Fact>,settings:Record<string,number>):number|undefined{
  if(typeof operand==='number')return operand;
  if(isSettingReference(operand))return settings[operand.setting];
  return facts.get(operand.field)?.number;
}
const operandLabel=(operand:Operand,labelOf:(predicate:string)=>string)=>
  typeof operand==='number'?String(operand):isSettingReference(operand)?operand.setting:labelOf(operand.field);

/** Every record's outcome under these rules. Settings are the step's bound numbers, by name. */
export function evaluateAuthored(records:SubjectRecord[],bindings:FieldBinding[],rules:AuthoredRule[],
  settings:Record<string,number>={}):Evaluation{
  const labelOf=(predicate:string)=>{const b=bindings.find(x=>x.predicate===predicate);return b?.attribute??localName(predicate);};
  const matchedByRule=rules.map(()=>0);
  const computedColumns=[...new Set(rules.flatMap(r=>r.then.filter(isComputed).map(c=>c.column?.trim()||localName(c.predicate))))];
  let unmatched=0;
  const outcomes=records.map(record=>{
    const facts=factsOf(record,bindings);
    const outcome:RecordOutcome={values:{},rules:[],divisionsByZero:[],missing:[],conflicts:[]};
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
          .some(o=>typeof o==='object'&&!isSettingReference(o)&&rules.some(r=>r.then.some(t=>t.predicate===o.field))
            &&!facts.has(o.field)));
        if(pending&&!last){waiting=true;return;}
        fired.add(index);changed=true;
        for(const conclusion of rule.then){
          const column=conclusion.column?.trim()||localName(conclusion.predicate);
          let value:string|number|null;
          if(isComputed(conclusion)){
            const {left,operator,right}=conclusion.compute;
            const a=operandValue(left,facts,settings),b=operandValue(right,facts,settings);
            if(a===undefined||b===undefined){
              outcome.missing.push({column,operands:[...(a===undefined?[operandLabel(left,labelOf)]:[]),
                ...(b===undefined?[operandLabel(right,labelOf)]:[])]});
              continue;
            }
            value=apply[operator](a,b);
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
    return outcome;
  });
  return {records:outcomes,matchedByRule,unmatched,computedColumns};
}

/** The records with what was concluded: new key columns on a table's rows, new properties on points. A computed number
 *  is written as its digits, an empty value as nothing, as a key column holds text. */
export function evaluatedTable(table:DataTable,evaluation:Evaluation):DataTable{
  if(isWide(table))return evaluatedWideTable(table,evaluation);
  const rows=table.rows.map((row,i)=>({...row,key:{...row.key,...Object.fromEntries(
    Object.entries(evaluation.records[i]?.values??{}).map(([k,v])=>[k,v===null?'':String(v)]))}}));
  const added=[...new Set(rows.flatMap(r=>Object.keys(r.key)))].filter(k=>!table.keys.includes(k));
  // Every row carries every new column, empty where nothing was concluded, so a column is never missing from a row.
  for(const row of rows)for(const k of added)if(!(k in row.key))row.key[k]='';
  return {...table,rows,keys:[...table.keys,...added]};
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
    +evaluation.matchedByRule.map((c,i)=>`Rule ${i+1}: ${c.toLocaleString('en')}`).join('; ')+'. '
    +(unmatched.length?`${records(unmatched.length)} matched no rule: ${named(unmatched)}. `:'Every record matched a rule. ')
    +(zero.length?`${records(zero.length)} ${has(zero.length)} an empty value, from a division by zero: ${named(zero)}. `:'')
    +(missing.length?`${records(missing.length)} ${has(missing.length)} no value, because a value to compute from is missing: ${named(missing)}. `:'')
    +(conflict.length?`${records(conflict.length)} ${has(conflict.length)} no value, because two rules gave different values: ${named(conflict)}.`:'');
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
    missingValueCount:rows.filter(r=>r.value===null).length};
}
