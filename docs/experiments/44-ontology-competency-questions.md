# Experiment 44: ontology competency questions

_Created 2026-10-08 · Updated 2026-10-14_

Date: October 8, 2026. Status: question list with measured statuses, thirteen of
them executable. No vocabulary term is changed by this document; it records what
the ontology can and cannot answer, and why.

A competency question is a question the ontology exists to answer. This list is
the **relevance** dimension of [the audit procedure](../audits/ontology-audit.md):
structure asks whether a graph is well formed, semantics asks whether it means
what we say, and relevance asks whether it answers anything a practitioner needs.
A vocabulary can pass the first two and still be useless, which is why relevance
is assessed separately rather than inferred from conformance.

Each question names who asks it, what must be in the graph to answer it, and its
current status. Status is assessed against what this prototype's vocabulary
declares and what its receipts actually emit, not against what a term's name
suggests.

| Status | Meaning |
| --- | --- |
| **Answerable** | A query over an exported run graph returns the answer today |
| **Partial** | The fact exists but is carried as opaque JSON, or only for some operations |
| **Not answerable** | The graph does not record it. Either a gap to close or a deliberate exclusion |

Statuses marked **executable** below are checked by the lab. An entry with no
query is a hand assessment and should be treated as weaker evidence.

Thirteen of these questions are **executable**. The Validation Lab's check 04
answers each with a SPARQL query over an exported run receipt and compares the
measured answer with the status recorded here, so a disagreement is reported
rather than assumed away: either the graph lost a fact or this list is stale.
That check found S1b on its first run. The remaining questions are reviewed by
hand until a fixture exists that could answer them.

Competency-question evaluation is a **developmental-evaluation** activity, not a
release gate. Its output is a list of questions the work cannot yet answer, which
informs what to build next; a question moving from Not answerable to Answerable is
a design decision with its own migration, not a bug fix.

## Provenance and reproducibility

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| P1 | Which widget, at which version and digest, produced this result? | A reviewer repeating an analysis | `fw:widget`, `fw:catalogVersion`, `fw:catalogDigest` on the node plan | Answerable |
| P2 | What exact parameters did this execution use? | A reviewer | `fw:configuration` on the plan, plus operation-specific quantities | Answerable |
| P3 | Which upstream results did this one consume? | Anyone tracing a number back | `prov:used` and `prov:wasDerivedFrom` on the step | Answerable |
| P4 | Which engine and version performed the inference? | A reviewer | Recorded in the run receipt | Answerable |
| P5 | Was this result produced by the configuration currently on the canvas, or an earlier one? | A practitioner after editing | Canvas plans and workflow plans are separate classes and now disjoint | Answerable |
| P6 | If a source file is withdrawn, which runs are affected? | A data steward | Asset digests in receipts; `retainedInputSHA256` for rasters, file hashes for evidence | Partial: digests exist for rasters and attachments, not for every input |

## Spatial scope and coordinate reference

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| S1 | What geographic scope does this analysis report on? | Anyone reading a result | A `geo:Feature` with `geo:hasGeometry` | Answerable |
| S1b | Is that scope typed as a study area, so it can be found by its role? | A reviewer who does not already know which feature is the boundary | `fw:StudyArea` | **Not answerable** for the pinned-dataset examples: the Old Naledi receipt types its boundary only `geo:Feature`. Drawn areas do emit `fw:StudyArea` |
| S2 | Was the clipping boundary the same as the study area? | A reviewer checking a clipped total | `fw:clipGeometry` is a distinct geometry identity from the study area's | Partial: the identities differ, but the cutline is not yet typed `fw:ClippingBoundary` |
| S3 | Was data acquired over a wider area than the one reported? | A reviewer | Buffer activities and their distance quantity | Partial: the buffered output is still typed `fw:StudyArea`, so the distinction is not machine-readable |
| S4 | In which CRS are these coordinates, and in which axis order? | Anyone reusing the geometry | CRS84 in the WKT literal | Answerable |
| S5 | Which transformation produced these coordinates, with which library and datum handling? | A reviewer of reprojected data | Reprojection provenance | **Not answerable**: carried as source JSON on the layer, not as typed RDF |
| S7 | Which inclusion rule and outer margin produced this clipped raster? | A reviewer comparing a total with a GDAL-derived one | `fw:rasterMaskConvention` and `fw:rasterMaskMarginPixels`, both SHACL-constrained | Answerable, not yet executable: the raster workspace needs a local GeoTIFF, so no bundled fixture exercises it |
| S6 | Was this raster resampled or reprojected? | A reviewer of a clipped raster | `fw:rasterMaskMethod`; no resampling operation exists | Answerable |

