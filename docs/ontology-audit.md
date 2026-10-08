# Semantic admission and worked-example audit

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

## Terms that must remain distinct

These distinctions are **not currently enforced by the ontology**. Measured on
October 8, 2026 with an OWL 2 DL reasoner, the vocabulary contains no
disjointness, cardinality or restriction axioms, so a graph that types one
individual as both a catchment and an isochrone, or both a study area and an
acquisition buffer, is consistent. Adding one `owl:disjointWith` axiom per pair
makes such a graph inconsistent. Until that is done, this table is a convention
for reviewers, and conformance to it is a review activity rather than a check.
Clipping boundary and Presentation have no class at all. See
[experiment 42](experiments/42-ontology-structure-and-meaning.md).

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

Run `npm test`, `npm run validate:ontology`, and `npm run validate:widgets`.
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
public-health conclusion; see [experiment 37](experiments/37-vega-lite-chart-spike.md).

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
suitability. See [experiment 38](experiments/38-standalone-map-communication.md).
