# 66 · Ports as semantic connections: syntactic, semantic and pragmatic interoperability

_Created 2026-10-10 · Updated 2026-10-19_
_Uses a term this project withdrew on 2026-10-12, named in [the withdrawn-vocabulary ledger](../withdrawn-vocabulary.json). The text stands as written — it is evidence of what was thought then, and rewording a dated record would falsify it. Live text says **port type** for what a connection is checked against._


**Status:** reframing, with a measurement. No code changes and no implementation proposed;
this is a base-contract reframe that supersedes advice in three earlier records and should be
settled before the work they describe is done.

Today a connection is a string comparison. `validateWorkflow` accepts an edge when the
producer's `PortType` is exactly equal to the consumer's declared input type, and otherwise
throws "Incompatible node connection."

The reframe: a port is a **semantic connection**, and what a connection checks is whether the
producer's data satisfies what the consumer needs — at three levels, not one. Interoperability
is **syntactic**, **semantic** and **pragmatic**, and a `PortType` string is a one-word summary
of all three at once. Everywhere that summary is too coarse, the project has added something to
compensate — a run-time check, or a new type name. Both are the missing levels implemented by
hand.

## The measurement that forced this

Of fifteen port types, eight have a single producer and at most one consumer. Listed with
their endpoints, they are not data kinds at all:

| Port type | From | To |
| --- | --- | --- |
| `facilities` | `facilities` | `xpert` |
| `gradedFacilities` | `xpert` | `access`, `facility_audit` |
| `access` | `access` | `access_policy` |
| `distances` | `nearest` | `policy` |
| `alert` | `alert` | `policy` |
| `coverage-check` | `coverage_check` | `map_output`, `table_output` |
| `point-comparison` | `compare_point_sets` | `comparison_map` |
| `mean-center` | `mean_center` | **nothing** |

Two chains are visible in that table: `facilities → xpert → access → access_policy` is the
Old Naledi pipeline, and `nearest → distances → policy ← alert` is the heat pipeline. **These
eight port types are the wiring of two worked examples, promoted into the type system.** Each
means "whatever the previous step in this example emits", which is a schema — named, frozen,
and unreadable by anything else.

`mean-center` is the limit case: a port type with a producer and no consumer. A stud that
fits nothing.

## Three levels of interoperability, where there is now one

A port is a **semantic connection** between widgets, and interoperability has three levels in
the sense health informatics already uses them. A single `PortType` string conflates all
three, which is why it fails in three different ways.

| Level | The question | Carried by | Enforcement |
| --- | --- | --- | --- |
| **Syntactic** | Can this data even be carried and parsed? | The **carrier kind**: features, table, raster, graph | **Hard stop.** A table has no geometry, and flattening it to features loses the key — a category error, not a mismatch ([48](48-tabular-input.md)) |
| **Semantic** | Does the same field mean the same thing on both sides? | **Declared roles**: a class, a datatype, a unit, a value set | **Validation rule**, before the run: a role unbound, mistyped, or bound to an unstated unit is refused |
| **Pragmatic** | Is it *fit for the use the consumer will make of it*? | **Declared qualifiers and fitness conditions**, evaluated against provenance | **Validation rule**, and often only a refusal or an unknown — see below |

Carrier kinds stay a type because the distinction is real: `fw:DataTable` is declared disjoint
from `fw:PointDataset` for exactly this reason. Candidates are **features, table, raster,
graph** — and the six port types that measured as general (`points`, `table`, `polygons`,
`raster`, `area`, `decisions`) are nearly that list already. Fifteen types resolve into
roughly four carriers plus declarations.

### The pragmatic level is where this project's findings actually live

This is the useful part of the reframe. Almost every distinction the project has discovered is
a **pragmatic** failure: the data parses, the terms mean what they say, and it is still wrong
for the use being made of it.

