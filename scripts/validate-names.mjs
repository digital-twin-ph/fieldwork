import {readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {table} from './widget-names.mjs';

// The teeth on the human review. A name is a public identifier saved workflows carry, so a widget
// reaching the palette without a practitioner having read its name is the same kind of gap as a
// convention recorded only in prose: nothing is wrong yet and nothing is checked.

export function validateNames({rows,review}){
  const problems=[];
  const byType=new Map((review.reviews??[]).map(r=>[r.nodeType,r]));
  const VERDICTS=new Set(['accepted','flagged','pending']);

  for(const row of rows){
    const entry=byType.get(row.nodeType);
    if(!entry){
      problems.push(`\`${row.nodeType}\` ("${row.title}") has no entry in widgets/name-review.json. `
        +`A new widget's name is reviewed before it ships: run \`npm run names:widgets\`, read the `
        +`row in docs/widget-names.md, and record a verdict.`);
      continue;
    }
    if(!VERDICTS.has(entry.verdict))
      problems.push(`\`${row.nodeType}\` carries the verdict "${entry.verdict}", which is not one of `
        +`${[...VERDICTS].join(', ')}.`);
    // A review is of the identifier, the palette words and the group together. Changing one
    // without re-reading the other two is how "Reproject input" survived under Sources.
    if(entry.fingerprint!==row.fingerprint)
      problems.push(`\`${row.nodeType}\` was reviewed as "${entry.title}" under ${entry.group}; it is `
        +`now "${row.title}" under ${row.group}. The review is stale -- re-read the row and update `
        +`the entry, including its fingerprint.`);
    if(entry.verdict==='flagged'&&!entry.note)
      problems.push(`\`${row.nodeType}\` is flagged with no note. A flag a reader cannot act on is `
        +`not a review.`);
    if(entry.verdict==='accepted'&&!(entry.reviewed&&entry.reviewedBy))
      problems.push(`\`${row.nodeType}\` is accepted without a reviewer and a date. An acceptance `
        +`nobody signed is not a review.`);
  }

  for(const entry of review.reviews??[])
    if(!rows.some(row=>row.nodeType===entry.nodeType))
      problems.push(`widgets/name-review.json reviews \`${entry.nodeType}\`, which is not a live `
        +`widget. Remove the entry, so the list tracks what is actually offered.`);

  const pending=rows.filter(row=>byType.get(row.nodeType)?.verdict==='pending').length;
  if(pending>review.pendingCeiling)
    problems.push(`${pending} widgets await review against a ceiling of ${review.pendingCeiling}. `
      +`The ceiling may be lowered, never raised.`);

  if(problems.length)throw new Error(problems.join('\n\n'));
  const flagged=rows.filter(row=>byType.get(row.nodeType)?.verdict==='flagged');
  return {reviewed:rows.length-pending,pending,ceiling:review.pendingCeiling,
    flagged:flagged.map(row=>({nodeType:row.nodeType,title:row.title,note:byType.get(row.nodeType).note}))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {rows,review}=await table();
  try{
    const result=validateNames({rows,review});
    console.log(`Widget names: ${rows.length} live, ${result.reviewed} reviewed, `
      +`${result.pending} awaiting review (ceiling ${result.ceiling}).`);
    // Flags are printed on every build, so a name a practitioner objected to cannot be forgotten
    // by being recorded.
    for(const flag of result.flagged)
      console.log(`  flagged: ${flag.nodeType} ("${flag.title}") -- ${flag.note}`);
  }catch(error){
    console.error(`\nWidget names: review gate failed.\n`);
    console.error(error.message);
    process.exit(1);
  }
}
