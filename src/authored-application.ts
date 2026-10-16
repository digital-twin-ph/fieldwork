/** Running an authored ruleset over records: facts in, conclusions back onto the records.
 *
 *  The declared rulesets each have a fact generator of their own, written for the shape they
 *  expect -- `extentN3` for polygons with an area, `facilityN3` for facilities with a named rule.
 *  An authored ruleset has no such generator, because nobody wrote one for rules nobody had
 *  written yet. This is the generic one, and what makes it possible is that the practitioner says
 *  which attribute means what: a **field binding**, which is the same mechanism
 *  [115](../docs/experiments/115-decomposing-the-projection-extract.md) needs for a table
 *  contract and [61](../docs/experiments/61-input-dimensions.md) called "the ability to say which
 *  column means what".
 *
 *  Nothing here guesses. An attribute whose meaning has not been declared takes no part, and a
 *  declared attribute that is missing from a record produces `…Known false` rather than a zero or
 *  a silence -- which is what lets a ruleset conclude Unknown instead of concluding nothing.
 */
import type {PointCollection,PointFeature,Scalar} from './types.js';
import type {DataTable} from './data-table.js';
import type {ReasonerQuad} from './worker-types.js';

/** One thing the rules are applied to, whatever shape it arrived in.
 *
 *  Until 2026-10-16 this path read a point layer and nothing else: `inputs.subjects as
 *  PointCollection`, straight into `authoredFacts`. So rules could be written about places and
 *  not about a table, which is half of the data anybody has -- Snow's Table 1 is dates and
 *  counts and carries no place at all. The rules themselves never cared: a rule reads a
 *  predicate, and a predicate is bound to an attribute. Only the two ends did.
 *
 *  So both ends normalise to this, and the rule layer between them is untouched. */
export interface SubjectRecord {
  /** Stable within one run, and what the reasoner's subject IRI is built from. */
  id:string;
  /** What a reader is shown when this record is named -- in the unmatched list, in a receipt. */
  label:string;
  properties:Record<string,Scalar|null>;
}

const isTable=(input:unknown):input is DataTable=>
  (input as DataTable|null)?.kind==='data-table';

/** The records of a point layer or of a long-format table, in one shape.
 *
 *  A table row is keyed by its declared key columns and carries one declared value, so the
 *  attributes a rule can read are exactly the key columns plus the value field -- which is the
 *  same contract the table widget already states, read the other way round. */
export function authoredSubjects(input:PointCollection|DataTable):SubjectRecord[]{
  if(isTable(input))
    return input.rows.map((row,index)=>({
      // Positional. A key can repeat across rows in a long-format table, so a key-derived id
      // would silently merge two records into one subject and the reasoner would conclude about
      // whichever won.
      id:`row-${index}`,
      label:Object.values(row.key).join(' · ')||`Row ${index+1}`,
      properties:{...row.key,[input.valueField]:row.value}}));
  return (input?.features??[]).map(feature=>({
    id:String(feature.id),
    label:String(feature.properties?.name??feature.id),
    properties:feature.properties as Record<string,Scalar|null>}));
}

export const AUTHORED_SUBJECT='subject';
const NS='urn:fieldwork:';
/** Where a practitioner's own vocabulary lives.
 *
 *  Authored rules MINT TERMS -- `waitMinutes`, `Short`, `LongOrClosed` are words somebody wrote
 *  while authoring, and the ontology cannot know them in advance. Putting them in `fw:` would
 *  make a practitioner's coinage indistinguishable from the framework's vocabulary, in receipts
 *  and in the coupling ledger that checks every `fw:` term is declared. They get a namespace of
 *  their own, so a reader can always tell which is which, and the ontology stays exactly what
 *  this application defines. Found on 2026-10-15 by building the ruleset worked example: it
 *  minted thirty terms in one afternoon. */
export const AUTHORED_NS='urn:fieldwork:authored:';
export const AUTHORED_PREFIX=`@prefix fw: <${NS}>.\n@prefix fwa: <${AUTHORED_NS}>.\n`
  +'@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';