| Finding | Syntactic | Semantic | Pragmatic |
| --- | --- | --- | --- |
| A projected change compared to an elevation ([62](62-workflow-traversal.md)) | fine, both numbers | fine, both lengths in metres | **wrong**: measured from different references, so the comparison is meaningless |
| 250 rows holding 489 deaths ([61](61-input-dimensions.md)) | fine, an integer column | fine, a count | **wrong**: a row is an address, not a case |
| A rate whose denominator year differs from its numerator period ([51](51-dataset-profiles.md)) | fine | fine, both counts | **wrong**: not a rate |
| Matching facilities by name ([65](65-ruleset-as-data.md)) | fine, both strings | fine, both names | **wrong**: names repeat, so it finds the wrong record without failing |
| A projection at a site used for an arbitrary point ([47](47-sea-level-pack.md)) | fine | fine, a real distance | **wrong**: a value at a site is not a value here |

A port system that checks only the first column — which is what a type-name comparison does —
cannot see any of these. A typed schema adds the second column and still cannot see them. That
is why the run-time checks and the private wires accumulated: they are the pragmatic level,
implemented by hand, one widget at a time.

### Pragmatic fitness is evaluated against provenance, and the ecosystem makes it decidable

The practical consequence, and the reason the provenance apparatus turns out to be
load-bearing rather than decorative. There is nothing wrong with the *values* in any row
above. The question is whether the producer's **declared qualifiers** satisfy the consumer's
**declared conditions** — and both are provenance, not payload.

So a consumer declares its fitness conditions in the same form the qualifiers already take:
this comparison requires an elevation whose vertical reference is relatable to the
projection's baseline; this rate requires a denominator whose vintage covers the numerator's
period; this counting widget requires a layer whose row meaning is declared. The check reads
declarations, not numbers, and it can run before anything executes.

**Inside the ecosystem this verdict is total; the limit is at the boundary.** Widgets are
governed entities, so the premises a fitness condition needs are available by obligation: every
input is another widget's declared output. A condition therefore returns a definite answer —
satisfied, or refused with the reason and the node responsible.

What cannot be certified is a declaration's **truth**, because that is a claim about the world
rather than about the graph. A widget declaring metres and faithfully carrying millimetres
satisfies every condition in the system, which is the sea-level chain in
[experiment 62](62-workflow-traversal.md). Only comparison against an external implementation
reaches that, and it covers four of thirty-nine widgets
([kinds of validation](../audits/validation.md)). So the honest division is not input against
output, but **inside the governed system, where conditions decide, against outside it, where
only parity speaks.**

### What the ontology supplies at each level

Reusing the vocabularies already in the audit's glossary rather than inventing a layer:

- **Syntactic** — `fw` carrier classes with their disjointness, GeoSPARQL for geometry where a
  carrier has any, and the existing receipt shapes for structure.
- **Semantic** — `fw` properties for roles, **QUDT** for units so a number carries what it
  measures, and **SKOS** concept schemes for declared value sets. The glossary already notes
  SKOS is for controlled category lists rather than classes, which is exactly what an evidence
  level, a decision status and an event-date kind are.
- **Pragmatic** — **PROV-O** for the lineage the conditions are evaluated over, DCAT and
  Dublin Core for dataset identity and vintage, and SHACL for the conditions themselves,
  because SHACL rejects rather than infers and a fitness condition must reject.

That split also says where a new term belongs, which has been decided case by case until now.

## Each port checks its own side

If a port carries the contract, the port is where the check belongs. The output port validates
what the widget emits against its declared contract; the input port validates what arrives
against what it requires. Contract and check live together, which is the whole point of
putting the declaration on the port rather than in prose.

| | Output port | Input port |
| --- | --- | --- |
| Checks | Did I produce what I promised? | Is what arrived fit for what I will do with it? |
| Kind of condition | A postcondition on the producer | A precondition on the consumer |
| Catches | Drift between a widget's declaration and its code; a missing unit, an undeclared field, a value outside its own declared set | Wrong producer, an unbound role, an unstated qualifier, a pragmatic mismatch |
| Attributes the fault to | The producer, where the fault is | Correctly, instead of blaming the consumer for its input |

