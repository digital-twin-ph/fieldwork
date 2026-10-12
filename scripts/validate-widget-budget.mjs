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
const registry=read('widgets/registry.json');

// Two numbers, not one. A widget costs code, a release file, a lab check, an audit sweep against
// twelve criteria, and a line in every future sweep. A retired widget costs none of that, and a
// composition costs a JSON file whose members already carry all of it. Counting them together is
// what let "51" mean one thing to the budget and another to a practitioner looking at a palette.
// `widgets` is the maintenance number -- live, unretired widgets. `addable` is the attention
// number, what a practitioner can actually put on a canvas, and a reduction must move the first
// without silently growing the second.
const release=w=>read(`widgets/releases/${w.nodeType}/${w.currentVersion}.json`);
const live=registry.widgets.filter(w=>release(w).implementationStatus!=='retired');
const retired=registry.widgets.length-live.length;
const actual=live.length;
const recorded=budget.counts.widgets;
const problems=[];

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
  +` — ${budget.counts.primitive} primitive, `
  +`${budget.counts.composite} composite, ${compositions} bundled composition`+(compositions===1?'':'s')
  +`. Target ${budget.target.widgets}`
  +(distance>0?`, which is ${distance} away.`:distance<0?`, which is ${-distance} below.`:`, which is met.`));
if(distance>0)console.log(`  ${budget.target.basis}`);
if(problems.length){console.error('\n'+problems.join('\n\n'));process.exit(1);}
