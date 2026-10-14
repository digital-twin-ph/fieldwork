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
const lab=join(root,'../validation-lab/content');
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

console.log(`Dive Deeper: ${verified} notebooks verified against the lab, ${withSection} carrying the declared section.`);
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
