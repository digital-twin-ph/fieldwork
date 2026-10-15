// The distributed user manual: one page per widget, pointed at from the ontology.
//
// Two things rot here and both are silent. A page gets written and nothing links it, so nobody
// finds it. Or a widget is renamed and its page is not, so fw:userManual resolves to a file that
// does not exist and the graph says documentation is there when it is not. The generated
// ontology/widgets.ttl is the join, and this checks the join is current.
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {coverage,turtle,compiledPages} from './widget-manual.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const ledgerPath=join(root,'widgets/manual-coverage.json');
const ledger=JSON.parse(readFileSync(ledgerPath,'utf8'));
const {live,documented,missing,orphaned}=coverage();
const problems=[];

for(const nodeType of orphaned)
  problems.push(`docs/widgets/${nodeType}.md documents "${nodeType}", which is not a registered widget. A page nobody can reach from the ontology is a page nobody finds.`);

// The generated graph must match what the files say right now.
const generatedPath=join(root,'ontology/widgets.ttl');
if(!existsSync(generatedPath))problems.push('ontology/widgets.ttl is missing. Run `npm run manual:widgets`.');
else if(readFileSync(generatedPath,'utf8')!==turtle())
  problems.push('ontology/widgets.ttl has drifted from widgets/registry.json and docs/widgets/. Run `npm run manual:widgets`.');

// The page a practitioner READS is widgets/manual-pages.json, compiled from the markdown at build
// time, and nothing checked it against its source. So docs/widgets/map_output.md could be rewritten
// -- as it was on 2026-10-15, to say a map has no input mode -- while the Manual button in the
// application went on explaining the Input mode selector that had just been deleted. The
// practitioner read it there: "Manual for Map is not readable for some words", with a screenshot of
// the old page. A generated artefact nothing compares to its source is the defect this project has
// now found often enough to check for by default.
const compiledPath=join(root,'widgets/manual-pages.json');
if(!existsSync(compiledPath))problems.push('widgets/manual-pages.json is missing. Run `npm run manual:widgets`.');
else if(readFileSync(compiledPath,'utf8')!==JSON.stringify(compiledPages(),null,2)+'\n')
  problems.push('widgets/manual-pages.json has drifted from docs/widgets/. The manual shown IN THE '
    +'APPLICATION is the compiled file, so a page edited and not recompiled is a page the '
    +'practitioner never sees. Run `npm run manual:widgets`.');

// A manual is for the person using the widget, not for the people building it. The practitioner,
// 2026-10-15: "The manual should not contain historical / audit / revision history text. It's for
// the human user, not developers or agents ... focus on understanding what the widget is (e.g.,
// type - input, process, output, what it does, ports) and how to use it and point to worked
// examples that exercise it."
//
// The map page had become a design record with a manual wrapped around it: dated removals,
// measured counts, blocker names, quotations. That content is not wrong and is not deleted -- it
// moves to docs/widget-specs/, where the people who need it look. These two checks keep the split.
const MANUAL_SECTIONS=['## What it does','## How to use it'];
const RECORD_MARKERS=[
  [/\b(Removed|Measured|Withdrawn|Corrected|Narrowed|Reworded) \d{4}-\d{2}-\d{2}\b/,'a dated change note'],
  [/\bthe practitioner\b/i,'a quotation of who said what'],
  [/docs\/experiments\//,'a link into the experiment record'],
  [/\bblocker\b/i,'a blocker name'],
];
for(const nodeType of documented){
  const text=readFileSync(join(root,`docs/widgets/${nodeType}.md`),'utf8');
  for(const heading of MANUAL_SECTIONS)
    if(!text.includes(heading))
      problems.push(`docs/widgets/${nodeType}.md has no "${heading}" section. A manual says what the `
        +`widget does and how to use it; a reader who has to infer either is reading a specification.`);
  // The pointer at the bottom is the one allowed mention, and the compiler strips it from the page.
  const body=text.replace(/\n---\n+\*How this widget is built[\s\S]*$/,'');
  for(const [pattern,what] of RECORD_MARKERS)
    if(pattern.test(body))
      problems.push(`docs/widgets/${nodeType}.md contains ${what}. A manual is for the person using `
        +`the widget: no history, no audit trail, no revision notes. That belongs in `
        +`docs/widget-specs/${nodeType}.md, which the manual links to at the end.`);
}

// A page must say something. An empty page satisfies a count and helps nobody.
for(const nodeType of documented){
  const text=readFileSync(join(root,`docs/widgets/${nodeType}.md`),'utf8');
  if(text.trim().length<400)
    problems.push(`docs/widgets/${nodeType}.md is ${text.trim().length} characters. A page that only repeats the title is a worse answer than no page, because it stops anyone writing the real one.`);
  // "What it assumes" was required here until 2026-10-15, when the practitioner set the audience:
  // a manual is for the person using the widget. An assumption that changes what they should do
  // belongs under "What it will not do", in their terms; an assumption about how the widget is
  // built belongs in docs/widget-specs/. The requirement moved rather than being dropped.
  if(!/^##\s+What it will not do/m.test(text))
    problems.push(`docs/widgets/${nodeType}.md has no "What it will not do" section. A reader needs `
      +`the limits that change what THEY should do, in plain words -- not the widget's internal `
      +`assumptions, which belong in docs/widget-specs/${nodeType}.md.`);
}

// The gap may close and may never widen.
if(missing.length>ledger.undocumentedCeiling)
  problems.push(`${missing.length} widgets have no manual page, against a ceiling of ${ledger.undocumentedCeiling}. Write a page, or lower the ceiling with a reason in the same commit.`);

console.log(`Widget manual: ${documented.length} of ${live.length} documented, ${missing.length} without a page (ceiling ${ledger.undocumentedCeiling}).`);
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
