# Semantic admission and worked-example audit

_Created 2026-10-07 · Updated 2026-10-09_

If the vocabulary below is unfamiliar, start with
[the glossary](#glossary-the-semantic-vocabulary-used-in-these-documents); the
terms it defines are used throughout this procedure and the experiment records.

The canvas must emit parseable N3/RDF. Its RDF must conform to the relevant
SHACL profile. Add missing shapes with a positive example and a negative test.
This is a development requirement, not a claim of complete semantic coverage.

Before introducing a primitive:

1. Define its plain-language meaning, exclusions and relationship to existing
   terms. Prefer an existing operation with parameters over a synonymous widget.
2. Separate the widget definition, configured plan, execution activity, input
   entity and result entity. Specify port types, cardinality, CRS, units,
   missing-data policy and provenance.
3. Reuse GeoSPARQL for spatial features/geometry, PROV-O for lineage, QUDT for
   quantities, DCAT for datasets and Dublin Core for descriptive metadata.
4. Define emitted triples and SHACL constraints before implementation. Record
   application checks that SHACL cannot establish, such as geometry topology,
   raster correctness, network connectivity and scientific suitability.
5. Add a versioned registry release and passing/failing semantic fixtures.

After adding or changing a worked example, execute its actual connected graph,
inspect N3 & evidence, parse rule syntax separately from ground RDF, check
registry bindings and validate the combined evidence graph against SHACL. Include
missing input, unit, identity, provenance and malformed-output cases. Confirm
that presentation nodes preserve rather than recompute scientific results.
Record unresolved gaps and update this audit when closing them.

## Three dimensions: structure, semantics, relevance

An ontology can be well formed, mean what it says, and still be useless. These
are separate questions, each with its own instrument and its own limits, and a
pass on one is not evidence about the others.

| Dimension | The question | Instrument | What a pass does **not** establish |
| --- | --- | --- | --- |
| **Structure** | Is the graph well formed and completely declared? | SHACL shapes over runtime and canvas graphs; a declaration check over the vocabulary itself for undeclared terms, missing labels and missing comments | That the terms mean anything in particular, or that the graph is worth producing |
| **Semantics** | Does the vocabulary mean what these documents claim? | An OWL 2 DL reasoner: consistency, class satisfiability, and whether a conflation the audit forbids is actually rejected | That the distinctions drawn are the right ones. A reasoner enforces the modelling it is given |
| **Relevance** | Does it answer anything a practitioner needs to ask? | [Competency questions](../experiments/44-ontology-competency-questions.md), each with the facts that would answer it and an honest status | That an answer is correct, timely or appropriate to a public-health question |

Structure is the oldest check here and the easiest to mistake for the others. A
conforming graph can be semantically empty, and a consistent vocabulary can
answer no question anyone has. Relevance is the newest dimension and the only one
that asks what the work is *for*.

Two rules follow. Admitting a primitive requires naming the competency question
it serves; if it answers none and suggests none, its value is unclear and should
be argued before it is built. And a question the ontology must **refuse** is
recorded as deliberately refused, in the term's own comment, so a reader meets
the limit where they meet the term.

## Glossary: the semantic vocabulary used in these documents

This procedure and the experiment records use the vocabulary of ontology
engineering. That vocabulary is unavoidable, but it should not be a barrier to
reviewing the work, and several of its terms mean something narrower than
everyday usage suggests. Where a term is commonly misread, the entry says what
it does **not** mean.

### Writing facts down

| Term | Meaning |
| --- | --- |
| IRI | A globally unique identifier for a thing, written like a web address. `urn:fieldwork:StudyArea` is an IRI. It need not resolve to anything; it is a name, not a link. |
| Triple | One statement in three parts: subject, predicate, object. "This node plan has node type `reproject`" is a triple. |
| RDF | The data model in which everything is triples. A set of triples is a graph. |
| Turtle, N3 | Text formats for writing triples. Turtle is the `.ttl` files here; N3 adds rules, which is what the reasoning engine evaluates. |
| Prefix | A shorthand for a long IRI. `fw:` stands for `urn:fieldwork:`, so `fw:StudyArea` is the full IRI written briefly. |
| Named graph | A labelled set of triples, used to keep sources apart — for example to separate what was asserted from what a reasoner inferred. |
| Ground RDF | Plain facts, as distinct from rules. This procedure insists rule formulas are parsed separately and never validated as if they were facts. |

### Describing kinds of things

| Term | Meaning |
| --- | --- |
| Class | A kind of thing, such as `fw:StudyArea`. Not a software class, and not a table. |
| Individual | A particular thing belonging to a class — one specific study area, not the idea of study areas. |
| Property | A named relationship. An **object property** links a thing to another thing; a **datatype property** links a thing to a value such as a number or date. |
| `rdfs:subClassOf` | Every member of this class is also a member of that one. Catchment datasets are spatial datasets. |
| `rdfs:domain` | Declares what kind of thing a property is used **on**. Read the caution below: it does not reject other uses. |
| `rdfs:range` | Declares what kind of thing or value a property points **to**. The same caution applies. |
| Declaration vs assertion | Declaring a class says the term exists. Asserting a fact says something about a particular thing. A catalogue of declarations is not a claim that anything has been built or run. |

### Reasoning about them

| Term | Meaning |
| --- | --- |
| OWL | A language for writing statements precise enough for a machine to draw conclusions from them. |
| OWL 2 DL | A profile of OWL restricted so that reasoning is decidable: a reasoner is guaranteed to finish and to be correct for it. |
| Description logic | The formal logic underlying OWL. "DL" in tool names refers to it. |
| Reasoner | A program that derives conclusions from a graph. Konclude, used in experiment 42, is one; the EYE engine in the application evaluates N3 rules, which is a different job. |
| Entailment, inference | A conclusion that follows necessarily from what was asserted, whether or not anyone wrote it down. |
| Materialisation | Writing inferred triples out explicitly so they can be inspected or queried. |
| Classification | Working out the full class hierarchy that the asserted axioms imply, including subclass relationships nobody stated. |
| Consistency | Whether a graph contains a contradiction. A graph with no contradictory axioms **cannot** be inconsistent, so "consistent" is only informative when the ontology says enough to be contradicted. |
| Satisfiability | Whether a class could have any member at all. An unsatisfiable class is a modelling error: it has been defined so that nothing could ever belong to it. |
| Disjointness | An explicit statement that two classes share no members. Without it, nothing stops one thing from belonging to both. |
| Cardinality | How many times a property may or must be used — "exactly one source", "at least one input". |
| Open-world assumption | Absent information means unknown, not false. A reasoner will not conclude that a facility has no coordinates merely because none were stated. This is why absence of a fact is never proof of compatibility. |

### Validating them

| Term | Meaning |
| --- | --- |
| SHACL | A language for stating requirements a graph must meet, and a tool that reports where it fails. Unlike OWL, it checks rather than infers. |
| Shape | One such set of requirements, aimed at a class or at specific nodes. |
| Conformance | A graph satisfies the shapes it was checked against. It does not mean the graph is correct, complete, or scientifically meaningful. |
| Constraint vs entailment | The distinction that matters most here. SHACL **rejects** a graph that breaks a rule. `rdfs:domain` and `rdfs:range` instead **infer** a type for whatever they are applied to, so a property used on an unintended subject produces a new inference rather than an error. Declaring domains and ranges is therefore not a way to validate how properties are used. |

### Vocabularies reused rather than reinvented

| Vocabulary | What it supplies here |
| --- | --- |
| GeoSPARQL | Spatial features, geometries and their coordinate reference system. |
| PROV-O | Lineage: an **Activity** is something that happened, an **Entity** is something it used or produced, and a **Plan** is the configuration it followed. A configured widget is a plan; one execution is an activity. |
| QUDT | Quantities with units, so a number carries what it measures. |
| DCAT | Datasets, their distributions and where they came from. |
| Dublin Core (`dcterms:`) | Descriptive metadata: titles, identifiers, descriptions, references. |
| SKOS | Controlled lists of concepts, for category vocabularies rather than classes. |
| EARL | **Proposed.** Test assertions and outcomes, including `earl:untested` and `earl:inapplicable`, so coverage gaps are queryable rather than merely absent ([experiment 66](../experiments/66-ports-as-schema-binding.md)). |

### Three traps these documents try to avoid

A reviewer can hold the project to these without knowing any description logic.

1. **A declaration is not a capability.** A class, a shape or a catalogue entry
   describes an intended contract. It is not evidence that code exists, runs, or
   produces the result the term suggests.
2. **Passing a check is not being right.** SHACL conformance establishes
   structure. Consistency establishes the absence of contradiction, and only
   where contradiction was possible. Neither establishes numerical accuracy,
   methodological suitability or a valid public-health conclusion.
3. **Similar labels are not identical meanings.** Two operations called "clip"
   may differ in pixel selection, coordinate reference system and missing-data
   behaviour. The table below exists because of this.

## A distinction, and the five ways it can be enforced

_Added 2026-10-09._ These documents used **"refusal"** for at least five different
things: an ontology axiom, a validator rule, a run-time error, a sentence of prose
and a decision not to build. They are not interchangeable — two of them make a wrong
answer impossible, one depends on reaching a code path, and two prevent nothing at
all — so the word is no longer used as a category. "Refuses" remains an ordinary
verb for observed behaviour: *the importer refuses a duplicate key* is a testable
claim about what happens.

A **distinction** is the knowledge itself, stated as a non-identity: *a table has no
geometry*; *a projected level is not an inundation extent*; *a value below the limit
of detection is not zero*; *a change from a baseline is not a level above a datum*;
*detection is not infection*. Distinctions are the expensive, durable content of this
project — days of reading an archive, plus judgment — and they are what a pack or a
primitive is actually for.

Each distinction is then **enforced** in one of five ways — or not enforced at all — and
the audit requires that the way be named:

| How it is enforced | What it does | Where it lives | Can the wrong answer still be produced? |
| --- | --- | --- | --- |
| **Hard stop** | Makes the wrong state unrepresentable | An ontology axiom, or a closed port type | No |
| **Validation rule** | Rejects the configuration before anything runs | A SHACL shape, or a `validate:*` rule | Not without editing code |
| **Run-time check** | Stops the run on the offending input | A check in the execution path | Only by not reaching that path |
| **Limitation** | Records what the result does not establish | Prose, a comment, a receipt, a notice | Yes, freely |
| **Out of scope** | Declines to build the capability at all | A dated record | Not applicable |

Three rules follow, each of which has already been broken once.

**Name what the software does, not what was intended.** A distinction described as enforced while it
is implemented as a limitation is the characteristic failure of this project, and
it is hard to see because the two read almost identically on the page. The vertical
datum in [experiment 58](../experiments/58-sea-level-widgets.md) was intended as a
hard stop, implemented as a run-time check on the *presence* of a string rather than the
*compatibility* of two references, and is therefore a limitation in substance; see
[experiment 62](../experiments/62-workflow-traversal.md).

**A limitation is honest, not sufficient.** Recording what a result does not
establish is required and valuable. It is not enforcement, it must never be reported
as enforcement, and a distinction that can only be enforced this way should say so
plainly rather than borrowing the language of the stronger four.

**Enforcement and delivery are different questions.** Where a constraint lives is
separate from when a practitioner meets it. A hard stop nobody can find has failed
for the reasons [experiment 49](../experiments/49-catalog-in-the-interface.md) gives — a
constraint shown too early is noise, too late is useless, too often is dismissed —
and a loudly displayed limitation is still not a hard stop.

## Two kinds of check, and why mixing them stalls the work

_Added 2026-10-09, after the audit grew to ten checks in a single session and the owner observed
that the gates had become "circular firing squads — dead before we leave the start gates."_

The checks below are not all the same kind of thing, and treating them as one list makes new
capability impossible to add.

| Kind | Asks | On a "no" |
| --- | --- | --- |
| **Protective** | Does this break what already works? | **Blocks.** Fix it before merging |
| **Maturity** | How well evidenced is this yet? | **Records.** "Not yet, because X" is a complete answer, dated |

Protective: D2 (duplicate operation), D3 (enforcement named), D4 and D4a (conditions in the right
place, standard studs), D7 (the name states what was done), and the palette reachability check.
All are cheap, none depends on anything unbuilt, and each protects work that already exists.

Maturity: **D8, D8a, D9 and D10**. These assert how far evidence has got. A new primitive that
nothing yet composes with has not failed; it is new.

**D10 is the one that deadlocks if this distinction is lost.** A primitive cannot be exercised by
a worked example until it exists, and the example cannot be built until its primitives exist —
`sample_raster` and the sea-level example each waited on the other. The escape was always in the
check's own wording, "unless the record states why and what would exercise it", and was ignored in
practice.

**A worked example is not the only way to satisfy D10**, and treating it as the only way is what
makes the gate expensive. What [experiment 43](../experiments/43-widget-packs.md) says an example
uniquely establishes is **composition** — that a widget works with others — not correctness, which
unit checks cover. So D10 is satisfied by a **minimal composition fixture**: two or three nodes
wired together with synthetic data, proving the ports meet. The teaching example, with its real
data, licence clearance and provenance, is a separate and much heavier artifact that should never
gate a primitive's admission.

Where a check cannot be answered yet, record the state and the date. An unanswered maturity check
is a finding; an unanswered protective check is a defect.

## Primitive design audit

_Added 2026-10-09, from the lessons consolidated in
[experiment 62](../experiments/62-workflow-traversal.md)._ Run these eight checks before a
primitive is built, and again before its release file is written. Each has a
determinate answer and a stated failure consequence; a check that cannot be answered
is a failure, not a deferral. Record the answers in the experiment record that
proposes the primitive. Every check cites the record that found it, so a reviewer can
re-read the reasoning rather than take it on trust.

**Admission is dated, not permanent.** This is a developmental evaluation and these criteria
change as lessons are learned, so a widget admitted under one version of D1 has not been tested
against a later one. `widgets/admission.json` records when each criterion last changed and when
the set was last swept against it, and `validate:admission` fails when a criterion changed after
its last sweep. Clearing that debt means sweeping, or recording why the change does not reach the
existing set — the second being a decision somebody signs for. See
[104](../experiments/104-admission-is-not-permanent.md); the permanence came from this audit's own
Method section, which deferred two criteria as "a separate task" and declared four "not applicable
retroactively".

**D1 · What is it, on two axes?**
Decompose the candidate into existing primitives and ask two separate questions: does a
distinction remain that does not follow from the parts, and **is this an operation a
practitioner would ask for by name?** The answers place it, and the placement decides
where it lives — not whether it may exist.

**There are two kinds of widget: primitive and composite.** The first axis decides which, and
nothing else does. The second axis decides *where it belongs*, which is a separate question with
a separate answer, and the two were conflated here until 2026-10-12, when the practitioner
pointed out that the cells below were being read as four kinds.

| Kind | Decided by | Placement, decided separately |
| --- | --- | --- |
| **Primitive** | a distinction remains that does not follow from its parts | **on the palette** when a practitioner asks for it by name; **internal** when they would not — real and reusable, but not a node. A keyed join is the example |
| **Composite** | no residual distinction; it is its parts arranged | **on the palette** under its intent name when a practitioner asks for it, implemented over shared primitives and not its own copy of them; **in a worked example or template**, not in `TYPES`, when they would not |

So "internal primitive" and "example node" are not kinds. They are a primitive and a composite
in the wrong place, which is why both are fixable by moving something rather than by rebuilding
it. "Superseded" is not a kind either: it is a lifecycle state, and a superseded widget still has
a kind.

*Evidence:* the decomposition written out, the residual distinction named or explicitly
absent, and **both** the kind and the placement stated.
*Fails if* either is unstated, or if a composite is implemented over its own
private copy of an operation another widget already performs.

**The unit of reuse is not the unit of use.** Factoring is an implementation criterion
and the palette is a practitioner criterion; where they disagree, the practitioner
decides. Decomposing a composite in the **codebase** is a gain — six current node types
are a keyed join plus an aggregate, and three separately implement
nearest-neighbour-with-distance. Decomposing it on the **canvas** is a loss, because a
practitioner asking "how many cases per barangay" should write one node and not three.
Primitives are exposed on the palette when a workflow needs them, not in advance
([60](../experiments/60-from-gis-studio-to-public-health-studio.md),
[62](../experiments/62-workflow-traversal.md)).

**D2 · Does the operation already exist under another name?**
*Evidence:* the searched node types and why each near match differs in meaning, not in
label. *Fails if* an existing widget performs the same operation. Three implementations
of nearest-neighbour-with-distance exist today — `nearest`, `access` and
`slr_site_assignment` — so the registry does not catch this.

**D2 follow-through, added 2026-10-12.** D2 as written is a gate for admitting something new,
and it had no procedure for the case it actually found: *N implementations already exist.*
Recording "three implementations" is a fact with no consequence attached, and that is how three
survived a passing audit. When a duplicate operation is found among existing widgets, the audit
must answer three further questions:

1. **Which implementation is the general one?** The one whose operation carries no domain — not
   the oldest, not the most used.
2. **What does each other one add?** Named precisely, as an operation or as domain.
3. **If what it adds is domain rather than operation, it merges into the general one** and its
   domain becomes a parameter, a prepared input, or a separate widget that consumes the general
   output. Only an addition that is itself a distinct *operation* justifies a separate widget.

*Fails if* a duplicate is recorded without naming the general implementation and the disposition
of each other one.

Worked, for the case that prompted this: **`nearest` is the general one** — for each point in A,
the nearest in B, with the distance and an explicit unknown-with-reason when either is missing.
`access` adds a speed, turning distance into a proxy travel time, and a service grading: domain.
`slr_site_assignment` adds one validity rule — do not assign a site the extract cannot answer
for — which [the widget audit](widget_audit.md) already found is satisfiable by preparing the
site layer: domain. So both merge, and what blocks it is not the operation but `nearest`'s
example-bound wrapping, below.

**D3 · Is every distinction enforced, and is the enforcement level named?**
*Evidence:* a table of distinction → enforcement, using hard stop, validation rule,
run-time check, limitation or out of scope as defined above. *Fails if* any is unstated,
or if a stronger form was available and not taken. A run-time check requires a stated reason why
a port type cannot express the condition; that reason is either a real limit or a
missing port type.

**D4 · Are the port-level and graph-level conditions in the right places?**
A port type governs what travels along one edge and reaches nothing else.

| Condition | Correct mechanism |
| --- | --- |
| The input carries the wrong kind of thing | **Hard stop** via port type: the canvas refuses the edge, validation refuses the workflow |
| A required input is empty | Validation rule in workflow validation — absence is not a type |
| Two inputs must come from different nodes | Validation rule over the edge set — a property of the graph, not of an edge |
| The upstream node is connected but unconfigured | Validation rule at run request; an unconfigured node must stay a valid draft ([48](../experiments/48-tabular-input.md)) |

*Fails if* a wrong-producer condition is left to the run, or a presence, arity or
graph-shape condition is pushed into a port type.

**D4a · Standard studs: is this a block, or a pre-glued assembly?**
A widget is a building block. Blocks are worth having because every one connects to every
other the same way, and a worked example is a *set* — it teaches one build and contributes
its pieces to the general bin afterwards. A block with a connector that fits only one other
block is not a block; it is two things glued together and shipped as one.

The test is the port type's **name**. A port named after what the data *is* — `points`,
`table`, `polygons`, `raster`, `area`, `decisions` — is a standard stud, and all six are
used by many widgets. A port named after **the widget that emits it** is a custom stud:
`mean-center` is what `mean_center` emits, `point-comparison` is what `compare_point_sets`
emits, and each connects to one consumer or none. Measured 2026-10-09: nine of fifteen port
types have a single producer and at most one consumer.

*Evidence:* the port type's name, and its producer and consumer counts.
*Fails if* a new port type is named after the widget producing it. Where a specific payload
must be required, prefer a **declared contract on a general port**, checked by a validation
rule, over a new port type: that keeps the stud standard and lets the shape carry the
meaning. A genuinely distinct data kind — a graph, a raster — may still earn its own type.

Two corollaries. A block that is specialised is fine, including one specific to a disease or
a programme, provided it connects through standard ports and declares a contract another
author can read. And a block made inside a worked example must end up **in the bin**:
ontology-mapped, addable where it makes sense, and documented — otherwise it stays glued to
its set, which is what an unmapped, example-only node type is.

> **D5, D6, D8 and D9 have never been applied.** They govern how a primitive is designed
> and were written after the 42 existing widgets were built, so the retrospective audit
> could not run them. Treat them as proposals until one has been used on a real candidate.
> See [the rule audit](rule-audit.md).

_Swept 2026-10-12, which refuted the reason it had not been. The audit had called D5 not
applicable retroactively because it governs design; the contestability note said whether a
qualifier sits on the input or in each consumer is readable off built code. It is, and it took one
pass. 82 parameters are bare strings, most of them labels and titles; **eight are qualifiers**.
Three fail — `rate.numeratorPeriod`, `rate.denominatorVintage` and
`slr_threshold_comparison.verticalDatum` are free text checked only for non-emptiness, and the
first two carry messages explaining why they matter while checking nothing but that something was
typed. The best case is the one D5 describes: `slr_threshold_comparison`'s scenario, basis, family,
year and quantile take their values from the connected table's key columns, so the enumeration
lives on the input. That case carries a silent failure found while sweeping it — a selection
matching **no row** returns null, which flows on as unknown and cannot be told apart from
genuinely missing data. No row means the selection matched nothing, which is a configuration error
and not a data gap, the same distinction [65](../experiments/65-ruleset-as-data.md) draws for
unmatched subjects. Full result in `widgets/admission.json`._

**D5 · Does each qualifier live on the input rather than in each consumer?**
*Evidence:* the declaration, its enumerated values, its unstated default, and the
receipt assertion. *Fails if* a qualifier is free text checked only for non-emptiness,
which is a limitation wearing the costume of a validation rule. The project has found
this same shape for the key, the datum, the vintage, what one row stands for, and the
method and limit of detection ([48](../experiments/48-tabular-input.md),
[51](../experiments/51-dataset-profiles.md), [61](../experiments/61-input-dimensions.md),
[62](../experiments/62-workflow-traversal.md)).

**D6 · Has the practitioner's workflow been traced end to end?**
*Evidence:* the steps from question to presented result, each marked present, external
or missing. *Fails if* any step is unexamined. A thick domain layer means a primitive is
missing underneath it ([59](../experiments/59-pattern-for-engineered-knowledge.md)); a thin
one may still sit over a gap, because pushing a step outside the application makes the
layer look thin either way ([62](../experiments/62-workflow-traversal.md)).

### Naming convention for node types

_Added 2026-10-09._ A node type is a public, durable identifier: saved workflows carry it, the
registry pins it, and changing one is a migration. So a name is a commitment made at D1 time,
not a label adjusted later.

**Name the operation, in the words a practitioner would use to ask for it.**

| Rule | Why |
| --- | --- |
| **Form:** `verb_object` for an operation that transforms — `clip_raster`, `buffer_area`, `summarize_polygons`. `object_role` for a source or a presentation — `table_input`, `map_output` | A reader can tell what a node does and which end of a workflow it belongs to, without opening it |
| **Never a product name** | `xpert` names a diagnostic platform while the operation classifies facility evidence. Nothing in it is specific to that product |
| **Never a dataset, a place, or an example** | `places`, `centers`, `facilities` and `alert` name the content of one demonstration, not an operation |
| **Never a bare adjective or a category noun** | `nearest` is an adjective; `policy` and `access` name categories so broad they say nothing. Which policy? Access to what? |
| **Prefer the operation to the method** — the method belongs in the receipt's `method` field, where it is already recorded | Two widgets called "clip" can differ in pixel selection and missing-data behaviour; the operation is the stable part. **Exception:** where the method name *is* the practitioner's term, as with `voronoi` and `isochrone`, keep it and say so |
| **A domain block carries its domain as a prefix** | `slr_` does this. `xpert`, `access` and `access_policy` are equally domain-specific and do not, so nothing marks them as domain in the identifier a reader meets first |
| **Spell a node type with `-ize`** | `summarize_polygons` was there first, and `summarise_hull` was added beside it on 2026-10-10 before anyone noticed. A public identifier a practitioner cannot guess the spelling of is a defect, whatever the prose does |
| **The node type and the title must say the same thing** | `xpert` titled "Diagnostic evidence" forces a reader to learn a mapping that carries no information |
| **Reserve the general word for the general case** | `output` is a superseded node while `map_output`, `table_output` and `chart_output` are the real ones. The plainest name should belong to the thing that deserves it |

D7 continues to apply over the top of these: a name that satisfies every rule above can still
overclaim, as "Acquire a GeoTIFF window" did for an operation that imports a local file.

Renaming an existing node type is a migration and uses the adapter pattern recorded in
[experiment 18](../experiments/18-shared-input-standardization.md): the old identifier keeps
resolving, saved workflows keep running, and the release file records the rename. A name is
cheap to choose and expensive to change.

**D7 · Does the name state what was done? — and that includes the port names.**
*Extended 2026-10-12.* D7 was applied to titles and descriptions, and to one port name
opportunistically when a practitioner noticed `decisions` overclaiming on
`slr_threshold_comparison`. It was never applied to port names systematically, and it missed a
worse case than the one it caught: `nearest` declares
`inputs:[['places','points'],['centers','points']]`. Both carry the general type `points`; the
**names** are the heat demo's vocabulary, so one worked example's story sits in a general
widget's contract, where a practitioner wiring a gauge layer must connect "places" to "centers".
A port name is read every time somebody wires the node, which makes it a stronger claim than a
description nobody opens.

*Fails if* a port name encodes a use rather than what the port carries.
*Evidence:* the name against the operation. An import is not an acquisition, a consumer
of published results is not a model, a presentation is not a computation. *Fails if* the
name claims more than the operation performs
([39](../experiments/39-stac-discovery-and-remote-acquisition.md),
[47](../experiments/47-sea-level-pack.md)).

_Swept partially 2026-10-12, and the sweep's result is why it had never been swept. A port-based
pass finds 15 live widgets with two or more inputs of distinct carriers; two are presentation, five
of the remaining thirteen pass on the John Snow checks, which join published 1854 point data with a
real OSM network, and six fail by having no independent case at all. **But the two widgets D8 most
clearly applies to declare one input port each.** `slr_threshold_comparison` joins an AR6 projected
change with a supplied elevation behind a single `assignments:table` port — it is this criterion's
own worked example — and `rate` joins a numerator and a denominator measured at different times
behind a single `records:points` port. A join is a property of the computation, not of the port
signature, so D8 as written gives the procedure no way to enumerate its own subjects. Completing it
means reading computations rather than contracts._

**D8 · Does the evidence test the distinction, not only the arithmetic?**
*Evidence:* the positive and negative cases, and for any computation joining two
independently sourced quantities, at least one case using real data from both sources.
*Fails if* every case is synthetic. A synthetic fixture is self-consistent by
construction: the sea-level unit tests pass because their elevations and their datum
label agree with the projection baseline, which is the agreement a real dataset would
not supply ([62](../experiments/62-workflow-traversal.md)).

**D8a · Are the port cases covered, at all three levels?**
A widget's contract lives on its ports, so the cases that make or break a connection are its
tests. *Evidence:* for each port, a case per interoperability level — the carrier kind refused,
a role unbound or mistyped or missing its unit, and a fitness condition contradicted; plus an
explicitly asserted unknown, and a qualifier left unstated at entry still producing a definite
refusal that names where it was lost. *Fails if* only the accepted connection is tested.
Measured 2026-10-09, the set has 1,700 candidate producer-to-input pairs, 1,500 of them
refused, and one unit test asserting a refusal
([66](../experiments/66-ports-as-schema-binding.md)).

**D9 · Does it lower the practitioner's effort, measured?**
Abstraction level is a claim about cognitive load and needs a number, as
[experiment 32](../experiments/32-john-snow-primitives.md) pins 250 locations and 489 deaths.
*Evidence:* the node count each affected worked example needs to express its standard
question, before and after. *Fails if* a worked example needs more nodes than before, or
if a new widget adds a palette entry without removing one or answering a question that
previously could not be asked. A refactor that improves the internals and lengthens the
canvas has failed its purpose.

**D10 · Does a worked example instantiate it?**
A widget no example instantiates has never been shown composing with the rest, which is
the only thing a worked example establishes that a unit test cannot
([43](../experiments/43-widget-packs.md)).
*Evidence:* `npm run usage:widgets`, which counts nodes per widget across the shipped
examples and the frozen fixtures and lists the widgets at zero.
*Fails if* the widget is added with no example instantiating it, unless the record states
why and what would exercise it. A deliberate gap is a legitimate state; an unrecorded one
is an untested composition. Report node counts and firing counts separately: firing is
derivable from a run's receipts, which already carry one per executed node.

## Terms that must remain distinct

Several of these distinctions are now **enforced**, and the rest are not yet.
Measured on October 8, 2026 with an OWL 2 DL reasoner: conflating study area with
clipping boundary, acquisition boundary or catchment, a canvas plan with a
workflow plan, a widget definition with either plan, or a presentation with a
spatial operation now makes a graph inconsistent. Conflating a boundary with an
execution is caught too, once PROV-O is merged, because this vocabulary declares
its boundary features to be PROV entities and PROV-O declares entities and
activities disjoint. Terms distinguished only by prose remain unenforced, and
`fw:AcquisitionBoundary` is declared but not yet emitted: buffer receipts still
type their output `fw:StudyArea`, so that distinction holds in documentation
only. See [experiment 42](../experiments/42-ontology-structure-and-meaning.md).

These three are counted separately and must not be used interchangeably, including in
prose: a **widget** is the versioned contract the registry lists (39 today); a **node** is
one instance of a widget in one workflow; a **workflow step** is one execution of a node.
Coverage is a question about nodes — has any example instantiated this widget — while
firing is a question about steps, and the two differ because a shared upstream node
executes once however many branches consume it.

| Term | Meaning |
| --- | --- |
| Widget definition | Versioned description of a reusable UI/operation contract |
| Canvas node plan | Possibly unfinished local configuration; no execution claim |
| Workflow node plan | Configuration identity observed in a completed run |
| Workflow step | Execution envelope binding a plan to output and receipt activities |
| Study area | Geographic scope of the question |
| Acquisition buffer | Expanded scope used to reduce boundary effects during data acquisition |
| Clipping boundary | Operation-specific cutline; may differ from the study area |
| Catchment | Modeled region associated with a source site; not observed utilization |
| Isochrone | Cumulative modeled travel-time region under stated network assumptions |
| Evidence reference | A cited source, not automatically an executable premise |
| Presentation | A view of existing results, not new scientific inference |
| Chart specification | A bounded presentation plan over a named result; mark and orientation do not change its measure |
| Donut geomasking | Derived point displacement within a metre-valued annulus; a demonstrator, not encryption or proven anonymity |
| H3 cell aggregate | Count of source locations in an indexed hexagonal cell; not a nearest-site catchment or an anonymity guarantee |
| Mean center | One unweighted projected arithmetic center of a point set, returned in CRS84; not a burden-weighted center or privacy metric |
| Point-set comparison | Computed unweighted projected means and pump-context distances for two point sets; a private evaluation activity, not geomasking or a privacy guarantee |

## Validation profiles

`CanvasNodePlan` and `CanvasConnection` shapes cover every canvas widget and
connection, including unfinished configurations. JSON snapshots preserve exact
configuration, but do not replace typed operation semantics. Connection endpoint
existence is checked by SHACL; compatible ports and executability remain application
checks. A conforming draft does not imply a runnable workflow.

`WorkflowNodePlan` and `WorkflowStep` shapes cover every executed node. Additional
runtime shapes cover point datasets, network vertices/edges, catchment geometries,
isochrone quantities/direction, buffers, polygon clipping/summary, raster receipt
structure and presentation inputs. Validate the combined run graph because source
identities and generators span receipts. Rule formulas are parsed as N3 separately
and are not treated as ground RDF for SHACL.

Structure and semantics are checked by `npm test`, `npm run validate:ontology`,
`npm run validate:widgets`, and the Validation Lab's ontology check, which reasons
over the vocabulary merged with a vendored PROV-O so that cross-kind conflations
are detectable. Relevance is reviewed by hand against the competency questions;
turning each into a query that runs against a receipt is not yet implemented.
For a run object JSON, use `node scripts/audit-runtime-n3.mjs run.json`.
The audit accepts known historical catalog releases and verifies their recorded
digest. It does not dispatch old executable versions.

## Current limits

SHACL runs in development tooling; the browser does not yet display a live SHACL
report or block export on SHACL failure. Configuration-specific shapes and full
legacy heat/access operation semantics remain incomplete. Ground EYE conclusions
are included in the combined SHACL data graph, separately from rule formulas. Scientific correctness,
learning effectiveness and external source truth require separate evaluation.
Proposed game/learner vocabulary in note 27 remains design-only.
The STAC discovery, asset-selection and windowed-acquisition terms in note 39
are design-only; no shape, widget release or acquisition path exists, and the
`fw:AssetSelection` and `fw:WindowedAcquisition` shapes must be written before
any implementation.
The John Snow geoprivacy example has separate `DonutGeomasking`, two
`MeanCenterComputation` branches, `PointSetComparison`, and `HexAggregation`
computation receipts and SHACL shapes. Each mean-center branch must consume
the same point source as its corresponding comparison input; the two centers
must use the comparison CRS and match source counts.
The comparison map is a presentation activity that reuses those results. Positive and negative
checks are in `tests/geoprivacy.test.mjs`; the executed graph and browser N3
view are covered there and in `tests/geoprivacy.browser.mjs`. These establish
structural and deterministic behavior only. The source-bearing project/run
evidence is intentionally private; the demo derived GeoJSON is a distinct
artifact. Hide-by-context and map encryption remain proposed (experiment 35).

The Chart enhancement reuses the existing Chart widget and count/summarized-polygon
inputs. Its `fw:ChartSpecification` plan records renderer, mark, orientation,
source field and measure kind; each `fw:ChartView` receipt must point to one
such plan. Positive and negative tests cover absent binding, invalid renderer
and negative bin values. The bounded Vega-Lite renderer consumes the recorded
bins without a new statistical transformation. This is structural and
presentation validation, not proof of an appropriate visualization or a valid
public-health conclusion; see [experiment 37](../experiments/37-vega-lite-chart-spike.md).

The Map communication slice reuses `map_output` rather than admitting a new
primitive. `fw:MapSpecification` is a presentation plan linked from the
executed `fw:MapView`; it records title, subtitle, source/method note, legend
visibility, static/interactive presentation, basemap choice and upstream
result identities. Inputs remain the existing typed spatial, decision, raster
or polygon ports. CRS84 geometry, missing/outside records, raster NoData,
source references and computation receipts remain upstream. The default local
basemap requests no tiles; online OSM/OpenTopoMap selections are presentation
resources only and are excluded from SVG. Positive and negative SHACL checks
are in `tests/map-communication.test.mjs`; executed N3, visual controls and
basemap switching are exercised in `tests/catchments.browser.mjs`. This checks
structural provenance and rendering behavior, not scientific or cartographic
suitability. See [experiment 38](../experiments/38-standalone-map-communication.md).
