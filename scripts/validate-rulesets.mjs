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
  if(doc.basis?.status==='published'&&!(doc.basis.citations??[]).length)
    problems.push(`${at} claims a published basis and cites nothing.`);
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
  for(const parameter of doc.parameters??[]){
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

const uncited=sets.filter(s=>!(s.doc.basis?.citations??[]).length);
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
if(ledger.counts?.rulesets!==sets.length)
  problems.push(`rulesets/ledger.json counts ${ledger.counts?.rulesets} rulesets and ${sets.length} are present.`);

if(problems.length){
  console.error(`\nRulesets: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
console.log(`Rulesets: ${sets.length} declared, ${sets.length-uncited.length} cited, ${uncited.length} uncited `
  +`against a ceiling of ${ledger.uncitedCeiling}.`);
if(uncited.length)console.log(`  uncited: ${uncited.map(s=>`${s.doc.id.split(':').pop()} (${s.doc.basis.status})`).join(', ')}`);
