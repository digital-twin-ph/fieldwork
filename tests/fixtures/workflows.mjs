import {readFileSync} from 'node:fs';
/** THE WORKFLOWS THE REMOVED BUILT-IN EXAMPLES BUILT, as the tests that build on them still need them (2026-11-08). The
 *  rulesets example's features moved to example-workflows-rulesets; the coverage exercise's four points are kept here.
 *  A fresh copy each call, as the builders gave. */
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
export const clipExercise=()=>read('coverage-workflow.json');
export const rulesetExample=()=>read('rulesets-workflow.json');
