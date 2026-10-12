#!/usr/bin/env node
/** Admission is a claim made at a point in time, and this is the clock.
 *
 * In a developmental evaluation the criteria change as lessons are learned, so a widget admitted
 * under the D1 of 2026-10-09 has not been tested against the D1 of 2026-10-12. Treating admission
 * as permanent is what left three implementations of one operation, nine example-bound widgets and
 * four port names encoding a use in a registry where every member had passed its own review.
 *
 * The permanence came from the widget audit's own Method section: D3 and D4 were sampled because
 * "doing it retroactively for all of them is a separate task", and D5, D6, D8 and D9 were declared
 * "not applicable retroactively". The separate task was never scheduled, and nothing counted it.
 *
 * So each criterion records when it last **changed** and when the set was last **swept** against
 * it. A criterion changed after its last sweep is a re-admission debt and fails this check. The
 * ways to clear it are to sweep, or to record in `widgets/admission.json` why the change does not
 * reach the existing set — the second being a decision somebody signs for, not a silence.
 *
 * Never-swept criteria are reported and do not fail: four of them were declared out of scope by
 * the audit, two of those contestably, and reversing that is a judgement rather than an omission.
 *
 * Usage: node scripts/validate-admission.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const state=read('widgets/admission.json');
const registry=read('widgets/registry.json');

const problems=[],never=[],stale=[];
for(const c of state.criteria){
  if(!c.changed)problems.push(`${c.id}: no "changed" date, so nothing can be compared against it.`);
  if(!c.swept){never.push(c.id);continue;}
  if(c.swept<c.changed)
    stale.push(`${c.id} changed on ${c.changed} and was last swept on ${c.swept}`
      +(c.changeNote?` — ${c.changeNote}`:''));
}
if(state.widgets!==registry.widgets.length)
  problems.push(`widgets/admission.json records ${state.widgets} widgets; the registry holds `
    +`${registry.widgets.length}. A changed set is a reason to re-sweep, so record it.`);

const swept=state.criteria.filter(c=>c.swept&&c.swept>=c.changed);
const complete=swept.filter(c=>c.coverage==='all');
console.log(`Admission state: ${swept.length} of ${state.criteria.length} criteria swept since they `
  +`last changed, ${complete.length} across the whole set of ${state.widgets}.`);
for(const c of state.criteria){
  const mark=!c.swept?'never swept':c.swept<c.changed?`STALE — changed ${c.changed}, swept ${c.swept}`
    :`${c.swept} · ${c.coverage}${c.sweptCount?` (${c.sweptCount})`:''}`;
  console.log(`  ${c.id.padEnd(4)} ${mark}`);
}
if(never.length)console.log(`\n  never swept: ${never.join(', ')} — reported, not gated. `
  +`D5 and D8 are recorded as contestable: both are readable off built code.`);
if(stale.length)problems.push('A criterion changed after its last sweep, which is a re-admission debt:\n  '
  +stale.join('\n  ')+'\nSweep it, or record in widgets/admission.json why the change does not reach the existing set.');
if(problems.length){console.error('\n'+problems.join('\n\n'));process.exit(1);}
