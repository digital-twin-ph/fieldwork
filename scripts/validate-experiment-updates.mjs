// An update table may be APPENDED to and never rewritten.
//
// That is the whole value of it. A history anyone can edit is a history that says whatever the
// last author wanted it to say, and the thing it exists to resist -- a sweep quietly rewriting
// what happened -- is exactly the kind of change that looks harmless in a diff. So the rows that
// were in HEAD must still be there, unchanged and in order, as a prefix of the rows now.
//
// Dates must not go backwards, because a table that can be reordered cannot be read as a sequence.
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {files,tableOf,HEADING} from './experiment-updates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const ledger=JSON.parse(readFileSync(join(root,'docs/experiments/update-tables.json'),'utf8'));
const problems=[];

const committed=file=>{
  try{return execFileSync('git',['show',`HEAD:docs/experiments/${file}`],{cwd:root,encoding:'utf8'});}
  catch{return null;}
};
const rowsOf=text=>(tableOf(text)||[]).filter(l=>!/^\|\s*-+\s*\|/.test(l)&&!/^\|\s*Date\s*\|/.test(l));
const dateOf=row=>(row.match(/^\|\s*(\d{4}-\d{2}-\d{2})/)||[])[1];

let withTable=0;
for(const file of files()){
  const text=readFileSync(join(root,'docs/experiments',file),'utf8');
  if(!text.includes(HEADING))continue;
  withTable++;
  const rows=rowsOf(text);

  for(const row of rows)
    if(!dateOf(row))problems.push(`${file}: an update row does not start with a date: ${row.slice(0,60)}`);
  const dates=rows.map(dateOf).filter(Boolean);
  for(let i=1;i<dates.length;i++)
    if(dates[i]<dates[i-1])problems.push(`${file}: update dates go backwards, ${dates[i-1]} then ${dates[i]}. The table is a sequence.`);

  const before=committed(file);
  if(before&&before.includes(HEADING)){
    const old=rowsOf(before);
    for(let i=0;i<old.length;i++)
      if(rows[i]!==old[i]){
        problems.push(`${file}: update row ${i+1} was rewritten. It read\n      ${old[i]}\n    and now reads\n      ${rows[i]??'(removed)'}\n    An update table is appended to, never edited: what happened does not change.`);
        break;
      }
  }
  // The stamp must agree with the last thing that happened.
  const stamp=(text.match(/Updated (\d{4}-\d{2}-\d{2})_/)||[])[1];
  const last=dates[dates.length-1];
  if(stamp&&last&&stamp<last)
    problems.push(`${file}: the Updated stamp says ${stamp} and the last update row says ${last}.`);
}

if(withTable<ledger.floor)
  problems.push(`${withTable} experiments carry an update table, below the floor of ${ledger.floor}. The floor may rise and never fall: a table once added is not removed.`);

console.log(`Experiment updates: ${withTable} of ${files().length} carry a table (floor ${ledger.floor}).`);
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
