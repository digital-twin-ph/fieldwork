/** A published ruleset's N3 must be exactly what its authored source compiles to.
 *
 *  The practitioner, 2026-10-15: *"The pinned rules should be editable so it's reviewable in the
 *  editor."* The obstacle looked like a decompiler -- the published rulesets are N3 text, and
 *  turning text back into the structured form a reader can inspect is a parser nobody should
 *  guess at. It was not needed. Every one of the seven published documents was already written
 *  in exactly the shape the authored compiler emits, so the structured form can be the SOURCE
 *  and the shipped N3 its image.
 *
 *  That is what this checks, and why it is a gate rather than a test: the two must never drift.
 *  If they did, the editor would show a practitioner one rule while the reasoner ran another,
 *  which is worse than showing them nothing. A ruleset whose rules are hand-edited without its
 *  source fails the build, by name.
 *
 *  Compared under consistent variable renaming. `?m` and `?proxyMinutes` denote the same rule,
 *  and the shipped documents were written by hand with short names; the check is about what the
 *  rule says, not what its variables are called.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {compileAuthoredRuleset} from '../build/rulesets.js';

const alpha=n3=>{const seen=new Map();
  return n3.trim().replace(/\?[A-Za-z][A-Za-z0-9_]*/g,v=>{
    if(!seen.has(v))seen.set(v,`?v${seen.size}`);return seen.get(v);});};

let checked=0,withoutSource=[],failed=[];
for(const id of readdirSync('rulesets',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name))
  for(const file of readdirSync(`rulesets/${id}`).filter(f=>f.endsWith('.json'))){
    const key=`${id}/${file.replace(/\.json$/,'')}`;
    const doc=JSON.parse(readFileSync(`rulesets/${id}/${file}`,'utf8'));
    if(!doc.authored){withoutSource.push(key);continue;}
    checked++;
    let compiled;
    try{compiled=compileAuthoredRuleset(doc.authored);}
    catch(error){failed.push(`${key}: its source does not compile — ${error.message}`);continue;}
    if(alpha(compiled)!==alpha(doc.rules))
      failed.push(`${key}: the shipped N3 is not what its authored source compiles to. `
        +`Edit the source and recompile, or the editor will show a rule the reasoner does not run.`);
  }

if(failed.length){for(const line of failed)console.error(`  ${line}`);
  console.error(`Ruleset sources: ${failed.length} of ${checked+failed.length} do not match their N3.`);
  process.exit(1);}
console.log(`Ruleset sources: ${checked} published rulesets compile to exactly the N3 they ship`
  +`${withoutSource.length?`, ${withoutSource.length} without a source (${withoutSource.join(', ')})`:''}.`);
