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
// An `asked` or `tried` document is an open position. Without a stated closing condition it sits
// open while the thing it half-did gets re-derived -- which is how 93 re-derived 27 and 102
// re-derived the widget audit. Counted, not yet gated, because 87 documents predate the standard.
const WOULD_CLOSE=/^## (What would close (it|this)|What would close)\b/m;
// A closing condition has to be executable in the phase this project is in. Four documents had
// named a practitioner who did not write them saying what they concluded -- real questions, and
// unanswerable without field testing, which this project has not reached. The effect is a
// document parked under a word that claims it is waiting on work. The practitioner, 2026-10-15:
// "That is not an experiment question."
//
// Matched inside the closing section only, so the same sentence stays legal everywhere else: a
// document may and should discuss what a practitioner would do with the thing it built. What it
// may not do is make that its condition for closing. A field question goes in
// docs/field-questions.md, and a restated condition may cite it -- hence the link exemption.
const DEFERS_TO_OBSERVATION=/practitioner who did not write|someone who did not write|watch(?:ing|ed)? (?:a|one) practitioner|(?:needs|requires) field test/i;
const CITES_FIELD_QUESTIONS=/field-questions\.md/;
const closingSection=text=>{
  const start=text.search(WOULD_CLOSE);
  if(start<0)return '';
  const rest=text.slice(start+1);
  const next=rest.search(/^## /m);
  return next<0?rest:rest.slice(0,next);
};

const documents=readdirSync(dir).filter(f=>/^\d+-.+\.md$/.test(f)).sort();
const debt=JSON.parse(readFileSync(DEBT,'utf8'));
const listed=new Set(debt.documents);

const problems=[],fixed=[];
let withStatus=0,withCanonical=0,withSplit=0,withMinds=0,open=0,openWithClosing=0;

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
  if(word==='asked'||word==='tried'){open++;if(WOULD_CLOSE.test(text))openWithClosing++;}
  const closing=closingSection(text);
  if(closing&&DEFERS_TO_OBSERVATION.test(closing)&&!CITES_FIELD_QUESTIONS.test(closing))
    problems.push(`${file}: its closing condition waits on a practitioner observation, which this `
      +`project cannot execute -- field testing is a phase it has not reached. State what `
      +`measurement, code or decision closes it, and move the observation to docs/field-questions.md.`);

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
console.log(`  open (asked or tried)   ${open}, of which ${openWithClosing} say what would close them`);
if(problems.length){console.error('\n'+problems.join('\n'));process.exit(1);}
