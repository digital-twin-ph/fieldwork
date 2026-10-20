// Every Dive Deeper link a widget offers has to reach a section that exists.
//
// The practitioner asked on 2026-10-14 how to see the Deeper Dive notebooks from each widget.
// The answer was that fourteen of the fifteen were reachable from nothing. Links were added; this
// is what stops them rotting, because a link to a renamed notebook fails in the practitioner's
// browser and nowhere else -- the application has no way to know the lab moved.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const parity=JSON.parse(readFileSync(join(root,'widgets/parity.json'),'utf8'));
const ledger=JSON.parse(readFileSync(join(root,'widgets/dive-deeper.json'),'utf8'));
const lab=join(root,'../validation-lab/content');
// The second repository, from 2026-10-20. A lesson and a parity check answer to different
// readers, so they no longer share a notebook or a pin: see docs/experiments/94. What lives here
// is checked the same way -- a link that 404s in a practitioner's browser fails nowhere else.
const deeper=join(root,'../dive-deeper/content');
const problems=[];
const entries=parity.entries.filter(e=>e.notebook);

for(const entry of parity.entries){
  const widget=entry.widget.split(':').pop();
  if(!entry.notebook)problems.push(`${widget}: parity entry "${entry.check}" names no notebook, so the check it reports cannot be opened.`);
  if(entry.diveDeeper&&!entry.notebook)problems.push(`${widget}: declares a Dive Deeper section with no notebook to find it in.`);
}

if(!existsSync(lab)){
  // Not a pass. The links are unverified and the output says so by name.
  console.log(`Dive Deeper: ${entries.length} notebooks referenced, NONE verified -- validation-lab is not checked out beside this repository.`);
  if(problems.length){for(const p of problems)console.error('  • '+p);process.exit(1);}
  process.exit(process.env.FIELDWORK_LAB_OPTIONAL==='1'?0:1);
}

const present=new Set(readdirSync(lab).filter(f=>f.endsWith('.ipynb')));
let verified=0,withSection=0;
for(const entry of entries){
  const widget=entry.widget.split(':').pop();
  if(!present.has(entry.notebook)){
    problems.push(`${widget}: names ${entry.notebook}, which the lab does not have. The link would 404 in a practitioner's browser and nowhere else.`);
    continue;
  }
  verified++;
  if(!entry.diveDeeper)continue;
  const cells=JSON.parse(readFileSync(join(lab,entry.notebook),'utf8')).cells.map(c=>c.source.join(''));
  const headings=cells.flatMap(c=>c.split('\n')).filter(line=>line.startsWith('## Dive deeper')).map(line=>line.slice(3).trim());
  if(!headings.includes(entry.diveDeeper))
    problems.push(`${widget}: declares the section "${entry.diveDeeper}", which ${entry.notebook} does not carry. It has ${headings.length?headings.map(h=>JSON.stringify(h)).join(', '):'no Dive deeper section at all'}.`);
  else withSection++;
}

// A notebook that teaches something and is reachable from no widget is the defect this started as.
const linked=new Set(entries.filter(e=>e.diveDeeper).map(e=>e.notebook));
for(const notebook of [...present].sort()){
  if(linked.has(notebook))continue;
  const cells=JSON.parse(readFileSync(join(lab,notebook),'utf8')).cells.map(c=>c.source.join(''));
  if(cells.some(c=>c.includes('## Dive deeper')))
    problems.push(`${notebook} carries a Dive Deeper section and no widget links it. Record it on the widget's parity entry, or the explanation is written and unreachable.`);
}

// The lessons in their own repository: each entry names a notebook that has to exist, and each
// notebook has to be reachable from a widget.
let lessons=0;
if(!existsSync(deeper)){
  console.log(`Dive Deeper lessons: ${ledger.entries.length} referenced, NONE verified -- dive-deeper is not checked out beside this repository.`);
  if(process.env.FIELDWORK_LAB_OPTIONAL!=='1')problems.push('dive-deeper is not checked out, so no lesson link is verified.');
}else{
  const lessonFiles=new Set(readdirSync(deeper).filter(f=>f.endsWith('.ipynb')));
  const named=new Set();
  for(const entry of ledger.entries){
    const widget=entry.widget.split(':').pop();
    named.add(entry.notebook);
    if(!entry.notebook||!entry.title?.trim()||!entry.teaches?.trim())
      problems.push(`${widget}: a lesson entry needs a notebook, a title and what it teaches.`);
    else if(!lessonFiles.has(entry.notebook))
      problems.push(`${widget}: names ${entry.notebook}, which dive-deeper does not have. The link would 404 in a practitioner's browser and nowhere else.`);
    else lessons++;
  }
  for(const notebook of [...lessonFiles].sort())
    if(!named.has(notebook))
      problems.push(`${notebook} is in dive-deeper and no widget links it. Record it in widgets/dive-deeper.json, or the lesson is written and unreachable.`);
}

// The ratchet on what is still in the wrong repository. It may fall and never rise.
const legacy=parity.entries.filter(entry=>entry.diveDeeper).length;
if(legacy>ledger.legacyCeiling)
  problems.push(`${legacy} Dive Deeper sections still live inside lab notebooks, against a ceiling of ${ledger.legacyCeiling}. Rewriting one against the pedagogical requirements moves it to dive-deeper and lowers this; nothing may raise it.`);

console.log(`Dive Deeper: ${lessons} lesson(s) verified in dive-deeper; ${verified} lab notebooks verified, ${withSection} carrying the declared section (legacy ${legacy} of ceiling ${ledger.legacyCeiling}).`);
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