## Data identity and missing data

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| D1 | How many records had no location, and were they discarded? | A practitioner judging coverage | Counts on the dataset, with unknown locations retained | Answerable |
| D2 | Which records were excluded from review, and for what stated reason? | A supervisor | Exclusions with their reasons | Answerable |
| D3 | Is this dataset synthetic, generated for demonstration, or observed? | Anyone reading a result | Source descriptions and example provenance | Partial: stated in prose and source metadata, not as a typed distinction |
| D4 | What does one unit in this raster mean? | Anyone computing a total | Source metadata and citation | Partial: author-entered text, deliberately not inferred from the file |

## Decisions and evidence

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| E1 | What inputs and rules produced this Review or Unknown assertion? | A practitioner challenged on a decision | Conclusions with the facts and rule formulas that produced them | Answerable |
| E2 | Which cited source supports this assumption, and who cited it? | A reviewer | `fw:EvidenceReference` with Dublin Core and PROV attribution | Answerable |
| E3 | Does an attached document establish the claim it is attached to? | A sceptical reviewer | Nothing: a citation is not an executable premise | **Not answerable, by design** |
| E4 | Why is this result Unknown rather than negative? | A practitioner | Missing-data policy on the operation | Answerable |

## Presentation

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| V1 | Did this map or chart recompute anything, or only display existing results? | A reviewer | `fw:Presentation`, now disjoint from `fw:SpatialOperation` | Answerable |
| V2 | Which result does this view display, and at what time? | A reviewer | `prov:wasDerivedFrom` on the view, with the run identity | Answerable |
| V3 | What do the colours or bands in this view mean? | Anyone reading it | Presentation plan fields | Partial: recorded for chart and map specifications, not for every view |

## Privacy and derived geometry

| # | Question | Asked by | Answered from | Status |
| --- | --- | --- | --- | --- |
| G1 | Are these coordinates original or displaced? | Anyone handling the file | `fw:MovedPoint` and its dataset are distinct from the source | Answerable |
| G2 | What displacement parameters and seed were used? | A reviewer | Donut parameters and seed in the receipt | Answerable |
| G3 | Does this displacement make the data anonymous? | A data steward | Nothing: the vocabulary states it is a demonstrator | **Not answerable, by design** |
| G4 | Which exported artifact contains source coordinates and which contains only derived geometry? | Anyone sharing a file | Distinguished in the export, and in the geoprivacy record | Partial: stated in documentation, not as a typed property of the artifact |

## Questions the ontology must refuse

Recording these is part of relevance. A vocabulary that appears to answer them
would be worse than one that does not.

| # | Question | Why it is refused |
| --- | --- | --- |
| R1 | How many people live in this catchment? | Counts are of records or memberships, never of population. No term should imply otherwise |
| R2 | Is this study area appropriate for this public-health question? | Readiness means the geometry meets an input contract, not that the area suits a question |
| R3 | Does this facility currently provide this service? | Facility evidence is a historical assignment, not current verification |
| R4 | Is this travel time what a person would experience? | A modelled corridor under stated assumptions is not observed travel |
| R5 | Did this workflow produce a correct result? | Structure, consistency and conformance establish none of that |

## Canvas questions: what a rule reading the current canvas can ask

_Added 2026-10-14, for [experiment 112](112-progressive-widget-reveal.md). The practitioner's
hypothesis is that **syntactic, then semantic, then pragmatic interoperability are the
foundation of progressive reveal**, so the questions are grouped by level and asked in that
order._

These differ from the questions above in **when** they are asked. The others are asked of a
finished run by someone reviewing it. These are asked of a canvas **mid-build**, to decide what
to offer next — so the answer has to be there *before* the widget in question is added. Asking
after it has run is asking whether the thing you already did was possible.

`scripts/competency-canvas.mjs` executes a worked example, parses the receipts and workflow
provenance back in — the same text the N3 and evidence view shows — and asks each question of
that graph. `--before` removes the rule node and re-attaches its output, which is the state a
reveal rule would actually meet. Measured on `snow-extent` and `snow-isochrone`, 2026-10-14:

