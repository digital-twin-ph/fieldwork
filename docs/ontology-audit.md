# Semantic admission and worked-example audit

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

## Terms that must remain distinct

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
