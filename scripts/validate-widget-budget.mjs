#!/usr/bin/env node
/** How many widgets there are, as a number somebody has to sign for.
 *
 * This project learns lessons and records them as criteria applied to the *next* widget. D1 asks
 * what a candidate is; D2 asks whether it already exists. Both are asked of one candidate at a
 * time, and they worked: every one of the twelve widgets added between 2026-10-09 and 2026-10-12
 * passed its own admission review honestly. The set still grew from 39 to 51 while a refactor to
 * shrink it sat unexecuted, because **nothing owned the total**.
 *
 * So the total is a ratchet now, in the pattern `ontology/coupling-debt.json` and
 * `widgets/check-coverage.json` already use. It may fall freely. It may not rise unless
 * `widgets/budget.json` is updated in the same commit, naming the admission review that
 * justifies the addition. Raising it is allowed; raising it silently is not.
 *
 * It is a target and not a ceiling, because D1 says primitives are exposed when a workflow needs
 * them and not in advance. A needed primitive is not refused by arithmetic — it is recorded.
 *
 * AND THE TARGET IS NOT A GOAL. The practitioner, 2026-10-26, on the epi kernel's three
 * additions: *"Forget the widget ceiling for epi kernel, it is a natural consequence of making
 * progress. This is a DE project at the end of the day, and we want to be moving forward, not
 * backward. The widget ratchet is artificial and is meant to guard for duplication and
 * non-widgets pretending to be widgets."*
 *
 * So what this file is FOR is two of the admission criteria and not the size of the set:
 *
 *   D2  — does this already exist? The ratchet makes every addition name its admission review,
 *         which is what forces that question to be asked out loud.
 *   D11 — does a residual function remain that no existing entity performs? A widget that
 *         cannot answer it is a non-widget pretending to be one.
 *
 * A widget that passes both is PROGRESS, and this file records it rather than charging for it.
 * That is why the count below is reported as a fact and the target as a reference: the number
 * exists to make additions visible, never to cap them, and a rising count whose additions each
 * named a review is this project working as intended. What the ratchet still refuses is growth
 * nobody recorded, which is the condition it was built for — the set went 39 to 51 in three days
 * while a refactor to shrink it sat unexecuted, and the defect was that nothing owned the total,
 * not that the total was too big.
 *
 * Usage: node scripts/validate-widget-budget.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const budget=read('widgets/budget.json');
const problems=[];
const registry=read('widgets/registry.json');

// Two numbers, not one. A widget costs code, a release file, a lab check, an audit sweep against
// twelve criteria, and a line in every future sweep. A retired widget costs none of that, and a
// composition costs a JSON file whose members already carry all of it. Counting them together is
// what let "51" mean one thing to the budget and another to a practitioner looking at a palette.
// `widgets` is the maintenance number -- live, unretired widgets. `addable` is the attention
// number, what a practitioner can actually put on a canvas, and a reduction must move the first
// without silently growing the second.
const release=w=>read(`widgets/releases/${w.nodeType}/${w.currentVersion}.json`);
const statusOf=w=>release(w).implementationStatus;
// A pending widget does not count. The practitioner's rule of 2026-10-12: a widget that is
// pending because of merge activity -- not developed, not used -- is exempt precisely because it
// is emergent. We do not yet know whether it deserves to be a tree in the forest, nor whether it
// fills a value gap in the inventory, and counting a candidate against a target for the
// committed set makes the number mean two things at once.
//
// `proposed` has been a permitted implementationStatus since the format was written, read by one
// line: the one checking the value is permitted. Same inert state `retired` was in this morning.
const pending=registry.widgets.filter(w=>statusOf(w)==='proposed');
const live=registry.widgets.filter(w=>statusOf(w)==='implemented');
const retired=registry.widgets.filter(w=>statusOf(w)==='retired').length;
const actual=live.length;

const declaredPending=new Map((budget.pending??[]).map(entry=>[entry.nodeType,entry]));
const clockDays=budget.pendingRule?.clockDays??14;
const measured=new Date(budget.measuredAt);
for(const widget of pending){
  const entry=declaredPending.get(widget.nodeType);
  if(!entry){
    problems.push(`\`${widget.nodeType}\` declares implementationStatus "proposed" and is not in `
      +`budget.pending. A pending widget is exempt from the count, so the exemption is where it must `
      +`be written down: name what it replaces, why it is pending, and when it was proposed.`);
    continue;
  }
  if(!(entry.replaces??[]).length)
    problems.push(`\`${widget.nodeType}\` is pending and names nothing it replaces. The exemption `
      +`exists for a widget arriving through a merge; without a replaces list it is a way to add `
      +`capability for free, which is the failure the budget exists to stop.`);
  for(const replaced of entry.replaces??[])
    if(!registry.widgets.some(w=>w.nodeType===replaced))
      problems.push(`\`${widget.nodeType}\` says it replaces \`${replaced}\`, which is not a registered widget.`);
  if(!entry.pendingBecause?.trim()||!entry.proposedAt)
    problems.push(`\`${widget.nodeType}\` is pending and must say why, and when it was proposed.`);
  else if(Math.round((measured-new Date(entry.proposedAt))/86400000)>clockDays)
    problems.push(`\`${widget.nodeType}\` has been pending since ${entry.proposedAt}, longer than the `
      +`${clockDays}-day window. ${budget.pendingRule?.clockBasis??''} Develop it, or withdraw it and `
      +`say so — an exemption with no end is a parking lot.`);
}
for(const [nodeType] of declaredPending)
  if(!pending.some(w=>w.nodeType===nodeType))
    problems.push(`budget.pending lists \`${nodeType}\`, whose release does not declare `
      +`implementationStatus "proposed". Either it was developed — remove the entry, raise `
      +`counts.widgets, and retire what it replaced in the same commit — or the states disagree.`);
if((budget.counts.pending??0)!==pending.length)
  problems.push(`counts.pending records ${budget.counts.pending} and ${pending.length} release(s) declare "proposed".`);
const recorded=budget.counts.widgets;

if(actual>recorded)
  problems.push(`The registry holds ${actual} widgets and widgets/budget.json records ${recorded}. `
    +`Adding a widget is allowed and adding one silently is not: update budget.json in this commit, `
    +`name the admission review that justifies it in additionsSince, and say why the total should rise `
    +`rather than something else falling.`);
if(actual<recorded)
  problems.push(`The registry holds ${actual} widgets and widgets/budget.json records ${recorded}. `
    +`The set shrank, which is the direction this file exists to encourage — record it, so the `
    +`number means something.`);

const latest=budget.additionsSince?.at(-1);
if(latest&&latest.widgets!==recorded)
  problems.push(`additionsSince ends at ${latest.widgets} widgets and counts.widgets says ${recorded}.`);

const compositions=budget.counts.compositions??0;
const addable=actual+compositions;
if(budget.counts.addable!==undefined&&budget.counts.addable!==addable)
  problems.push(`counts.addable says ${budget.counts.addable} and ${actual} live widgets plus `
    +`${compositions} bundled compositions is ${addable}. Reduction must move the widget count `
    +`without growing what a practitioner has to read.`);

const distance=actual-budget.target.widgets;
console.log(`Widget budget: ${actual} live widgets`+(retired?` (${retired} retired)`:'')
  +(pending.length?` (${pending.length} pending, exempt)`:'')
  +` — ${budget.counts.primitive} primitive, `
  +`${budget.counts.composite} composite, ${compositions} bundled composition`+(compositions===1?'':'s')
  // REPORTED, NOT CHARGED FOR. This read "Target 41, which is 11 away", and a distance phrased as
  // a shortfall is read as a debt -- which is how three widgets that each carried new function
  // got recorded as room owed back. The reference is still printed, because duplication pressure
  // is worth seeing; it is no longer printed as a gap to close.
  +`. Reference ${budget.target.widgets}`
  +(distance>0?`, exceeded by ${distance} — see additionsSince for what each one added.`
    :distance<0?`, ${-distance} below it.`:`, met.`));
console.log('  The guard is D2 (does it already exist?) and D11 (does a residual function remain '
  +'that nothing else performs?), not the size of the set. An addition that answers both is '
  +'progress and is recorded here; growth nobody recorded is what this refuses.');
if(distance>0)console.log(`  Reduction plan, if and when it is wanted: ${budget.target.basis}`);
if(problems.length){console.error('\n'+problems.join('\n\n'));process.exit(1);}
