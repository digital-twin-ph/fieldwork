#!/usr/bin/env node
/** A widget may not be name-attached to a worked example.
 *
 * The practitioner's rule of 2026-10-12. The shipped files already agreed with it and nobody
 * asked them: twelve of 51 release files declare `standardization: "example-specific"` about
 * themselves, and no file in `src/` or `scripts/` read the field. Twelve self-reported failed
 * admissions sat in the palette and in the budget.
 *
 * So this is the ratchet that reads it, in the pattern `widgets/budget.json` and
 * `ontology/coupling-debt.json` already use. An example-specific widget must either be retired
 * or appear in `widgets/standardization.json` with the record that will remove it. The exemption
 * list may shrink freely and may never grow.
 *
 * Why a constraint rather than a sweep: retiring twelve widgets once is undone by widget 52.
 * Reduction that fails the build is the only kind that stays reduced.
 *
 * Usage: node scripts/validate-standardization.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const ledger=read('widgets/standardization.json');
const registry=read('widgets/registry.json');

const release=w=>read(`widgets/releases/${w.nodeType}/${w.currentVersion}.json`);
const declared=new Map(registry.widgets.map(w=>[w.nodeType,release(w)]));

const exampleSpecific=[...declared].filter(([,r])=>r.standardization==='example-specific').map(([t])=>t);
const retired=[...declared].filter(([,r])=>r.implementationStatus==='retired').map(([t])=>t);
const exempt=new Map(ledger.exempt.map(e=>[e.nodeType,e]));
const problems=[];

// 1 · every example-specific widget is accounted for
for(const type of exampleSpecific)
  if(!exempt.has(type)&&!retired.includes(type))
    problems.push(`\`${type}\` declares standardization "example-specific" and is neither retired nor `
      +`listed in widgets/standardization.json. A widget may not be name-attached to a worked example. `
      +`Either retire it, generalise it so the declaration becomes "shared", or add it to the exemption `
      +`list with the record that will remove it — and raise exemptionCeiling in the same commit, which `
      +`is the thing this check exists to make visible.`);

// 2 · no stale exemptions: an exemption for a widget that is no longer example-specific, or gone
for(const [type,entry] of exempt){
  if(retired.includes(type))
    problems.push(`widgets/standardization.json exempts \`${type}\`, which is now retired. The `
      +`exemption did its job: delete the entry and lower exemptionCeiling to ${exempt.size-1}, so `
      +`the ratchet actually ticks down.`);
  else if(!declared.has(type))
    problems.push(`widgets/standardization.json exempts \`${type}\`, which is not in the registry. `
      +`If it was retired and removed, delete the exemption and lower exemptionCeiling to ${exempt.size-1}.`);
  else if(declared.get(type).standardization!=='example-specific')
    problems.push(`widgets/standardization.json exempts \`${type}\`, which now declares `
      +`"${declared.get(type).standardization}". The exemption did its job: delete the entry and lower `
      +`exemptionCeiling to ${exempt.size-1}, so the number means something.`);
  else if(!entry.disposition||!entry.reason)
    problems.push(`The exemption for \`${type}\` must name a disposition and a reason. An exemption `
      +`without a disposition is how a finding becomes a permanent resident (experiment 103).`);
}

// 3 · the ratchet itself
if(exempt.size>ledger.exemptionCeiling)
  problems.push(`widgets/standardization.json exempts ${exempt.size} widgets and sets exemptionCeiling `
    +`to ${ledger.exemptionCeiling}. The list may shrink freely and may never grow.`);

// 4 · a retired widget is never offered
const palette=readFileSync(`${root}/src/palette.ts`,'utf8');
for(const type of retired)
  if(new RegExp(`'${type}'`).test(palette.replace(/RETIRED_FROM_PALETTE[\s\S]*?\]/,'')))
    problems.push(`\`${type}\` is retired and still named in src/palette.ts outside the retirement list. `
      +`A retired widget never runs and is never offered.`);

const ungated=ledger.exempt.filter(e=>!e.gatedOn);
if(problems.length){
  console.error(`\nStandardization: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
console.log(`Standardization: ${exampleSpecific.length} of ${registry.widgets.length} widgets declare `
  +`"example-specific", ${exempt.size} exempt against a ceiling of ${ledger.exemptionCeiling}, `
  +`${retired.length} retired.`);
if(ungated.length)
  console.log(`  ${ungated.length} exemption${ungated.length===1?'':'s'} gated on nothing — actionable now: `
    +ungated.map(e=>`${e.nodeType} (${e.disposition})`).join(', '));
