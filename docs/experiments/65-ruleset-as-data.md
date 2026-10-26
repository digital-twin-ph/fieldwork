# 65 · A ruleset as declared data, and where its knobs live

_Created 2026-10-10 · Updated 2026-10-15_

**Status:** admission review. Written before the code, as experiments 48, 58, 61, 63 and 64
were. Proposes one widget replacing three node types, and one new declared artifact — a
**ruleset** — which is data, not code.

[Experiment 64](64-widget-streamlining.md) found three node types whose only difference is
which rules they run: `policy`, `xpert` and `access_policy`. `policy`'s description, "Apply
N3 rules with EYE-JS", reads as though rules were an input. They are not. `xpert` declares
`Record<string,never>` — no parameters at all — and all three carry their rules as template
literals inside the execution path. This is the third time the same shape has appeared: a
thick domain layer standing where a general primitive is missing
([59](59-pattern-for-engineered-knowledge.md)), after tabular import and the keyed join.

## What is actually there, measured

| | `policy` | `access_policy` | `xpert` |
| --- | --- | --- | --- |
| Knob | `thresholdKm` | `thresholdMin` | none |
| Asserts | `fw:decision` | `fw:decision` | `fw:evidenceLevel`, `fw:service` |
| Vocabulary | Unknown · Review · NoFlag | the same three | Direct · Contextual · Inferential · None; Onsite · OnsiteOrReferral · ReferralOnly · Unknown |
| Output port | `decisions` | `decisions` | `gradedFacilities` |
| Citations | none | none | NB06, with three papers, per evidence level |

Three things follow immediately. The knobs are the same *kind* of thing in different
**units** — kilometres and minutes — which is the project's recurring finding in a new place:
a threshold without its unit is not a threshold. The asserted predicate and its value set
**vary per ruleset**, so a widget that hardcodes Unknown/Review/NoFlag cannot host `xpert`.
And `gradedFacilities` is one of the six producer-named port types D4a identifies as a custom
stud, which this work can retire rather than preserve.

## The finding that makes this urgent

`xpert`'s fact generation matches facilities by **name string**:

    const named = f.name==='Princess Marina Hospital' ? 'Marina'
                : f.name==='Broadhurst II Clinic'    ? 'Broadhurst' : 'None';

Two facility names from one example dataset are compiled into a shipped widget, and the rules
then branch on them. This is the error the project has already named as a distinction and
forbidden elsewhere: *a join on names is not a join on identities*
([60](60-from-gis-studio-to-public-health-studio.md)), and
[experiment 47](47-sea-level-pack.md) states why — names repeat, so a name-keyed match finds
the wrong record **without failing**.

The failure mode here is specific and silent. A facility renamed in a later registry edition
drops to the `None` branch, which changes its evidence level, which changes its access
decision. Nothing reports anything. A second facility sharing the name gets Direct evidence
it has no basis for.

Extracting rulesets is what exposed this, and it is the strongest argument for doing it: a
rule that classifies must not enumerate instances, and the instance data has to come out
before the ruleset can be declared.

## The four stages inside a rule application

Naming them is what makes one widget able to host three rulesets, and tells us which parts
are candidates to be primitives in their own right.

| Stage | What it does | General or specific |
| --- | --- | --- |
| 1 · **Fact generation** | Project a typed input into RDF facts | General, *given a declared contract* saying which attributes become which predicates. Every widget already emits facts for its receipt, so the capability exists and is not factored |
| 2 · **Parameter binding** | Bind declared knobs, typed and unit-checked, before they reach the rules | General. Today a number is interpolated into rule text with `toFixed(9)` |
| 3 · **Evaluation** | EYE-JS evaluates N3 over the facts | General, and already shared |
| 4 · **Classification extraction** | Read the asserted predicate off each subject and map it to the output | General, *given a declared vocabulary* |

Stages 1 and 4 are where the specificity currently hides, and both become general the moment
the ruleset declares a contract. Stage 2 is where the unit problem lives.

## Where the knobs live: a two-sided contract

A ruleset applies **to an input**, so its configuration surface cannot be fixed by the
ruleset alone. It is a function of two things: what the ruleset needs, and what the connected
input actually offers. Getting this wrong is what produced three node types in the first
place — each one hardcoded both sides.

