/** The authored form of a ruleset, and its compiler to N3.
 *
 *  Specified by [experiment 106](../docs/experiments/106-rule-builder-ui.md) on 2026-10-12 and
 *  not built until 2026-10-15, when the practitioner looked at the shipped Inspector and said:
 *  *"Regarding ruleset widgets, this is not the design we discussed, the rules are pinned not very
 *  flexible."* They were right. What shipped was the other half of
 *  [65](../docs/experiments/65-ruleset-as-data.md) -- rules as declared versioned data, one widget
 *  hosting them, three widgets retired -- and a practitioner could choose one of four bundled
 *  rulesets and set a number. The rules themselves were fixed text.
 *
 *  The form is three nested things and deliberately no more:
 *
 *      condition = { field, comparator, value }
 *      group     = { all: [condition, ...] }                              // AND
 *      rule      = { any: [group, ...], then: [{predicate, value}, ...] } // OR of AND groups
 *
 *  **Disjunctive normal form by construction**, which is what makes compilation total: every
 *  authored ruleset has an N3 image and none can need an operator the subset lacks. OR is expanded
 *  to one rule per disjunct because the subset is monotonic and first-match is unavailable, so
 *  conclusions must be mutually exclusive by construction rather than by order.
 *
 *  Negation: comparison-negation is safe and is what `notGreaterThan` and `notLessThan` are --
 *  they compile to a math builtin, not to scoped negation. Existence-negation is excluded; there
 *  is no "field is absent" condition, because a monotonic subset cannot conclude from absence and
 *  a ruleset that appeared to would be lying. A ruleset says "unknown" with an explicit
 *  `...Known false` fact instead, which is what all three shipped rulesets do.
 */

export type Comparator='equals'|'greaterThan'|'notGreaterThan'|'lessThan'|'notLessThan';

/** The N3 builtin each comparator compiles to. `equals` has none: it is a term match in the
 *  subject clause, which is why it is the only comparator that works on a non-numeric value. */
const BUILTIN:Record<Exclude<Comparator,'equals'>,string>={
  greaterThan:'math:greaterThan',
  notGreaterThan:'math:notGreaterThan',
  lessThan:'math:lessThan',
  notLessThan:'math:notLessThan',
};

/** A reference to one of the step's declared settings.
 *
 *  Structured, rather than the `{{threshold}}` text the compiled rules use. The placeholder is a
 *  real convention -- a published ruleset's rules are text that `bindParameters` fills, and the
 *  compiler emits the same so an authored ruleset reaches the reasoner by exactly that path --
 *  but it is a convention of the COMPILED FORM, and it had been carried into the form a
 *  practitioner edits. They met `{{threshold}}` in a value box and, as the practitioner said on
 *  2026-10-15, that is "template syntax that not anyone would write". The same mistake as
 *  printing `fwa:` at them: an encoding detail reaching the surface. */
export interface SettingReference {setting:string}
export const isSettingReference=(value:unknown):value is SettingReference=>
  typeof value==='object'&&value!==null&&typeof (value as SettingReference).setting==='string';

/** Everything a condition or a conclusion can be compared against. */
export type AuthoredValue=string|number|boolean|SettingReference;

export interface AuthoredCondition {
  /** A predicate in CURIE form, `fw:distanceKm`. A bound role in the Inspector; a predicate here. */
  field:string;
  comparator:Comparator;
  /** A term (`fw:Marina`), a literal (`true`, `5`), or a reference to a declared setting.
   *
   *  A `{{name}}` string is still accepted, because rules authored before 2026-10-15 hold one. */
  value:string|number|boolean|SettingReference;
}
export interface AuthoredGroup {all:AuthoredCondition[]}
export interface AuthoredConclusion {predicate:string; value:string}
export interface AuthoredRule {
  any:AuthoredGroup[];
  /** A LIST, because the rulesets that exist refute a single conclusion: access-review concludes a
   *  decision and a zone from one rule, nb06-evidence an evidence level and a service from every
   *  one. 106's first draft had one conclusion and these are what corrected it. */
  then:AuthoredConclusion[];
}
export interface AuthoredRuleset {
  /** The variable the rules are about: `?p` for a place, `?f` for a facility. */
  subject:string;
  comment?:string;
  rules:AuthoredRule[];
}

/** The most N3 rules one authored ruleset may compile to.
 *
 *  65 asks for a ceiling and 106 for it to be checkable from the form, before compiling. It is a
 *  guard against a combinatorial surface rather than a judgement about complexity: every disjunct
 *  is a separate rule the engine must try against every subject, and an author adding one more
 *  group to each of several rules multiplies rather than adds. 64 is well above anything the three
 *  shipped rulesets reach -- the largest is 7 -- and low enough that nobody authors their way into
 *  an unreadable ruleset without being told. */
export const RULE_CEILING=64;

