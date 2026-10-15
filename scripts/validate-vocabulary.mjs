// Withdrawn vocabulary, counted and held to a ceiling that can only fall.
//
// "We have been loose with terminology here when precision and accuracy are important." Measured
// on 2026-10-14, the complaint was exactly right: `carrier` and `carrier kind` were withdrawn on
// 2026-10-12, the withdrawal was written into the glossary, and 173 occurrences across 51 files
// survived it -- including six source files and a use I added myself two days later. A
// withdrawal that lives only in prose withdraws nothing. This project's own rule: mechanised
// rules enforce, prose rules describe.
//
// It is a CEILING and not a sweep. Many occurrences are inside dated records of what was thought
// at the time -- "the carrier question that stopped the decomposition in experiment 82" is
// evidence about a day in October, and rewriting it would destroy the thing the record exists
// for. The ceiling lets those stand while making a NEW use fail the build, which is the only use
// anybody can still prevent.
//
// Usage: node scripts/validate-vocabulary.mjs [--write]
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const LEDGER='docs/withdrawn-vocabulary.json';
const SEARCHED=['docs','src','widgets','ontology','rulesets','compositions','tests','scripts'];
const EXTENSIONS=/\.(md|ts|tsx|json|ttl|mjs)$/;
// The glossary states the withdrawal, this file enforces it, and the ledger lists the debt. All
// three have to name the term to do their job.
// widgets/release-notes.json is GENERATED from the release files, which are dated records whose
// text may not be reworded -- a withdrawn term inside one is evidence of what was thought then.
// Counting the generated mirror counts the same eleven words twice and would push the ceiling up
// for prose nobody wrote today, so the source is counted and the copy is not. Added 2026-10-15.
const EXEMPT=new Set(['docs/glossary.md',LEDGER,'scripts/validate-vocabulary.mjs',
  'widgets/release-notes.json',
  // docs/directions.json tracks the withdrawal itself -- what it requires, and what checking it
  // found -- and cannot do that without naming the term, for the same reason the glossary and the
  // ledger cannot. Added 2026-10-15, when the practitioner pointed at this very debt as the same
  // failure as the map model: a decision recorded and not carried out.
  'docs/directions.json']);

const walk=dir=>{
  let out=[];
  for(const entry of readdirSync(root+dir)){
    const path=`${dir}/${entry}`;
    if(statSync(root+path).isDirectory()){out=out.concat(walk(path));continue;}
    if(EXTENSIONS.test(entry))out.push(path);
  }
  return out;
};
const ledger=JSON.parse(readFileSync(root+LEDGER,'utf8'));
const files=SEARCHED.flatMap(walk).filter(f=>!EXEMPT.has(f)).sort();
const counts={},problems=[];
let total=0;
for(const term of ledger.terms){
  const pattern=new RegExp(term.pattern,'gi');
  let termTotal=0;
  for(const file of files){
    const hits=(readFileSync(root+file,'utf8').match(pattern)||[]).length;
    if(!hits)continue;
    termTotal+=hits;
    counts[file]=(counts[file]||0)+hits;
  }
  total+=termTotal;
  if(termTotal>term.ceiling)
    problems.push(`"${term.term}" was withdrawn ${term.withdrawn} and appears ${termTotal} times, `
      +`above the ceiling of ${term.ceiling}. Say ${term.insteadSay} instead. `
      +`The ceiling may be lowered and never raised.`);
}
if(process.argv.includes('--write')){
  for(const term of ledger.terms){
    const pattern=new RegExp(term.pattern,'gi');
    term.ceiling=files.reduce((sum,file)=>sum+(readFileSync(root+file,'utf8').match(pattern)||[]).length,0);
  }
  ledger.measuredAt=new Date().toISOString().slice(0,10);
  writeFileSync(root+LEDGER,JSON.stringify(ledger,null,1)+'\n');
  console.log(`Recorded: ${ledger.terms.map(t=>`${t.term} ${t.ceiling}`).join(', ')}`);
}
console.log(`Withdrawn vocabulary: ${total} occurrence(s) of ${ledger.terms.length} withdrawn term(s) `
  +`across ${Object.keys(counts).length} files (ceiling ${ledger.terms.reduce((s,t)=>s+t.ceiling,0)}).`);
const worst=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
if(worst.length)console.log('  heaviest: '+worst.map(([f,n])=>`${f} ${n}`).join(', '));
if(problems.length){
  console.log();
  for(const problem of problems)console.log(`  • ${problem}`);
  process.exit(1);
}
