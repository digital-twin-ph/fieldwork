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
  +`. Target ${budget.target.widgets}`
  +(distance>0?`, which is ${distance} away.`:distance<0?`, which is ${-distance} below.`:`, which is met.`));
if(distance>0)console.log(`  ${budget.target.basis}`);
if(problems.length){console.error('\n'+problems.join('\n\n'));process.exit(1);}
