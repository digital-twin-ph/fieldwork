// Stamps every documentation file with the dates git records, and verifies the stamps.
//
// Dates are derived at write time, never typed: a hand-written date drifts the moment the file
// is edited, and a drifted date is worse than none because it still looks authoritative.
//
// Verification deliberately does NOT compare against git. The stamp lives inside the file it
// dates, so writing it is itself a commit: any rule of the form "the stamp equals the date of
// the last commit touching this file" is unsatisfiable by construction, and a gate built on it
// fails immediately after it is satisfied. So the gate checks what can be true — that a stamp
// exists, parses, and is not ordered backwards or dated in the future — and `--write` refreshes
// the dates from history, ignoring commits that changed nothing but a stamp.
//
// Usage: node scripts/stamp-docs.mjs            verify (exit 1 on a problem)
//        node scripts/stamp-docs.mjs --write    refresh the stamps from git history
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const write=process.argv.includes('--write');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
// CHANGELOG is dated by its own release headings; a second date beside them would compete.
const SKIP=new Set(['CHANGELOG.md']);
const STAMP=/^_Created (\d{4}-\d{2}-\d{2}) · Updated (\d{4}-\d{2}-\d{2})_$/;

function markdownFiles(dir,found=[]){
  for(const entry of readdirSync(dir)){
    if(['node_modules','.git','build','test-results','_output'].includes(entry))continue;
    const path=join(dir,entry);
    if(statSync(path).isDirectory())markdownFiles(path,found);
    else if(entry.endsWith('.md')&&!SKIP.has(entry))found.push(relative(root,path));
  }
  return found;
}

/** Commits that changed something other than the stamp line, newest first. */
function substantiveDates(file){
  const entries=git('log','--follow','--format=%H %ad','--date=short','--',file).split('\n').filter(Boolean);
  const dates=[];
  for(const entry of entries){
    const [hash,date]=entry.split(' ');
    let changed=[];
    try{changed=git('show','--format=','--unified=0','--',file,hash).split('\n');}catch{dates.push(date);continue;}
    const content=changed.filter(line=>/^[+-]/.test(line)&&!/^(\+\+\+|---)/.test(line))
      .map(line=>line.slice(1)).filter(line=>line.trim()!=='');
    if(!content.length||content.some(line=>!STAMP.test(line)))dates.push(date);
  }
  return dates.length?dates:entries.map(entry=>entry.split(' ')[1]);
}

const today=new Date().toISOString().slice(0,10);
const files=markdownFiles(root).sort();
const problems=[];
let written=0;

for(const file of files){
  const text=await readFile(join(root,file),'utf8');
  const lines=text.split('\n');
  const heading=lines.findIndex(line=>line.replace(/^\uFEFF/,'').startsWith('# '));
  if(heading<0){problems.push(`${file}: no level-one heading to stamp beneath`);continue;}
  const at=lines.findIndex(line=>STAMP.test(line));

  if(!write){
    if(at<0){problems.push(`${file}: no date stamp under its heading`);continue;}
    const [,created,updated]=STAMP.exec(lines[at]);
    if(created>updated)problems.push(`${file}: created ${created} is later than updated ${updated}`);
    if(updated>today)problems.push(`${file}: updated ${updated} is in the future`);
    continue;
  }

  const dates=substantiveDates(file);
  if(!dates.length)dates.push(today);
  const stamp=`_Created ${dates[dates.length-1]} · Updated ${dates[0]}_`;
  if(at>=0){if(lines[at]===stamp)continue;lines[at]=stamp;}
  else lines.splice(heading+1,0,'',stamp);
  await writeFile(join(root,file),lines.join('\n'));
  written++;
}

if(write){
  for(const problem of problems)console.error(`DOC DATE: ${problem}`);
  console.log(`Stamped ${written} of ${files.length} documentation files from git history.`);
  if(problems.length)process.exitCode=1;
}
else if(problems.length){
  for(const problem of problems)console.error(`DOC DATE: ${problem}`);
  console.error(`\n${problems.length} problem(s). Run: npm run stamp:docs`);
  process.exitCode=1;
}
else console.log(`Documentation dates verified: ${files.length} files carry a plausible stamp.`);
