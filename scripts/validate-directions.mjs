#!/usr/bin/env node
/** A direction is a decision that something should now be done differently. This is the clock.
 *
 * The practitioner named the failure on 2026-10-15, on finding that a map still had an Input mode
 * a day after the discussion that ruled against modes: "The map output discussion is what we call
 * a DE moment, a moment when things should head in a different direction, and it did not." And:
 * "This is a DE project, and once we identify a wrong model we have to address the model gap."
 *
 * The failure is specific and this project has produced it at least three times. A discussion
 * settles a model; the new model is written into a widget page, a glossary entry or an ontology
 * term; the code is left alone; and the record now says the matter is settled while the running
 * application still does the old thing. Nothing could catch it, because a widget page is not a
 * work item and no ratchet reads prose.
 *
 * Two rules, which are what this file is:
 *
 *   1 · A direction states what it requires IN CODE, and names a work item. "Recorded in
 *       docs/..." is where it was written down, which is the thing that was not enough.
 *   2 · An OPEN direction is checked inside the window, with a dated note saying what was found.
 *       Not checked means not acted on, and the date cannot move without a finding -- the same
 *       rule the blocker ledger needed for the same reason.
 *
 * Deliberately not the blocker ledger. A blocker says something CANNOT be done yet; a direction
 * says something SHOULD now be done differently. A blocker rots by being lifted and not noticed,
 * a direction rots by being agreed and not built.
 *
 * Usage: node scripts/validate-directions.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const register=JSON.parse(readFileSync(`${root}/docs/directions.json`,'utf8'));
const STATUSES=new Set(['open','built','withdrawn']);
const problems=[];
const days=(a,b)=>Math.round((a-new Date(b))/86400000);
const today=process.env.FIELDWORK_TODAY?new Date(process.env.FIELDWORK_TODAY):new Date();
if(Number.isNaN(today.getTime()))throw new Error('FIELDWORK_TODAY must be a date.');

const seen=new Set();
for(const direction of register.directions){
  const {id,stated,statedBy,inTheirWords,requiresInCode,workItem,status,lastChecked,checks}=direction;
  const at=id||JSON.stringify(direction).slice(0,60);
  if(seen.has(id))problems.push(`Two directions share the id \`${id}\`.`);
  seen.add(id);
  if(!id||!stated||!statedBy)problems.push(`${at}: a direction needs an id, a date and who stated it.`);
  if(!inTheirWords?.trim())
    problems.push(`${at} does not quote the direction as it was given. A paraphrase is where a `
      +`direction starts drifting into what the person writing it down already believed.`);
  if(!requiresInCode?.trim())
    problems.push(`${at} does not say what it requires IN CODE. A direction with nothing to build `
      +`is either already done or was never a direction, and both of those need saying.`);
  if(!workItem?.trim())
    problems.push(`${at} names no work item. Where it was RECORDED is not where work is chosen: `
      +`a widget page is invisible to every ratchet this project has, which is how a settled model `
      +`shipped unchanged.`);
  if(!STATUSES.has(status))problems.push(`${at}: status "${status}" is not one of ${[...STATUSES].join(', ')}.`);
  if(status!=='open'&&!(checks??[]).length)
    problems.push(`${at} is ${status} and records no check saying what changed.`);
  if(status==='open'){
    if(!(checks??[]).length)
      problems.push(`${at} is open and records no checks. The clock is satisfied by a dated note `
        +`saying what you found, not by moving lastChecked.`);
    else{
      for(const check of checks)
        if(!check?.date||!check?.found?.trim())problems.push(`${at}: every check needs a date and what it found.`);
      const newest=checks.map(c=>c.date).filter(Boolean).sort().at(-1);
      if(newest!==lastChecked)
        problems.push(`${at}: lastChecked is ${lastChecked} and the newest check is ${newest}. `
          +`The date and the finding have to be the same event.`);
    }
    const window=direction.checkWindowDays??register.checkWindowDays;
    if(lastChecked&&days(today,lastChecked)>window)
      problems.push(`${at} is open and was last checked ${lastChecked}, ${days(today,lastChecked)} `
        +`days ago, against a window of ${window}. ${register.windowBasis}`);
  }
}

if(problems.length){
  console.error(`\nDirections: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
const counts=Object.fromEntries([...STATUSES].map(s=>[s,register.directions.filter(d=>d.status===s).length]));
const oldest=register.directions.filter(d=>d.status==='open')
  .sort((a,b)=>new Date(a.lastChecked)-new Date(b.lastChecked))[0];
console.log(`Directions: ${counts.open} open, ${counts.built} built, ${counts.withdrawn} withdrawn. `
  +`Check window ${register.checkWindowDays} days.`);
if(oldest)console.log(`  oldest open: ${oldest.id}, checked ${oldest.lastChecked} `
  +`(${days(today,oldest.lastChecked)} days ago)`);
