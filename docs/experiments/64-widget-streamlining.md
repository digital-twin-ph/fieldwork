# 64 · Streamlining the widget set: a sequenced refactor

_Created 2026-10-09 · Updated 2026-10-09_

**Status:** tried — Phase 1 is done and Phases 2 to 6 are not. Confirmed as the direction by
the practitioner on 2026-10-12, three days and twelve widgets later; see *what the delay cost*
at the end.

Originally: admission review for a refactor. Written before the code, as experiments 48,
58, 61 and 63 were. Proposes no new widget and no new vocabulary. Sequences the work the
[widget design audit](../audits/widget_audit.md) found, ordered by **risk to saved work**
rather than by value, because the only irreversible mistake available here is breaking a
workflow somebody saved.

Thirty-nine widgets is the point at which this is still tractable. The audit's findings are
not individually urgent; what makes them urgent together is that every one of them gets
more expensive as the set grows, and three of them — the example nodes on the palette, the
duplicate operations, the unmapped widgets — are already being copied by each new widget
that follows the existing pattern.

## What the measurements say

From the [widget design audit](../audits/widget_audit.md) and the enforcement inventory run
for it:

| Measurement | Result |
| --- | --- |
| D1 quadrants | 17 primitives, 11 composites, 9 example nodes, 2 superseded |
| D2 duplicate operations | Nearest-with-distance ×3; generic output ×1 against 3 proper ones; group-and-aggregate ×3 |
| D3 declared validation | **All 39 declare `validationStatus: application-only`** — the validator requires it, with an empty `shaclShapes` array, so no widget can declare more. A ceiling in the registry format, not 39 choices |
| D3 ontology mappings | **10 widgets map to nothing.** 6 of 9 example nodes, 2 of 11 composites, 1 of 17 primitives |
| D7 naming | One description overclaims: `raster_input` says "Acquire", and reads a local file |
| D10 usage | 35 of 39 exercised by an example; `rate` and `reproject` are the real gaps |

The mapping distribution is the useful one, because it was not used to make the D1
judgment and agrees with it anyway. **A widget that maps to no ontology term is almost
always an example node or a duplicate**, which gives the refactor an entry criterion that
does not depend on anyone's reading of a description.

`reproject` is the exception worth naming: a genuine primitive with no ontology mapping and
no worked example, carrying a strong limitation — one datum, no datum shift — that nothing
demonstrates. It is the least-evidenced widget in the registry and should not be mistaken
for an example node on the strength of the criterion above.

## Two things this refactor must not do

**No composite leaves the palette.** Eleven composites decompose into a join and an
aggregate, and factoring them *in the code* is the point. Factoring them *on the canvas*
would make a practitioner wire three nodes to ask one question, which is a worse tool. The
unit of reuse is not the unit of use ([the audit](../audits/ontology-audit.md), D1).

**No worked example grows.** D9 requires the node count of each example to hold or fall.
The baseline, pinned here from `npm run usage:widgets` on 2026-10-09:

| Example | Nodes | Example | Nodes |
| --- | --- | --- | --- |
| heat (demo 01) | 7 | fixture: coverage-workflow-2026-10-05 | 6 |
| old-naledi | 12 | fixture: old-naledi-source-2026-10-06 | 11 |
| spatial coverage | 3 | fixture: sea-level-workflow-2026-10-09 | 7 |
| snow-voronoi | 12 | fixture: snow-epidemic-curve-2026-10-09 | 3 |
| snow-isochrone | 16 | raster clipping | 4 |
| snow-geoprivacy | 15 | blank / study area | 0 |

A rise in any of these is a regression, and is allowed only where a distinction requires it
and the record names the distinction — as [experiment 58](58-sea-level-widgets.md) argued
when site assignment needed three inputs rather than two, because a table has no geometry.

## Phases, ordered by risk

### Phase 1 — no migration, no behaviour change

Nothing here can affect a saved workflow. Do it first and independently.

- Correct the `raster_input` description: it imports a local GeoTIFF window, it does not
  acquire. One word, and it is the project's own naming rule
  ([39](39-stac-discovery-and-remote-acquisition.md)).
- Split the **Semantic reasoning** palette group, which currently holds N3 rule
  applications (`policy`, `xpert`, `access_policy`) beside plain predicates
  (`coverage_check` is point-in-polygon; `slr_threshold_comparison` compares two numbers).
  Calling a numeric comparison semantic reasoning overclaims in the way the naming rule
  forbids.
