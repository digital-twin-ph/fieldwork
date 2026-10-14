// The update table an experiment carries: what happened to it, and when, appended and never
// overwritten.
//
// The practitioner's point of 2026-10-14, after asking whether the experiments are heading
// anywhere: a single `Updated` stamp cannot answer that. It says a file changed, not whether the
// thinking moved, and it is destroyed by any sweep that touches the file -- which is exactly what
// happened the day before, when a date-stamp correction rewrote `Updated` on 50 experiments and
// made twelve that had not been thought about in three days look current.
//
// A table of dated rows survives that. It also makes "heading nowhere" visible per experiment: an
// entry opened in one row and never added to is a question nobody has returned to.
//
// Existing history is SEEDED FROM GIT, because it is already recorded there and transcribing it by
// hand would be inventing it. A seeded row names the commit that made the change.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,basename} from 'node:path';
import {readdirSync} from 'node:fs';

const root=fileURLToPath(new URL('../',import.meta.url));
export const HEADING='## Updates';
const SWEEPS=[/^Correct documentation dates/,/^Stamp /,/stamp:docs/];

export const files=()=>readdirSync(join(root,'docs/experiments'))
  .filter(f=>/^\d+-.+\.md$/.test(f)).sort();

/** One row per commit that changed the file, oldest first, with sweeps left out: a commit that
 *  only rewrote a date stamp is not something that happened to the experiment. */
export function historyOf(file){
  const out=execFileSync('git',['log','--format=%ad\u0001%s','--date=short','--reverse','--',
    `docs/experiments/${file}`],{cwd:root,encoding:'utf8'}).trim();
  if(!out)return [];
  return out.split('\n').map(line=>{
    const [date,subject]=line.split('\u0001');
    return {date,subject};
  }).filter(r=>!SWEEPS.some(rx=>rx.test(r.subject)));
}

export const tableOf=text=>{
  const at=text.indexOf(HEADING);
  if(at<0)return null;
  return text.slice(at).split('\n').filter(l=>/^\|/.test(l));
};

export function seed(file){
  const path=join(root,'docs/experiments',file);
  const text=readFileSync(path,'utf8');
  if(text.includes(HEADING))return {file,skipped:'already has one'};
  const rows=historyOf(file);
  if(!rows.length)return {file,skipped:'no history'};
  const body=['',HEADING,'',
    '_Appended, never rewritten. Rows before this table existed are seeded from the commits that',
    'changed this file; a date stamp sweep is not an update._','',
    '| Date | What happened |','| --- | --- |',
    ...rows.map(r=>`| ${r.date} | ${r.subject.replace(/\|/g,'\\|')} |`),''].join('\n');
  writeFileSync(path,text.replace(/\s*$/,'\n')+body);
  return {file,rows:rows.length};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const only=process.argv.find(a=>/^\d+-/.test(a));
  const list=only?[only]:files();
  let seeded=0,skipped=0;
  for(const f of list){
    const r=process.argv.includes('--write')?seed(f):{file:f,rows:historyOf(f).length};
    if(r.skipped)skipped++;else seeded++;
  }
  console.log(process.argv.includes('--write')
    ?`Update tables: ${seeded} seeded, ${skipped} already had one or had no history.`
    :`Would seed ${seeded} of ${list.length} experiments (${skipped} skipped).`);
}