/** How many N3 rules this compiles to, known from the form alone and without compiling.
 *
 *  The rule count is the sum over rules of their group counts, because OR expands. 65 asks for a
 *  ceiling and this is what makes it checkable before anything is generated -- a practitioner who
 *  authors a combinatorial explosion is told so while they are authoring it. */
export const compiledRuleCount=(ruleset:AuthoredRuleset):number=>
  ruleset.rules.reduce((n,rule)=>n+rule.any.length,0);

const isPlaceholder=(value:unknown):value is string=>
  typeof value==='string'&&/^\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}$/.test(value);
/** The name of the setting a value refers to, however it is written. */
export const settingNamed=(value:unknown):string|undefined=>
  isSettingReference(value)?value.setting
  :isPlaceholder(value)?value.slice(2,-2):undefined;

/** A term as it appears in N3: a CURIE and a placeholder pass through, a string literal is quoted,
 *  a number and a boolean are written bare. */
function term(value:string|number|boolean|SettingReference):string{
  // A setting becomes the placeholder here, at the edge where rules become text, and nowhere
  // else. bindParameters fills it exactly as it fills a published ruleset's.
  if(isSettingReference(value))return `{{${value.setting}}}`;
  if(typeof value==='boolean'||typeof value==='number')return String(value);
  if(isPlaceholder(value)||/^[a-zA-Z][a-zA-Z0-9_-]*:[^\s]*$/.test(value))return value;
  return JSON.stringify(value);
}

/** A variable for a field that has to be bound before a builtin can compare it.
 *
 *  Named from the field rather than numbered, because the compiled N3 is something a practitioner
 *  is invited to read: `?minutes` says what it holds where `?v2` does not. Collisions with the
 *  subject and with each other are resolved by suffixing, so the name is always unique within a
 *  rule and never silently shadows the subject. */
function variableFor(field:string,taken:Set<string>):string{
  const local=field.includes(':')?field.slice(field.indexOf(':')+1):field;
  const base='?'+local.replace(/[^a-zA-Z0-9]/g,'');
  let name=base;
  for(let n=2;taken.has(name);n++)name=`${base}${n}`;
  taken.add(name);
  return name;
}

export class AuthoredRulesetError extends Error {}

/** Compile one authored ruleset to the N3 subset. Total: every authored ruleset has an image.
 *
 *  Parameters stay as `{{placeholder}}` and are bound later by `bindParameters`, exactly as the
 *  declared rulesets do -- the compiler does not resolve them, so an authored ruleset and a
 *  declared one reach the reasoner by the same path. */
export function compileAuthoredRuleset(ruleset:AuthoredRuleset):string{
  const subject=ruleset.subject;
  if(!/^\?[a-zA-Z][a-zA-Z0-9]*$/.test(subject))
    throw new AuthoredRulesetError(`The subject must be an N3 variable such as ?p, not ${JSON.stringify(subject)}.`);
  // Refused BEFORE compiling, from the form alone, so the message can name the product and the
  // ceiling rather than appearing after a wall of generated text. A5.
  const count=compiledRuleCount(ruleset);
  if(count>RULE_CEILING)
    throw new AuthoredRulesetError(`These rules compile to ${count} N3 rules, over the ceiling of ${RULE_CEILING}. `
      +`Every group of conditions becomes a rule of its own, so adding one alternative to each of several `
      +`rules multiplies rather than adds. Split this into more than one step, or state fewer alternatives.`);
  const lines=ruleset.comment?[`# ${ruleset.comment}`]:[];
  for(const rule of ruleset.rules){
    if(!rule.any.length)throw new AuthoredRulesetError('A rule needs at least one group of conditions.');
    if(!rule.then.length)throw new AuthoredRulesetError('A rule needs at least one conclusion.');
    for(const group of rule.any){
      if(!group.all.length)throw new AuthoredRulesetError('A group needs at least one condition.');
      const taken=new Set<string>([subject]);
      // The subject clause, in authored order, and the builtin clauses that follow it. A field
      // compared more than once in one group is bound ONCE and its builtins chained, which is how
      // a band -- over 5 and not over 15 -- stays a single pass over a single binding.
      const subjectParts:string[]=[];
      const bound=new Map<string,string>();
      const builtins=new Map<string,string[]>();
      for(const condition of group.all){
        if(!/^[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z][a-zA-Z0-9_]*$/.test(condition.field))
          throw new AuthoredRulesetError(`A condition's field must be a CURIE such as fw:distanceKm, not ${JSON.stringify(condition.field)}.`);
        if(condition.comparator==='equals'){
          subjectParts.push(`${condition.field} ${term(condition.value)}`);
          continue;
        }
        const builtin=BUILTIN[condition.comparator];
        if(!builtin)throw new AuthoredRulesetError(`Unknown comparator ${JSON.stringify(condition.comparator)}.`);
        if(typeof condition.value!=='number'&&!isPlaceholder(condition.value)&&!isSettingReference(condition.value))
          throw new AuthoredRulesetError(`${condition.comparator} compares numbers, so its value must be a number `
            +`or a parameter placeholder, not ${JSON.stringify(condition.value)}. A term is compared with equals.`);
        let variable=bound.get(condition.field);
        if(!variable){
          variable=variableFor(condition.field,taken);
          bound.set(condition.field,variable);
          subjectParts.push(`${condition.field} ${variable}`);
          builtins.set(variable,[]);
        }
        builtins.get(variable)!.push(`${builtin} ${term(condition.value)}`);
      }
      const premise=[`${subject} ${subjectParts.join('; ')}.`,
        ...[...builtins].map(([variable,tests])=>`${variable} ${tests.join('; ')}.`)].join(' ');
      const conclusion=rule.then.map(c=>`${c.predicate} ${term(c.value)}`).join('; ');
      lines.push(`{ ${premise} } => { ${subject} ${conclusion}. }.`);
    }
  }
  return lines.join('\n')+'\n';
}

