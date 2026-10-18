#!/usr/bin/env node
/** A ruleset must be sourced. It does not have to be general.
 *
 * This is deliberately not a copy of `validate-standardization.mjs`, and the difference is the
 * whole architecture. A **widget** must be general: an operation that belongs to one worked
 * example is a failed admission, which is what that ratchet enforces. A **ruleset** must be
 * particular — knowledge about a place, a disease, a published hierarchy is precisely what this
 * layer exists to hold, and refusing an example-specific ruleset would refuse the point of it.
 *
 * What a ruleset can be wrong about is its **authority**. So the ratchet counts rulesets with no
 * cited basis: 2 of 3 today, a number that only became countable when the rules stopped being
 * template literals. It may fall freely and may never rise.
 *
 * The widget set grew 39 -> 51 in three days because nothing owned the total. Rulesets are data,
 * so they are cheaper to add than widgets and will grow faster. This file exists before the layer
 * is finished rather than after.
 *
 * Usage: node scripts/validate-rulesets.mjs
 */
import {readFileSync,readdirSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const ledger=read('rulesets/ledger.json');

const sets=[];
for(const dir of readdirSync(`${root}/rulesets`,{withFileTypes:true}).filter(e=>e.isDirectory()))
  for(const file of readdirSync(`${root}/rulesets/${dir.name}`).filter(f=>f.endsWith('.json')))
    sets.push({path:`rulesets/${dir.name}/${file}`,doc:read(`rulesets/${dir.name}/${file}`)});

const BASIS=new Set(['published','practitioner-agreed','illustrative','proxy']);
const problems=[];

for(const {path,doc} of sets){
  const at=`${doc.id??path}`;
  if(!/^urn:fieldwork:ruleset:[a-z0-9-]+$/.test(doc.id??''))problems.push(`${path}: invalid ruleset id.`);
  if(!/^\d+\.\d+\.\d+$/.test(doc.version??''))problems.push(`${at}: a ruleset needs a semantic version, because a rule change changes results.`);
  if(!doc.mustNotBeReadAs?.trim())
    problems.push(`${at} does not say what it must not be read as. Applying a published hierarchy is `
      +`not the same as being it, and a classification is not a decision anyone has taken.`);
  if(!BASIS.has(doc.basis?.status))
    problems.push(`${at}: basis.status must be one of ${[...BASIS].join(', ')}.`);
  if(!doc.basis?.statedBy?.trim())
    problems.push(`${at}: basis.statedBy must name who or what states the basis.`);
  if(!Array.isArray(doc.basis?.evidence)||!Array.isArray(doc.basis?.unresolvedCitations))
    problems.push(`${at}: basis must declare evidence and unresolvedCitations, each an array, even when empty.`);
  if(doc.basis?.status==='published'&&!(doc.basis.evidence??[]).length&&!(doc.basis.unresolvedCitations??[]).length)
    problems.push(`${at} claims a published basis and names nothing at all.`);
  for(const ref of doc.basis?.evidence??[]){
    if(!['url','pdf'].includes(ref.kind))
      problems.push(`${at}: evidence must be kind "url" or "pdf" — the same reference shape nodes use, so a cited PDF is verified by digest rather than trusted by filename.`);
    if(ref.kind==='url'&&!/^https?:\/\//.test(ref.url??''))problems.push(`${at}: ${ref.id} is a url reference without an http or https URL.`);
    if(ref.kind==='pdf'&&!/^[0-9a-f]{64}$/.test(ref.sha256??''))problems.push(`${at}: ${ref.id} is a pdf reference without a SHA-256.`);
    for(const field of ['id','title','role','addedAt','modifiedAt'])
      if(!ref[field])problems.push(`${at}: evidence ${ref.id??'(no id)'} is missing ${field}.`);
  }
  for(const unresolved of doc.basis?.unresolvedCitations??[])
    if(!unresolved.citation?.trim()||!unresolved.whatWouldResolveIt?.trim())
      problems.push(`${at}: an unresolved citation must name itself and say what would resolve it. `
        +`"We cite three papers" and "a reader can open three papers" are different claims.`);
  // An unknown value is required, because absence of a fact already means unknown: asserting it is
  // a different and stronger statement, and a vocabulary without one cannot make that statement.
  const vocabularies=doc.outputVocabulary?.predicates??(doc.outputVocabulary?.predicate?[doc.outputVocabulary]:[]);
  if(!vocabularies.length)problems.push(`${at}: declare an output vocabulary.`);
  for(const vocabulary of vocabularies){
    if(!vocabulary.unknownValue)
      problems.push(`${at}: ${vocabulary.predicate} declares no unknown value. An asserted unknown is `
        +`not an absent conclusion, and a vocabulary without one cannot say "the rules considered `
        +`this subject and the evidence does not settle it".`);
    else if(!(vocabulary.values??[]).includes(vocabulary.unknownValue))
      problems.push(`${at}: ${vocabulary.predicate} names "${vocabulary.unknownValue}" as its unknown value and does not list it.`);
  }
  if(doc.outputVocabulary&&doc.outputVocabulary.unmatchedSubjectsExpected===undefined)
    problems.push(`${at} does not say whether unmatched subjects are expected. A subject no rule fired `
      +`on is a gap in the ruleset, not a finding about the data, and the two counts must stay apart.`);
  // The check that would have caught the two facility names, had they been in the rules.
  if(/urn:fieldwork:(place|facility|site):/.test(doc.rules??''))
    problems.push(`${at}: the rules name a dataset instance. A ruleset classifies; it does not enumerate.`);
  for(const declaration of doc.requiredDeclarations??[]){
    // A declaration is NOT a parameter: the rules never read it, so it must not carry a
    // placeholder and must not appear in the rule text. Mixing the two would let a provenance
    // field silently change what the reasoner computes.
    if(declaration.placeholder||(doc.rules??'').includes(`{{${declaration.name}}}`))
      problems.push(`${at}: required declaration ${declaration.name} reaches the rules. A declaration documents the data; a parameter tunes the rules; a field that does both is neither.`);
    if(!['doi','text','version'].includes(declaration.kind))
      problems.push(`${at}: required declaration ${declaration.name} must state a kind of doi, text or version.`);
    if(!['licence','interpretation'].includes(declaration.obligation))
      problems.push(`${at}: required declaration ${declaration.name} must say WHY it is obligatory — licence or interpretation. "The licence requires it" and "a reader will want it" are different claims.`);
    if(!String(declaration.meaning??'').trim())
      problems.push(`${at}: required declaration ${declaration.name} states no meaning, so a practitioner is asked for something without being told what it is.`);
  }
  for(const parameter of doc.parameters??[]){
    if(parameter.type==='text'&&(parameter.unit||parameter.min!==undefined||parameter.max!==undefined||parameter.decimals!==undefined))
      problems.push(`${at}: parameter ${parameter.name} is text and declares a numeric constraint.`);
    if(!parameter.unit&&parameter.type==='number')
      problems.push(`${at}: parameter ${parameter.name} is numeric and declares no unit. A threshold without its unit is not a threshold.`);
    if(!(doc.rules??'').includes(parameter.placeholder))
      problems.push(`${at}: parameter ${parameter.name} is declared and its placeholder appears in no rule.`);
  }
  for(const placeholder of new Set((doc.rules??'').match(/\{\{[a-zA-Z]+\}\}/g)??[]))
    if(!(doc.parameters??[]).some(p=>p.placeholder===placeholder))
      problems.push(`${at}: the rules use ${placeholder} and no parameter declares it, so it would reach `
        +`the reasoner as literal text and match nothing.`);
}

// Resolvable evidence, not citation strings. Restructuring the basis to carry url-or-pdf
// references is what showed the difference: the one ruleset recorded as having a cited basis cites
// three papers as author-year text, which resolve to nothing a reader can open.
// One entry per ruleset IDENTITY, not per version file. A basis belongs to the ruleset: publishing
// 2.0.0 for a port type change does not create a second uncited ruleset, and counting files would make
// the ceiling rise for a change that altered no claim. The newest version of each id is read.
const byId=new Map();
for(const entry of sets){
  const seen=byId.get(entry.doc.id);
  if(!seen||String(seen.doc.version)<String(entry.doc.version))byId.set(entry.doc.id,entry);
}
const rulesets=[...byId.values()];
const uncited=rulesets.filter(s=>!(s.doc.basis?.evidence??[]).length);
if(uncited.length>ledger.uncitedCeiling)
  problems.push(`${uncited.length} rulesets carry no citation and rulesets/ledger.json sets uncitedCeiling `
    +`to ${ledger.uncitedCeiling}: ${uncited.map(s=>s.doc.id).join(', ')}. A ruleset must be sourced. `
    +`The count may fall freely and may never rise — raise the ceiling only with a reason, in the same commit.`);
for(const {doc} of uncited)
  if(!ledger.uncited.some(e=>e.id===doc.id))
    problems.push(`${doc.id} carries no citation and is not listed in rulesets/ledger.json with what would `
      +`cite it. An uncited ruleset nobody has written down is indistinguishable from one nobody noticed.`);
for(const entry of ledger.uncited)
  if(!uncited.some(s=>s.doc.id===entry.id))
    problems.push(`rulesets/ledger.json lists ${entry.id} as uncited and it now carries a citation. `
      +`Remove the entry and lower uncitedCeiling to ${uncited.length}, so the number means something.`);
// A version that is not the first of its identity must say what it changed, and a version that
// moved a port must say what moving costs. Added 2026-10-15 after finding the opposite: two
// rulesets had carried change notes since 2026-10-12 and nothing read them, while the third had
// changed its output port with its only account of it buried in a prose description.
const ports=doc=>JSON.stringify(doc.inputContract?.ports??{});
for(const [id,versions] of Object.entries(sets.reduce((by,s)=>{
  (by[s.doc.id]??=[]).push(s);return by;},{}))){
  const ordered=versions.slice().sort((a,b)=>String(a.doc.version).localeCompare(String(b.doc.version),undefined,{numeric:true}));
  for(let i=1;i<ordered.length;i++){
    const {path,doc}=ordered[i],previous=ordered[i-1].doc;
    const changes=doc.changes??[];
    if(!changes.length){
      problems.push(`${path}: ${id} ${doc.version} supersedes ${previous.version} and declares no changes. `
        +`A practitioner told only that a newer version exists has been told the least useful half of it.`);
      continue;
    }
    for(const change of changes){
      if(!['major','minor','patch'].includes(change.kind))
        problems.push(`${path}: a change declares kind ${JSON.stringify(change.kind)}, not major, minor or patch.`);
      if(!change.description?.trim())problems.push(`${path}: a change carries no description.`);
    }
    if(ports(doc)!==ports(previous)&&!changes.some(c=>c.incompatibility?.trim()))
      problems.push(`${path}: ${id} ${doc.version} changes the ports it declares and no change states an `
        +`incompatibility. A port change breaks what is wired, whatever the version number says about it, `
        +`and the practitioner reading the alert needs to know whether moving is a click or a rewiring job.`);
  }
}

if(ledger.counts?.rulesets!==rulesets.length)
  problems.push(`rulesets/ledger.json counts ${ledger.counts?.rulesets} rulesets and ${rulesets.length} identities are present across ${sets.length} version files.`);

if(problems.length){
  console.error(`\nRulesets: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
const unresolved=rulesets.reduce((n,s)=>n+(s.doc.basis?.unresolvedCitations??[]).length,0);
console.log(`Rulesets: ${rulesets.length} declared across ${sets.length} version files, ${rulesets.length-uncited.length} with resolvable evidence, `
  +`${uncited.length} without, against a ceiling of ${ledger.uncitedCeiling}. `
  +`${unresolved} citation${unresolved===1?'':'s'} named but not resolvable.`);
if(uncited.length)console.log(`  no resolvable evidence: ${uncited.map(s=>`${s.doc.id.split(':').pop()} (${s.doc.basis.status})`).join(', ')}`);
