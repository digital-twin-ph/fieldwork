// Gate step: no term the application asserts may be undeclared in the ontology, except
// the ones recorded as debt in ontology/coupling-debt.json. The debt count is a ratchet:
// it may fall and may not rise, and a term declared properly must be removed from it.
import {readFile,writeFile} from 'node:fs/promises';
import {declaredTerms,emittedTerms,undeclared} from './ontology-coupling.mjs';

const debt=JSON.parse(await readFile('ontology/coupling-debt.json','utf8'));
const declared=await declaredTerms();
const emitted=await emittedTerms();
const open=undeclared(emitted,declared);
const known=new Set(debt.terms.map(t=>t.term));

const appeared=open.filter(t=>!known.has(t.term));
const settled=[...known].filter(term=>!open.some(t=>t.term===term)).sort();

for(const t of appeared)
  console.error(`  undeclared: fw:${t.term} (${t.kind}) asserted by ${t.modules.join(', ')}`);
for(const term of settled)
  console.error(`  settled: fw:${term} is declared now and must be removed from the debt list`);

if(process.argv.includes('--write')){
  await writeFile('ontology/coupling-debt.json',JSON.stringify({...debt,
    measuredAt:new Date().toISOString().slice(0,10),terms:open},null,1)+'\n');
  console.log(`Rewrote the debt list: ${open.length} undeclared terms.`);
} else if(appeared.length||settled.length){
  throw new Error(`${appeared.length} newly undeclared term${appeared.length===1?'':'s'} and `
    +`${settled.length} settled one${settled.length===1?'':'s'}. Declare the term in the ontology, `
    +`or run "node scripts/validate-ontology-coupling.mjs --write" to record the change.`);
}

// Per-widget term counts. A widget asserting more terms produces larger receipts and more
// work for anything reasoning over them, so growth is worth seeing in the gate output
// rather than discovering from a slow run. A static count is a proxy for that and not a
// measurement of it: a term inside a loop is asserted once per record.
const perModule=new Map();
for(const [term,modules] of emitted)for(const module of modules){
  if(!perModule.has(module))perModule.set(module,new Set());
  perModule.get(module).add(term);
}
const heaviest=[...perModule].sort((a,b)=>b[1].size-a[1].size).slice(0,5);
console.log(`Ontology coupling: ${emitted.size} terms asserted, ${declared.typed.size} typed in the ontology, `
  +`${open.length} undeclared (debt recorded ${debt.measuredAt}).`);
console.log(`  heaviest assertors: ${heaviest.map(([m,t])=>`${m} ${t.size}`).join(', ')}`);
