# 58 · Implementing the sea-level pack in the host

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** admission review. Written before the code, as
[experiment 48](48-tabular-input.md) was, so that the decisions are reviewable separately from the
implementation. Three of them change the pack's contract and are argued here rather than discovered
in a diff.

The sea-level pack is **declaration-only**: vocabulary, SHACL shapes, three widget contracts, a
worked example, and `implementation: {files: [], definition: "not implemented"}` for every widget.
Nothing in it can run, and the application loads no pack by rule, so the decision taken is to
**implement its three contracts in the application**, exactly as Tabular data was built after
[experiment 47](47-sea-level-pack.md) found the gap.

## What the pack specifies

| Contract | Ports | Refuses |
| --- | --- | --- |
| `slr_extract_import` | → `table` | To acquire anything. It imports a bounded long-format extract of published projections and records the dataset, version, baseline period and obligatory citations |
| `slr_site_assignment` | `points`, `table` → `table` | To treat a projection at a site as a value for an arbitrary point: the distance is part of the result |
| `slr_threshold_comparison` | `table` → `decisions` | To be an inundation model. No hydrodynamics, defences, drainage or waves; it will not run without a stated vertical datum, and must not be presented as a flood extent |

Its vocabulary is careful in ways worth keeping: a projection value is a **change** in relative sea
level against a stated baseline, not an absolute level and not a depth; a scenario is a conditional
pathway with no likelihood attached; values from different workflows are not interchangeable; and a
family that excludes vertical land motion is not comparable with one that includes it.

## Decision 1 — the host implements, the pack keeps the vocabulary

The pack's namespace stays authoritative for meaning. The host's widgets map to `slr:` classes the
way other widgets map to `geo:` and `prov:` terms, and the host **mints no sea-level term of its
own**, which keeps a single definition of each concept.

Two consequences. The pack's three widget declarations are superseded: it declares contracts it does
not implement, the host now does, and leaving both would violate the catalog's own rule that a pack
may not declare a node type the host defines — a rule whose purpose is that a saved workflow must
never be ambiguous about which definition produced a result. So the pack's `contents.widgets` is
retired and its `stages.application` moves from `proposed` to `implemented-in-host`.

And the host must carry the pack's declarations to validate against them, so the two TTL files are
**vendored** into `ontology/packs/` at the digests `widgets/packs.json` already pins. Vendoring is
not forking: the pack remains the source, the copy is verified against the pinned digest by
`validate:packs`, and a drift is a failure rather than a silent divergence.

This is the first finding about the pack model itself. **A pack that cannot ship code is a
specification**, and specifications are implemented by the thing that can execute them. That is not
a failure of the pack; it is what `runtimeFetching: none` means in practice, and it should be said
plainly in [experiment 43](43-widget-packs.md) rather than discovered by each future pack author.

## Decision 2 — site assignment needs three inputs, not two

The contract declares `points` and `table`. That cannot work, because of a rule this project
established deliberately in [experiment 48](48-tabular-input.md): **a table has no geometry**, and
`fw:DataTable` is declared disjoint from `fw:PointDataset`. The projection sites therefore cannot
arrive inside the projections table, and their coordinates have to come from somewhere.

So the implementation takes **three** inputs: the points of interest, the projection sites as a
point layer, and the projections table. The site list is published as a CSV of `site_id`, name,
latitude and longitude, which Input data already imports, so no new acquisition path is needed.

This is a deviation from the pack and the pack will record it. It is also the second thing the
exercise teaches: a contract written before the host had a tabular type assumed the table could
carry sites, and the disjointness axiom that makes tables honest is what forbids it.

## Decision 3 — the comparison's refusals are implemented as refusals

The threshold comparison will not run unless:

- a **vertical datum** is stated by the practitioner, because a comparison of a projected change
  against an elevation on an unstated datum is uninterpretable;
- the elevation comes from a **named attribute** of the points, supplied by whoever knows the
  survey, never defaulted or inferred;
- exactly one **scenario, workflow, family, year and quantile** are selected, since a value without
  its full key is meaningless and mixing families or workflows in one comparison is refused;
- the result is **not connected to a raster output**, which would render something resembling a
  flood map. The host's `decisions` port already restricts it to Map, Table and Chart.

And the output states, in the receipt and in the presentation note, that it is a comparison of two
numbers. The pack's vocabulary carries that sentence; the implementation must not soften it.

## What this cannot establish, stated before building

- That a projection applies at an assigned point. The distance is recorded precisely because it
  does not.
- That an exceeded threshold means inundation, or that an unexceeded one means safety.
- Anything about the AR6 numbers themselves. The host imports an extract; it neither produces
  projections nor validates them, and the three obligatory citations travel with the data.
- Parity, in the sense of [experiment 57](57-parity-evidence.md). These widgets select, join and
  compare; there is no external implementation of this workflow to recompute it against, so the
  honest evidence is unit checks of the join and the comparison, not a parity claim.

## Validation this commits to

Unit checks: the key-tuple selection refuses a partial key; a family or workflow mix is refused;
nearest-site assignment records distance and refuses points without coordinates; the comparison
refuses a missing datum, a missing elevation attribute and a non-numeric elevation; and the
classification is exact at the boundary, where equality must be stated rather than assumed.

A browser check imports a synthetic extract carrying the published key structure — **synthetic
values, not AR6 numbers**, since the real extract requires the 38 GB store and the pack's own
extraction script — assigns sites, compares against an elevation attribute, displays the result and
reloads offline.
