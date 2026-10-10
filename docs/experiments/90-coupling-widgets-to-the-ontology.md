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

**Paid immediately:** `sample_raster`'s nine and `buffer_point`'s two
(`sourcePoint`, `circleAreaFraction` — the latter being the fraction of a true
circle a buffer polygon actually covers, which is worth a definition). Debt
53 → **42**. The remaining 42 are 29 in `old-naledi.ts`, which is a worked
example's own vocabulary, and 13 elsewhere.

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

**That the release file is coupled.** The check reads source and ontology; the
release file's prose note is still prose. Recording a widget's asserted terms in
its release would make a change to them a visible release change, and so a
composition drift signal — which is where this started. That needs a field in
the release schema and cannot be backfilled, because release files are immutable
once committed, so it applies to releases published from now on.