/** What one attribute of a record means, in the vocabulary the rules are written in. */
export interface FieldBinding {
  /** The attribute on the record, as imported. */
  attribute:string;
  /** The predicate the rules use, in CURIE form: `fwa:waitMinutes`. */
  predicate:string;
  kind:'number'|'boolean'|'term';
  /** Shown to a reader, and carried into the explanation. */
  label?:string;
  unitLabel?:string;
}

const curieLocal=(curie:string)=>curie.slice(curie.indexOf(':')+1);
/** `fwa:waitMinutes` → `fwa:waitMinutesKnown`. The convention the shipped rulesets already use:
 *  absence is a FACT, stated, never inferred from silence. */
export const knownPredicate=(predicate:string)=>`${predicate}Known`;

/** A term value as the rules will see it: `clinic` → `fwa:clinic`, so a rule can match it. */
export const termFor=(value:Scalar):string=>
  `fwa:${String(value).trim().replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'None'}`;

/** Whether a record's value can be read as the kind its binding declares, and if not, why.
 *
 *  Factored out of `authoredFacts` so that the facts and the report of what went wrong cannot
 *  disagree. Both answers come from this one reading: a value this calls unreadable is exactly a
 *  value the rules were told is not there.
 *
 *  The distinction it draws is the one the result cannot. A date with no count and a count
 *  written as "3" both produce `…Known false`, both reach the Unrecorded branch, and in the
 *  output they are the same word. They are not the same problem: one is data nobody collected,
 *  the other is data somebody collected and this step could not read. 2026-10-16.
 */
export type ValueReading={known:true}|{known:false;why:'missing'|'unreadable';saw:string};
export function readValue(raw:Scalar|null|undefined,kind:FieldBinding['kind']):ValueReading{
  if(raw===undefined||raw===null||raw==='')return {known:false,why:'missing',saw:''};
  if(kind==='number'&&!(typeof raw==='number'&&Number.isFinite(raw)))
    return {known:false,why:'unreadable',saw:String(raw)};
  return {known:true};
}

/** What the records could not tell this step, per bound field.
 *
 *  The practitioner, 2026-10-16: *"we must surface the issue on the widget as a toast message
 *  that I can then read and close."* A run that quietly bands a third of its records Unrecorded
 *  has answered the question it was asked and hidden the thing worth knowing. */
export interface DataIssue {field:string; why:'missing'|'unreadable'; count:number; of:number; says:string}
export function authoredDataIssues(input:PointCollection|DataTable,bindings:FieldBinding[]):DataIssue[]{
  const subjects=authoredSubjects(input);
  const issues:DataIssue[]=[];
  for(const binding of bindings){
    const named=binding.label||binding.attribute;
    const readings=subjects.map(record=>readValue(record.properties?.[binding.attribute],binding.kind));
    const missing=readings.filter(r=>!r.known&&r.why==='missing').length;
    const unreadable=readings.filter(r=>!r.known&&r.why==='unreadable');
    if(missing)issues.push({field:binding.attribute,why:'missing',count:missing,of:subjects.length,
      says:`${missing} of ${subjects.length} records have no value for ${named}. The rules were told it is `
        +`not recorded, so whatever they conclude for those records is a conclusion about an absence.`});
    if(unreadable.length){
      const examples=[...new Set(unreadable.map(r=>(r as {saw:string}).saw))].slice(0,3);
      issues.push({field:binding.attribute,why:'unreadable',count:unreadable.length,of:subjects.length,
        says:`${unreadable.length} of ${subjects.length} records carry a value for ${named} that is not a number `
          +`(${examples.map(e=>`"${e}"`).join(', ')}${examples.length<unreadable.length?', and others':''}). `
          +`They were read as not recorded, which is the same answer this step gives for a value nobody `
          +`collected -- and this is not that. Correct the column, or bind it as text.`});
    }
  }
  return issues;
}