- Remove `output` from the add-palette, keeping its node type executable. It is superseded
  by `map_output`, `table_output` and `chart_output`; removing a palette entry does not
  touch a node that already exists.
- Give `nearest` and `reproject` their ontology mappings, or state in the release file why
  they have none. Do not invest mappings in the example nodes that Phase 2 retires.

### Phase 2 — shrink the palette, with an adapter

**Revised 2026-10-09.** An earlier draft of this phase proposed retiring the nine example
nodes to templates, and a later one proposed collapsing some into configuration. Both were
wrong, for the reason D4a now records: **a widget is a building block and a worked example is
a set.** A set teaches one build and contributes its pieces to the general bin afterwards. The
failure of `xpert` is not that a TB-specific block exists — a diagnostic-evidence block is a
legitimate piece, and a practitioner in that programme asks for it by name. The failure is
that it never reached the bin: no ontology mapping, no readable contract, addable only within
the example that minted it. **Finish those blocks; do not delete them.**

So Phase 2 is three separate jobs that an earlier draft ran together:

1. **Put the blocks in the bin.** Give every example-minted node type an ontology mapping and
   a declared contract, and make the palette **derived** rather than hand-listed. Today
   `renderLibrary` builds `allowed` from the loaded template's node types plus a maintained
   list, so general operations are unreachable where they are not already used —
   `mean_center` and `hex_aggregate` from Old Naledi, `area` and `chart_output` from the heat
   example. Derive it: a block with a declared contract is addable wherever its ports fit.
2. **Relabel, where the label is wrong.** `access`, `facilities`, `facility_audit`, `samples`
   and the three rule nodes are classified `standard`, meaning *ships with the application*,
   which reads as *applies to any domain*. They are **domain** blocks. Relabelling needs no
   migration and no code change beyond the derivation rule, and it is the honest fix.
3. **Remove only what is not an operation at all.** `alert` is `{active, date}` — a parameter
   wearing a node type. `places` and `centers` were adapted into `observations` by
   [experiment 18](18-shared-input-standardization.md) and survive as legacy identities.
   `comparison_map` is a mode of `map_output`, which already carries
   `inputMode` and `presentation`. These four are the only genuine deletions, and each needs
   the adapter pattern that experiment 18 established.

The migration pattern **already exists and has been used once**: experiment 18 normalised
Neighborhoods and Cooling centers into Input data through an adapter recorded in the
releases, and `places` and `centers` survive only as legacy import identities. That is the
precedent to follow, and its terms are the ones to keep:

**Retirement means archived, corrected 2026-10-12.** The practitioner: *"retired should be
archived and not visible, not just not addable"*, because *"when it's retired and visible it
adds to clutter"*. The definition below said "no longer addable", which is not enough. A widget that
disappears from the add-palette but stays in the catalogue, in the counts and in search is still
occupying a practitioner's attention, and the point of the refactor is to stop it doing that.

So retirement has to be defined per surface, and the surfaces are:

| Surface | A retired widget |
| --- | --- |
| Add-palette and node search | **absent** |
| Widget catalogue dialog | **absent from the list**, and the registry count it reports excludes it. Reachable only under a deliberate "show retired" if anybody asks for one, which nobody has |
| `widgets/classification.json` counts | excluded from `standardCount` and `domainCount` |
| `widgets/check-coverage.json` | excluded, so a retired widget stops owing a Validation Lab check and leaves the awaiting count rather than sitting in it forever |
| `docs/usage.md` | moved to a retired section, not deleted: a practitioner opening an old workflow needs to be able to look it up |
| **The Inspector** | **absent too** — see the correction below, which removes the exception this row used to carry |

**The exception is withdrawn, 2026-10-12.** This table first kept one surface where a retired
widget stayed visible: the Inspector, for a node in a saved workflow that still ran. The
practitioner removed it with a question — *"if it's retired and it's in a saved workflow, by
whom?"* — and a rule: *that workflow should cease to work unless the retired widget can be
replaced by an existing one.*

**The question is the harder half.** This refactor was sequenced by "risk to saved work, because
the only irreversible mistake available here is breaking a workflow somebody saved". There is no
somebody. The saved workflows are the seven shipped examples and the frozen fixtures in
`tests/fixtures/`, all of which this project owns and can migrate deliberately, plus whatever
sits in a developer's `localStorage`. The ordering was weighted for owners who do not exist, and
that weighting is what left a retired widget executable.

So the rule replaces the exception, and it has two branches:

