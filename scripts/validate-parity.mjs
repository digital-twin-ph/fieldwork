// Verifies recorded parity evidence against the Validation Lab's own result files.
//
// The registry says a widget was independently recomputed; this checks that the Lab agrees it
// was, by digesting the result file the claim names and reading what it actually reports. The
// claim and the evidence are maintained in different repositories, so one of them will drift.
//
// IN THE GATE FROM 2026-11-26 (the lab audit, docs/audits/validation-lab-audit.md). It needs a Validation Lab
// checkout, which is why it was left out, and in that time nothing ran it. verify.yml checks the lab out at the
// commit this file pins, as validate:dive-deeper needs, so CI verifies the evidence the ledger claims. With no checkout
// it fails, as validate:dive-deeper does, unless FIELDWORK_LAB_OPTIONAL=1.
//
// IT ALSO SAYS HOW OLD EACH CHECK IS: an entry whose release is behind the widget's current one is listed, by how
// many releases. Reported, never failed: a release that changed nothing a check exercises leaves the check as true as
// it was, and only rerunning it says otherwise. That is the lab's job, and this list is what tells it where to look.
// Usage: node scripts/validate-parity.mjs [--lab ../validation-lab]
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const args=process.argv.slice(2);
const lab=resolve(args.includes('--lab')?args[args.indexOf('--lab')+1]:'../validation-lab');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const local=path=>new URL('../'+path,import.meta.url);
const registry=JSON.parse(await readFile(local('widgets/registry.json'),'utf8'));
const parity=JSON.parse(await readFile(local('widgets/parity.json'),'utf8'));

if(!existsSync(lab)){
  console.log(`Parity: ${parity.entries.length} entries, NONE verified -- validation-lab is not checked out at ${lab}.`);
  process.exit(process.env.FIELDWORK_LAB_OPTIONAL==='1'?0:1);
}
const key=v=>v.split('.').map(Number);
const later=(a,b)=>{const x=key(a),y=key(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
const currentOf=new Map(registry.widgets.map(w=>[w.id,w]));
const retiredNow=id=>{const w=currentOf.get(id);if(!w)return true;
  return JSON.parse(readFileSync(new URL(`../widgets/releases/${w.nodeType}/${w.currentVersion}.json`,import.meta.url),'utf8')).implementationStatus==='retired';};
const behind=[];

let failed=false;
const quiet=process.argv.includes('--quiet');
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
  const widget=currentOf.get(entry.widget);
  if(widget&&!retiredNow(entry.widget)&&!entry.checkedThrough&&entry.checks!=='rulesets'&&later(widget.currentVersion,entry.coversRelease))
    behind.push({label,current:widget.currentVersion,releases:widget.releases.filter(r=>later(r.version,entry.coversRelease)).length});
  if(!quiet||problems.length)console.log(`${label} — ${entry.outcome}`);
  if(!problems.length&&!quiet)console.log(`  verified against ${entry.result} at ${entry.ranAt}`);
  for(const problem of problems)console.log(`  PROBLEM: ${problem}`);
  failed||=problems.length>0;
}

// How old the evidence is, for the lab to act on. Never a failure: see the head of this file.
if(behind.length){
  console.log(`\nChecked at an older release than the current one: ${behind.length} entries.`);
  for(const b of behind)console.log(`  ${b.label}: now ${b.current}, ${b.releases} release${b.releases===1?'':'s'} since`);
}else console.log('\nEvery live widget\'s parity entry covers its current release.');
console.log(`Verified ${parity.entries.length} entries against the lab${failed?', WITH PROBLEMS above':''}.`);
const covered=new Set(parity.entries.map(e=>e.widget));
const uncovered=registry.widgets.filter(w=>!covered.has(w.id));
console.log(`\nParity recorded for ${covered.size} of ${registry.widgets.length} widgets. Without parity:`);
console.log('  '+uncovered.map(w=>w.nodeType).join(', '));
console.log(`Lab pinned at ${parity.lab.commit.slice(0,12)}; this run read a working copy at ${lab}.`);
process.exitCode=failed?1:0;
