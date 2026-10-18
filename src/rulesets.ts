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
  /** Text parameters only: the shape a stated value must have. A pattern checks FORM, never
   *  truth -- it catches "TODO" and not a plausible wrong answer. */
  pattern?:string;
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
/** Something the practitioner must STATE about the data, which the rules never read.
 *
 *  Not a parameter. A parameter tunes the rules and its placeholder must appear in them --
 *  `validate-rulesets.mjs` refuses one that does not -- whereas a citation documents where the
 *  numbers came from and changes no computed value. `sea-level.ts` draws exactly this line on one
 *  question: *does the field say where the data came from, or how to interpret the numbers?*
 *  Parameters are the second kind. These are the first.
 *
 *  Missing ones become `DeclarationGap`s, reported on the widget and never fatal. That is the
 *  practitioner's decision of 2026-10-15 -- *"Provenance is something we can check if uploaded or
 *  not and can be flagged as an alert, not a blocker"* -- and no provenance field changes a single
 *  computed number, so refusing to compute would be a punishment for an unfilled form.
 *
 *  `obligation` records WHY it is asked for, because "the licence requires it" and "a reader will
 *  want it" are different claims and a practitioner deciding what to fill in first needs to tell
 *  them apart. `expectType` is the CSL type a resolved DOI should return: the three AR6 citations
 *  resolve as `book-chapter`, `journal-article` and `dataset`, which a pattern could not have
 *  distinguished (see docs/research/doi-resolution-probe-2026-10-17.md). */
export interface RequiredDeclaration {
  name:string;
  label:string;
  kind:'doi'|'text'|'version';
  meaning:string;
  obligation:'licence'|'interpretation';
  expectType?:string;
}

