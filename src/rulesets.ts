/** The rulesets this build carries, as declared data rather than template literals.
 *
 *  Four widgets existed whose only difference was which rules they ran — `policy`,
 *  `access_policy`, `xpert` and `facility_audit` — and all four carried their rules as template
 *  literals inside the execution path. `policy`'s own description read "Apply N3 rules with
 *  EYE-JS", as though rules were an input. They were not.
 *
 *  This is the first half of that merge, and it is deliberately behaviour-preserving: the rules
 *  move out, the widgets stay, and `tests/rulesets.test.mjs` asserts the assembled text is
 *  **byte-identical** to what the literals produced. A merge that changed a conclusion while
 *  claiming to relocate rules would be impossible to argue about afterwards.
 *
 *  Bundled rather than fetched, for the same reason compositions are: Fieldwork runs offline, so
 *  a ruleset reaching a practitioner is a build decision.
 *
 *  What declaring them exposed, which is the point of declaring them: of the three, **one has a
 *  cited basis**. `nb06-evidence` carries NB06 and three papers. The other two carry disclaimers
 *  in place of a source — "Threshold is illustrative", "not a clinical recommendation or routed
 *  travel time". Those are honest and they are not citations, and a template literal in an
 *  execution path kept the difference invisible.
 */
import type {EvidenceReference} from './evidence.js';
import outreachCriteria from '../rulesets/outreach-criteria/1.0.0.json' with {type:'json'};
import accessReview from '../rulesets/access-review/1.0.0.json' with {type:'json'};
import nb06Evidence from '../rulesets/nb06-evidence/1.0.0.json' with {type:'json'};

export interface RulesetParameter {
  name:string; role:string; type:string; unit?:string; min?:number; max?:number;
  default?:number; decimals?:number; placeholder:string; meaning:string;
}
export interface Ruleset {
  schema:string; id:string; version:string; title:string; released:string;
  description:string; mustNotBeReadAs:string; rules:string;
  parameters:RulesetParameter[];
  inputContract:{factGenerator:string; subjectKind:string; expects:unknown[]; note?:string; knownDefect?:string};
  outputVocabulary:Record<string,unknown>;
  basis:RulesetBasis;
}

/** A ruleset's authority, and whether a reader can get to it.
 *
 *  `evidence` reuses `EvidenceReference` unchanged — the same url-or-pdf-with-digest union that
 *  node references use, so a cited PDF is verified by hash rather than trusted by filename, and
 *  the provenance emitter already knows how to write it.
 *
 *  `unresolvedCitations` exists because restructuring this field found the gap it names. The one
 *  ruleset recorded as having a cited basis cites three papers as author-year strings, which
 *  resolve to nothing a reader can open. No locator was invented to close that; the gap is
 *  recorded, and the ratchet counts resolvable evidence rather than citation strings. */
export interface RulesetBasis {
  status:'published'|'practitioner-agreed'|'illustrative'|'proxy';
  statedBy:string;
  evidence:EvidenceReference[];
  unresolvedCitations:{citation:string; supports?:string; whatWouldResolveIt:string}[];
  note?:string;
}

/** What a run records about the ruleset it applied. Carried on the receipt and emitted into
 *  provenance — never into the facts or the rules. A citation in a rule premise would let the
 *  reasoner draw conclusions from a bibliography, which `tests/evidence.test.mjs` has asserted
 *  against for node references since before rulesets existed. */
export interface RulesetCitation {id:string; version:string; title:string; basis:RulesetBasis}
export const rulesetCitation=(ruleset:Ruleset):RulesetCitation=>
  ({id:ruleset.id,version:ruleset.version,title:ruleset.title,basis:structuredClone(ruleset.basis)});

const BUNDLED=[outreachCriteria,accessReview,nb06Evidence] as unknown as Ruleset[];
export const rulesetKey=(id:string,version:string)=>`${id}@${version}`;
const INDEX=new Map(BUNDLED.map(r=>[rulesetKey(r.id,r.version),r]));

export const bundledRulesets=():Ruleset[]=>BUNDLED.map(r=>structuredClone(r));

export function resolveRuleset(id:string,version:string):Ruleset{
  const found=INDEX.get(rulesetKey(id,version));
  if(found)return structuredClone(found);
  const others=BUNDLED.filter(r=>r.id===id).map(r=>r.version);
  throw new Error(others.length
    ?`This build carries ${id} at ${others.join(', ')} and not ${version}. A saved workflow pins a ruleset version because a rule change changes results.`
    :`This build carries no ruleset ${id}.`);
}

/** Bind declared parameters into the rule text.
 *
 *  Every declared parameter must be supplied and every placeholder must be consumed, because the
 *  two failure modes are silent in opposite directions: an unbound placeholder reaches the
 *  reasoner as literal text and matches nothing, so the ruleset concludes nothing and looks like a
 *  dataset full of unknowns; and a value with no placeholder is a knob the practitioner can turn
 *  that changes nothing at all. Refused rather than tolerated.
 *
 *  Decimals are fixed per parameter rather than chosen here, because the shipped rules were
 *  assembled with `toFixed(9)` and the byte-identity test depends on reproducing exactly that. */
export function bindParameters(ruleset:Ruleset,values:Record<string,number>):string{
  let rules=ruleset.rules;
  for(const parameter of ruleset.parameters){
    const value=values[parameter.name];
    if(value===undefined)
      throw new Error(`${ruleset.title} needs a value for ${parameter.name}: ${parameter.meaning}`);
    if(!Number.isFinite(value)||(parameter.min!==undefined&&value<parameter.min)||(parameter.max!==undefined&&value>parameter.max))
      throw new Error(`${parameter.name} must be between ${parameter.min} and ${parameter.max}.`);
    if(!rules.includes(parameter.placeholder))
      throw new Error(`${ruleset.title} declares the parameter ${parameter.name} and its rules never use it.`);
    rules=rules.replaceAll(parameter.placeholder,value.toFixed(parameter.decimals??9));
  }
  const unbound=rules.match(/\{\{[a-zA-Z]+\}\}/);
  if(unbound)throw new Error(`${ruleset.title} left ${unbound[0]} unbound, so its rules would match nothing.`);
  return rules;
}