**The ruleset declares roles, not field names.** A role says *what the rules need*: a numeric
distance in a length unit; a boolean alert flag; a categorical facility kind drawn from a
named value set. It does not say which column or attribute supplies it, because the ruleset
cannot know.

**The input exposes a schema.** What that means differs by input kind, and the difference is
the point:

| Input | Its schema | State today |
| --- | --- | --- |
| Points / vector | Typed feature attributes | **Exists.** `src/attribute-schema.ts` declares `ATTRIBUTE_TYPES` as text, number, integer, boolean, date, with `AttributeDefinition`, value-set parsing, per-value validation and `attributeLiteral` to project a value into RDF |
| Table | The declared key columns and the value field, with the unit's stated status | Partly: `table_input` declares keys, value field and unit status, but no per-column type |
| Raster | Bands, with no-data and resolution | No attribute schema. A per-point rule over a raster also needs the sampling primitive that does not exist ([62](62-workflow-traversal.md)) |
| Network | Vertex and edge attributes | No attribute schema |

**The widget's configuration is the binding.** The practitioner is shown one selector per
declared role, listing only the fields of the connected input whose type and unit can satisfy
it. Nothing is guessed and nothing is defaulted: a role left unbound means the node is an
incomplete draft, which is the division
[experiment 48](48-tabular-input.md) settled when it found that validating unconditionally
made a node impossible to add.

So the knobs are of two kinds, and only the first belongs to the ruleset:

- **Parameters** — a threshold, a tolerance. Declared by the ruleset with type, **unit**,
  range, default and meaning. `thresholdKm` and `thresholdMin` become one declared parameter
  each, with the unit attached rather than buried in the name.
- **Bindings** — which field plays which role. Declared by neither side alone; chosen by the
  practitioner from what the ruleset needs and the input has, and recorded in the receipt so
  a reader can tell which column meant what.

**A ruleset also declares which input kinds it applies to.** A ruleset needing a distance per
point cannot apply to a raster until something samples it, and a ruleset over a keyed table
is not a ruleset over features. Declaring the applicable kinds turns a nonsensical connection
into a refusal rather than a run that concludes nothing.

### This is experiment 61's problem again

[Experiment 61](61-input-dimensions.md) found that person, place and time are already in the
input data and what is missing is **the ability to say which column means what** — and
proposed declaring it on the input, from a fixed list, defaulting to unstated. Role binding is
the same problem with the roles supplied by a ruleset instead of by the application.

The two should share one mechanism rather than inventing a second. Whichever lands first
should be built so the other can use it: a typed field schema per input kind, and a binding
that records itself in the receipt. Generalising `attribute-schema.ts` beyond
`PointCollection` is the enabling work for both, and it is larger than either.

### Refusals this creates

- An **unbound role** leaves a valid draft that refuses to execute, naming the role.
- A **type mismatch** is not offered: a text column is not listed for a numeric role.
- A **unit mismatch or absence** is refused. A length role cannot be bound to a column whose
  unit is unstated, because the project's own finding is that declaring a unit does not verify
  it and an unstated unit is not dimensionless.
- An **unsupported input kind** is refused by the ruleset's declaration, before any binding.
- A **value outside a declared set** is refused for a categorical role, rather than falling
  through to a default branch — which is precisely how the Marina match fails silently today.

## What a ruleset declares

A ruleset is a versioned artifact with an identity, in the shape the registry already uses
for widgets and the catalog uses for packs:

- **Identity and version** — `urn:fieldwork:ruleset:<name>`, versioned independently of the
  widget, because a rule change changes results and must be visible as a version change.