| | |
| --- | --- |
| **Retired and replaceable** — a migration adapter exists | The workflow opens, the node is rewritten, **and it says so**. Silence is the defect [the removed-widget tests](../../tests/composition-drift.test.mjs) already record |
| **Retired and not replaceable** | The workflow **refuses to open**, naming the widget and that it was retired |

A retired widget therefore never runs, which is why it needs no Inspector surface and why
archiving can be total.

**Half of this already works.** Measured 2026-10-12 against `validateWorkflow`:

| Saved node type | What happens today |
| --- | --- |
| `healthsites_discovery` | opens, becomes `find_health_facilities` — **silently** |
| `output` | opens, becomes `map_output` — **silently** |
| `places`, `centers` | open, become `observations` — **silently** |
| `a_type_that_never_existed` | **refused**: *"Invalid or duplicate node."* |

So the not-replaceable branch is already loud, and the replaceable branch already migrates. What
is missing is narrow: the migrations do not announce themselves, and the refusal message names
neither the widget nor retirement as the cause. Those two are the work, not the mechanism.

And the removed-widget tests were written for this: *"These tests record what actually happens
today. They are not a specification of what should happen; if loud failure is introduced later,
they will fail, and that is the point."* They are the tripwire, and they should fail when the
migrations start speaking.

**And the state already exists while nothing honours it.** `scripts/validate-widgets.mjs` has
accepted `implementationStatus: 'retired'` since the registry format was written; no release
uses it, and **no file in `src/` reads the field at all**. So the lifecycle state is declarable
and inert. Phase 2's first task is therefore not retiring a widget — it is making the
application respect a status it already permits.

- A retired node type stays **executable**, so every saved workflow and every frozen
  fixture runs unchanged and produces the same result.
- It is no longer **addable**, so no new workflow acquires one — and, per the correction
  above, no longer **visible** anywhere a practitioner is choosing or counting widgets.
- Its release file records the retirement and what replaces it, rather than being deleted.
- The frozen fixtures in `tests/fixtures/` are the test: they replay saved work, which is
  precisely what this phase risks.

### Phase 3 — factor the keyed join

One internal join implementation; `nearest`, `access` and `slr_site_assignment` re-expressed
over it, and the group-and-aggregate composites over one aggregate. Invisible to the canvas:
no palette change, no port change, no receipt change that a reader would notice.

This is where D9 bites hardest, and where the test is numeric: every example's node count
must be identical before and after, and the three nearest implementations must agree on the
distances the John Snow and sea-level fixtures already pin.

The join is an **internal primitive** — reusable, built once, and not a palette entry,
because no practitioner asks for a join by name
([60](60-from-gis-studio-to-public-health-studio.md)).

### Phase 4 — narrow the port types

> **Generalised by [experiment 66](66-ports-as-schema-binding.md), 2026-10-09.** This phase
> proposed a declared payload contract on the `table` port. That is not a special case: every
> connection is a schema binding, and fifteen port types resolve into roughly four carrier
> kinds plus contracts. Settle 66 before doing this phase.

**Revised 2026-10-09.** An earlier draft proposed three new port types — `assignments`,
`series`, `projection-extract` — to make four run-time checks unreachable. Each would be
named after the widget that produces it, which D4a now forbids: that is three more custom
studs on a set where nine of fifteen port types already have a single producer and at most
one consumer, and `mean-center` has a producer and **no** consumer at all.

The block-compatible route keeps the general stud and lets the shape carry the meaning: a
**declared payload contract on the `table` port**, checked as a validation rule, so a plain
table is refused where assignments are required without minting a type for assignments. That
is a precondition rather than a hard stop, which is one level weaker than
[experiment 62](62-workflow-traversal.md) proposed, and the trade is deliberate — a hard stop
bought with a proprietary connector costs more composability than it buys safety.

The six existing producer-named port types — `access`, `facilities`, `gradedFacilities`,
`coverage-check`, `mean-center`, `point-comparison` — are the same defect already shipped,
and retiring them onto general ports with declared contracts is the larger prize here. It is
also a base-contract change touching saved workflows, so it needs its own record.

`PortType` is a closed union compiled into the application, so this is a **base-contract
change** and [experiment 43](43-widget-packs.md) puts it outside a pack's scope. It needs
its own record and its own migration note, and it is deliberately after Phase 3 so the join
exists before its output is given a type.

The other eight checks are presence, arity or graph-shape conditions. They move into
`validateWorkflow` as preconditions in one place, and they stay checks — no port type can
express "these two inputs must come from different nodes", and
[experiment 48](48-tabular-input.md) established that an unconfigured node must remain a
valid draft, so configuration readiness cannot become a hard stop.

