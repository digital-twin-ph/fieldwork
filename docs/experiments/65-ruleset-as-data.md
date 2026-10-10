# 65 · A ruleset as declared data, and where its knobs live

_Created 2026-10-09 · Updated 2026-10-09_

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
- **The rules**, as N3 text, containing no instance data.
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

## Distinctions, and how each is enforced

| Distinction | Enforcement |
| --- | --- |
| A ruleset classifies; it does not enumerate instances | **Validation rule**: a ruleset whose rules contain an instance IRI from a dataset is refused. This is the check that would have caught the Marina match |
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

## What this cannot establish

That any ruleset is correct, or that NB06 is applied faithfully — the widget evaluates what it
is given and records which rules ran. That extracting the rules preserves Old Naledi's
behaviour: the regression suite decides that, and if it does not hold, this record is wrong
and should say so. And nothing about whether a practitioner can read a ruleset, which is a
question for the runbook observation in [experiment 63](63-worked-example-runbooks.md).