- **The rules**, authored as structured conditions and **compiled** to N3, containing no
  instance data. Amended 2026-10-12; see [the authoring surface](#the-authoring-surface-structured-entry-compiled-to-n3).
- **Declared parameters**, each with unit, type, range, default and meaning.
- **A declared input contract** — which predicates the rules expect, so stage 1 can be
  general and a mismatch is refused rather than silently producing no conclusions.
- **A declared output vocabulary** — the predicate asserted and its permitted values, which
  must include a value for *unknown*.
- **Provenance and citations** — `xpert` applies the published NB06 hierarchy and cites three
  papers. A ruleset carries its basis the way a dataset carries its licence, which is what
  [experiment 56](56-basis-behind-identity.md) means by the basis behind an identity.

## The semantics: what it does, how, how it is validated, what comes out

The vocabulary has to say four things, in the role distinctions this project already keeps —
a widget definition is a contract, a configured node is a **plan**, one execution is an
**activity**, a result is an **entity**.

### What it does, and who does it

| Term | Role | What it is, and is **not** |
| --- | --- | --- |
| `fw:RuleApplication` | `prov:Activity` | One evaluation of one ruleset against facts projected from one input. **Not** inference by the widget: the widget projects, binds and extracts; the engine derives |
| `fw:Ruleset` | `prov:Plan` (and so a `prov:Entity`) | The declared rules, parameters, contracts and citations, identified and versioned. **Not** a computation, and not the published standard it may implement — applying NB06 is not NB06 |
| `fw:RuleApplicationPlan` | `prov:Plan` | The configured node: which ruleset at which version and digest, each bound parameter **with its unit**, each role bound to which field, and the engine's identity and version |
| `fw:Classification` | `prov:Entity` | The result: one asserted value per subject, drawn from the ruleset's declared vocabulary. **Not** a decision anyone has taken, and not a recommendation |

The engine is named as an agent rather than left implicit, because a conclusion is
attributable: the activity records `prov:wasAssociatedWith` the engine as a
`prov:SoftwareAgent` with its version, and the derivation is attributed to the **ruleset and
its version**, not to the widget. A conclusion that changes when a ruleset version changes is
then traceable to the thing that changed.

### How it is validated

Three layers, named per [kinds of validation](../audits/validation.md) so none is mistaken for
another:

- **The ruleset's own declaration** is checked when the ruleset is admitted: parameters carry
  units, the output vocabulary includes an unknown value, the rules contain no instance IRI,
  and the declared input kinds exist.
- **The binding** is checked before a run: every role bound, types compatible, units present
  and commensurable, categorical values within their declared set.
- **The emitted facts** are checked by a SHACL shape, `fw:RuleApplicationShape`, requiring the
  ruleset identity, version and digest; the engine and its version; one `fw:boundRole` per
  declared role; each bound parameter with a `qudt:unit`; the subject counts below; and that
  every asserted value belongs to the declared vocabulary.

A pass on the third establishes that the receipt is well formed. It establishes nothing about
whether the rules are right, which is the ruleset author's claim and carries their citations.

### What comes out, and two distinctions the counts exist for

The output is a classification over the input's subjects, on the general `decisions` port,
carrying the ruleset's declared vocabulary rather than a fixed three statuses. The receipt
records `fw:classifiedSubjectCount` per value, plus two separate counts that must never be
merged:

**An asserted unknown is not an absent conclusion.** Under the open-world assumption that
[the audit procedure](../audits/ontology-audit.md) records, absence of a fact means *unknown*,
so writing `fw:decision fw:Unknown` is a stronger and different statement: it says the rules
ran, considered this subject, and concluded that the evidence does not settle it. The existing
rules already do this deliberately — "Missing evidence stays unknown" — and the vocabulary
must keep the two apart so a reader can tell a considered unknown from a silence.

**An unmatched subject is not an unknown.** A subject no rule fired on is a **gap in the
ruleset**, not a finding about the data. Today's rulesets are small enough to be exhaustive by
inspection; a general widget cannot assume that. So `fw:unmatchedSubjectCount` is emitted
separately, and a ruleset whose declaration does not say whether unmatched subjects are
expected is refused. Collapsing these two counts would let an incomplete ruleset present
itself as a dataset full of uncertainty.

A sketch of the emitted shape, in the form the receipts already use:

    <...:activity> a fw:RuleApplication, prov:Activity;
      prov:used <...:output:input>;
      prov:wasAssociatedWith <urn:fieldwork:engine:eye-js> ;
      prov:qualifiedAssociation [ prov:hadPlan <urn:fieldwork:ruleset:outreach-criteria> ] .
    <urn:fieldwork:ruleset:outreach-criteria> a fw:Ruleset, prov:Plan;
      dcterms:hasVersion "1.0.0"; fw:rulesetDigest "sha256-…";
      dcterms:bibliographicCitation "…" .
    <...:plan> a fw:RuleApplicationPlan, prov:Plan;
      fw:boundRole [ fw:role "distance"; fw:boundField "distance_m" ];
      fw:boundParameter [ fw:parameter "threshold"; qudt:numericValue 5.0;
                          qudt:unit <http://qudt.org/vocab/unit/KM> ] .

## The authoring surface: structured entry, compiled to N3

_Amendment, 2026-10-12, on the user's direction: "It's better to make the widget do
structured UI mediated rules entry than hand written N3. The receipt though should show
valid N3." This supersedes the bare "rules, as N3 text" above._

A practitioner builds a rule from dropdowns — a field, a comparator, a value, combined with
AND and OR, concluding one value from the ruleset's declared vocabulary. N3 is then the
**compiled** form, not the authored one. The receipt shows the compiled N3 alongside the
structured form it came from: the N3 because that is what the engine ran and what the
conclusion is attributable to, the structured form because that is what a practitioner
wrote and can be asked to defend. The ruleset digest is taken over the compiled N3, since
two structured forms that compile identically are the same rules.

### Why this is stronger than a text box, not weaker

The whole codebase uses exactly **two** builtins — `math:greaterThan` and
`math:notGreaterThan`, five occurrences each — with conjunction and nothing else. No
negation, no recursion, no aggregation. That subset is currently honoured by the author's
restraint and checked by nothing.

A text box would admit the rest of N3, and this project cannot validate what it would
admit: deciding whether a hand-written ruleset terminates, or stays monotonic, is not a
check anyone writes. A builder that can only emit the subset makes the guarantee
**structural**. Two of the validation rules this record proposes stop being checks and
become impossibilities: a ruleset cannot contain an instance IRI because the builder offers
fields and values, never subjects; and it cannot use negation-as-failure because the
comparator list does not contain it.

So the gain is not convenience. It is that the subset becomes a property of the authoring
surface rather than a claim about the author.

### Comparators, and the two kinds of negation

Negating a **comparison** is safe. The complement of `math:greaterThan` is
`math:notGreaterThan`, which the rules already use; the pair is total over numbers, and
swapping one for the other keeps the rule monotonic. A numeric comparator dropdown with
greater-than, not-greater-than, less-than and not-less-than, and a categorical one with
term equality by unification and `log:notEqualTo`, all stay inside the subset. These are the
negators to offer.

Negating **existence** is not safe, and is the trap the dropdown must not open. "No alert
recorded" asks the engine to conclude from the absence of a fact, which is negation-as-
failure: non-monotonic, so adding a fact *retracts* a conclusion, and flatly against the
open-world reading [the audit procedure](../audits/ontology-audit.md) records. All three
current rulesets avoid it deliberately, and the evidence is in the code: `fw:alertKnown`,
`fw:distanceKnown` and `fw:accessKnown` are pre-asserted booleans, so absence is a
**measured fact in the facts** rather than an inference from silence. That pattern becomes
the rule. Stage 1 asserts a `*Known` boolean per bound role for every subject, and the
builder offers "is not recorded" as an ordinary comparison against that boolean. The
practitioner gets the condition they wanted; the engine never reasons from silence.

### AND is native; OR multiplies rules

AND is conjunction in the antecedent — one rule, several conditions, which is what the three
existing rulesets already are.

OR is **not an N3 feature**. It compiles to rule multiplication: one rule per disjunct,
each asserting the same conclusion. This is worth stating because it is visible in the
receipt: a practitioner who writes one rule with two ORs of two will see four rules in the
N3, and should, because four rules is what runs. It also means the compiler expands to
disjunctive normal form, which grows multiplicatively, so the builder states a rule-count
ceiling and refuses past it rather than emitting a receipt nobody can read.

### What OR makes reachable, and what it does not

**Correction to an earlier reading in this session:** I had recorded that two rules
asserting different conclusions for one subject would silently overwrite each other. They
do not. Both extraction sites already refuse:

    if(decisions.has(id)&&decisions.get(id)!==decision)
      throw new Error('Reasoner returned conflicting decisions.');   // src/core.ts, policy

    if(terms.length!==1||!allowed.some(t=>t===terms[0]))
      throw new Error(`Missing or conflicting ${predicate} assertion for ${id}.`);
                                                        // src/old-naledi.ts, assertion()

So OR introduces no silent wrong answer. What it introduces is a **reachable run-time
failure with no authoring-time guidance**: a practitioner can build two groups whose
conditions overlap and whose conclusions differ, and get "Reasoner returned conflicting
decisions" that names neither group.

The familiar escape — an ordered list where the first matching rule wins — is **not
available in this subset**, because first-match requires negating the earlier conditions,
which is the non-monotonic operator just excluded. Choosing structured entry therefore
forces the honest option: conclusions must be **mutually exclusive by construction**, and
the builder checks exclusivity before it will compile, on numeric ranges and on categorical
value sets, where both are decidable. A ruleset whose groups overlap is refused at
authoring time, naming the two rows, instead of at run time naming nothing.

This is a constraint the dropdown surface imposes on the ruleset design, not a limitation of
the dropdown. It is also the first place where the open-world discipline costs a familiar
convenience, and that is worth watching: if practitioners keep reaching for first-match
ordering, the finding is about the subset, not about them.

### What this still cannot establish

That a practitioner can author a correct rule from dropdowns, or read the compiled N3 and
recognise their own intent in it. Both are observations for the runbook work in
[experiment 63](63-worked-example-runbooks.md), and neither is settled by the compiler
being correct.

## The merge, half done — and what below, above and forward say about it

_2026-10-12. The rules are now declared data and the assembled text is byte-identical to what the
template literals produced (`tests/rulesets.test.mjs`). The four widgets still exist. This section
is the three stances the practitioner asked for, applied to `policy`, because it is the widget
this record is mostly about and the one whose residual decides the shape of the merge._

### Below · one tree: what is `policy`'s unique contribution to the forest?

Its executor, stage by stage, with the ruleset already extracted:

| Stage | What `policy` does | General? |
| --- | --- | --- |
| Read inputs | `inputs.distances`, `inputs.alert`, `node.params.thresholdKm` | general, given declared ports |
| Facts and binding | `makeN3(rows, alert, threshold)` | general now — the ruleset declares the contract and the parameter |
| Evaluation | `await reasoner(n3.input)` | already shared |
| Extraction | read `fw:decision`, check it is in the vocabulary, **refuse a conflict**, refuse an unclassified subject | general, given a declared vocabulary |
| **Explanation** | `` `Nearest center: ${r.center.name}. Distance ${r.distance.toFixed(2)} km ${r.distance>threshold?'>':'≤'} ${threshold} km. Heat alert ${alert.active?'active':'inactive'} on ${alert.date}.` `` | **no** |

So the residual is one sentence. Everything else is one of four general stages plus declared data.

That sentence is not trivial, which is the finding. It is the **evidence surface** — what a
practitioner reads in order to challenge a decision, and the thing
[94](94-where-explanation-belongs.md) is about. And it is *ruleset knowledge written in widget
code*: it restates the ruleset's own conditions in English, naming its roles, its comparison and
its unit.

Three concrete consequences, all of them things this record did not say:

- **The ruleset format needs an explanation section**, declared per conclusion value, or the merge
  either loses the evidence surface or keeps four widgets' worth of prose in the host. This record
  specifies identity, rules, parameters, input contract, output vocabulary and provenance, and
  **not this**. That is a gap, found by looking at one tree.
- **The explanation hardcodes the unit a third time.** `nearest` carries a unit knob as of
  2026-10-12; three display readers were fixed that day for saying "km" regardless; this is a
  fourth site, inside a sentence. A declared template would take the unit from the bound role.
- **Its unknown wording is example-specific**: `'Heat alert status is missing.'` is the fallback
  for every unknown this widget produces. A declared ruleset should say why its own unknowns
  happen, since it is the thing that knows.

A fourth, smaller: `fw:distanceKm` is a **predicate** with a unit welded into its name. The
1.0.0 ruleset keeps it, because this version must reproduce the shipped conclusions exactly; a
unit-free predicate with a declared unit is what 2.0.0 is for.

### Above · the forest: two bodies, one artefact kind

The framework emerging has three layers, and the second and third are **converging on one shape**.
Measured by comparing the one shipped composition against a shipped ruleset:

| | |
| --- | --- |
| Shared core, 8 fields | `schema`, `id`, `version`, `title`, `released`, `description`, `mustNotBeReadAs`, `parameters` |
| Composition only | `nodeType`, `stage`, `author`, `governance`, `members`, `edges`, `ports` |
| Ruleset only | `rules`, `inputContract`, `outputVocabulary`, `basis` |

So there is one **declared artefact** emerging with two bodies: an arrangement, or a rule set.
Both are data, versioned, digested, offline-bundled, and carrying a statement of what they must
not be read as. The forest is not "a GIS with widgets". It is **an engine plus a catalogue of
declared knowledge**, and the widget count falling is the symptom, not the goal: knowledge is
moving to the layer where it can carry a version, a digest and a citation.

Two gaps fall straight out of the table, and each is the other's mirror:

- A **ruleset has no `author` or `governance`**, which a composition has. Nobody owns a ruleset,
  and a ruleset is exactly the kind of artefact that needs an owner.
- A **composition has no `basis`**, which a ruleset now has. A composition asserting
  `fw:claimsNoComputation` still arranges things for a reason, and that reason is uncited.

And the consequence for the target: `widgets/budget.json` aims at 41 because 64 counted planned
retirements. Above says 41 is not a destination — the right number is *however many irreducible
operations there are*, which nobody has counted. The target is a direction, and it should stop
being read as an arrival.

### Forward · what this means for emergence

The widget set grew 39 → 51 in three days because **nothing owned the total**, and every one of
the twelve passed its own admission review honestly. A ruleset is cheaper to add than a widget —
data, no code, no release build, no lab check — so the same failure is available one layer down
and will arrive faster.

**But the constraint must be a different one, and copying the widget rule would be the error.**
A widget must be **general**: that is what `widgets/standardization.json` enforces, and why twelve
example-specific widgets were a problem. A ruleset must be **particular** — knowledge about a
place, a disease, a published hierarchy is precisely what the layer exists to hold. Refusing an
example-specific ruleset would refuse the point of it.

What a ruleset can be wrong about is its **authority**. So the ratchet counts rulesets with no
cited basis, and `scripts/validate-rulesets.mjs` is that ratchet, written before the layer is
finished rather than after. It also makes four things required of every ruleset that the three
shipped ones happened to have: a basis with a status and who states it, what it must not be read
as, an unknown value in every output vocabulary, and no instance IRI in the rules.

Today it reports **2 of 3 uncited**, which is a number that did not exist yesterday:
`nb06-evidence` carries NB06 and three papers; `outreach-criteria` says "Threshold is
illustrative"; `access-review` says "not a clinical recommendation or routed travel time". Both of
those are honest and neither is a source. Extracting the rules is what made the difference
countable, and `rulesets/ledger.json` records what would cite each — including that `access-review`
has **three** uncited numbers, not one, because its 5, 15 and 30 minute zone bounds are literals
in the rules rather than parameters.

## Distinctions, and how each is enforced

| Distinction | Enforcement |
| --- | --- |
| A ruleset classifies; it does not enumerate instances | **Validation rule**: a ruleset whose rules contain an instance IRI from a dataset is refused. This is the check that would have caught the Marina match |
| A widget must be general; a ruleset must be sourced | **Two ratchets, deliberately different**: `validate-standardization.mjs` refuses an example-specific widget, and `validate-rulesets.mjs` does **not** — it counts uncited bases instead. Copying the widget rule to this layer would refuse the knowledge the layer exists to hold |
| An explanation is the ruleset's, not the widget's | **Open**: `policy`'s explanation sentence is its only residual, and this record does not specify where it goes. Named here rather than discovered during the merge |
| The authored form is structured; N3 is compiled | **Structural**: the builder emits only the subset, so instance IRIs and negation-as-failure are unreachable rather than checked. The receipt shows both forms, and the digest is over the compiled N3 |
| Negating a comparison is safe; negating existence is not | **Hard stop**: the comparator list contains complementary numeric builtins and `log:notEqualTo`, and no scoped negation. Absence is expressed against a pre-asserted `*Known` boolean, as the three current rulesets already do |
| Two conclusions for one subject is an error, not a precedence | **Precondition**: the builder refuses overlapping groups with differing conclusions at authoring time, naming the rows. Both extraction sites already refuse at run time, so this is guidance, not a correctness fix. First-match ordering is unavailable in the monotonic subset |
| A threshold without its unit is not a threshold | **Validation rule**: a numeric parameter must declare a unit |
| An unknown is not a negative | **Validation rule**: the declared output vocabulary must include an unknown value, and missing input must map to it. The existing rules already honour this — "Missing evidence stays unknown" — and the check makes it binding on every future ruleset |
| Applying a published hierarchy is not the same as the hierarchy | **Limitation**, stated in the ruleset's own provenance, plus required citations |
| A rule change changes the result | **Precondition**: the receipt records ruleset identity, version and digest, and a saved workflow that cannot resolve them refuses to run rather than silently using the current rules |
| A bound parameter is not rule text | **Hard stop**: parameters are typed and validated before substitution; rule text is never assembled from unvalidated input |

## Audit answers

- **D1** — Primitive, on the palette. Residual knowledge: everything in the table above,
  none of which follows from "evaluate N3". A practitioner asks for it by name, though the
  *name* matters: not "Apply N3 rules" but something a practitioner recognises.
- **D2** — No existing widget applies a declared ruleset. The three it replaces are the
  duplicates.
- **D4a** — Input: the general `points` stud plus a declared fact contract. Output: the
  general `decisions` stud carrying the ruleset's declared vocabulary, which **retires
  `gradedFacilities`**, one of the six custom studs.
- **D7** — The name must not claim to reason. It evaluates a declared ruleset; the knowledge
  is the ruleset's, not the widget's.
- **D9** — Node-count neutral: one node becomes one node with a ruleset selected, so no
  worked example grows. This is the advantage collapsing has over decomposing.
- **D10** — Old Naledi and the heat example exercise it the moment their rulesets are
  extracted, so coverage is immediate rather than deferred.

## Migration

Three node types become one widget plus three declared rulesets. The adapter pattern from
[experiment 18](18-shared-input-standardization.md) applies: a saved workflow containing
`policy`, `xpert` or `access_policy` resolves to the new widget with the corresponding
ruleset and version pinned, and must produce **identical** results — including Old Naledi's
existing classifications, which the browser suite already checks.

The Marina and Broadhurst matches cannot be carried across unchanged, because the ruleset may
not contain instance data. They become what they always were: an attribute of those facility
records in the example's own data, declared as an input. That changes the Old Naledi example's
data, not its results, and the existing regression expectations are what prove it.

## The widget is an interpreter, and the ruleset is the program

_Added 2026-10-14, from the practitioner:_

> In a nutshell, a ruleset widget is like a mini-software program with many possibilities
> because of how rules may be combined to produce an output.

That reading settles four questions this record had been answering one at a time, because
each is a property of interpreters rather than a quirk of this widget.

| In the frame | Here |
| --- | --- |
| the interpreter | `apply_ruleset` — one widget, one contract: apply what this node was given |
| the program | the ruleset document: rules, declared expectations, declared ports |
| its arguments | the ruleset's declared parameters, bound on the node |
| its signature | the ports — which belong to the program, not the interpreter |
| its execution record | the N3 receipt |

**Why the ports are late-bound.** A signature belongs to a program. One `apply_ruleset`
node takes `polygons` and gives `polygons`; another takes `distances` and `alert` and gives
`decisions`. The interpreter cannot declare either.

**Why one palette entry and not one per ruleset.** You do not put every program in the menu
of an interpreter. The practitioner's decision of the same day — *"when we offer instances
of rulesets as widgets, that's the recipe for exponential clutter"* — is the same point:
the palette offers the interpreter, and the Inspector chooses the program.

**Why "many possibilities" is the hard part.** Rules compose. The output space of a ruleset
is not enumerable from the widget, which is why experiment 112 could predict a successor
for a routing step and could predict nothing for this one.

### The receipt is the node's final state, and it was citing the wrong program

The practitioner, in the same exchange: *a ruleset widget's N3 receipts represent the final
state of the node when the ruleset is configured and the ports are bound.* Tested against
the code, and it failed.

**All four fact generators resolved their own ruleset version rather than the node's pin.**
`extentN3` hardcoded `extent-review 1.0.0`, `makeN3` `outreach-criteria 1.0.0`, `accessN3`
`access-review 1.0.0`, `facilityN3` `nb06-evidence 1.0.0`. So a node pinning
`extent-review 1.1.0` produced a receipt citing **1.0.0** — the receipt stated a program the
node had not chosen.

It survived because the rules are byte-identical across every pair of versions this build
carries: `access-review` 1.0.0/2.0.0, `nb06-evidence` 1.0.0/2.0.0 and `extent-review`
1.0.0/1.1.0 differ in their declared PORTS and not in their rules. So no conclusion was
ever wrong, and nothing could have noticed. The next version that changes a rule would have
made every receipt of it a false citation.

Fixed by passing the node's pinned version into each generator. Verified on both worked
examples: three ruleset nodes, each receipt now citing the version its node pins.

**What this does not fix** is the one the blocker `ruleset-pin-has-no-digest` records: a
pin names a version and carries no digest, so the receipt still cannot prove *which text*
that version was. Naming a program without identifying it is the gap, and for an
interpreter that is the whole provenance question.

## What this cannot establish

That any ruleset is correct, or that NB06 is applied faithfully — the widget evaluates what it
is given and records which rules ran. That extracting the rules preserves Old Naledi's
behaviour: the regression suite decides that, and if it does not hold, this record is wrong
and should say so. And nothing about whether a practitioner can read a ruleset, which is a
question for the runbook observation in [experiment 63](63-worked-example-runbooks.md).

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
| 2026-10-12 | 65: structured rule entry, with N3 as the compiled form |
| 2026-10-12 | The ruleset layer gets its constraint at birth, and it is not the widget's |
| 2026-10-14 | The practitioner's frame -- a ruleset widget is a mini-program interpreter -- recorded, and it settles why the ports are late-bound, why one palette entry is right, and why a successor cannot be predicted for this widget. Tested their other statement, that the receipt is the node's final state once configured and bound: it failed. All four fact generators resolved their own hardcoded ruleset version instead of the node's pin, so a node pinning extent-review 1.1.0 cited 1.0.0. It survived because rules are byte-identical across every version pair this build carries. Fixed and verified on both worked examples |

## The interpreter has a branch per program, and the general answer is already written

_Added 2026-10-25._

The frame above says the widget is an interpreter and the ruleset is the program. An
interpreter that must be **edited to run a new program** is not one. That is the state today:
`src/core.ts` carries four hand-written cases — `outreach`, `polygon-extent`, `access-review`,
`facility-grading-points` — each projecting its ruleset's conclusions back onto records in its
own way. The code already admits it, in the comment on the second:

> That this case had to be written is the experiment's own finding. A ruleset declares its
> `projection` as data, but the handler for a new one is a branch here, so adding a ruleset
> over a shape nothing had classified before is **not a data change**.

**The general answer exists and is used by the other half of the system.**
`authoredProjection` in `src/authored-application.ts` takes a `PointCollection` **or** a
`DataTable`, applies conclusions to the subjects they were drawn about, and writes them back —
as new key columns on a table, as merged properties on points — leaving the value field
untouched, *"so what the table MEASURES is still the thing it measured."* Rules a practitioner
authors go through it. Rulesets this project ships do not.

So the work is subtraction: bundled rulesets adopt `authoredProjection` through declared
column-to-predicate bindings, and the four branches retire. One mechanism in, four out. It is
the same mechanism [115](115-decomposing-the-projection-extract.md)'s P1 needs, which is why
an `extract-contract` ruleset would otherwise have required a fifth branch to be written for it.

### What this makes reachable: transforming a column

The practitioner, 2026-10-25, on where a recode belongs: *"all the above can be built into the
ruleset widget."* Checked against **Epi Info's documented command set** (CDC), which separates
four commands this project had been treating as one:

| Epi Info | here |
| --- | --- |
| `IF` | the authored form's `any` / `all` conditions and its `then` conclusions — built |
| `DEFINE`, `ASSIGN` | `authoredProjection` writing a conclusion as a new column — built |
| `RECODE` — a **bounded** from→to map, not a general conditional | expressible as `IF`/`THEN` today; the bounded form is not built |

Two consequences worth stating separately, because they are different kinds of gap.

**Recoding a column already works** for a practitioner authoring rules on `apply_ruleset`: the
conclusions land as columns beside the data. No example demonstrates it, no manual page says
it, and nothing in the palette suggests it — which is a **confusion** cost under
[the directions register](../directions.json)'s
`streamlining-measures-confusion-and-duplication`, not a missing capability.

**A bounded map is a different artifact from a rule**, and the distinction is worth keeping:
a from→to table can be read at a glance, checked, and its unmapped values enumerated, while an
arbitrary condition cannot. If one is built it is declared data, and an unmapped value is
reported by name rather than passing through silently — the stance
[138](138-a-table-and-a-boundary-are-two-tables.md) takes for a row naming no part.

The epidemiological case for it is concrete and is already in this repository. The
person-denominated rate ratio in South London groups 32 sub-districts into three water-supply
groups, and works only because the published table carries a `water_supply` column —
**a recode somebody performed by hand before the data arrived**. A practitioner holding only
sub-district names could not have produced those groups here.

