# Audit — the two sea-level widgets

_Created 2026-10-13 · Updated 2026-10-13_

Asked by the practitioner on 2026-10-12 and again on 2026-10-13: the sea-level
rise worked example is postponed, and postponing it means inspecting the two
widgets that were never audited — **Sea-level projection extract**
(`slr_extract_import`) and **Assign projection site** (`slr_site_assignment`) —
to find whether they belong in existing primitives and where the gaps are.

Pack work stays postponed. This is the audit, not a change to the pack.

## Summary

| Widget | Verdict | Action |
| --- | --- | --- |
| `slr_extract_import` | **Misfiled and misnamed.** It acquires nothing and imports nothing. | Move group, rename. Clears a standing blocker. |
| `slr_site_assignment` | **Legitimate composite, already factored.** | Leave the contract. Name is a lesser question. |

## `slr_extract_import` — a source that sources nothing

**What it declares:** group `Sources`, `inputs:[['projections','table']]`,
output `table`.

**What it does:** takes a table that `table_input` already imported, checks it
against the long-format projection schema, and returns **the same table** with a
`projection` annotation carrying the provenance. It computes nothing and reads no
file.

Two things are false about it, and they are the same fact twice:

- It is grouped under **Sources** while taking its data on an input port. The
  palette group states a workflow stage; this one states a stage the contract does
  not occupy. That is the standing blocker
  `sources-group-does-not-mean-acquisition`, which as of 2026-10-13 blocks this
  widget alone — it was lifted for `reproject` when the split changed that
  widget's contract ([111](../experiments/111-splitting-reproject.md)).
- Its node type ends in **`import`**, which is an acquisition verb in
  `scripts/validate-naming.mjs`. It imports nothing. `table_input` does the
  importing, and this widget's refusal messages say so themselves: *"Import a
  long-format projection extract first."*

**What it actually is — and this is worth keeping.** It is a *declaration*: an
assertion that a table is a bounded extract of a published dataset, with the
provenance that makes its values interpretable. The knowledge it enforces is real
and is the strongest part of the sea-level work:

- a projected value without its full key is uninterpretable;
- values are not comparable across dataset versions, so the version is required;
- a baseline period is read from the documentation and **never assumed**;
- a basis identifier is uninterpretable without its kind, because `wf_1e` is one
  workflow and `medium` is a p-box over several, and a p-box bound is not a
  quantile of one distribution;
- families that include and exclude vertical land motion are not comparable;
- units are admitted (mm or m) and the conversion is **recorded rather than
  performed silently**, after an assumption that AR6 publishes metres turned out
  to be wrong on 2026-10-09.

None of that should be lost. The widget is right; its group and its name are
wrong.

**Recommended:** group `Comparisons and checks`, node type `slr_declare_extract`,
title "Declare projection extract". That satisfies the blocker's own lift test —
*the widget changes contract or group so the check passes without an exemption* —
in the same way `reproject` did, and it is a rename under the
[experiment 18](../experiments/18-shared-input-standardization.md) adapter.

## `slr_site_assignment` — the computation is already a primitive

**What it does:** narrows the site layer to sites whose `site_id` appears in the
extract, then assigns each point its nearest remaining site and records the
distance.

The nearest-site search is **already factored**: it calls `nearestOf` from
`src/nearest-neighbour.ts`, which the source comments record as *"one shared
search, three callers"*. So the primitive underneath exists and is shared, which
is what D1 asks for — the unit of reuse is not the unit of use.

What the widget adds beyond the shared search is domain knowledge that is not a
primitive anywhere:

- a site the extract cannot answer for is not a candidate, so the layer is
  narrowed by `site_id` before any search;
- a site layer and an extract that share no `site_id` are refused outright, with
  the reason that they must come from the same published dataset.

Decomposing it into `measure_distance` plus a filter would need a join-on-key
filter primitive that does not exist, and would make a practitioner wire three
nodes to ask one question. **Leave the contract as it is.**

Its node type is a noun phrase, `site_assignment`, where the convention asks for
`verb_object` and its own title already says "Assign projection site". That is a
real but minor disagreement, and the next section is why it is not being acted on
by itself.

## A finding about the convention, not the widgets

The naming convention says `verb_object` for transforms. **Nothing enforces it.**
`scripts/validate-naming.mjs` has seven rules, and the only one about verbs is the
negative case — a transform verb appearing under Sources. The convention's main
rule is prose.

Measured 2026-10-13 across the 27 widgets in the processing groups: **14 are
verb-first and 13 are not.**

> mean_center, donut_geomask, hex_aggregate, voronoi, isochrone,
> slr_site_assignment, slr_threshold_comparison, reachable_corridor,
> reachable_nodes, facilities, access, point_grid, coverage_check

Mechanising verb-first today would flag all thirteen, and **at least five of them
are right as they stand**. `voronoi`, `isochrone` and `mean_center` are the names
practitioners actually use; renaming them to `compute_voronoi` or
`build_isochrone` would satisfy a rule and make the palette say something nobody
says. That is D1's second axis — whether a practitioner would ask for the
operation by name — and it beats the convention here.

So the rule as written does not survive being applied to what exists. It fires
reliably and would bind harmfully, which is the case
[AGENTS.md](../../AGENTS.md) warns is the dangerous one, because firing looks like
evidence of worth.

**Not proposed as a rule.** The honest version is narrower — *a widget whose own
title is verb-first should have a verb-first type* — which would flag
`slr_site_assignment` and leave `voronoi` alone. That is a candidate, not a rule,
and it should be tried against the full set before it is enforced.

## What this audit does not establish

It does not establish that the sea-level widgets are scientifically suitable. It
reads their contracts, names and groups. Whether the AR6 extract is being used
appropriately for any question is untouched, and
`slr_threshold_comparison` is still reported by `validate:check-coverage` as one
of the four widgets on the weakest evidence rung.

It does not establish that the recommended rename is safe to perform. No example
instantiates either widget outside the postponed pack, so the migration cost is
low, but the pack is postponed and this audit does not reopen it.

It does not measure whether a practitioner finds the extract's refusals
intelligible. The refusal texts are unusually specific — the p-box one in
particular — and nobody outside this project has read them.