### Phase 5 — enforce the distinctions that are currently unenforced

- `buffer_area` emits `fw:AcquisitionBoundary` rather than typing its output
  `fw:StudyArea`. The term exists, the distinction is the widget's whole purpose, and
  nothing enforces it today.
- A vertical reference as an enumerated declaration on the input, so
  `slr_threshold_comparison` refuses a comparison it cannot interpret
  ([62](62-workflow-traversal.md)).
- Per-widget distinction tables in the release files, which is D3 applied as the audit
  intends — by the author, at the time. Thirty-three release files were not read for the
  audit; this is where that debt is paid.

### Phase 6 — close the usage gap

A service-coverage rate worked example, which exercises `rate`, forces the vintage-bearing
denominator [51](51-dataset-profiles.md) calls the most common serious error, and is the
second-domain test [59](59-pattern-for-engineered-knowledge.md) and
[60](60-from-gis-studio-to-public-health-studio.md) both propose. A reprojection example
follows, closing D10 entirely.

## Decisions to settle before Phase 2

| Decision | Why it cannot wait |
| --- | --- |
| Does a retired node type remain in `registry.json`, or move to a retired section? | `validate:widgets` and the derived `classification.json` both read the registry, and the catalog rule that a pack may not declare a node type the host defines depends on what "declared" means |
| Do the Old Naledi and heat examples keep their example nodes, or get rebuilt on primitives? | Rebuilding changes the examples' node counts, which D9 forbids without a named reason. Keeping them means the templates carry retired types indefinitely, which is probably correct and should be said out loud |
| Is `comparison_map` an example node or a presentation primitive? | It is classified an example node here on one line of description. It may be a general side-by-side presentation, in which case it stays |

## Validation this commits to

Each phase keeps `npm run check` green on Node 22, and `validate:widgets`,
`validate:ontology` and `validate:docs` pass at every phase boundary rather than only at the
end. `npm run usage:widgets` is re-run at each boundary and its node counts compared against
the baseline table above.

Phase 2 and Phase 3 additionally require that every frozen fixture in `tests/fixtures/`
replays to the same result, and that the pinned numbers hold: 250 locations and 489 deaths
for Voronoi, 216 and 433 for the default five-minute corridor
([32](32-john-snow-primitives.md)).

`classification.json` is derived by `build.mjs` and must never be hand-edited; a stale copy
fails `validate:widgets`, which is the intended behaviour.

## What this cannot establish

That the D1 quadrants are correct — they are judgments, the zero-mapping criterion only
corroborates them, and three decisions above exist because the judgment is contestable. That
the refactor improves anything a practitioner experiences: the palette gets shorter and more
honest, which is an argument rather than evidence, and only the observation in
[experiment 63](63-worked-example-runbooks.md) would test it. And nothing about the
correctness of any computation; this changes where operations live, not what they compute,
and a phase that changes a result has gone wrong.

## What the delay cost

_Added 2026-10-12, when the practitioner restated the direction: too many widgets, and the
duplicates and composites should be retired._

This was written against **39** widgets and opened by saying that thirty-nine "is the point at
which this is still tractable", that the findings "get more expensive as the set grows", and
that three of them "are already being copied by each new widget that follows the existing
pattern".

There are now **51**. Phase 1 was done. Nothing from Phase 2 onward was.

| | 2026-10-09 | 2026-10-12 |
| --- | --- | --- |
| Widgets | 39 | **51** |
| Through D1 in the audit's table | 39 | 39 |
| Example-bound on the palette | 9 | 9, of which 2 already migrate |
| Nearest-with-distance implementations | 3 | 3 |

**What the delay did not cost** is worth recording too, because the sequencing worked. D9 held:
every worked example's node count is unchanged from the baseline pinned above — heat 7,
old-naledi 12, spatial coverage 3, snow-voronoi 12, snow-isochrone 16, snow-geoprivacy 15,
raster 4, blank 0. No saved workflow was broken, because the risky phases are the ones that were
not attempted. Ordering by risk to saved work meant the part that got skipped was the part that
could have done damage.

**And the twelve new widgets are not the refactor's failure.** Eight of them are the isochrone
decomposition and its summarising primitives, which [80](80-network-snap.md)–[88](88-combined-area.md)
each admitted through D1 individually. The set grew because the work grew, not because nothing
was watching. What was not watched is this table: the audit's counts were never brought forward,
which is why the growth was invisible until someone asked.
