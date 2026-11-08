// Verifies recorded parity evidence against the Validation Lab's own result files.
//
// The registry says a widget was independently recomputed; this checks that the Lab agrees it
// was, by digesting the result file the claim names and reading what it actually reports. The
// claim and the evidence are maintained in different repositories, so one of them will drift.
//
// Needs a Validation Lab checkout, so it is deliberately not part of `npm run check`.
// Usage: node scripts/validate-parity.mjs [--lab ../validation-lab]
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const args=process.argv.slice(2);
const lab=resolve(args.includes('--lab')?args[args.indexOf('--lab')+1]:'../validation-lab');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const local=path=>new URL('../'+path,import.meta.url);
const registry=JSON.parse(await readFile(local('widgets/registry.json'),'utf8'));
const parity=JSON.parse(await readFile(local('widgets/parity.json'),'utf8'));

let failed=false;
for(const entry of parity.entries){
  const label=`${entry.widget.replace('urn:fieldwork:widget:','')} ${entry.coversRelease} / ${entry.check}`;
  const problems=[];
  let result;
  try{
    const text=await readFile(resolve(lab,entry.result),'utf8');
    if(sha256(text)!==entry.sha256)problems.push(`result digest ${sha256(text).slice(0,12)} does not match the recorded ${entry.sha256.slice(0,12)}`);
    result=JSON.parse(text);
  }catch(error){problems.push(`result file unreadable: ${error.message}`);}
  if(result){
    if(result.check!==entry.check)problems.push(`the Lab calls this check ${result.check}`);
    // ONE FIXTURE OR SEVERAL: a check over two examples records a list (33). The operation that names this widget is
    // the one that must say which release was checked.
    const fixtures=result.fixture?[result.fixture]:result.fixtures??[];
    const through=entry.checkedThrough??entry.widget;
    if(entry.checks==='rulesets'){
      // A CHECK OF RULESETS (23), not of one widget's release: its fixtures name the rulesets each widget ran. Held to
      // naming at least one, which is what it can say.
      if(!fixtures.some(f=>f.ruleset))problems.push('the Lab result names no ruleset');
    }else{
      const operation=fixtures.map(f=>f.operation).find(o=>o?.widget===through)??fixtures[0]?.operation;
      // A widget checked through the step that holds its output (the hull, through the extent rule, 25) says so.
      if(operation?.widget!==through)problems.push(`the Lab checked ${operation?.widget}`);
      if(operation?.release!==(entry.checkedThrough?operation?.release:entry.coversRelease))
        problems.push(`the Lab checked release ${operation?.release}, not ${entry.coversRelease}`);
    }
    // The one substantive cross-check: a recorded "agrees" must not sit on a failing result.
    if(result.agrees===true&&entry.outcome!=='agrees')problems.push(`the Lab reports agreement; the registry records "${entry.outcome}"`);
    if(result.agrees===false&&entry.outcome==='agrees')problems.push('the registry records agreement; the Lab does not');
  }
  console.log(`${label} — ${entry.outcome}`);
  if(!problems.length)console.log(`  verified against ${entry.result} at ${entry.ranAt}`);
  for(const problem of problems)console.log(`  PROBLEM: ${problem}`);
  failed||=problems.length>0;
}

const covered=new Set(parity.entries.map(e=>e.widget));
const uncovered=registry.widgets.filter(w=>!covered.has(w.id));
console.log(`\nParity recorded for ${covered.size} of ${registry.widgets.length} widgets. Without parity:`);
console.log('  '+uncovered.map(w=>w.nodeType).join(', '));
console.log(`Lab pinned at ${parity.lab.commit.slice(0,12)}; this run read a working copy at ${lab}.`);
process.exitCode=failed?1:0;