Fault attribution is the practical reason for doing both rather than only the input side. With
input checks alone, a producer that fails to emit a unit surfaces as the *consumer* complaining
that a unit is missing, and an author debugs the wrong widget.

This also gives the four wrong-producer run-time checks their home: they become input-port
validation. The other eight — presence, arity, graph shape, configuration readiness — are
properties of the graph rather than of one edge, and stay in `validateWorkflow`.

### Three things the symmetry hides

**Both sides can reach a definite verdict, because the ecosystem is governed.** An earlier
draft of this record claimed the input side could only refuse or abstain, on the grounds that
an unstated qualifier means unknown. That reasoning imported the open-world assumption from the
general case, where data arrives from anywhere. It does not hold inside Fieldwork.

A widget's input is **always another widget's output**, and every widget is a governed entity:
admitted to the registry, carrying a declared contract, checked by `validate:widgets`. The set
of possible producers is enumerable and each one's obligations are known. So if every output
port is obliged to declare its qualifiers and validates that it did, a consumer never faces
unstated provenance from inside the graph — the premises its fitness conditions need are there
by construction.

The uncertainty is therefore not spread across the system. It is **localised to the boundary**,
where data enters from outside: an import widget reading a file, or a practitioner typing a
datum. That is a design requirement rather than an observation, and it has two consequences.

First, **import widgets carry the obligation to obtain declarations.** This is what
[experiment 61](61-input-dimensions.md) proposed — declare on the input, from a fixed list,
which column means what — and it is load-bearing rather than convenient: the whole
interoperability story downstream inherits its certainty from what the boundary established.
The sea-level datum being free text is the same failure seen from this angle: an obligation at
the boundary that was never enforced.

Second, **an unstated qualifier taints, and a taint still yields a definite verdict.** An entry
point may record that a unit was never stated — `table_input` already does exactly this, and
[experiment 48](48-tabular-input.md) was right that it must not assume dimensionless. That
unknown then propagates as a *known* unknown, with provenance naming where it entered. A
downstream widget whose condition needs that unit does not shrug; it **refuses, and says which
node left it unstated.** "Unknown" is a fact about the data; the verdict about the connection is
total either way, and PROV is what makes the refusal attributable rather than mysterious.

So the real asymmetry is not output against input. It is **inside the ecosystem against
outside it** — which is the next point.

**Conformance to a declaration is not correctness of the declaration.** Output validation
checks that a widget emits what it said it would. It cannot check that what it said is true. A
widget declaring `unit: metre` and faithfully emitting the numbers it was given passes, even
when the source published millimetres — which is precisely the sea-level chain in
[experiment 62](62-workflow-traversal.md), where every layer was self-consistent and the unit
was never read from the file. Only parity against an external implementation reaches that, and
it covers four of thirty-nine widgets
([kinds of validation](../audits/validation.md)). Output validation must not be reported as
more than it is.

**When it runs is a separate decision with a cost.** Today SHACL runs in development tooling
and the browser neither displays a live report nor blocks export on failure
([the audit procedure](../audits/ontology-audit.md)). Validating every output on every run,
over inputs capped at 2,000 features, is a change to that stance and needs a measurement rather
than an assumption. The staged answer is to validate at the boundary in the development gate
first — where the fixtures already replay — and to decide separately, with numbers, whether a
run in the browser blocks or reports.

### What this would unlock

A widget whose output port validates has a **verified** contract rather than an asserted one,
which is the project's oldest theme — declaring a unit does not verify it. That is also the
mechanism the registry currently lacks: `validate-widgets.mjs` requires every release to claim
`validationStatus: "application-only"`, and nothing today could justify more. A checked output
contract is what a stronger claim would rest on, so this and the registry's ceiling are one
question asked twice.

## Testing a widget is testing its ports

If the contract lives on the port, then the cases that make or break a connection *are* the
widget's tests, and the matrix is derivable rather than invented.

Measured 2026-10-09: thirty-four widgets declare an output and fifty consumer input ports
exist, giving **1,700 candidate pairs — 200 allowed and 1,500 refused.** The number of unit
tests asserting a refused connection is **one**. The port system makes seventeen hundred
decisions and one of them is checked.

