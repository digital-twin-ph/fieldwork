/** The Inspector is a control surface, not a record.
 *
 *  Measured 2026-10-20: 11,838 characters of prose across 80 paragraphs sat in the Inspector while
 *  49 of 53 widgets had no manual page. Measured again on 2026-10-21 it had reached 23,679
 *  characters across 151 paragraphs, and the practitioner said so plainly:
 *
 *    "And there are too many commentaries in the Inspector panel. That is not the place to keep
 *    development or agent notes."
 *
 *  The first rule written against that held a ceiling on TOTAL characters. It stopped the growth
 *  and it measured the wrong thing. A total is a shared budget: a panel that gains a control pays
 *  for it by shortening the explanation of a different control. On 2026-10-22 that is exactly what
 *  happened -- the weight and ruleset explanations were trimmed, neither of them a development
 *  note, to afford a country-mismatch warning the practitioner had asked for. The budget made the
 *  Inspector worse in order to let something necessary in. The practitioner named the fault on
 *  2026-10-23:
 *
 *    "Inspector prose should not be limited by number of characters, it should be limited by how
 *    well each component of the widget is explained concisely." ... "concisely and clearly"
 *
 *  and then named what a rule can honestly do about a qualitative thing:
 *
 *    "The prose in the UI is more qualitative review than quantitative. But it could still be
 *    scored."
 *
 *  So this scores each explanation and holds two numbers, neither of them a budget:
 *
 *    concise  -- no single explanation runs past ledger.concise characters. A longer one is an
 *                essay and belongs in docs/widgets/<node_type>.md, which the panel links to.
 *    floor    -- no explanation scores below the worst one already present. A new control's
 *                explanation costs nothing for being new; it is refused only for being worse
 *                than what is already there. That is the practitioner's rule, mechanised.
 *
 *  WHAT THE SCORE DOES NOT ESTABLISH. It does not know whether an explanation is true, whether it
 *  explains the control a reader will take it to be about, or whether anyone understood it. It
 *  measures sentence length, syllable load, hedging and development vocabulary -- proxies, every
 *  one. Its real job is the list it prints: the worst-scoring explanations are the ones a human
 *  should read, and the qualitative review stays human. A score that is treated as the review
 *  rather than as a route to it will be gamed by short bad sentences.
 *
 *  Association is scored, not gated. Measured 2026-10-23, 134 of 139 paragraphs sit outside the
 *  `<div class="field">` of any control, including the one explaining the snap limit, which falls
 *  after its helper's closing tag. Which control a paragraph is about is settled by reading order,
 *  not structure, so `anchored` is reported and carries no weight. Making it structural is a
 *  markup change across every renderer: experiment 132.
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
const LABEL=/field-label"[^>]*>([^<]{2,60})<\/label>/g;
// An interpolated value becomes one token rather than being deleted: removing it splits sentences
// and the shortest scrap then scored best, which is how a first draft ranked "then" above every
// real explanation in the repository.
const words=t=>t.replace(/\$\{[^}]*\}/g,'X').replace(/<[^>]*>/g,' ').replace(/&[a-z#0-9]+;/g,' ')
  .replace(/\s+/g,' ').trim();
// A backtick surviving into text means the match crossed a source concatenation, so it is two
// halves of the source rather than a paragraph. A paragraph that is mostly values is a readout.
const FRAGMENT=/[`]/;
const mostlyValues=t=>{const w=t.split(/\s+/);
  return w.filter(x=>/^X[.,:;·]?$/.test(x)).length/w.length>.25;};
const syllables=w=>{const m=w.toLowerCase().replace(/[^a-z]/g,'').replace(/e$/,'').match(/[aeiouy]+/g);
  return m?m.length:1;};
const HEDGE=/\b(may|might|generally|usually|typically|often|somewhat|can be|should be|appears|seems|roughly|about)\b/gi;
const NOTES=/\b(we|for now|TODO|note that|currently|experiment|planned|not implemented|yet to)\b/gi;
const clamp=x=>Math.max(0,Math.min(1,x));

const items=[];
const setAside={fragments:0,readouts:0};
for(const file of ledger.files){
  const source=readFileSync(`${root}/${file}`,'utf8');
  const labels=[...source.matchAll(LABEL)].map(m=>({at:m.index,text:words(m[1])}));
  for(const match of source.matchAll(PROSE)){
    const text=words(match[1]);
    if(!/[a-z]{3}/.test(text)){setAside.readouts++;continue;}
    if(FRAGMENT.test(text)||text.split(/\s+/).length<6){setAside.fragments++;continue;}
    if(mostlyValues(text)){setAside.readouts++;continue;}
    const toks=text.split(/\s+/).filter(Boolean);
    const sentences=text.split(/(?<=[.!?])\s+/).filter(s=>/[a-z]{3}/i.test(s));
    const perSentence=toks.length/Math.max(1,sentences.length);
    const grade=.39*perSentence
      +11.8*(toks.reduce((a,w)=>a+syllables(w),0)/Math.max(1,toks.length))-15.59;
    const near=labels.filter(l=>l.at<match.index).at(-1);
    const terms=(near?.text??'').toLowerCase().match(/[a-z]{4,}/g)??[];
    const body=text.toLowerCase();
    const overlap=terms.length
      ?terms.filter(t=>body.includes(t.slice(0,Math.max(4,t.length-2)))).length/terms.length:0;
    const per25=n=>(text.match(n)??[]).length/Math.max(1,toks.length/25);
    const parts={
      brevity:clamp((ledger.concise-text.length)/ledger.score.brevitySpan),
      sentences:clamp((ledger.score.sentenceCap-perSentence)/ledger.score.sentenceSpan),
      grade:clamp((ledger.score.gradeCap-grade)/ledger.score.gradeSpan),
      direct:clamp(1-per25(HEDGE)/2),
      clean:clamp(1-per25(NOTES)),
    };
    const score=Math.round(100*Object.entries(ledger.score.weights)
      .reduce((a,[k,w])=>a+w*parts[k],0));
    items.push({file,label:near?.text??'(none)',text,parts,anchored:overlap,score});
  }
}
items.sort((a,b)=>a.score-b.score);
const over=items.filter(i=>i.text.length>ledger.concise).sort((a,b)=>b.text.length-a.text.length);
const worst=items.length?items[0].score:100;

const problems=[];
if(over.length>ledger.overCeiling)
  problems.push(`${over.length} explanations run past ${ledger.concise} characters, against a `
    +`ceiling of ${ledger.overCeiling}. ${ledger.ceilingRule} An explanation needing more than two `
    +`sentences is not concise, and its reader is reading docs/widgets/<node_type>.md.`);
if(over.length<ledger.overCeiling)
  problems.push(`${over.length} explanations run past ${ledger.concise} characters, under the `
    +`ceiling of ${ledger.overCeiling}. Lower overCeiling in widgets/inspector-prose.json to `
    +`${over.length}: a ceiling left above the measurement is room to grow back into.`);
if(worst<ledger.floor)
  problems.push(`The worst-scoring explanation scores ${worst}, below the floor of ${ledger.floor}. `
    +`${ledger.floorRule} Nothing here is charged for being new: this one is refused for reading `
    +`worse than every explanation already in the Inspector.`);
if(worst>ledger.floor)
  problems.push(`The worst-scoring explanation scores ${worst}, above the floor of ${ledger.floor}. `
    +`Raise floor in widgets/inspector-prose.json to ${worst}: a floor left below the measurement `
    +`is room to sink back into.`);

if(problems.length){
  console.error(`\nInspector prose: ${problems.length} problem${problems.length===1?'':'s'}.\n`);
  for(const p of problems)console.error(`  • ${p}\n`);
}
console.log(`Inspector prose: ${items.length} explanations scored, worst ${worst} against a floor `
  +`of ${ledger.floor}, ${over.length} past ${ledger.concise} characters against a ceiling of `
  +`${ledger.overCeiling}. ${setAside.fragments} source fragments and ${setAside.readouts} `
  +`computed readouts set aside.`);
console.log(`\nRead these first -- a score routes a human review, it does not replace one:`);
for(const i of items.slice(0,ledger.score.show)){
  console.log(`  ${String(i.score).padStart(3)}  ${i.file} / ${i.label}  (${i.text.length} chars)`);
  console.log(`       ${i.text.slice(0,120)}${i.text.length>120?'...':''}`);
  console.log(`       ${Object.entries(i.parts).map(([k,v])=>`${k} ${v.toFixed(2)}`).join('  ')}`
    +`  anchored ${i.anchored.toFixed(2)}`);
}
if(problems.length)process.exit(1);
