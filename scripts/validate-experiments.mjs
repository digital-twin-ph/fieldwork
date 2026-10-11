// Checks that experiment documents carry the form docs/experiments/README.md describes.
//
// Two things a machine can honestly read: a status whose first word is one of a closed
// set, and one spelling of the heading where a document declines to over-claim. The five
// questions the standard is really about are a reading test, and nothing here pretends
// to check them.
//
// Existing documents are debt, listed in docs/experiments/standard-debt.json, and the
// ratchet runs both ways: a document that is not listed must conform, and a listed
// document that now conforms must be removed from the list. Otherwise the list becomes a
// place where conformance goes to be forgotten.
//
// Usage: node scripts/validate-experiments.mjs
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const dir=join(root,'docs/experiments');
const DEBT=join(dir,'standard-debt.json');
const STATUS=['asked','tried','validated','retired'];
const CANONICAL='What this does not establish';
const SPLIT='What this cannot establish';
const CHANGED_OUR_MINDS=/^## What changed our minds\b/m;

const documents=readdirSync(dir).filter(f=>/^\d+-.+\.md$/.test(f)).sort();
const debt=JSON.parse(readFileSync(DEBT,'utf8'));
const listed=new Set(debt.documents);

const problems=[],fixed=[];
let withStatus=0,withCanonical=0,withSplit=0,withMinds=0;

for(const file of documents){
  const text=readFileSync(join(dir,file),'utf8');
  const status=text.match(/^\*\*Status:\*\*\s*(.*)$/m);
  const word=status?status[1].trim().toLowerCase().match(/^[a-z]+/)?.[0]:null;
  const conformingStatus=Boolean(word&&STATUS.includes(word));
  const usesSplit=new RegExp(`^## ${SPLIT}\\b`,'m').test(text);
  const conforms=conformingStatus&&!usesSplit;

  if(conformingStatus)withStatus++;
  if(new RegExp(`^## ${CANONICAL}\\b`,'m').test(text))withCanonical++;
  if(usesSplit)withSplit++;
  if(CHANGED_OUR_MINDS.test(text))withMinds++;

  if(conforms&&listed.has(file))fixed.push(file);
  if(conforms||listed.has(file))continue;
  if(!status)problems.push(`${file}: no "**Status:**" line. Open with one of ${STATUS.join(', ')}, then the prose.`);
  else if(!conformingStatus)problems.push(`${file}: status starts "${word}", which is not one of ${STATUS.join(', ')}. The prose after the word is free; the word is not.`);
  if(usesSplit)problems.push(`${file}: uses "## ${SPLIT}". The one spelling is "## ${CANONICAL}".`);
}

for(const file of fixed)
  problems.push(`${file}: conforms now, so remove it from ${DEBT.replace(root+'/','')}. The debt list only shrinks.`);
for(const file of debt.documents)
  if(!documents.includes(file))problems.push(`${DEBT.replace(root+'/','')} lists ${file}, which does not exist.`);

const conforming=documents.length-listed.size+fixed.length;
console.log(`Experiment documents: ${documents.length}, of which ${conforming} conform and ${listed.size-fixed.length} are recorded as debt.`);
console.log(`  status in the closed vocabulary   ${withStatus}`);
console.log(`  "${CANONICAL}"   ${withCanonical}`);
console.log(`  "${SPLIT}" (to close)   ${withSplit}`);
console.log(`  "What changed our minds"   ${withMinds}`);
if(problems.length){console.error('\n'+problems.join('\n'));process.exit(1);}
