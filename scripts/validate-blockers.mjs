#!/usr/bin/env node
/** A blocker is a dated claim, and this is the clock on it.
 *
 * The practitioner's rule of 2026-10-12: even blockers are not permanent, and each should be
 * revisited in DE mode. The evidence for it is what re-deriving the two recorded blockers found
 * the same day. One had been **lifted** by a widget that shipped, while TODO.md still read
 * "not built". The other was true and one size too large, and had been stopping work it did not
 * block: the ruleset merge needs declared rulesets, not the generic field schema it was waiting on.
 *
 * So a blocker nobody re-derives does the same damage as an admission nobody re-reviews -- it
 * looks like a fact and acts like a decision. Two rules follow, and they are what this script is:
 *
 *   1 · Every blocker states a **liftTest**: the check that would show it has gone. A blocker that
 *       cannot be falsified is a mood, not a finding.
 *   2 · A **standing** blocker is revisited inside the window, or this fails. Not revisited means
 *       not known, and the project has twice treated "recorded" as "still true".
 *
 * And the teeth: every `gatedOn` in widgets/standardization.json must name a standing blocker
 * here. That turns the reduction ledger's gates from prose into claims with a clock, which is the
 * difference between a gate and an excuse.
 *
 * Usage: node scripts/validate-blockers.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const ledger=read('widgets/blockers.json');
const standardization=read('widgets/standardization.json');
// The naming ratchet gates too, and reads the same blocker ids. Leaving it out of the cross-check
// would make its gates declared-and-unread -- the defect this whole ledger exists to prevent.
const naming=read('widgets/naming.json');
const registry=read('widgets/registry.json');

// `finding` was added 2026-10-15. A claim that is TRUE and gates nothing is not a blocker: calling
// it standing says work is queued behind it when none is, and it collects a weekly re-derivation
// that buys nobody anything. Two entries were in that position. A finding carries a claim and a
// liftTest like any other entry, and no clock, because there is no gate to keep honest.
const STATUSES=new Set(['standing','narrowed','lifted','withdrawn','finding']);
const problems=[];
const days=(a,b)=>Math.round((a-new Date(b))/86400000);
// The revisit window is measured against the REAL date, not against a field inside the file being
// checked. It used to read `ledger.measuredAt`, so a blocker could never breach the window unless
// somebody also advanced that field -- and advancing it is exactly what a person who forgot to
// revisit would also forget. The clock measured itself, so it never ticked.
//
// FIELDWORK_TODAY exists so a check can pin the date; nothing in the application reads it.
const today=process.env.FIELDWORK_TODAY?new Date(process.env.FIELDWORK_TODAY):new Date();
if(Number.isNaN(today.getTime()))throw new Error('FIELDWORK_TODAY must be a date.');
if(days(today,ledger.measuredAt)<0)
  problems.push(`widgets/blockers.json records measuredAt ${ledger.measuredAt}, which is in the `
    +`future. The counts cannot have been taken yet.`);
const byId=new Map();
// An entry may hold the clock open longer than the ledger default, with a stated reason.
const window=blocker=>blocker.revisitWindowDays??ledger.revisitWindowDays;

for(const blocker of ledger.blockers){
  const {id,claim,status,recorded,lastRevisited,liftTest}=blocker;
  if(byId.has(id))problems.push(`Two blockers share the id \`${id}\`.`);
  byId.set(id,blocker);
  if(!id||!claim?.trim())problems.push(`A blocker needs an id and a claim: ${JSON.stringify(blocker).slice(0,80)}`);
  if(!STATUSES.has(status))problems.push(`\`${id}\`: status "${status}" is not one of ${[...STATUSES].join(', ')}.`);
  if(!liftTest?.trim())
    problems.push(`\`${id}\` states no liftTest. A blocker that names no check capable of showing `
      +`it has gone cannot be falsified, so it will never be lifted — which is how a claim becomes `
      +`permanent without anyone deciding that it should be.`);
  if(!recorded||!lastRevisited)problems.push(`\`${id}\`: both recorded and lastRevisited are required.`);
  else if(days(new Date(lastRevisited),recorded)<0)
    problems.push(`\`${id}\`: lastRevisited ${lastRevisited} is before recorded ${recorded}.`);
  else if(status==='standing'&&days(today,lastRevisited)>window(blocker))
    problems.push(`\`${id}\` is standing and was last revisited ${lastRevisited}, `
      +`${days(today,lastRevisited)} days ago, against a window of ${window(blocker)}. `
      +`Re-derive it and record what you found in revisits, or change its status. ${ledger.windowBasis}`);
  // The clock used to be satisfiable by editing one date, which rewards the person who forgot to
  // re-derive with a one-character fix. A standing blocker now carries dated revisit notes and the
  // newest one has to BE lastRevisited, so the date cannot move unless somebody writes a finding.
  if(status==='standing'){
    const revisits=blocker.revisits??[];
    if(!revisits.length)
      problems.push(`\`${id}\` is standing and records no revisits. The clock is satisfied by a dated `
        +`note saying what re-deriving the claim found -- not by moving lastRevisited, which is the `
        +`edit a person who skipped the re-derivation would also make.`);
    else{
      for(const entry of revisits)
        if(!entry?.date||!entry?.found?.trim())
          problems.push(`\`${id}\`: every revisit needs a date and what it found.`);
      const newest=revisits.map(r=>r.date).filter(Boolean).sort().at(-1);
      if(newest!==lastRevisited)
        problems.push(`\`${id}\`: lastRevisited is ${lastRevisited} and the newest revisit note is `
          +`${newest}. The date and the finding have to be the same event.`);
    }
    if(!(blocker.blocks??[]).length)
      problems.push(`\`${id}\` is standing and blocks nothing. A blocker nothing is waiting on is not `
        +`a blocker: give it the work it gates, or record it as a finding, which carries no clock.`);
  }
  if(status==='finding'&&(blocker.blocks??[]).length)
    problems.push(`\`${id}\` is a finding and lists ${blocker.blocks.length} thing(s) it blocks. `
      +`Something waiting on it makes it standing, with a clock.`);
  if(blocker.revisitWindowDays&&blocker.revisitWindowDays>ledger.revisitWindowDays&&!blocker.windowReason?.trim())
    problems.push(`\`${id}\` raises its revisit window to ${blocker.revisitWindowDays} days above the `
      +`ledger's ${ledger.revisitWindowDays} and states no windowReason. A longer window is defensible `
      +`-- re-deriving a claim that waits on a mechanism nobody is building buys nothing -- but it is a `
      +`claim about the claim and has to be argued.`);
  if(['lifted','withdrawn'].includes(status)&&!blocker.whatChanged?.trim())
    problems.push(`\`${id}\` is ${status} and does not say what changed. A blocker that disappears `
      +`without a record is indistinguishable from one that was forgotten.`);
  if(status==='narrowed'&&!blocker.whatChanged?.trim())
    problems.push(`\`${id}\` is narrowed and does not say what changed. The narrowing is the finding.`);
  if(status==='lifted'&&blocker.blocks?.length)
    problems.push(`\`${id}\` is lifted and still lists ${blocker.blocks.length} thing(s) it blocks. `
      +`Clear the list, or the work stays queued behind nothing.`);
}

// The teeth. A gate in the reduction ledger has to be a claim with a clock behind it.
const widgetTypes=new Set(registry.widgets.map(w=>w.nodeType));
const gated=[
  ...(standardization.exempt??[]),
  ...(standardization.deferred??[]),
  ...(naming.knownViolations??[]),
].filter(e=>e.gatedOn);
for(const entry of gated){
  const blocker=byId.get(entry.gatedOn);
  if(!blocker)
    problems.push(`widgets/standardization.json gates \`${entry.nodeType}\` on "${entry.gatedOn}", `
      +`which is not a blocker id in widgets/blockers.json. A gate naming a document names no claim `
      +`and carries no clock: add the blocker, with its liftTest, and gate on its id.`);
  else if(!['standing','narrowed'].includes(blocker.status))  // a finding gates nothing, by definition
    problems.push(`\`${entry.nodeType}\` is gated on \`${blocker.id}\`, which is ${blocker.status}. `
      +`The gate is gone: act on the entry or re-record the blocker.`);
  else if(!(blocker.blocks??[]).includes(entry.nodeType))
    problems.push(`\`${entry.nodeType}\` is gated on \`${blocker.id}\`, which does not list it among `
      +`what it blocks. One of the two is wrong.`);
}
for(const blocker of ledger.blockers)
  for(const blocked of blocker.blocks??[])
    if(widgetTypes.has(blocked)&&!gated.some(e=>e.nodeType===blocked&&e.gatedOn===blocker.id))
      problems.push(`\`${blocker.id}\` claims to block the widget \`${blocked}\`, which is not gated `
        +`on it in widgets/standardization.json or widgets/naming.json. A blocker nothing is `
        +`waiting on is not a blocker.`);

if(problems.length){
  console.error(`\nBlockers: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
const counts=Object.fromEntries([...STATUSES].map(s=>[s,ledger.blockers.filter(b=>b.status===s).length]));
const findings=counts.finding?`, ${counts.finding} finding${counts.finding===1?'':'s'} (true, gating nothing, no clock)`:'';
const oldest=ledger.blockers.filter(b=>b.status==='standing')
  .sort((a,b)=>new Date(a.lastRevisited)-new Date(b.lastRevisited))[0];
console.log(`Blockers: ${counts.standing} standing, ${counts.narrowed} narrowed, ${counts.lifted} lifted, `
  +`${counts.withdrawn} withdrawn${findings}. Revisit window ${ledger.revisitWindowDays} days.`);
if(oldest)console.log(`  oldest standing: ${oldest.id}, revisited ${oldest.lastRevisited} `
  +`(${days(today,oldest.lastRevisited)} days ago)`);
