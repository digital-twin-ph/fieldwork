# 56 · The basis behind an identity: method provenance and validation evidence

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** audit, one implemented change, and a specification deliberately left unpopulated.

Two gaps in [experiment 49](49-catalog-in-the-interface.md)'s table of who needs what turn
out to be the same gap:

- A practitioner asking *can I rely on this result* needs more than which definitions ran at
  which digests. A widget pack is not a bundle of code; it is a technical workflow whose
  credibility rests on its **methods and models**, which should carry their own sources.
- A curator asking *is the catalog sound* needs more than rules, owners and pinned commits.
  They need the **validation results** — what was checked, against what, and when.

The common principle: **an identity or a state recorded without its basis is not
reviewable.** A digest says which code ran, not whether the method is defensible. A review
state says somebody decided, not what they saw.

## Audit, practitioner side: method provenance is structurally absent

Every widget release file carries an `evidence` block. All 66 of them hold a *self-assessment*
and no sources — the isochrone release, for instance, reads
`"status": "not-individually-certified"` with a note about synthetic numerical contracts. A
scan of all 66 finds **zero** DOIs, URLs or citations anywhere in those blocks.

Method citations do exist in the application, but in the wrong place for this purpose. A node
can carry references with roles `data`, `method`, `assumption` and `context`, and the receipt
generator labels them — but the code comment beside it is explicit: *citation metadata supplied
by the workflow author; not independently verified evidence*. So today the only method
references in the system are **optional, per-run, author-asserted and unverified**. Nothing
attaches a method basis to the widget that implements it, and nothing requires a pack to state
what its models rest on.

That matters most exactly where packs are heading. The sea-level pack consumes IPCC AR6
projections and carries three obligatory citations for its **data**
([experiment 47](47-sea-level-pack.md)), and the catalog validator counts them. Its
*application* widgets — site assignment, threshold comparison — have no equivalent requirement,
although they are the parts that turn a published projection into a claim about a place.

## The precedent this project already set, without naming it

The raster clipping work is method provenance done properly, and it was never recorded as such.
[Experiment 29](29-raster-edge-inclusion.md) found all-touched clipping more inclusive than
GDAL's at pixel-aligned cutlines; the resolution was to adopt **GDAL's rule**, with the
divergence measured at 35, then 18, then 2 cells as the rule was corrected. That is exactly
what a method basis should carry: an external implementation named as the authority, plus a
**measured statement of fidelity to it**.

Generalising that gives a closed vocabulary rather than a free-text citation field:

| `methodBasis` | Means | Requires |
| --- | --- | --- |
| `generic-geometry` | Standard computational geometry; no published method claimed | nothing further |
| `published-method` | Implements a method from the literature | references with resolvable identifiers, and a fidelity note |
| `derived-from-implementation` | Follows another implementation's rule, as clipping follows GDAL's | the implementation and version named, and a measured divergence |
| `none-claimed` | Presentation or plumbing; no method at stake | nothing further |

With two rules attached. **A citation is not a validation** — a reference says what the
implementation is based on, never that the implementation is faithful or the method
appropriate; fidelity is a separate, measurable claim, which is why the table requires it
separately. And **the receipt must say who asserted a reference**: the registry (this project's
curators), a pack manifest (the pack's curators, subject to its semantic review), or the
workflow author (unverified, as the code already says). Three different authorities should not
render as one list of citations.

## Audit, curator side: review states had no attachable evidence — fixed

The catalog records `semantic`, `security` and `regression` review states per pack. Until now
those were claims with nothing to cite: `validate:packs` wrote a report naming only the time it
ran, the catalog version and each pack's problems, so it could not be tied to a host build or
quoted in a review.

**Implemented.** The report is now self-describing:

```
schema: fieldwork/pack-validation/1
validatedAgainst: { hostVersion, registryDigest, catalogVersion, catalogDigest, widgets }
rulesEvaluated: [ all eight catalog rules ]
packs: [ { id, version, commit, admission, filesVerified, filesPinned, reviews, problems, notes } ]
```

A curator reviewing a pack can now state what their decision rested on: host 0.6.0, registry
digest `c95bf6d3…`, catalog 0.1.2 digest `ac57e8f1…`, eight rules evaluated, eight of eight
files verified. When a review is actually performed, the review record should reference that
report **by digest** rather than copying its contents — the catalog already learned that lesson
when a restated stage status drifted ([experiment 43](43-widget-packs.md)).

## What is specified and not built, and why

The `methodBasis` vocabulary above is not implemented, and the reason is worth stating rather
than hiding in a backlog: populating it means asserting, for 34 widgets, what each method rests
on. That is a **curator's judgment, not a mechanical migration**, and the one way to get it
badly wrong is to generate plausible citations from memory. This session has already produced
one fabricated-reference failure of exactly that kind, and a registry full of DOIs that nobody
checked would be worse than an empty `evidence` block, because it would look like diligence.

So the proposal is to add the field as **required and closed-set**, which forces an explicit
statement per widget — including `none-claimed` where that is the honest answer — and to let
`validate:widgets` enforce that `published-method` and `derived-from-implementation` carry what
they promise. The values come from whoever is accountable for them.

## Competency questions

Answerable, if `methodBasis` is adopted:

1. What does this widget's method rest on, and who asserts that?
2. Where the basis is another implementation, how far does this one diverge, measured?
3. Which references came from the registry, which from a pack, and which from the workflow
   author?

Answerable now:

4. What did this validation run check, against which host, registry and catalog?
5. How many of a pack's pinned files were verified, and in what review state is it?

Must be refused:

6. Is this method sound, or appropriate for my question? — a reference records a basis; it is
   not a review, and this project certifies nothing scientifically. Every release says so:
   `not-individually-certified`.
7. Does a passing validation run mean a pack is safe or admitted? — it means eight structural
   rules held at a stated moment against a stated host.

## Practitioner exercise

Take any result and try to answer, from the receipt alone, what the method that produced it is
based on. Today the honest answer is usually "the code, at this digest" — which is precisely
the gap. Then ask whether you would cite that result in a report.