export function authoredFacts(input:PointCollection|DataTable,bindings:FieldBinding[]):string{
  const subjects=authoredSubjects(input);
  if(!subjects.length)throw new Error('Connect records to classify. There is nothing to apply rules to.');
  if(!bindings.length)throw new Error('Say which attribute means what before this step can apply any rule: no field is bound.');
  const prefix=AUTHORED_PREFIX;
  const lines=subjects.map(record=>{
    const subject=`<${NS}${AUTHORED_SUBJECT}:${encodeURIComponent(record.id)}>`;
    const parts:string[]=[];
    for(const binding of bindings){
      const raw=record.properties?.[binding.attribute];
      const known=readValue(raw,binding.kind).known;
      parts.push(`${knownPredicate(binding.predicate)} ${known}`);
      if(!known)continue;
      parts.push(`${binding.predicate} ${binding.kind==='number'?Number(raw)
        :binding.kind==='boolean'?raw===true||raw==='true'
        :termFor(raw)}`);
    }
    return `${subject} ${parts.join('; ')}.`;
  });
  return prefix+lines.join('\n')+'\n';
}

/** Every conclusion the reasoner reached, per subject: predicate local name → value local name.
 *
 *  Deliberately not `extractDecisions`, which knows the three statuses of one ruleset by name. An
 *  authored ruleset declares its own vocabulary and may conclude two things at once, so this
 *  reads what is there and the caller decides what it means. A subject the rules did not classify
 *  is simply absent, which is a result and not an error -- 65's rule that a ruleset may leave a
 *  subject unmatched, provided it says so. */
export function authoredConclusions(conclusions:ReasonerQuad[]):Map<string,Record<string,string>> {
  const bySubject=new Map<string,Record<string,string>>();
  for(const quad of conclusions){
    if(!quad.subject.startsWith(NS+AUTHORED_SUBJECT+':'))continue;
    const id=quad.subject.slice((NS+AUTHORED_SUBJECT+':').length);
    const local=(iri:string)=>iri.startsWith(AUTHORED_NS)?iri.slice(AUTHORED_NS.length)
      :iri.startsWith(NS)?iri.slice(NS.length):iri;
    const predicate=curieLocal(local(quad.predicate));
    const value=local(quad.object);
    const held=bySubject.get(id)??{};
    if(held[predicate]!==undefined&&held[predicate]!==value)
      throw new Error(`The rules reached two different ${predicate} conclusions for one record. `
        +`Conclusions have to be mutually exclusive: no rule may fire alongside another that disagrees with it.`);
    held[predicate]=value;
    bySubject.set(id,held);
  }
  return bySubject;
}

/** The records, carrying what the rules concluded about them.
 *
 *  The subject comes back whole, as extent-review 1.1.0 returns its polygons: a decision about a
 *  record that cannot be drawn is a decision nothing downstream can use. */
export function authoredProjection(
  input:PointCollection|DataTable,bindings:FieldBinding[],conclusions:ReasonerQuad[],
):{features:PointFeature[];rows:Record<string,Scalar|null>[];unmatched:string[];table?:DataTable}{
  const reached=authoredConclusions(conclusions);
  const subjects=authoredSubjects(input);
  const unmatched:string[]=[];
  const concludedFor=(record:SubjectRecord)=>{
    const concluded=reached.get(encodeURIComponent(record.id))??{};
    if(!Object.keys(concluded).length)unmatched.push(record.label);
    return concluded;
  };

  if(isTable(input)){
    // The conclusions become key columns. A long-format table's row is a key and one value, and
    // a key column is exactly what a concluded term is: a label this row now carries. The value
    // field is untouched, so what the table MEASURES is still the thing it measured.
    const rows=input.rows.map((row,index)=>({...row,
      key:{...row.key,...concludedFor(subjects[index])}}));
    const table:DataTable={...input,rows,
      keys:[...input.keys,...[...new Set(rows.flatMap(r=>Object.keys(r.key)))].filter(k=>!input.keys.includes(k))]};
    return {features:[],
      rows:rows.map(row=>({...row.key,[input.valueField]:row.value})),
      unmatched,table};
  }

  const features=input.features.map((feature,index)=>
    ({...feature,properties:{...feature.properties,...concludedFor(subjects[index])}}));
  const rows=features.map((feature,index)=>{
    const row:Record<string,Scalar|null>={id:feature.id,name:feature.properties.name};
    for(const binding of bindings)row[binding.label||binding.attribute]=feature.properties[binding.attribute]??null;
    for(const [predicate,value] of Object.entries(reached.get(encodeURIComponent(subjects[index].id))??{}))row[predicate]=value;
    return row;
  });
  return {features,rows,unmatched};
}