export interface Ruleset {
  schema:string; id:string; version:string; title:string; released:string;
  /** What the practitioner must state about the data. The rules never read these. */
  requiredDeclarations?:RequiredDeclaration[];
  /** Declared by this version about itself. Absent on a first version, which changed nothing. */
  changes?:RulesetChange[];
  description:string; mustNotBeReadAs:string; rules:string;
  /** The structured form `rules` was compiled from, so a practitioner can READ the rules of a
   *  published ruleset laid out as rules rather than as N3 -- and open them in the same editor
   *  they write their own in.
   *
   *  `scripts/validate-ruleset-sources.mjs` fails the build unless compiling this gives exactly
   *  the N3 above, under consistent variable renaming. Without that gate the editor could show
   *  one rule while the reasoner ran another, which is worse than showing nothing. */
  authored?:{subject:string; comment?:string;
    rules:{any:{all:{field:string;comparator:string;value:string|number|boolean|{setting:string}}[]}[];
      then:{predicate:string;value:string}[]}[]};
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
export {compileAuthoredRuleset,compiledRuleCount,AuthoredRulesetError,RULE_CEILING,authoredUnitProblems} from './authored-rules.js';
export type {FieldBinding} from './authored-application.js';
export {authoredFacts,authoredProjection,authoredConclusions,knownPredicate,termFor,AUTHORED_SUBJECT} from './authored-application.js';
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
export function bindParameters(ruleset:Ruleset,values:Record<string,number|string>):string{
  let rules=ruleset.rules;
  for(const parameter of ruleset.parameters){
    const value=values[parameter.name];
    if(value===undefined)
      throw new Error(`${ruleset.title} needs a value for ${parameter.name}: ${parameter.meaning}`);
    // TEXT parameters. A rule can compare a field against a word the practitioner states -- which
    // family value in this file means "includes vertical land motion" -- and not only against a
    // number. Added 2026-10-17; every parameter shipped before it was numeric, which is why a
    // ruleset could ask for a threshold and not for a name.
    //
    // Bound as an N3 string literal, with JSON.stringify doing the escaping, so a value carrying
    // a quote cannot close the literal early and change what the rule says.
    if(parameter.type==='text'){
      const stated=typeof value==='string'?value.trim():'';
      if(!stated)throw new Error(`${ruleset.title} needs a value for ${parameter.name}: ${parameter.meaning}`);
      if(parameter.pattern&&!new RegExp(parameter.pattern).test(stated))
        throw new Error(`${parameter.name} does not look like ${parameter.meaning} An entry of the wrong shape would reach the reasoner and match nothing.`);
      if(!rules.includes(parameter.placeholder))
        throw new Error(`${ruleset.title} declares the parameter ${parameter.name} and its rules never use it.`);
      rules=rules.replaceAll(parameter.placeholder,JSON.stringify(stated));
      continue;
    }
    if(typeof value!=='number')
      throw new Error(`${parameter.name} is a number and was given ${JSON.stringify(value)}.`);
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

/** Which required declarations are unstated, as gaps a reader can act on.
 *
 *  Reported, never fatal. The text names the obligation rather than scolding: a licence
 *  obligation is a fact about the data's terms, not a preference of this application. */
export function declarationGaps(
  ruleset:Pick<Ruleset,'requiredDeclarations'>,stated:Record<string,string>|undefined,
):{field:string; says:string}[]{
  const text=(v:unknown)=>typeof v==='string'?v.trim():'';
  return (ruleset.requiredDeclarations??[]).filter(d=>!text(stated?.[d.name])).map(d=>({
    field:d.label,
    says:d.obligation==='licence'
      ? `${d.meaning} The licence this data is published under makes it obligatory, so this is a term of use and not a preference.`
      : `${d.meaning} Without it a reader cannot tell what these numbers mean.`,
  }));
}

/** The roles a ruleset needs bound to columns, and the ones it derives for itself.
 *
 *  Experiment [65](../docs/experiments/65-ruleset-as-data.md), written before the code: *"Stages
 *  1 and 4 are where the specificity currently hides, and both become general the moment the
 *  ruleset declares a contract"*, and *"the ruleset declares ROLES, not field names"*. Every
 *  bundled ruleset already carries both halves — `authored` holds the structured rules and
 *  `inputContract.expects` holds the roles — so what was missing was never the declaration. It
 *  was the binding, and the dispatch that would use it.
 *
 *  **A presence role is derived, not bound, and it says so.** `fw:distanceKnown` is not a column
 *  anybody has; it is whether the value was readable, and the authored projection already emits
 *  one for every bound field. Asking a practitioner to bind a column to it would be asking them
 *  to supply an answer the application computes.
 *
 *  **Declared, not inferred from the spelling.** The first draft read a `Known` suffix and looked
 *  for the stem among the other roles. That fails on the shipped rulesets and deserved to:
 *  `fw:distanceKnown` pairs with `fw:distanceKm`, because as outreach-criteria's own note says,
 *  "fw:distanceKm welds a unit into a predicate name", and `fw:alertKnown` pairs with
 *  `fw:heatAlert`, which shares no stem at all. Guessing a relationship from two predicate names
 *  is the same mistake as guessing a column's meaning from its heading, which this application
 *  refuses everywhere else. A role that is computed declares `derived: true`. */
export const isDerivedRole=(role:{predicate:string;derived?:boolean})=>role.derived===true;

export interface RoleBinding {predicate:string; attribute:string}

export function bindableRoles(ruleset:Pick<Ruleset,'inputContract'>):{predicate:string;type:string;unit?:string;derived?:boolean}[]{
  const expects=(ruleset.inputContract?.expects??[]) as {predicate:string;type:string;unit?:string;derived?:boolean}[];
  return expects.filter(e=>!isDerivedRole(e));
}

/** The authored-shaped field list a pinned ruleset runs on, once its roles are bound.
 *
 *  Refuses rather than guesses. A role left unbound, or bound to a column the records do not
 *  carry, would reach the reasoner as a predicate nothing asserts — the rules would simply match
 *  nothing and the run would look like a dataset full of unknowns, which is the failure
 *  `bindParameters` already refuses for an unbound placeholder. */
export function declaredFields(
  ruleset:Pick<Ruleset,'inputContract'>,bindings:readonly RoleBinding[],columns?:readonly string[],
):{attribute:string;predicate:string;kind:string;unit?:string}[]{
  const roles=bindableRoles(ruleset);
  const by=new Map(bindings.map(b=>[b.predicate,b.attribute.trim()]));
  const missing=roles.filter(r=>!by.get(r.predicate));
  if(missing.length)
    throw new Error(`This ruleset needs ${missing.length} role${missing.length===1?'':'s'} bound to a column before it can run: `
      +`${missing.map(r=>r.predicate).join(', ')}. A role the records do not supply reaches the reasoner as a predicate nothing asserts, and the run would report every record as unknown.`);
  if(columns)for(const role of roles){
    const attribute=by.get(role.predicate)!;
    if(!columns.includes(attribute))
      throw new Error(`${role.predicate} is bound to "${attribute}", which these records do not carry. Columns available: ${columns.join(', ')}.`);
  }
  return roles.map(role=>({attribute:by.get(role.predicate)!,predicate:role.predicate,
    kind:role.type==='number'?'number':role.type==='boolean'?'boolean':'term',
    ...(role.unit?{unit:role.unit}:{})}));
}
