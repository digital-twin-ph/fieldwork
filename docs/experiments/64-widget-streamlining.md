# 64 · Streamlining the widget set: a sequenced refactor

_Created 2026-10-10 · Updated 2026-10-19_
_Uses a term this project withdrew on 2026-10-12, named in [the withdrawn-vocabulary ledger](../withdrawn-vocabulary.json). The text stands as written — it is evidence of what was thought then, and rewording a dated record would falsify it. Live text says **port type** for what a connection is checked against._


**Status:** tried — Phase 1 is done and Phases 2 to 6 are not. Confirmed as the direction by
the practitioner on 2026-10-12, three days and twelve widgets later; see *what the delay cost*
at the end.

Originally: admission review for a refactor. Written before the code, as experiments 48,
58, 61 and 63 were. Proposes no new widget and no new vocabulary. Sequences the work the
[widget design audit](../audits/widget_audit.md) found, ordered by **risk to saved work**
rather than by value, because the only irreversible mistake available here is breaking a
workflow somebody saved.
**Overruled 2026-10-12**: essentiality is decided first and example impact is its output, not
its input. See the amendment below.

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

**No composite leaves the palette.** _Overruled in part on 2026-10-12 as a
statement about widgets; see [the amendment](#amendment-2026-10-12--derive-the-essential-set-first-example-impact-is-not-an-input). The palette entry is
what this protects, and a composition keeps it._ Eleven composites decompose into a join and an
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

## Amendment, 2026-10-12 — derive the essential set first; example impact is not an input

The practitioner: *"I want to tackle reducing the number of widgets to only those that are
essential / real primitives or example compositions, example agnostic. Regardless of whether
they impact examples. THEN, I want to know how to adapt the examples to the emerged set of
reduced number of widgets and example compositions."*

This is a change of **method**, and it overrules two things in this document by name.

**It overrules the ordering principle.** This refactor was sequenced "by risk to saved work
rather than by value". That weighting was already found to be for owners who do not exist —
there are no external owners, only the examples and fixtures this project owns. The direction
now is the other way round: decide what is essential on its own terms, then find out what the
examples cost. Example impact is an *output* of Stage 1, not an input to it.

**It overrules "No composite leaves the palette"** — as a statement about widgets. The reason
given still holds: factoring composites onto the canvas would make a practitioner wire three
nodes to ask one question, and the unit of reuse is not the unit of use. But that argument
protects the **palette entry**, not the **widget**. A composite can keep its single node and
stop being a widget, because this project already built the vehicle.

### The vehicle exists and ships exactly one instance

`src/composition-registry.ts` bundles compositions, pins each member by `sha256`, declares the
composition's own ports and parameters, detects drift when a member moves, and asserts
`fw:claimsNoComputation` in every run's provenance to say it adds nothing
([75](75-compositions-as-nodes.md), [these are its mechanics](../../src/compositions.ts)).
`compositions/compute_walking_catchment/0.3.0.json` is the one shipped instance: four pinned
members, two declared inputs, one output.

So a composite has somewhere to go. One canvas node, no residual knowledge claimed, members
already released and already lab-checked. That is what "example compositions" names, and it is
why this reduction is affordable rather than a capability loss.

### Stage 1 · The essentiality test, applied to all 51

Three questions per widget, in order. **Example usage is not among them.**

1. **Is it irreducible?** Does a distinction remain that does not follow from its parts? This
   is D1's primitive test, already applied to all 51 by
   [the audit](../audits/widget_audit.md) — 31 primitive, 20 composite.
2. **Is it example-agnostic?** Would a practitioner in another country, with another disease
   and another dataset, ask for this *by this name, with these defaults*? A widget whose name,
   defaults or bundled data belong to one demonstration fails this **whatever its kind** — the
   audit records nine such, and this is the test that acts on them rather than noting them.
3. **Is it reachable as a composition of survivors?** For anything not irreducible: can it be
   expressed as pinned members with declared ports?

Which gives **four dispositions**, and the fourth is the one that must not be discovered
later:

| Disposition | Test | What it is |
| --- | --- | --- |
| **Primitive widget** | irreducible ∧ agnostic | Stays. Code, a release, a lab check, an audit sweep |
| **Bundled composition** | reducible ∧ agnostic ∧ asked for by name | One palette node, zero widgets. Data, not code |
| **Example-internal** | reducible ∧ example-specific | Its members, inside that example's own workflow. Not addable, not searchable, not counted |
| **Lost** | none of the above | A capability that disappears. **Named here, not found by a practitioner** |

The nine example-bound widgets are candidates for the third row, not the second: shipping them
as bundled compositions would leave the palette the same size and reduce nothing. That is the
distinction between relabelling and reduction.

### This splits the budget into two numbers

`widgets/budget.json` counts 51 against a target of 41, and after this it is counting two
unlike things. A widget costs code, a release file, a lab check, an audit sweep against twelve
criteria, and a line in every future sweep. A composition costs a JSON file whose members
already carry all of that. They cannot share a ceiling.

So the budget becomes **widgets** — the maintenance number, which is what 51 was shame about —
and **addable entries**, the attention number a practitioner actually experiences. Reduction
has to move the first; it must not silently grow the second.

### Stage 2 · Adapting the examples, once Stage 1 has an answer

Strictly downstream, and it inherits an invariant that is stronger than the one this document
pinned. The baseline table above fixes each example's node count, which D9 forbids raising.
Compositions largely preserve it for free — a composition is one node on the canvas, so a
composite becoming a composition changes the count by zero. The constraint that does the work
is the other one:

**The examples' results must not change.** That is the only available evidence that reduction
preserved capability, and it is already instrumented: the frozen fixtures in `tests/fixtures/`,
Old Naledi's classifications in the browser suite, and the pinned numbers — 250 locations and
489 deaths for Voronoi, 216 and 433 for the five-minute corridor.

Where a result *must* change, the change belongs to the **data**, not to the computation. The
worked case is `xpert`, which matches two facilities by name string: extracting the ruleset
makes those matches an attribute of the example's own records, which is
[65](65-ruleset-as-data.md)'s migration, and the frozen expectation is what proves the results
survived it.

Two questions Stage 2 must answer that Stage 1 cannot:

- For each example, which nodes are rewritten, by what adapter, and does it **say so** — the
  existing migrations are silent, and a silent rewrite of a practitioner's saved work is the
  thing retirement was supposed to make visible.
- Which retirements are **available now** and which are gated. `nearest` is gated on port work
  ([66](66-ports-as-schema-binding.md)); the three rule widgets are gated on a typed field
  schema beyond point attributes. A plan that does not separate these two will stall on the
  gated half and deliver none of the free half.

### What would close each stage

**Stage 1** closes with a disposition table covering all 51, each row naming its test outcome,
with the *Lost* row empty or its entries justified — and with `budget.json` carrying two
numbers. It does not close by being argued; the audit's own lesson is that a criterion which
detects without deciding produces a true record and no change
([103](103-duplicates-should-merge.md)).

**Stage 2** closes when every example runs on the reduced set with every frozen fixture
replaying identically and every pinned number holding, and when each rewritten node reports
its rewrite.

### What this amendment cannot establish

That the essentiality test is decidable without judgement. Question 2 in particular — would a
practitioner elsewhere ask for this by this name — is a judgement, and it is the one that
retires nine widgets, so it is the one most worth contesting. The test makes the judgement
explicit and dated rather than removing it, which is all
[104](104-admission-is-not-permanent.md) claims for any criterion.

And that reduction helps anyone. A shorter palette is an argument, not evidence; only the
observation in [63](63-worked-example-runbooks.md) would test it.

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

   **What `facility_audit` is for, recorded 2026-10-19** because no file said and the practitioner
   had to supply it: *"facility audit is case specific to Gaborone because we weren't sure whether
   the facilities we obtained from healthsites, were the same ones in the Ministry of Health's list
   and yet the same in Overture Places list."*

   So it is an instrument for **source agreement on facility identity**, built case-specifically.
   The registry describes it as "Inspect every candidate facility and its evidence basis", which
   says what it renders and not what it is for — and a block whose purpose is unrecorded cannot be
   judged against the essentiality test above, which is why it has sat in the audit queue.

   The general question behind it is not Gaborone's. [71](71-health-facility-sources.md) already
   established that healthsites.io and Overpass are *"the same upstream data… the same facilities
   from the source"*, measuring 47 against 30 for one area on one day — a lag, not a disagreement.
   Overture ingests OSM among its sources. So of the three lists named above, **two share lineage
   and only the ministry's is independent**, and agreement between the first two is not
   corroboration. That is the same finding the boundary work reached on 2026-10-19, where
   geoBoundaries and GADM agreed to between 1.1 and 5.6 metres on Bunia's bounding box because both
   descend from the OCHA Referenciel Géographique Commun, making three products two data points.

   **Source agreement means nothing without source independence**, and nothing in this application
   records lineage between sources or would notice the difference.

   **And no widget can do the check.** The practitioner, 2026-10-19: *"The facility audit was
   therefore hand checking and no widget will be able to do that."* Deciding that a facility in one
   list is the facility in another is adjudication — names differ, coordinates differ, one list is
   a year old — and this is the term [60](60-from-gis-studio-to-public-health-studio.md) reserved
   as **linkage** and deliberately left undefined until the work needed it. The work needs it.

   That makes `facility_audit` neither a deletion nor a domain block to finish into an operation.
   It is a **worksheet for a judgement**, and the essentiality test asked of it — *would a
   practitioner elsewhere ask for this by this name* — is the wrong question, because what is
   general is the activity and not the widget. Rendering candidates side by side is mechanisable;
   concluding they are the same facility is not.

   What follows is where this gets actionable: **a hand check produces a decision, and a decision
   needs a receipt.** The pattern already exists twice. A `ColumnRepair` is a practitioner's
   judgement — read this column as a number, these values were unreadable, at this time — and
   `src/core.ts` asserts it as `prov:qualifiedRevision [ a fw:ColumnRepair; … ]`. An `AreaRevision`
   does the same for a redrawn boundary. Neither computes anything; both are recorded, dated and
   carried into the receipt. A linkage decision is the same shape and has no equivalent.

   A practitioner cannot record *"these two records are the same facility, decided by me, on this
   basis, on this date"* in a form the run receipt carries.

   **Scoped out, 2026-10-19.** The practitioner, on reading the above: *"There are just inputs that
   will need manual validation, which are out of scope for FW, for now."* So this is a named gap and
   not a queued job. Linkage stays undefined in
   [60](60-from-gis-studio-to-public-health-studio.md)'s list, which is that list working as
   intended — *"these become entries when the work needs them, not before"* — and the two existing
   judgement records, `ColumnRepair` and `AreaRevision`, stay the only ones.

   The *"for now"* is the load-bearing part, so what reopens it is worth stating: an input whose
   validation cannot be done outside the application, or a run whose conclusion depends on a
   linkage decision that the receipt then fails to carry. Neither has happened. Until one does, a
   practitioner validating inputs by hand before importing them is the supported path, and nothing
   here should be built to anticipate it.

   What this leaves undecided is `facility_audit` itself: a widget whose purpose is to support an
   activity now out of scope. That is a disposition for the audit queue to settle, with the purpose
   recorded above rather than inferred from "Evidence register", and it should not be read off this
   scoping decision — a worksheet for work done elsewhere may still be worth shipping.
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

## Amendment, 2026-10-29 — a workflow is the evidence of usefulness, and the gate now says so

The practitioner, on the six South London workflows:

> There are six workflows in South London, enough to exercise our widgets in the palette. This is
> one way we can assess which widgets are really useful in workflows and which are not (these
> deserve targeted revisits).

Measured the same day, and the numbers are sharper than the ladder made them look:

| | |
| --- | --- |
| Live widgets | 54 |
| Used by **no** workflow | **12** |
| Used by exactly one workflow | 30 |
| Reached by two workflows or more | **12** |
| Used by South London alone | 17, of which **11 are used by no other example** |

The twelve no workflow uses: `buffer_point`, `deduplicate_points`, `fill_interior_gaps`,
`measure_area`, `micro_workflow`, `reachable_corridor`, `reachable_nodes`, `sample_raster`,
`slr_threshold_comparison`, `snap_to_network`, `summarize_combined_area`, `travel_time_band`.

**Ten of those twelve are `parity only`**, which is the distinction worth stating plainly: a lab
check establishes that a widget is RIGHT, and appearing in a workflow is the only evidence here
that it is USEFUL. Those are not the same claim, and the ladder's rungs let the first stand in
for the second. `scripts/widget-evidence.mjs` now names them on every run, the way
`compositionsUsedByNoExample` already named its own.

The second number is a fragility this measurement was not looking for. Eleven widgets have South
London as their only evidence; restructuring that example on 2026-10-28 and again on 2026-10-29
could have taken eleven widgets' entire case with it, and nothing would have reported that. A
widget reached by exactly one workflow has one workflow's worth of evidence.

### And the Snow examples already reach most of the palette

The practitioner, the same day: *"Between the two John Snow related examples, many widgets can be
exercised at least once."* Measured:

| | |
| --- | --- |
| Exercised by the five Snow-related examples | **32 of 54** |
| Exercised only by a non-Snow example | 10 |
| Exercised by nothing | 12 |

The ten outside are the ones whose problems Snow's data does not pose: facilities and facility
audits, health-facility search, sea-level site assignment, rasters, a point grid, travel time,
clipping points to an area, measured distance.

**And one workflow would reach five of the twelve.** `compute_walking_catchment` — the
composition in `compositionsUsedByNoExample` — is assembled from `snap_to_network`,
`reachable_nodes`, `reachable_corridor` and `travel_time_band`, every one of which is in the
unused twelve. `micro_workflow`, the widget that runs a composition at all, is a sixth. They are
unused for one reason: `snow-isochrone` uses the monolithic `isochrone` widget, and the
decomposition that was built beside it, parity-checked at 2 parts in 100,000 on the John Snow
network, is reached by no workflow. A Snow workflow built from the composition rather than the
monolith would exercise the composition, its four members and the widget that runs them.

That is the targeted revisit this measurement was asked for, and it is one workflow rather than
six retirements.

What this does **not** establish: that an unused widget should be retired. D11 asks whether a
residual function remains that nothing else performs, and nothing here answers that — a widget
may be unused because no example needed its problem yet, which is a gap in the examples rather
than in the palette. It establishes only which twelve the question is owed about.

## What would close it

Phases 2 to 6 executed, or each remaining phase explicitly withdrawn with a reason. Phase 1 is
done. The practitioner directed on 2026-10-12 that this work precedes any further validation, so
the closing condition is now the project's stated next step rather than a someday — and
`widgets/budget.json` reports the distance to the target in every run.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
| 2026-10-12 | Promote the widget shrink to urgent, and record what the delay cost |
| 2026-10-12 | Retired means archived: define it per surface, and find the state is inert |
| 2026-10-12 | A retired widget never runs, so it needs no visible surface at all |
| 2026-10-12 | Make the total a signed number, and make an open experiment say what closes it |
| 2026-10-12 | 106 and 64: the rule builder's tests, and essentiality before example impact |
