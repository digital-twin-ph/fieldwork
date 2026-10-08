# Competency questions

A competency question is a question the ontology exists to answer. The list is
the **relevance** dimension of [the audit procedure](ontology-audit.md): structure
asks whether a graph is well formed, semantics asks whether it means what we say,
and relevance asks whether it answers anything a practitioner needs.

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

## Using this list

Add a question before adding a primitive, not after: if a proposed widget
answers no question here and suggests none, its value is unclear. When a
question moves from Not answerable to Answerable, record what changed and which
receipts now carry the fact. When a question is refused, say so in the term's own
comment so a reader meets the limit where they meet the term.
