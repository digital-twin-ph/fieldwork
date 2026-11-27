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
 *  Usage: node scripts/measure-surface-prose.mjs [--at <git revision>] [--list]
 *    --at    reads the files as they were at that revision, for a before and after.
 *    --list  prints each flagged string.
 */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const root=new URL('..',import.meta.url).pathname;
const args=process.argv.slice(2);
const at=args.includes('--at')?args[args.indexOf('--at')+1]:null;
const list=args.includes('--list');
const read=file=>at?execFileSync('git',['show',`${at}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:64<<20}):readFileSync(`${root}/${file}`,'utf8');

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

const total={strings:0,words:0,flagged:0,flaggedWords:0};
const rows=[];
for(const [surface,file] of SURFACES){
  let source;
  try{source=read(file);}catch{rows.push([surface,file,'not present at that revision']);continue;}
  const seen=new Set(),flagged=[];
  let strings=0,count=0,flaggedWords=0;
  for(const pattern of VISIBLE)for(const m of source.matchAll(pattern)){
    const text=words(m[1]??m[2]??'');
    if(!/[a-z]{3}/i.test(text)||seen.has(text))continue;
    seen.add(text);strings++;
    const n=text.split(/\s+/).length;count+=n;
    const design=text.split(/(?<=[.!?])\s+/).filter(s=>DESIGN.test(s));
    if(design.length){flagged.push(text);flaggedWords+=design.join(' ').split(/\s+/).length;}
  }
  rows.push([surface,file,`${strings} strings, ${count} words; ${flagged.length} use design vocabulary, ${flaggedWords} words in those sentences`]);
  total.strings+=strings;total.words+=count;total.flagged+=flagged.length;total.flaggedWords+=flaggedWords;
  if(list)for(const f of flagged)rows.push(['','',`  · ${f.slice(0,140)}${f.length>140?'…':''}`]);
}
console.log(`Surface prose${at?` at ${at}`:''}: a measure, not a gate.`);
for(const [surface,file,said] of rows)console.log(surface?`  ${surface} (${file}): ${said}`:said);
console.log(`  All: ${total.strings} strings, ${total.words} words; ${total.flagged} use design vocabulary, ${total.flaggedWords} words in those sentences.`);
