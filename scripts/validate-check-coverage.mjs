// Which widgets owe the Validation Lab a check, and whether that number is falling.
//
// 31 widgets compute something and 6 have an independent check, so 26 claims rest on this
// repository's own tests alone. That is a legitimate state to be in and an illegitimate one
// to lose track of, which is what this file makes impossible: the count is printed on every
// run and can only fall.
//
// What is enforced is completeness and the ratchet, not the judgement. Whether
// `facility_audit` really derives no value is a reading of the widget, written down in its
// `reason` for someone to disagree with. A validator that tried to decide that would be
// asserting something it cannot know -- and the registry cannot help, because
// implementation.definition names src/core.ts#TYPES for 39 of 51 widgets.
//
// Usage: node scripts/validate-check-coverage.mjs
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const coverage=read('widgets/check-coverage.json');
const registry=read('widgets/registry.json');
const parity=read('widgets/parity.json');

const EXPECTATIONS=new Set(Object.keys(coverage.expectations));
const declared=new Map(coverage.widgets.map(w=>[w.nodeType,w]));
// Live widgets only. A retired widget stops owing a lab check, because it never runs: keeping it
// here would be a row in the ledger and a line in the count for something no canvas can hold.
// That is the practitioner's rule of 2026-10-12 -- retired means archived, not merely unaddable.
const retired=new Set(registry.widgets.filter(w=>
  read(`widgets/releases/${w.nodeType}/${w.currentVersion}.json`).implementationStatus==='retired')
  .map(w=>w.nodeType));
const known=new Set(registry.widgets.map(w=>w.nodeType).filter(t=>!retired.has(t)));
// Every check recorded for a widget, not the last one written down. A widget may be covered by
// more than one: `apply_ruleset` is checked against an enumerated decision table by 23 and against
// a rule over derived geometry by 25, and `summarize_hull` by 10 for its ring and by 25 for the
// area that ring derives. Keyed as a Map of one check, the second entry silently replaced the
// first and this validator reported the widget's own declaration as a claim about nothing.
// Found 2026-10-14 by adding the second check. Experiment 113.
const checked=new Map();
for(const e of parity.entries){
  const nodeType=e.widget.split(':').pop();
  checked.set(nodeType,(checked.get(nodeType)||new Set()).add(e.check));
}
const problems=[];

if(declared.size!==coverage.widgets.length)problems.push('A widget is declared twice.');
for(const nodeType of known)
  if(!declared.has(nodeType))
    problems.push(`${nodeType} is in the registry and not in check-coverage.json. Declare what it owes, with a reason.`);
for(const [nodeType,entry] of declared){
  if(retired.has(nodeType)){problems.push(`check-coverage.json declares ${nodeType}, which is retired. `
    +`A retired widget never runs, so it owes no check: remove the entry and lower counts.widgets to ${declared.size-1}.`);continue;}
  if(!known.has(nodeType)){problems.push(`check-coverage.json declares ${nodeType}, which is not a registered widget.`);continue;}
  if(!EXPECTATIONS.has(entry.expectation))
    problems.push(`${nodeType}: expectation "${entry.expectation}" is not one of ${[...EXPECTATIONS].join(', ')}.`);
  if(entry.expectation!=='parity'&&!entry.reason?.trim())
    problems.push(`${nodeType}: "${entry.expectation}" needs a reason. An exemption without one is a gap that looks like a decision.`);
  if(entry.expectation==='parity'&&!entry.check&&!entry.computes?.trim())
    problems.push(`${nodeType}: say what it computes, so the check that is owed has something to aim at.`);
  // A claimed check has to exist as parity evidence, or the count is a claim about nothing.
  if(entry.check&&!checked.get(nodeType)?.has(entry.check))
    problems.push(`${nodeType}: claims check "${entry.check}", which parity.json does not record for it.`);
  if(!entry.check&&checked.has(nodeType))
    problems.push(`${nodeType}: parity.json records check "${checked.get(nodeType)}" and this file does not. Record it, so the count falls.`);
}

const actual={widgets:declared.size,
  covered:[...declared.values()].filter(w=>w.expectation==='parity'&&w.check).length,
  awaiting:[...declared.values()].filter(w=>w.expectation==='parity'&&!w.check).length,
  none:[...declared.values()].filter(w=>w.expectation==='none').length,
  blocked:[...declared.values()].filter(w=>w.expectation==='blocked').length};

// Both directions, as the ontology coupling debt does. Rising is a regression; falling
// without the file being updated leaves a stale number that reads as progress not made.
for(const [key,value] of Object.entries(actual))
  if(coverage.counts[key]!==value)
    problems.push(`counts.${key} records ${coverage.counts[key]} and the declarations give ${value}. `
      +(key!=='awaiting'?'Update widgets/check-coverage.json.'
        :value>coverage.counts[key]
          ?'Either a widget that owes a check was added -- allowed, and recording it is not optional -- '
            +'or the count was lowered without a check being written, which claims progress not made.'
          :'A check was recorded without the count falling. Update it, so the number means something.'));

console.log(`Lab check coverage: ${actual.covered} of ${actual.covered+actual.awaiting} computing widgets checked, `
  +`${actual.awaiting} awaiting, ${actual.blocked} blocked, ${actual.none} with nothing to recompute.`);
if(actual.awaiting)console.log(`  awaiting: ${[...declared.values()].filter(w=>w.expectation==='parity'&&!w.check).map(w=>w.nodeType).join(', ')}`);
if(problems.length){console.error('\n'+problems.join('\n'));process.exit(1);}