### The matrix can be generated and frozen

Allowed-ness is a pure function of the declarations, so the whole matrix can be computed and
committed as a fixture. That costs little and buys two things the project does not have: a
change to any contract shows up as a **diff in the matrix** rather than as a surprise in a
workflow, and a reviewer can see the composition surface of the whole set on one page.

It is also the honest form of the claim. A generated matrix asserts what the declarations
*say*, so a diff means "something you declared changed". It is not evidence that the allowed
connections are sensible — that is what the per-level cases below are for.

### Cases per level, which is where the three levels pay off again

A port's test cases are not a judgement call once the levels are named:

| Level | Output port | Input port |
| --- | --- | --- |
| **Syntactic** | Emits the declared carrier kind, and nothing else | Refuses every other carrier kind. A table offered where features are required fails here, not later |
| **Semantic** | Every declared field present, of the declared type, with its unit where one is declared; values inside their declared value sets | Refuses an unbound role, a type mismatch, and a unit that is absent or of the wrong dimension |
| **Pragmatic** | Qualifiers carried through from the input's provenance rather than dropped | Refuses when a fitness condition is contradicted, **naming the condition**; and when a needed qualifier was never stated, refuses **naming the node where it was lost** |

Two cases deserve naming because they are the ones most likely to be skipped, and both are
findings from this session rather than hypotheticals:

- **The explicit unknown.** An output must assert an unknown where it concluded one, not omit
  the subject — a considered unknown and a silence are different statements
  ([65](65-ruleset-as-data.md)).
- **The taint.** A qualifier left unstated at entry must still produce a definite refusal
  downstream, with the entry node named. A test that only checks the happy path cannot tell a
  propagated unknown from a lost one.

### What this replaces

The twelve run-time `Connect …` checks are, read this way, twelve connection test cases that
were implemented as code instead. Four are input-port refusals at the semantic or pragmatic
level; the other eight are graph properties and belong to `validateWorkflow`, with their own
cases. Either way the test exists — the question has only been where the check lives.

## Per-port evidence in the widget's metadata

A release file today records ports as a list of names and types, and records validation once
for the whole widget. Under this reframe both are too coarse: the contract is per port and per
level, so the evidence must be too. Each port should carry, for each of the three levels,
whether a condition is declared, how it is enforced, and **which test covers it**.

A sketch, in the shape the release format already uses:

    "ports": {
      "inputs": [{
        "port": "assignments",
        "carrier": "table",
        "roles": [
          {"role":"projected_change","type":"number","unit":"length"},
          {"role":"elevation","type":"number","unit":"length"}
        ],
        "conditions": [
          {"condition":"elevation reference relatable to projection baseline",
           "enforcement":"validation-rule",
           "tests":["tests/sea-level.test.mjs#refuses an unrelatable vertical reference"]}
        ],
        "evidence": {
          "syntactic":"enforced",     "semantic":"enforced",
          "pragmatic":"declared-only"
        }
      }],
      "output": { "...": "the same, as postconditions" }
    }

Three rules keep this from becoming a place to make claims, which is the risk the current flat
`validationStatus` avoids by forbidding every value but one.

**Named tests must be verified to exist.** `validate:widgets` should resolve every test
reference and fail when one is missing or renamed. A metadata field naming a test that does not
run is worse than an empty field, because it reads as evidence. This is the check that makes
the difference between recording evidence and asserting it — the project's oldest rule, that a
declaration is not a capability, applied to the evidence field itself.

**The widget-level status becomes derived, not written.** Rather than each release declaring
`validationStatus`, the widget's status is computed as the weakest level across its ports, the
way `classification.json` is already derived by the build and must never be hand-edited. A
widget cannot then claim more than its ports support, and the ceiling stops being a flat
constant: a release gets the status its evidence earns.

**At-release evidence and post-release evidence stay apart.** Per-port evidence is what was
true when the release was committed, and release files are immutable. Parity accrues
afterwards in `widgets/parity.json`, pinned to the Validation Lab commit that produced it. The
two must not be merged, and neither should be read as the other
([kinds of validation](../audits/validation.md)).

