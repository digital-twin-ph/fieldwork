/** Caps, enumerable.
 *
 *  The practitioner, 2026-10-22, after meeting six of them one at a time: *"Where are these caps
 *  coming from? It seems from the outset of trying to use this widget there are caps left and
 *  right."* and *"I have wasted 2 days with these caps."*
 *
 *  They came from accretion. Each was added when the thing it bounded was small, written as a
 *  constant with a comment, and nothing could list them. Blockers and directions have had a
 *  ledger, a clock and a validator since 2026-10-12; caps had a prose inventory that listed some
 *  of them. This gives them the same teeth:
 *
 *    * every magnitude constant in a watched file must be declared in widgets/caps.json,
 *    * every declaration must say what it refuses and where its number came from,
 *    * a chosen number must say it was chosen and carry the test that would replace it,
 *    * and every cap must exist in the ontology, so a receipt can name the ones that governed a
 *      run and a reader can ask what they are.
 *
 *  Usage: node scripts/validate-caps.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname;
const ledger=JSON.parse(readFileSync(`${root}/widgets/caps.json`,'utf8'));
const ontology=readFileSync(`${root}/ontology/fieldwork.ttl`,'utf8');
const BASIS=new Set(Object.keys(ledger.basisVocabulary));
const KIND=new Set(Object.keys(ledger.kindVocabulary));
const CONSTANT=/^export const ([A-Z][A-Z0-9_]*)\s*=\s*([0-9][0-9_.]*)\s*;/gm;

const problems=[];
const declared=new Map(ledger.caps.map(cap=>[cap.constant,cap]));
const seen=new Set();

for(const file of ledger.watchedFiles){
  const source=readFileSync(`${root}/${file}`,'utf8');
  for(const [,name,literal] of source.matchAll(CONSTANT)){
    seen.add(name);
    const cap=declared.get(name);
    if(!cap){
      problems.push(`${file} exports \`${name}\`, a number that is not declared in `
        +`widgets/caps.json. A magnitude nobody can enumerate is one a practitioner meets by `
        +`being refused. Declare it, with where the number came from and what it refuses.`);
      continue;
    }
    const value=Number(literal.replace(/_/g,''));
    if(value!==cap.value)
      problems.push(`\`${name}\` is ${value.toLocaleString('en')} in ${file} and `
        +`${cap.value.toLocaleString('en')} in widgets/caps.json. The ledger describes a number `
        +`that is not the one in force.`);
  }
}

for(const cap of ledger.caps){
  const at=cap.id??JSON.stringify(cap).slice(0,40);
  if(!seen.has(cap.constant))
    problems.push(`${at} declares \`${cap.constant}\`, which no watched file exports. A cap that `
      +`governs nothing should be removed, or its file added to watchedFiles.`);
  if(!BASIS.has(cap.basis))
    problems.push(`${at}: basis "${cap.basis}" is not one of ${[...BASIS].join(', ')}.`);
  for(const field of ['evidence','refuses','liftTest'])
    if(!cap[field]?.trim())
      problems.push(`${at} does not say its \`${field}\`. A number without one is the kind that `
        +`costs somebody two days.`);
  if(cap.kind==='discovery'&&cap.basis==='undderived'&&/not applicable/i.test(cap.liftTest))
    problems.push(`${at} bounds DISCOVERY, its number was chosen, and its liftTest is "not `
      +`applicable". A chosen limit on what can be found out is exactly the kind that needs the `
      +`measurement that would replace it.`);
  if(!KIND.has(cap.kind))
    problems.push(`${at}: kind "${cap.kind}" is not one of ${[...KIND].join(', ')}. The question is `
      +`whether it bounds something this application makes, something the platform imposes, or `
      +`what a practitioner can find out.`);
  if(cap.kind!=='discovery'&&cap.basis==='undderived'&&/not applicable/i.test(cap.liftTest)){/* an artefact we choose may be chosen */}
  if(!cap.iri?.startsWith('urn:fieldwork:cap:'))
    problems.push(`${at} has no urn:fieldwork:cap: IRI, so no receipt can name it.`);
  else if(!ontology.includes(`<${cap.iri}>`))
    problems.push(`${at} is not in ontology/fieldwork.ttl as <${cap.iri}>. The practitioner asked `
      +`for caps to be queryable in the ontology and the receipts; a cap only a validator can see `
      +`is not.`);
}

if(problems.length){
  console.error(`\nCaps: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
// THE RATCHET, and it is deliberately not about caps in general. A limit on a drawing this
// application makes is reasonable by construction; a limit on what a practitioner can find out
// decides, in advance, the answer to a question this project exists to ask. Only the second kind
// is counted, and only where the number was chosen rather than measured.
// WIDENED 2026-10-22, from chosen numbers alone to every discovery cap that is not a
// measurement. `attempt-seconds` was classified exactly right -- discovery, derived, with a
// liftTest naming the measurement that would replace it -- and it still spent three days
// aborting a working province download, because `derived` was not counted here. The
// practitioner: "That is the definition of an unreasonable cap, which I thought we know how to
// classify already." We did. Classifying it was not the same as being held to it.
const chosenDiscovery=ledger.caps.filter(c=>c.kind==='discovery'&&c.basis!=='measured');
if(chosenDiscovery.length>ledger.chosenDiscoveryCeiling)
  problems.push(`${chosenDiscovery.length} discovery caps rest on a number nobody measured here, against a ceiling `
    +`of ${ledger.chosenDiscoveryCeiling}: ${chosenDiscovery.map(c=>c.id).join(', ')}. `
    +`${ledger.ceilingRule}`);
if(chosenDiscovery.length<ledger.chosenDiscoveryCeiling)
  problems.push(`${chosenDiscovery.length} discovery caps rest on a number nobody measured here and the ceiling is `
    +`${ledger.chosenDiscoveryCeiling}. Lower it: a ceiling above the measurement is room to grow back into.`);
const counts=Object.fromEntries([...BASIS].map(b=>[b,ledger.caps.filter(c=>c.basis===b).length]));
const refusing=ledger.caps.filter(c=>!/^nothing/i.test(c.refuses)).length;
const byKind=Object.fromEntries([...KIND].map(k=>[k,ledger.caps.filter(c=>c.kind===k).length]));
console.log(`Caps: ${ledger.caps.length} declared and in the ontology — `
  +Object.entries(byKind).map(([k,n])=>`${n} ${k}`).join(', ')+'; '
  +Object.entries(counts).map(([b,n])=>`${n} ${b}`).join(', ')
  +`. ${refusing} can refuse a practitioner's work.`);
for(const cap of chosenDiscovery)
  console.log(`  bounds discovery, unmeasured (ceiling ${ledger.chosenDiscoveryCeiling}): `
    +`${cap.id} = ${cap.value.toLocaleString('en')} ${cap.unit} — ${cap.liftTest}`);