/** The receipt for a step that applied rules the practitioner wrote.
 *
 *  A declared ruleset's receipt cites the artefact it applied: id, version, title, basis. An
 *  authored one has no artefact to cite, so it carries **the rules themselves** -- which is the
 *  stronger thing, and the reason this is reproducible at all. It also states the field bindings,
 *  because a conclusion about `fwa:waitMinutes` means nothing to a reader who cannot see which
 *  column that was, and the subjects the rules left unmatched, because 65 requires a ruleset that
 *  leaves a subject unclassified to say so rather than let it pass as classified.
 */
export function authoredReceipt(
  node:{id:string;params:{label?:string}},
  authored:{title:string;mustNotBeReadAs:string;fields:FieldBinding[]},
  facts:string,rules:string,conclusions:ReasonerQuad[],unmatched:string[],
  runId:string,edges:{to:string;from:string}[],dataIssues:DataIssue[]=[],
){
  const activity=`<${NS}run:${runId}:ruleset:${node.id}>`;
  const sources=edges.filter(e=>e.to===node.id).map(e=>`<${NS}run:${runId}:output:${e.from}>`);
  const bindings=authored.fields.map(field=>
    `${activity} fw:fieldBinding [ fw:boundAttribute ${JSON.stringify(field.attribute)}; `
    +`fw:boundPredicate ${JSON.stringify(field.predicate)}; fw:boundKind ${JSON.stringify(field.kind)} ].`).join('\n');
  // What the records could not tell this step, in the evidence rather than only on the screen.
  // The practitioner, 2026-10-16: *"These fail conditions must be represented also in the
  // ontology."* A notice a reader can close is not a record. A receipt that says a quarter of
  // the records were read as unrecorded is the difference between a result somebody can audit
  // and a result they have to take on trust -- and the two kinds are distinguished here as they
  // are in the interface, because a value nobody collected and a value this could not read are
  // not the same finding.
  const problems=dataIssues.map(issue=>
    `${activity} fw:readingProblem [ a fw:ReadingProblem; `
    +`fw:boundAttribute ${JSON.stringify(issue.field)}; `
    +`fw:problemKind ${issue.why==='missing'?'fw:ValueAbsent':'fw:ValueUnreadable'}; `
    +`fw:affectedRecordCount ${issue.count}; fw:consideredRecordCount ${issue.of} ].`).join('\n');
  const statement=`@prefix fw: <${NS}>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:RuleApplication, prov:Activity; fw:ruleSource "authored"; `
    +`fw:rulesetTitle ${JSON.stringify(authored.title)}; `
    +`fw:mustNotBeReadAs ${JSON.stringify(authored.mustNotBeReadAs)}; `
    +`fw:unmatchedSubjectCount ${unmatched.length}`
    +(sources.length?`; prov:used ${sources.join(', ')}`:'')+'.\n'
    +(bindings?bindings+'\n':'')
    +(problems?problems+'\n':'');
  return {nodeId:node.id,
    facts:statement+facts,input:statement+facts+'\n'+rules,rules,conclusions,
    method:`Applied ${authored.fields.length} bound field${authored.fields.length===1?'':'s'} to rules written in this workflow. `
      +(unmatched.length?`${unmatched.length} record${unmatched.length===1?'':'s'} matched no rule and carry no conclusion: ${unmatched.slice(0,5).join(', ')}${unmatched.length>5?' and more':''}. `
        :'Every record matched a rule. ')
      // Stated in the method too, because a reader scanning what this step did should not have
      // to parse N3 to learn that some of its conclusions are about absences.
      +(dataIssues.length
        ?dataIssues.map(issue=>`${issue.count} of ${issue.of} records had `
          +`${issue.why==='missing'?'no value':'an unreadable value'} for ${issue.field}, and the rules were `
          +`told it was not recorded.`).join(' ')
        :'Every bound value was readable.')};
}