### What this resolves

The registry currently requires every release to declare `validationStatus:
"application-only"` with no shapes, and `evidence.status: "not-individually-certified"`. That
ceiling exists for a good reason — nothing verified a widget's contract, so any stronger claim
would have been unfounded. Per-port evidence plus output-port validation is the mechanism that
would make a stronger claim mean something, and the derived status is what prevents it being
claimed before it is earned.

So the four artifacts have distinct jobs and distinct lifetimes: `classification.json` derived
at build, a generated connection matrix derived at build, per-port evidence fixed at release,
and `parity.json` accruing after it.

## Tests as queryable facts, not file references

A test named in a JSON field is a string. The question worth asking of this work is not "which
file covers this port" but "**which port conditions are covered by nothing**", and that is a
query. So the evidence belongs in the graph, on the same terms as everything else here.

The modelling follows the triad the project already keeps. A **test case** is a declared
specification, so a `prov:Plan`: it names the port, the level and the condition it covers. A
**test run** is one execution, so a `prov:Activity`, carrying the commit and the platform. A
**result** is a `prov:Entity`.

### Reuse EARL rather than mint terms

[EARL](https://www.w3.org/TR/EARL10-Schema/), the W3C Evaluation and Report Language, exists
for exactly this and is not yet used here. Reusing it follows the rule the audit procedure
already applies to GeoSPARQL, PROV-O, QUDT, DCAT and SKOS, and it supplies the part that
matters most — an outcome vocabulary that is honest by construction:

| EARL outcome | What it means here |
| --- | --- |
| `earl:passed` · `earl:failed` | The case ran and settled |
| `earl:cantTell` | It ran and did not settle — the analogue of a considered unknown |
| `earl:inapplicable` | The level does not apply, as the pragmatic level does not for a port with no fitness conditions |
| `earl:untested` | **Declared and covered by nothing.** The state of 1,500 refused connection pairs |

`earl:untested` is the term that makes this worth doing. Absence of an assertion is not
evidence of anything, so a gap has to be **asserted** to be queryable — the same structure as
the asserted unknown in [experiment 65](65-ruleset-as-data.md), and the same reason: under the
open-world assumption, silence and a finding are different statements and must not look alike.

An assertion therefore binds a widget release, a port condition, an outcome, and the run that
produced it:

    [] a earl:Assertion;
      earl:subject <urn:fieldwork:widget:slr_threshold_comparison> ;
      earl:test <urn:fieldwork:condition:elevation-reference-relatable> ;
      earl:result [ a earl:TestResult; earl:outcome earl:untested ] ;
      prov:wasGeneratedBy <urn:fieldwork:testrun:…> .
    <urn:fieldwork:condition:elevation-reference-relatable> a fw:PortCondition;
      fw:onPort "assignments"; fw:level fw:Pragmatic; fw:enforcement fw:Limitation .

### What becomes askable

These are competency questions in the sense of
[experiment 44](44-ontology-competency-questions.md), which currently reviews relevance by hand
and records that turning its questions into queries is not implemented. Coverage is the case
where the query is straightforward and the answer is actionable:

1. Which port conditions are `earl:untested`?
2. Which conditions are declared at the pragmatic level but enforced only as a limitation?
3. Which widgets assert a passing result on no platform other than Chromium?
4. Which refused connections in the generated matrix have no assertion at all?
5. For a given fitness condition, which tests cover it, and at which commit did they last run?

Question two is the one that would have surfaced the sea-level datum and the unemitted
acquisition boundary without anyone reading the code.

### Two honesty constraints

**An assertion is scoped to its run.** A result carries the commit and the platform, because
the project already insists a result is claimed only for the browsers actually run, and the
default gate is Chromium alone. A passing assertion with no platform is not a lighter claim; it
is an unscoped one.

**The graph is only as honest as its generator.** These assertions should be produced by the
test run itself rather than written by hand, and a hand-written `earl:passed` is the same
defect as a hand-edited `classification.json`. And a graph full of passes still establishes
only what the checks reach: passing a check is not being right, which is trap two in
[the audit procedure](../audits/ontology-audit.md).

## The schema must bind meanings, not field names

This is the guard that keeps the reframe from reintroducing a worse problem. Structural
matching on names and types would admit a column called `distance_m` that is the right type
and measures something else entirely, which is trap three in
[the audit procedure](../audits/ontology-audit.md): similar labels are not identical meanings.

So a contract requires **declared roles** — a numeric distance in a length unit, a categorical
evidence level from a named value set — and the binding records which field was chosen for
which role. That is exactly what [experiment 61](61-input-dimensions.md) proposed for person,
place and time, and what [experiment 65](65-ruleset-as-data.md) proposed for ruleset roles.
Under this reframe they are not two mechanisms and a port system. They are one mechanism used
in three places.

## What this unifies

Six things this project has been treating separately:

1. **Port type matching** — the coarse case of schema satisfaction.
2. **Four of the twelve run-time `Connect …` checks** — the wrong-producer ones, which are
   schema requirements the type could not state ([62](62-workflow-traversal.md)).
3. **The eight producer-named port types** — schemas encoded as names, per the measurement
   above and D4a.
4. **Ruleset role binding** — schema binding with the roles declared by a ruleset
   ([65](65-ruleset-as-data.md)).
5. **Declaring which column means what** — schema meaning declared on the input
   ([61](61-input-dimensions.md)).
6. **"A declared contract on a general port"** — D4a's own recommendation, which is this.

The remaining eight run-time checks are **not** schema questions and stay separate:
presence (an input is empty), arity (both centres required), graph shape (two inputs must come
from different nodes), and configuration readiness (the upstream node is a valid draft). No
schema can express any of those, which is a useful confirmation that the reframe has a real
boundary rather than absorbing everything.

## What it supersedes

- [Experiment 62](62-workflow-traversal.md) recommends narrowing port types so wrong-producer
  checks become hard stops. Correct in its aim, wrong in its means: three new types named
  after their producers would be three more private wires.
- [Experiment 64](64-widget-streamlining.md)'s Phase 4 already reversed that and proposed a
  declared contract on the `table` port. This record generalises it: not a special case for
  tables, but how every connection works.
- D4a's test — a port named after its producer is a custom stud — stands, and this explains
  why it is true. A producer-named type *is* a schema with no way to be read.

## What gets better, beyond tidiness

A connection error can finally say what is wrong. "Incompatible node connection" becomes
"this needs a numeric distance in metres; the connected layer has no such field" — which is
the kind of guidance [experiment 49](49-catalog-in-the-interface.md) wants and cannot
currently produce, because the application does not know what a connection needs beyond a
type name.

And a widget becomes readable by something other than the application: a contract stating
roles, types and units is reviewable, diffable and publishable, where a port type name is
only a token.

## Risks, stated before anyone builds this

**It can become too clever.** A satisfaction check with coercion, optional fields and
subtyping would be a type system nobody asked for, and a wrong connection that type-checks is
worse than one that fails loudly. The discipline is that roles are declared and bound
explicitly by a practitioner, never inferred.

**It moves work to authoring time.** Every widget must declare what it needs, and the eight
narrow ports exist partly because declaring was harder than naming. If declaring stays hard,
authors will keep naming.

**It is a base-contract change.** `PortType` is a closed union compiled into the application,
saved workflows carry node types and edges, and [experiment 43](43-widget-packs.md) puts the
base contract outside a pack's scope. Carriers and contracts need a migration note and the
frozen fixtures as their test.

## What this cannot establish

That four carriers are the right four — that is a judgment from the current measurement, and
`decisions` and `area` may prove to be carriers rather than contracts once anyone tries it.
That schema contracts are expressible for raster and graph inputs, where no attribute schema
exists at all today ([65](65-ruleset-as-data.md)). And nothing about whether a practitioner
finds a bound connection clearer than a typed one, which is an observation to run rather than
a claim to make.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
