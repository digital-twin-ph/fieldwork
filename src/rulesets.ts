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
import type {PortType} from './types.js';
import outreachCriteria from '../rulesets/outreach-criteria/1.0.0.json' with {type:'json'};
import accessReview2 from '../rulesets/access-review/2.0.0.json' with {type:'json'};
import nb06Evidence2 from '../rulesets/nb06-evidence/2.0.0.json' with {type:'json'};
import accessReview from '../rulesets/access-review/1.0.0.json' with {type:'json'};
import nb06Evidence from '../rulesets/nb06-evidence/1.0.0.json' with {type:'json'};
import extentReview from '../rulesets/extent-review/1.0.0.json' with {type:'json'};
import extentReview2 from '../rulesets/extent-review/1.1.0.json' with {type:'json'};

export interface RulesetParameter {
  name:string; role:string; type:string; unit?:string; min?:number; max?:number;
  default?:number; decimals?:number; placeholder:string; meaning:string;
  /** How the unit reads on screen. The IRI is the identity; this is the label beside the input,
   *  declared rather than derived because deriving 'km' from a QUDT IRI is a guess. */
  unitLabel?:string;
}
/** What a version changed, declared by the version that changed it.
 *
 *  Two rulesets have carried these notes since 2026-10-12 and nothing read them: typed, validated
 *  and shown from 2026-10-15, because a practitioner told that a newer version exists has been
 *  told the least useful half of it. `incompatibility` is what a workflow pinned to the previous
 *  version must change in order to move, and it is required whenever the ports changed -- a port
 *  change breaks what is wired, whatever the version number says about it. */
export interface RulesetChange {
  kind:'major'|'minor'|'patch';
  description:string;
  /** Absent when a workflow can move versions and change nothing else. */
  incompatibility?:string;
  /** What this version stops supporting, for a reader who relied on it. */
  deprecates?:string;
}
export interface Ruleset {
  schema:string; id:string; version:string; title:string; released:string;
  /** Declared by this version about itself. Absent on a first version, which changed nothing. */
  changes?:RulesetChange[];
  description:string; mustNotBeReadAs:string; rules:string;
  parameters:RulesetParameter[];
  inputContract:{
    factGenerator:string; subjectKind:string; expects:unknown[]; note?:string; knownDefect?:string;
    /** The ruleset's own ports, pinned into a node that hosts it. Declared here because the three
     *  rulesets have three different input sets and two different output port types, which is what
     *  made one widget hosting all three look like a base-contract change. */
    ports:{inputs:[string,PortType][]; output:PortType};
    /** Which port type the classification is assembled into. Each ruleset's consumer expects a
     *  different shape, so the merge collapses the palette and not these. */
    projection:string;
    /** Which parameter of the node this ruleset was extracted from supplies which declared
     *  parameter. `thresholdKm` and `thresholdMin` were one kind of thing in two units with the
     *  unit buried in the name; the ruleset declares one parameter with its unit attached. */
    parameterFrom:Record<string,string>;
    portsNote?:string};
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

// Both versions of each changed ruleset are carried: a saved workflow pins the version that
// produced its results, and a port type change does not entitle this build to forget the old one.
const BUNDLED=[outreachCriteria,accessReview,accessReview2,nb06Evidence,nb06Evidence2,extentReview,extentReview2] as unknown as Ruleset[];
/** The version of this ruleset a practitioner would be offered today, if it is not the one
 *  pinned. Returns nothing when the pin is current.
 *
 *  A pinned version keeps running, deliberately: a rule change changes results, so a saved
 *  workflow replays the rules it was built on. What was missing is that nobody was told a newer
 *  one exists. The practitioner's instruction of 2026-10-14: "when new versions appear, and a
 *  workflow is run that requires an old version, we have to alert the user that there is a newer
 *  version." */
export function supersededBy(id:string,version:string):string|undefined{
  const newer=BUNDLED.filter(r=>r.id===id&&r.version.localeCompare(version,undefined,{numeric:true})>0)
    .map(r=>r.version).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  return newer.at(-1);
}
/** The newer version and what it changed, for a node pinned to an older one.
 *
 *  `changes` is read from every version BETWEEN the pin and the newest, not from the newest
 *  alone, so a pin two versions behind is told about both. `incompatible` is true when any of
 *  them declares an incompatibility, which is what decides whether moving is a click or a
 *  rewiring job. */
export function supersession(id:string,version:string):
  {version:string; changes:RulesetChange[]; incompatible:boolean}|undefined{
  const newest=supersededBy(id,version);
  if(!newest)return undefined;
  const between=BUNDLED.filter(r=>r.id===id
    &&r.version.localeCompare(version,undefined,{numeric:true})>0
    &&r.version.localeCompare(newest,undefined,{numeric:true})<=0)
    .sort((a,b)=>a.version.localeCompare(b.version,undefined,{numeric:true}));
  const changes=between.flatMap(r=>r.changes||[]);
  return {version:newest,changes,incompatible:changes.some(c=>!!c.incompatibility)};
}
// The authored form and its compiler, re-exported here because this module is what the
// application and the tests reach for when they mean "a ruleset". Experiment 106.
export type {AuthoredRuleset,AuthoredRule,AuthoredGroup,AuthoredCondition,AuthoredConclusion,Comparator} from './authored-rules.js';
export {compileAuthoredRuleset,compiledRuleCount,AuthoredRulesetError,RULE_CEILING} from './authored-rules.js';
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
