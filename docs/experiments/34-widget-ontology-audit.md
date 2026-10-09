# 34 — Canvas and runtime semantic audit

_Created 2026-10-07 · Updated 2026-10-07_

Date: 2026-10-07. Developmental evaluation; local implementation.

Question: can a practitioner trace each canvas primitive through its meaning,
version, inputs, computation and evidence without confusing plans with results?

Changes made:

- Every canvas node emits a draft plan with widget identity, descriptor version,
  digest and configuration; connections identify upstream/downstream plans and ports.
- Uncited runs now emit common provenance too. Executed plans and receipt activities
  are linked to their widget definitions. The legacy execution path now receives
  the enclosing run ID rather than inventing unrelated receipt run IDs.
- Point inputs emit typed attributes and run-scoped source features. Street networks
  emit directed vertices and edges with metre quantities. Catchments link their source
  sites and expose time budgets, speed, direction, snap limits and corridor width.
- Clipping and summary receipts describe their actual operation and CRS. A coverage
  map now has a presentation receipt. Raster input reading is distinguished from
  acquiring the original file. Raster clipping is labeled implemented, with limits.
- New runtime and canvas SHACL profiles test identity, lineage, geometry references,
  units and operation parameters. Mutation tests reject broken bindings, endpoints,
  source-site references, direction, time units and duplicate generators.

The small network fixture isolates serialization and uses a labeled readiness stub;
it does not establish EYE correctness or real-world accessibility accuracy. Existing
browser tests exercise real EYE separately. Registry mappings still explicitly retain
legacy gaps. Shared structural conformance is not full semantic standardization.

The [audit procedure](../ontology-audit.md) is now a required checkpoint before
adding primitives and after changing worked examples. Its current-limits section
tracks what remains before universal operation-specific SHACL validation can be claimed.

Validation: 94 unit tests passed; 10 focused Chromium tests passed for catchment
workflows and evidence/reference behavior. The updated real-EYE coverage browser
test also passed with combined facts, provenance and ground conclusions validated
against SHACL. Registry validation reports 27 widgets and 54 releases; ontology
fixtures conform. These checks do not establish Firefox/Safari behavior or learner
effectiveness. The source build and TypeScript checks passed.

Browser UI exercise (2026-10-07): ran the 55-test Chromium suite with the local
WorldPop file. It initially reported 54 passes and one outdated study-area text
assertion; the interface correctly displayed "not executed evidence" for draft
plans. Updated that assertion and reran the study-area test with two new N3 UI
tests: all three passed. The new tests parse the N3 shown for an incomplete
canvas and validate the downloaded John Snow run graph against SHACL. This
covers all 57 distinct browser cases. Firefox and WebKit were not exercised.