/** What a comparison is measured in, on each side, and whether the two agree.
 *
 *  The practitioner, 2026-10-15: *"How do we make sure measurements have units in the ruleset
 *  widget?"* The answer this project already uses one layer down: every published ruleset
 *  declares a QUDT unit on each numeric parameter and on each numeric predicate it expects, and
 *  `makeN3` refuses distances in the wrong unit rather than converting them -- *"the threshold is
 *  a practitioner's judgement in a stated unit, and silently reinterpreting it would change what
 *  they decided."* The authored form had a unit LABEL, which is a word on a screen, and nothing
 *  compared the two sides.
 *
 *  Three rules, and the first is the one that makes the others possible:
 *
 *  1. A numeric field declares a unit. A number without one is not a measurement.
 *  2. A numeric parameter declares a unit.
 *  3. A comparison between a field and a parameter whose units differ is **refused**, naming
 *     both. Refused rather than converted, following the precedent: converting would change
 *     what the practitioner decided without telling them.
 *
 *  A bare literal is the case nothing can check — `waitMinutes is more than 10` carries no unit
 *  of its own and takes the field's. The defence there is not a rule but the editor, which shows
 *  the field's unit beside the box the number is typed into.
 */
export interface UnitProblem {field:string; says:string}
export function authoredUnitProblems(authored:{
  fields:{predicate:string;kind:string;label?:string;unit?:string;unitLabel?:string}[];
  parameters?:{name:string;unit?:string;unitLabel?:string}[];
  rules:{any:{all:{field:string;comparator:string;value:AuthoredValue}[]}[]}[];
}):UnitProblem[]{
  const problems:UnitProblem[]=[];
  const named=(predicate:string)=>authored.fields.find(f=>f.predicate===predicate);
  const shown=(unit?:string,label?:string)=>label||unit?.split('/').pop()||'no unit';

  for(const field of authored.fields)
    if(field.kind==='number'&&!field.unit?.trim())
      problems.push({field:field.predicate,
        says:`${field.label||field.predicate} is a number and states no unit. A number without a unit is `
          +`not a measurement, and a rule comparing it to anything is comparing two numbers and hoping.`});
  for(const parameter of authored.parameters??[])
    if(!parameter.unit?.trim())
      problems.push({field:parameter.name,
        says:`The ${parameter.name} setting states no unit, so nothing can check that it means the same `
          +`as the field it is compared against.`});

  // One report per (field, setting) pair rather than per condition. Step 1 of the ruleset
  // example compares the same two things in three rules, and telling a practitioner three times
  // that minutes are not hours is not telling them three things.
  const reported=new Set<string>();
  for(const rule of authored.rules)
    for(const group of rule.any)
      for(const condition of group.all){
        if(condition.comparator==='equals')continue;
        const field=named(condition.field);
        if(!field?.unit)continue;
        // Either form of a setting reference: the structured one a practitioner now edits, or
        // the `{{name}}` text rules authored before 2026-10-15 hold.
        const setting=settingNamed(condition.value);
        if(!setting)continue;
        const parameter=(authored.parameters??[]).find(p=>p.name===setting);
        if(!parameter?.unit)continue;
        const pair=`${condition.field}/${parameter.name}`;
        if(parameter.unit!==field.unit&&!reported.has(pair)){
          reported.add(pair);
          problems.push({field:condition.field,
            says:`${field.label||field.predicate} is measured in ${shown(field.unit,field.unitLabel)} and the `
              +`${parameter.name} setting is in ${shown(parameter.unit,parameter.unitLabel)}. They are compared `
              +`directly, so this rule would be wrong by whatever separates the two. State the setting in `
              +`${shown(field.unit,field.unitLabel)}, or compare against a field that is in `
              +`${shown(parameter.unit,parameter.unitLabel)}.`});
        }
      }
  return problems;
}
