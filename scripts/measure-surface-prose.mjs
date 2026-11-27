/** HOW MUCH DESIGN EXPLANATION EACH SURFACE SHOWS, measured, never gated (Comprehensibility 1, 2026-11-07; the
 *  commentary sweep's measure, 2026-11-27). The practitioner: *"The UI should be intuitive enough that it does not need
 *  commentary text. Commentary text about design belongs in design documents not the UI."*
 *
 *  `validate-inspector-prose` scores the Inspector's paragraphs. This reads the other surfaces the sweep works through,
 *  and for each counts the strings a reader sees -- paragraphs, small print, muted lines, tooltips, placeholders and
 *  text set by the code -- and the words in those whose sentences use design or project vocabulary: the reasoning
 *  engine's terms, the note kinds' terms, development words. It reports; it never fails the gate. A count is a route to
 *  the strings a human should read, not a verdict on them: "N3 & evidence" is a tab's name the naming review holds, and
 *  is counted all the same.
 *
 *  A SOURCE SCAN, NOT A RENDERING (PR 9's review, 2026-11-27). It reads the strings as the source writes them, so a
 *  string the code assembles from pieces is not seen whole: a match holding code (`=>`, `as const`, a backtick, a
 *  method call) is a fragment of an expression, set aside and counted apart, never as words a reader sees. What a
 *  surface shows in a given state is a browser's to measure; this routes a human to the strings to read.
 *
 *  Usage: node scripts/measure-surface-prose.mjs [--at <git revision>] [--list]
 *    --at    reads the files as they were at that revision, for a before and after.
 *    --list  prints each flagged string.
 */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const root=new URL('..',import.meta.url).pathname;
const args=process.argv.slice(2);
const list=args.includes('--list');
const fail=said=>{console.error(said);process.exit(2);};
// A REVISION IS REQUIRED WITH --at, AND MUST BE ONE: a missing or mistyped one read the working tree, or printed an
// all-zero report and passed (PR 9's review).
let at=null;
if(args.includes('--at')){
  at=args[args.indexOf('--at')+1];
  if(!at||at.startsWith('--'))fail('--at needs a git revision, such as --at 095edd53.');
  try{execFileSync('git',['rev-parse','--verify','--quiet',`${at}^{commit}`],{cwd:root,stdio:'ignore'});}
  catch{fail(`--at ${at}: not a commit in this repository.`);}
}
// ABSENT AT THAT REVISION is said as absent; any other failure to read stops the scan.
const present=file=>{try{execFileSync('git',['cat-file','-e',`${at}:${file}`],{cwd:root,stdio:'ignore'});return true;}catch{return false;}};
const read=file=>{
  if(!at)return readFileSync(`${root}/${file}`,'utf8');
  if(!present(file))return null;
  return execFileSync('git',['show',`${at}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:64<<20});
};
// CODE, NOT TEXT: the signs of an expression caught between two quotes.
const CODE=/=>|\bas const\b|`|\.(?:map|join|filter|length)\b|\(\[|\]\)|\+\(/;

const SURFACES=[
  ['Header, bars, tabs and empty states','index.html'],
  ['Notes tab','src/notes-ui.ts'],
  ['Workflow, library and Results','src/app.ts'],
];
// WHAT A READER SEES. An interpolation becomes one token, a tag a space, an entity a space.
const VISIBLE=[
  /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g,
  /<small(?:\s[^>]*)?>([\s\S]*?)<\/small>/g,
  /<span class="muted"[^>]*>([\s\S]*?)<\/span>/g,
  /\btitle="([^"]{8,})"/g,
  /\bplaceholder="([^"]{4,})"/g,
  /\.(?:textContent|placeholder|title)=(?:'([^'\n]{8,})'|"([^"\n]{8,})")/g,
];
const words=t=>t.replace(/\$\{[^}]*\}/g,'X').replace(/<[^>]*>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\\u[0-9a-f]{4}/gi,' ')
  .replace(/\s+/g,' ').trim();
// DESIGN OR PROJECT VOCABULARY: the engine's (N3, inference, facts and rules), the note kinds' (machined, derived), and
// development words. Whole words, any case.
const DESIGN=/\b(N3|inference|inferred|explicit rules?|generated facts|machined|derived|authored|reveal rule|experiment|prototype|we|for now|currently|not yet implemented|planned|by design|deliberately|on purpose|SHACL|RDF|ontology)\b/i;

const total={strings:0,words:0,flagged:0,flaggedWords:0,fragments:0};
const rows=[];
for(const [surface,file] of SURFACES){
  const source=read(file);
  if(source===null){rows.push([surface,file,'absent at that revision']);continue;}
  const seen=new Set(),flagged=[];
  let strings=0,count=0,flaggedWords=0,fragments=0;
  for(const pattern of VISIBLE)for(const m of source.matchAll(pattern)){
    const raw=m[1]??m[2]??'';
    if(CODE.test(raw)){fragments++;continue;}
    const text=words(raw);
    if(!/[a-z]{3}/i.test(text)||seen.has(text))continue;
    seen.add(text);strings++;
    const n=text.split(/\s+/).length;count+=n;
    const design=text.split(/(?<=[.!?])\s+/).filter(s=>DESIGN.test(s));
    if(design.length){flagged.push(text);flaggedWords+=design.join(' ').split(/\s+/).length;}
  }
  rows.push([surface,file,`${strings} strings, ${count} words; ${flagged.length} use design vocabulary, ${flaggedWords} words in those sentences; ${fragments} code fragments set aside`]);
  total.strings+=strings;total.words+=count;total.flagged+=flagged.length;total.flaggedWords+=flaggedWords;total.fragments+=fragments;
  if(list)for(const f of flagged)rows.push(['','',`  · ${f.slice(0,140)}${f.length>140?'…':''}`]);
}
console.log(`Surface prose${at?` at ${at}`:''}: a source scan and a measure, not a gate.`);
for(const [surface,file,said] of rows)console.log(surface?`  ${surface} (${file}): ${said}`:said);
console.log(`  All: ${total.strings} strings, ${total.words} words; ${total.flagged} use design vocabulary, ${total.flaggedWords} words in those sentences; ${total.fragments} code fragments set aside.`);
