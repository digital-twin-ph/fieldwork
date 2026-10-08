# Experiment 42: validating the ontology's structure and its meaning

Date: October 8, 2026. Status: measured findings and a recommendation. No
ontology file, axiom or application behaviour is changed by this document.

The vocabulary used below is defined in
[the audit procedure's glossary](../ontology-audit.md#glossary-the-semantic-vocabulary-used-in-these-documents),
including the distinction between a constraint and an entailment that this
record turns on.

Earlier audits checked that runtime graphs conform to SHACL shapes. This one
turns the instrument on the vocabulary itself and asks a different question: not
"does this graph have the required shape?" but "does the ontology mean what the
project's own documents say it means?" The answer is largely no, and the gap is
small to close.

## Method, and why it is reproducible without a UI

The reasoner is **Konclude**, a complete OWL 2 DL tableau reasoner, reached
through `rdf-reasoner-konclude` 0.7.2 with `n3` 2.13.8 on Node 22.23.3. That is
the same engine [Ontosphere](https://github.com/ThHanke/ontosphere) compiles to
WebAssembly and runs in the browser, so a verdict here should match what that
tool reports interactively over the same files. Running it headlessly makes the
result reproducible, diffable and suitable for a regression gate, which a
screenshot of a visualisation is not.

The check reads all six files in `ontology/` as data and lives in the
[Validation Lab](41-validation-lab.md) as its check 03, under the same boundary
rules: it imports no Fieldwork code. The reasoner is **LGPL-3.0-or-later** and
about 25 MB because it bundles a WebAssembly build, so it is a dependency of the
lab and deliberately **not** of this repository, whose browser bundle is
Apache-2.0 with an explicit asset manifest.

## Structure: clean where it is checkable

Across 917 triples the vocabulary declares 80 classes, 78 object properties and
116 datatype properties, with 171 `rdfs:subClassOf`, 65 `rdfs:domain` and 133
`rdfs:range` assertions.

| Structural check | Result |
| --- | --- |
| Fieldwork terms used in a domain, range or subClassOf without being declared | **0** |
| Classes without an `rdfs:label` | 47 of 80 |
| Classes without an `rdfs:comment` | 27 of 80 |
| Properties without an `rdfs:domain` | 129 of 194 |
| Properties without an `rdfs:range` | 61 of 194 |

The first row is the one that would have indicated a defect, and it is clean:
there are no dangling references or misspelled terms. The others are
completeness gaps in annotation rather than errors, but they matter for a
vocabulary intended to be read by people reusing it, and the audit procedure
already requires a plain-language meaning for every admitted term.

## Meaning: consistent, and that result carries no information

| Axiom family | Count |
| --- | --- |
| `owl:disjointWith`, `owl:AllDisjointClasses` | 0 |
| `owl:equivalentClass`, `owl:equivalentProperty` | 0 |
| `owl:FunctionalProperty`, `InverseFunctionalProperty`, `TransitiveProperty`, `SymmetricProperty`, `inverseOf`, `propertyDisjointWith` | 0 |
| `owl:cardinality`, `minCardinality`, `maxCardinality`, `someValuesFrom`, `allValuesFrom`, `hasValue`, `Restriction` | 0 |
| `owl:unionOf`, `intersectionOf`, `complementOf`, `oneOf` | 0 |

Konclude reports the ontology **consistent** with **no unsatisfiable classes**.
That is not evidence of good modelling. With no axiom that any assertion could
contradict, inconsistency is unreachable, so the consistency result is
unfalsifiable. Classification makes the same point from the other side: it
produces 63 inferred triples and **not one new subsumption between Fieldwork
classes** beyond those already asserted. The reasoner has nothing to work with.

What exists is an RDFS-expressive taxonomy declared using OWL vocabulary. That
is a legitimate and common choice; the problem is only that other documents in
this repository describe it as if it carried more.

A second consequence is easy to miss and worth stating plainly. `rdfs:domain`
and `rdfs:range` are **entailment** axioms, not constraints. Using a property on
an unintended subject does not raise an error — it *infers* the domain class for
that subject. With no disjointness anywhere in the vocabulary, that inference
can never contradict anything. So the 65 domains and 133 ranges provide
inference, not validation, and all actual validation is carried by the SHACL
shapes, which cover runtime receipts and canvas plans rather than the vocabulary
itself. A reader who sees 198 domain and range assertions may reasonably
conclude the ontology constrains how properties are used. It does not.

## The conflation probe

The ["terms that must remain distinct" table](../ontology-audit.md) is this
project's central semantic discipline. The probe adds one individual per pair to
the ontology graph, typed as both members of the pair, and asks the reasoner
whether the result is consistent.

| Conflated pair | Published as distinct in | Reasoner verdict |
| --- | --- | --- |
| `fw:Catchment` + `fw:NetworkIsochrone` | audit table: "Catchment" vs "Isochrone" | consistent |
| `fw:CanvasNodePlan` + `fw:WorkflowNodePlan` | audit table: draft plan vs observed plan | consistent |
| `fw:StudyArea` + `fw:AreaBuffer` | audit table: "Study area" vs "Acquisition buffer" | consistent |

| Graph | Konclude verdict |
| --- | --- |
| Ontology + all three conflations | **Consistent** |
| The same, plus one `owl:disjointWith` per pair | **Inconsistent** |

So those distinctions are documentation, not axioms. Nothing in the published
vocabulary prevents a catchment from being an isochrone, a draft plan from being
an executed one, or a reporting boundary from being an acquisition buffer. The
second row is the useful half of the finding: the gap closes at one triple per
pair, detected by the same engine that misses it today.

## Two terms with no class, and one class with no widget

Mapping the audit table onto declared classes leaves two entries unrepresented:

- **Clipping boundary.** The audit states this distinction most insistently — a
  cutline is operation-specific and may differ from the study area. There is no
  class for it. `fw:PolygonClipping` and `fw:RasterClipping` are the operations;
  the boundary itself is modelled only as geometry, which is exactly the
  conflation the table warns against.
- **Presentation.** `fw:MapView`, `fw:TableView` and `fw:ChartView` are
  presentations, but nothing declares the general notion that a presentation
  reuses results rather than computing new ones.

In the other direction, **`fw:Reprojection` is already declared**, while the
Reproject widget added in [experiment 40](40-reprojection-primitives.md) records
its ontology status as a gap. That mapping should be reviewed rather than left
unmapped; whether the existing class matches the implemented import-time
operation is a semantic admission question, not a clerical one.

## Recommendation

Not done here, because it changes a published vocabulary.

1. Add `owl:disjointWith`, or one `owl:AllDisjointClasses` per group, for every
   pair the audit table separates. Start with the pairs probed above.
2. Declare classes for Clipping boundary and Presentation, with the exclusions
   that distinguish them from study area and from computation.
3. Review `fw:Reprojection` against the implemented widget and either map it or
   record why it does not fit.
4. Fill in `rdfs:label` and `rdfs:comment` for the 47 and 27 classes that lack
   them, and domains for properties where a single domain is genuinely intended.
5. Add check 03 to the regression gate so a future conflation fails a build
   rather than passing review.

These axioms also gate the [widget pack design](43-widget-packs.md): until the
vocabulary asserts disjointness, nothing would prevent a pack from declaring its
own class equivalent to `fw:StudyArea`, so a pack admitted from outside this
repository could conflate terms without any reasoner objecting.

Steps 1 and 2 change what existing graphs the ontology admits, so they need an
ontology version increment and a note naming any graph they would newly reject.
Disjointness is a strong claim: before asserting that two classes cannot share
an individual, confirm no worked example already produces one. The probe graphs
in check 03 are the place to record that confirmation.

## Tooling assessed

The question that led here was which offline, browser-based ontology browser
fits this prototype's architecture. Recorded for the
[prior-art register](../prior-art.md), with the same policy: licence, version
and maintenance noted, nothing adopted by this document.

| Tool | Architecture | Licence | Disposition |
| --- | --- | --- | --- |
| [Ontosphere](https://github.com/ThHanke/ontosphere) 1.7.6 | React 19, TypeScript, fully client-side; Konclude OWL 2 DL and `shacl-engine` in WebAssembly; loads files, URLs or SPARQL endpoints | Apache-2.0 | **Adopt as an accompanying inspector.** Its engine is already used headlessly here. Its architecture is close to this prototype's, which makes it a credible comparator |
| [WebVOWL, Hadden Industries fork](https://github.com/Hadden-Industries/webvowl) | VOWL visualisation; OWL ingestion and conversion now run in the browser, so no Java backend | **AGPL-3.0** | Evaluate as a separate linked tool only. The licence makes vendoring any part of it into this Apache-2.0 bundle a decision with consequences |
| [OntoInk](https://github.com/ISE-FIZKarlsruhe/ontoink) | MkDocs plugin: ontology diagrams, SHACL validation, live Turtle editing | MIT | Candidate for publishing `ontology/` as navigable, validated documentation |

"Client-side" is not "offline". This repository precaches through a service
worker and reports *Available offline*; none of the three has been tested in a
disconnected tab, and a Konclude WebAssembly build is a substantial download.
Verify before relying on any of them in the field.

## Limits

This covers the vocabulary files only, not instance data, and it says nothing
about whether the distinctions the audit table draws are the right ones — a
reasoner enforces the modelling it is given, and a fully axiomatised ontology
can still be wrong about the world. The run used Node rather than Ontosphere's
interface, so it reproduces that tool's engine and not its visualisation or its
SHACL report. Consistency, classification and the probe results establish
formal properties of a graph; they establish nothing about geographic
correctness, public-health interpretation or practitioner understanding.