| # | Level | Question | Status |
| --- | --- | --- | --- |
| C1 | Syntactic | What kinds of thing has this canvas produced? | **Answerable** — 19 `fw:` classes in the graph |
| C2 | Syntactic | Which geometry is here, and in which CRS are its coordinates? | **Answerable** — 258 geometries, CRS84 stated in each literal |
| C3 | Semantic | Is a point here an observation, infrastructure, or synthetic? | **Not answerable** — no term records what a point IS. Deaths, pumps and generated grid samples are indistinguishable |
| C4 | Semantic | Which feature is the study area, found by its role? | **Not answerable** here — the same gap S1b records for pinned-dataset examples |
| C5 | Semantic | What did a rule conclude, and about which thing? | **Answerable** after a rule runs; absent before, which is correct |
| C6 | Pragmatic | What on this canvas asserts an enclosed area, asked once? | **Answerable from 2026-10-14** — see below. It was not |
| C7 | Pragmatic | Which results were computed in a metric CRS, and which one? | **Answerable** — `fw:metricCRS`, two assertions |
| C8 | Pragmatic | Could the extent ruleset run on what is here, by its own declared expectations? | **Answerable from 2026-10-14** |
| C9 | Pragmatic | Is a point here attached to a street network, so it can be routed from? | **Answerable** in the routing example via `fw:networkSnaps` and `fw:snappedNodeCount`; the per-point attachment is still an attribute rather than a fact |
| C10 | Pragmatic | Is any result here over fewer sites than were offered? | **Answerable** when it happens — `fw:unconnectedSiteCount`, added 2026-10-14 — and silent otherwise, which is correct |

**5 of 10 before the day's work, 5 of 10 after — but a different five, and the two that moved
are the two the reveal rule needs.**

### What C6 found, and why it was not a subPropertyOf

The canvas held the number and could not answer the question. `summarize_hull` measured
139,230.01 m² and asserted `fw:hullAreaSquareMetres` **of the activity** — the computation. The
extent ruleset expects `fw:areaSquareMetres` **of the polygon**, and was minting those facts
itself, inside its own fact generator, at the moment it ran. So the canvas could answer *could
this ruleset run here?* only after the ruleset had run.

The obvious repair — declare one term a kind of the other — is wrong, and the graph says why:
the subjects differ. An activity does not enclose ground, so `fw:hullAreaSquareMetres
rdfs:subPropertyOf fw:areaSquareMetres` would entail that a computation has an area, and
nothing would catch it, because `fw:areaSquareMetres` declares no domain.

What the hull does now is assert the area **of the polygon it generated**, at the IRI
`extentN3` already mints for that polygon, so the receipt and the rule facts are about the same
subject rather than two nodes that happen to share a number. `fw:spanMetres` is declared the
same way, as a property of a geometry, beside `fw:hullSpanMetres` which remains a quantity of
the computation.

It is [experiment 113](113-rules-over-geometry.md)'s first leap one layer up. There, a derived
quantity had to become a field on the record before a rule could read it. Here, the same
quantity had to become a fact about the thing, not about the step that produced it.

### What these questions say about the hypothesis

Syntactic questions answer. Semantic questions mostly do not: **nothing in the graph records
what a point means**, so the level the hypothesis puts second is the level with the least
support. Pragmatic questions answer where a widget was taught to assert the fact, and not
otherwise — which makes them a ledger of work rather than a property of the design.

## Using this list

Add a question before adding a primitive, not after: if a proposed widget
answers no question here and suggests none, its value is unclear. When a
question moves from Not answerable to Answerable, record what changed and which
receipts now carry the fact. When a question is refused, say so in the term's own
comment so a reader meets the limit where they meet the term.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-08 | Number the competency questions as experiment 44 |
| 2026-10-08 | Match GDAL's all-touched rule, and record which rule a clip used |
| 2026-10-08 | Date every documentation file from git history, and check it in the gate |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
| 2026-10-14 | Ten canvas questions added for experiment 112, grouped by the practitioner's hypothesis — syntactic, then semantic, then pragmatic — and executed against a real run graph by scripts/competency-canvas.mjs. Syntactic answers; semantic mostly does not, since nothing records what a point MEANS; pragmatic answers only where a widget was taught to assert the fact. C6 and C8 moved to answerable when summarize_hull began asserting the area of the POLYGON rather than only of the computation |
