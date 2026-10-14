# 90 · Coupling widgets to the ontology

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** mechanised, with 42 terms of debt recorded and a ratchet on it.

## What was uncoupled

A widget's release file pins an ontology **class**, and `validate:widgets` checks
that class is declared. The **properties** a widget asserts were described in
prose in `ontology.note`, and prose does not fail a build.

So the coupling was a convention held by whoever wrote the release file. Measured
the first time anything checked it:

| | |
| --- | --- |
| Terms the application can assert | 315 |
| Terms typed in the ontology | 483 |
| **Asserted and declared nowhere** | **53** — 27 properties and 26 classes or individuals |

`sample_raster` alone asserted nine undeclared properties: `cellSizeX`,
`cellSizeY`, `sampleConvention`, `sampledAttribute`, `sampledCount`,
`sampledValueUnit`, `noDataCount`, `outsideRasterCount`, `unlocatedCount`. Its
receipts have been telling readers how a raster was sampled in a vocabulary
nothing defines.

This is the same defect as the one that prompted the question. Three times today
a property had to lose its `rdfs:domain` because a second activity class started
asserting it — `fw:originCount`, `fw:travelDirection`, `fw:polygonCount`,
`fw:assumedSpeedMetresPerMinute`. Each was caught by hand while writing Turtle.
Nothing would have caught them otherwise.

## How it is coupled now

`npm run validate:ontology-coupling`, in `check` alongside the rest of the gate.

**Terms are extracted from source, not from a running widget.** Receipts are
built from template literals, and running a widget needs inputs that differ for
every one of the fifty. Any `fw:Term` appearing in `src/` is a term the
application can assert, which is the conservative reading: it over-collects
rather than missing one.

**The declaration side accepts a mention, not only a typing.** A property named
only in an `rdfs:domain` is declared, even if loosely, and this is about catching
the undefined rather than grading the definitions.

## The debt, and the ratchet

53 terms could not be declared properly in one sitting, and an allowlist in code
would have hidden them. So `ontology/coupling-debt.json` records each one with
the modules that assert it, and the check **fails in both directions**:

- a term asserted that is neither declared nor recorded → fails, naming the module
- a term recorded that has since been declared → fails, saying it must leave the list

Both were verified by forcing them. Adding `fw:gapsSmoothed` to
`fill-interior-gaps.ts` failed with `undeclared: fw:gapsSmoothed (property)
asserted by fill-interior-gaps.ts`. Declaring eleven terms failed until the list
was rewritten.

The second direction matters more than it looks. A ratchet that only catches
growth lets a paid debt sit in the list forever, and the list stops meaning
anything.

**All 53 were paid the same day**, in three groups, and the debt list is now
empty with the test asserting it stays that way:

| Group | Terms | Where declared |
| --- | --- | --- |
| `sample_raster` and `buffer_point` properties | 11 | `ontology/fieldwork.ttl` |
| Core vocabulary: two prose-only value sets, the heat-outreach reasoning terms, table and request provenance | 13 | `ontology/fieldwork.ttl` |
| The Old Naledi example's own domain terms | 29 | `ontology/examples/old-naledi.ttl` |

Three things came out of doing it rather than planning it.

**Two properties had their values declared only in prose.**
`fw:spatialRelation` carried the comment *"Inside, Boundary, Outside, or
MissingLocation"* and `fw:coverageDecision` *"Accept, Review, or Excluded"* —
and not one of those seven individuals was declared anywhere. A reasoner meeting
`fw:Inside` found nothing saying what it is. They are now classes with named
individuals and the properties have ranges, so the prose has become checkable.

**The most load-bearing terms were the least declared.** `fw:decision`,
`fw:distanceKm`, `fw:distanceKnown`, `fw:alertKnown`, `fw:heatAlert` and the
values `fw:NoFlag`, `fw:Review`, `fw:Unknown` appear in the **N3 rules the
reasoner runs**, not only in receipts. The vocabulary the engine reasons over was
undeclared.

**One term meant something other than it looked.** `fw:zone` in Old Naledi is a
*travel-time band* — Within5, Within15, Within30, Over30 — not a coordinate
system zone, which the rest of the application carries as `fw:metricCRS`. Two
different things sharing an everyday word, now pinned by a declaration that says
so.

The Old Naledi terms went to `ontology/examples/old-naledi.ttl` rather than the
core ontology: Broadhurst and Marina are facilities in Gaborone, and a
clinic-service classification is not a Fieldwork primitive. The core ontology
should not absorb one study's subject matter.

None of the eight primitives built today carries any debt, and a test asserts
that specifically — it is the state the mechanism exists to hold everything else
to.

## The performance side

The question raised it, and it is real: every term asserted is a triple to
write, store, and reason over. Two things are recorded.

**A static count per module**, printed by the gate. The heaviest assertors are
`old-naledi.ts` (37 terms), `catchment-semantics.ts` (33),
`runtime-semantics.ts` (21). This is a **proxy and not a measurement** — a term
inside a loop is asserted once per record, so a module with few terms can produce
more triples than one with many.

**A measured baseline on a real run.** The walking catchment composition
produces **83 triples and 13.4 KB** of provenance from four members, about 21
triples each. A test holds it at 92, close enough that adding a term to any
member shows up there rather than in a slow run months later.

That is the honest limit of what is measured: provenance *size*, on one
composition. Reasoning *time* over it is not measured, and the relationship
between the two is assumed rather than established.

## What this does not establish

**That the declarations are good.** The check catches a term with no definition.
It cannot catch a definition that is wrong, a label that misleads, or a domain
that is too narrow — which is exactly the class of defect that prompted this,
since `fw:originCount` was *declared*, just declared with a domain that became
false when a second widget used it. A term asserted by two activity classes whose
declaration names one of them is still undetected.

**That every release is coupled yet.** `ontology.emits` now exists in the
release schema, validated against what the module actually asserts, and required
of any release published after 2026-10-10. But release files are immutable once
committed, so the fifty already published cannot be backfilled: each gets its
`emits` at its next release. Coverage today is one widget of fifty.

## The cascade, demonstrated

`travel_time_band` 0.3.0 was published for no reason other than to record the
terms it asserts. That alone produced the chain the question asked for:

```
  drift: compute_walking_catchment 0.1.0 · band moved —
  travel_time_band has moved from 0.2.0 to 0.3.0 since this composition pinned
  it. Read that release's changes before trusting the result.
```

An ontology change became a release, and the release became a drift signal for a
composition that pinned the old one. Ontology drift and widget drift are now one
signal, which is what tightening the coupling was for.

The composition was re-pinned as 0.2.0, and 0.1.0 kept as
`tests/fixtures/drifted-composition-2026-10-10.json` so the drift report stays
exercised by a test rather than becoming a story about something that happened
once.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Couple widgets to the ontology in CI, and record the 42 terms of debt |
| 2026-10-10 | Complete the widget-ontology coupling: debt to zero, and the cascade works |
