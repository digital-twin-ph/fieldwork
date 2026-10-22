/** The Inspector is a control surface, not a record.
 *
 *  Measured 2026-10-20: 11,838 characters of prose across 80 paragraphs sat in the Inspector while
 *  49 of 53 widgets had no manual page -- the same fact twice, since explanation went where it was
 *  easy to put rather than where a reader looks. A month was not needed to undo that: measured
 *  again on 2026-10-21 it had reached 23,679 characters across 151 paragraphs, and the practitioner
 *  said so plainly:
 *
 *    "And there are too many commentaries in the Inspector panel. That is not the place to keep
 *    development or agent notes."
 *
 *  A rule nobody measures is a rule that holds until the next paragraph. This counts what the
 *  Inspector renderers emit as prose and holds a ceiling that may fall and may never rise, which
 *  is how every other debt in this repository is kept from growing. The remedy for a paragraph
 *  that does not fit is docs/widgets/<node_type>.md, which a reader reaches from the panel itself.
 *
 *  Usage: node scripts/validate-inspector-prose.mjs
 */
import {readFileSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname;
const ledger=JSON.parse(readFileSync(`${root}/widgets/inspector-prose.json`,'utf8'));
// EVERY paragraph, classed or not. A first draft counted only `muted`, `notice` and `description`,
// and the paragraphs trimmed out of the Street network panel that day were mostly unclassed -- so
// the measurement barely moved while the panel halved. A rule that can be dodged by leaving the
// class off is not a rule.
const PROSE=/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g;

let total=0,paragraphs=0;
const rows=[];
for(const file of ledger.files){
  const source=readFileSync(`${root}/${file}`,'utf8');
  const found=[...source.matchAll(PROSE)].map(m=>m[1]);
  const chars=found.join(' ').length;
  total+=chars;paragraphs+=found.length;
  rows.push({file,paragraphs:found.length,chars});
}
rows.sort((a,b)=>b.chars-a.chars);

const problems=[];
if(total>ledger.characterCeiling)
  problems.push(`Inspector prose is ${total.toLocaleString('en')} characters against a ceiling of `
    +`${ledger.characterCeiling.toLocaleString('en')}. ${ledger.ceilingRule} A paragraph that `
    +`explains why belongs in docs/widgets/<node_type>.md, which the panel links to.`);
if(total<ledger.characterCeiling-ledger.slack)
  problems.push(`Inspector prose is ${total.toLocaleString('en')} characters, which is `
    +`${(ledger.characterCeiling-total).toLocaleString('en')} under the ceiling of `
    +`${ledger.characterCeiling.toLocaleString('en')}. Lower the ceiling in `
    +`widgets/inspector-prose.json to what you measured: a ceiling left far above the measurement `
    +`is room for it to grow back into.`);

if(problems.length){
  console.error(`\nInspector prose: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
  process.exit(1);
}
console.log(`Inspector prose: ${total.toLocaleString('en')} characters in ${paragraphs} paragraphs, `
  +`ceiling ${ledger.characterCeiling.toLocaleString('en')}.`);
for(const row of rows)console.log(`  ${row.file}  ${row.paragraphs} paragraphs, ${row.chars.toLocaleString('en')}`);
