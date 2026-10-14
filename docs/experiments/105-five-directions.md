# 105 · Five directions

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** tried — the five directions are recorded as the method and each has been pointed at
this project once. Four produced findings; the fifth, forward, produced a direction that nothing
has yet tested.

Searched `docs/` first, per [the standard](README.md): the prior statement is the glossary's
**Developmental evaluation** entry, which gives the stance and names no directions.

## The question asked

The practitioner: *"In a DE project, we look back, we look forward, we look sideways, above and
below."*

This document first recorded that as five mechanisms and got three of the five wrong. The
corrections are the practitioner's own and they are what make the method usable:

| Direction | What it actually asks |
| --- | --- |
| **Backward** | Does what was already admitted still pass what we now know? |
| **Sideways** | **The present inventory**: duplicates, connections, gaps, value in what we have *now* |
| **Above** | **The forest**: what does the emerging framework look like? |
| **Below** | **A tree**: what does this one thing uniquely contribute to the forest? |
| **Forward** | **The synthesis**: given backward, sideways, above and below, what does that mean for the future — the direction of emergence? |

My first reading had sideways as "has this been asked before", above as "does it serve the goal",
below as "does the code match the declaration", and forward as "what would close this". The first
three were adjacent concerns, and the fourth was follow-through, which belongs to backward. Forward
is not a per-document field. **It is the only direction that is derived rather than observed.**

## Sideways · the inventory, and what it found

Pointed at the port-type union, which is where this project's inventory actually lives: 51 widgets
exchange data through what was **16 carriers**, and `PortType` is a closed union, so this is the
whole of it. Counted from the built definitions — a first pass by regex got two rows wrong and is
the reason this is now a test rather than a reading.

| | Carriers | |
| --- | --- | --- |
| **General** | `points`, `polygons`, `area`, `table`, `raster`, `network` | `points` alone has 11 producers and 27 consumers; these six carry **79%** of all connections |
| **Private pipes** — one producer, one consumer | `alert`, `distances`, `facilities`, `access`, `mean-center`, `point-comparison` | each a private channel between two named widgets, declared as though it were a type |
| **Shared** | `decisions`, `gradedFacilities`, `coverage-check` | |
| **Dead** | ~~`samples`~~ | appeared in the union and **nowhere else**. **Removed 2026-10-12**, and `tests/port-inventory.test.mjs` now refuses a dead member and holds the private-pipe count at six |

Six carriers do the work. Six more are private pipes. One was dead, and is gone.

**And this is why the nearest-neighbour merge is blocked.** The three implementations emit
`distances`, `access` and `table` — two of them private pipes invented by the widget that emits
them. The port problem is not abstract and it is not about renaming a shared type: it is that each
implementation built its own channel, so three widgets doing one thing produce three
incommensurable outputs.

## Above · the forest

Nobody had described the shape, so: **51 widgets, 31 primitive and 20 composite**, exchanging data
over 6 general carriers with a fringe of 10 specific ones. 19 of the 32 that compute have an
independent check. The ontology types 560 terms with nothing undeclared. One composition mechanism
exists and holds one composition.

Three regions, which is the useful part of the view:

- **A real core** — the isochrone chain, the summarising primitives, the clipping and buffering
  and projection widgets. General carriers, admitted individually, 19 with independent checks.
- **Two scaffolding regions** — the heat demo and Old Naledi, which between them account for
  **nine of the nine** example-bound widgets, five of the six private pipes, and the dead carrier.
  They predate the real case studies and are where almost every structural defect lives.
- **A domain pack region** — the three `slr_*` widgets, attached to a pack whose programme is
  postponed.

The forest is mostly one healthy stand, with a large patch of scaffolding that has started to
look like trees.

## Below · one tree's unique contribution

For a primitive this is D1's residual distinction, and for a composite it is "nothing residual,
but asked for by name" — which makes convenience the contribution, legitimate only while a
practitioner does ask. Applied to the three that prompted all this:

| | Unique contribution |
| --- | --- |
| `nearest` | the search itself: nearest candidate, distance, and an explicit unmatched-with-reason |
| `access` | a speed, turning distance into proxy minutes, and an evidence grading |
| `slr_site_assignment` | one validity rule: do not assign a site the extract cannot answer for |

Looked at from below, two of the three contribute **a parameter and a filter**. That is not a
widget's worth of contribution, and it is the same conclusion D2's follow-through reached from
sideways — which is the method working: two directions, one answer.

## Forward · the direction this implies

Not a closing condition. The synthesis of the four above, and the first time this project has
written one:

**The framework is converging on general carriers, primitives, and composition.** Everything that
has gone well this week sits in that pattern — eight primitives over `points` and `polygons`, a
composition that expands to its members, parity evidence that follows the carrier rather than the
widget. Everything that resists sits outside it: private-pipe carriers, demo-shaped widgets, and
rule-carrying widgets with no general form.

So the direction of emergence is **fewer widgets over fewer carriers, with domain expressed as
parameters, prepared inputs, and rules-as-data rather than as widget types** — and that gives an
order the retirement-first plan did not have:

1. **Collapse the private pipes.** Six carriers exist to connect two widgets each. Removing them
   is what turns the blocked merges into renames.
2. **Then the merges happen almost for free** — `access` and `slr_site_assignment` become
   `nearest` plus a parameter and a prepared input.
3. **Then the example-bound widgets lose their carriers**, and the two scaffolding regions have
   nothing holding them up.
4. **A general rule-carrier** replaces `policy`, `access_policy` and `xpert` and absorbs `alert`:
   four widgets and two private pipes out, one widget in.

That is a prediction and it is falsifiable: if collapsing one private pipe does not make its merge
cheaper, the direction is wrong.

## Second run · pointed at vocabulary, 2026-10-12 evening

_On the practitioner's instruction to remember that nothing from the past is permanent, and to run
the five stances — including over conclusions reached an hour earlier. The occasion was the point
that because this is an ontology-based project, **names should come from existing standards,
because those standards are curated and have been argued over, and that is where to look for
validated inputs.**_

### Backward · is what was admitted still admissible?

Two of today's own conclusions failed review within the hour.

**Overstated.** I wrote that three operations hide their standard name behind an invented one.
Measured against the release titles, it is **two**: `clip_polygons` is called *"Clip polygons"* and
`summarize_combined_area` is called *"Combined area"*, while `summarize_hull`'s title is already
*"Convex hull"* — only its **nodeType** carries this project's `summarize_` prefix.

That distinction is worth more than the correction. A **nodeType** is an internal identifier a saved
workflow pins; a **title** is what a practitioner reads. `buffer_point` is titled *"Area around a
point"* rather than *"Buffer"*, which departs from the standard **deliberately and defensibly** for
an audience that does not think in GIS operations. So the rule is not "use the standard name
everywhere": an identifier departing from a standard costs a dictionary and a translation; a title
departing from one may be a kindness.

**And the reason my first reading was wrong is the same reason three other things were wrong
today** — I read a one-line description or a name instead of the artifact. That is now four:
`facility_audit`'s port, `facilities`' description, the buffer cap, and this.

### Sideways · the inventory

| | Count |
| --- | --- |
| Declared `fw:` terms in the ontology | **462**, across 17 ttl files |
| Of those, carrying an alignment to a non-`fw:` term | **76** |

> **Corrected 2026-10-12.** This table first read *263 terms, 0 aligned*. Both figures came from
> grepping `ontology/fieldwork.ttl` — one file of seventeen — for four alignment predicates, and not
> for `rdfs:subClassOf` or `rdfs:subPropertyOf`, which are how this project had been aligning all
> along. The sideways stance is supposed to be an inventory; an inventory of one shelf is not one.
> `docs/audits/ontology-audit.md` records this and the four other numbers that came from the same
> mistake.

| | |
| --- | --- |
| External namespaces the project does use for what it says — `geo:`, `prov:`, `qudt:`, `dcat:`, `dcterms:` | 5 |
| Operations whose practitioner-facing title hides a standard operation name | 2 |
| Dictionaries translating this project's relation names into DE-9IM | **was 2, now 1** |

So the project borrows standard vocabularies fluently for the things it *says*, and has never
declared, for a single one of its own 263 terms, whether a standard already names that thing.

**Done, not just counted:** the duplicated dictionary is now one `GEOSPARQL_PREDICATE` in
`src/spatial-predicates.ts`, with a test that keeps it there and asserts `MissingLocation` acquires
no standard predicate — because DE-9IM has none for an absent geometry, which is independent
evidence for what was argued separately today.

### Above · the forest

The framework has three layers — primitives, compositions, declared knowledge — and this adds an
axis across all of them: **whose vocabulary is it?** With a rule that holds at every layer:

> A standard names **the domain**. The project names **its own conduct**.

Geometry, relations, units and coordinate reference systems are the domain; inventing there costs a
dictionary. Activities, plans, receipts, admission and retirement are this project's conduct, and
naming there *is* the work. `fw:GridSampleGeneration` is not a reinvention of anything; `fw:Inside`
is.

### Below · one tree

`clip_polygons`. Its unique contribution to the forest is **a name and no operation**. It calls
`polygonClipping.intersection`, its receipt says *"Polygon intersection in CRS84"*, and the only
thing it adds over the standard operation is the word *clip* — an ArcGIS and QGIS idiom. A widget
whose residual is a name is the definition of something that should be a **mode** and not a node,
which is what [107](107-set-operations-and-the-ruleset.md) proposes independently.

### Forward · the direction

**A standard is a validated input, and vocabulary is the one basis this project has never
ratcheted.** The parallel is exact and the gap is the third row:

| Layer | Its basis | Ratchet | Today |
| --- | --- | --- | --- |
| Computation | an independent recomputation | `parity.json`, the Lab | 23 of 53 |
| Knowledge | a citation a reader can open | `validate-rulesets.mjs` | 0 of 3 resolvable |
| **Vocabulary** | **a standard that curated the term** | **none** | **76 of 462 aligned** |

The action is the same discipline one layer over, and it must not be "every term aligns", which
would be false — most of the 263 describe this project's conduct and no standard names them. It is
the shape `rulesets/ledger.json` already uses for citations: every declared term says which of
three it is.

1. **Aligned** — a standard names this, and the term is used as the standard defines it.
2. **No standard names this** — with the standards actually checked, named, so the claim is
   falsifiable rather than a shrug.
3. **A standard exists and we departed** — the debt, with the reason and the cost. `fw:Inside` is
   here, and the cost was a dictionary written twice.

Only the third is debt, and only the third needs a ceiling that may fall and never rise.

## What would close it

Each direction pointed at this project a second time, with the first pass's findings in hand — and
in particular the forward prediction tested by collapsing one private pipe and seeing whether the
merge it blocks becomes a rename. This moves to `validated` if it does, and to `retired` if the
synthesis turns out to be a description of what already happened rather than a direction.

## What changed our minds

**A number in this document was wrong for the sixth time today.** The sideways table first claimed
the general carriers handle 86% of connections. The measured figure is **79%** — asserted in prose,
caught only because the accompanying test computed it and failed. This is the rule
[98](98-the-coverage-ratchet.md) already records, broken again in the document arguing for
measurement over counting, which is as good an illustration of the practitioner's point as the
argument itself: the stance is not what we count, it is what we do, and what I did was write a
number down.

**Three of five directions were wrong on the first attempt, and the wrongness had a pattern.** I
read every one as a *mechanism this project could install* — a check, a counter, a required
field — because that is what the previous day had rewarded. Sideways became "search before
writing", forward became "say what would close it", below became "compare the declaration to the
code". All three are real practices and none is the direction.

The directions are **ways of looking**, and the first thing each needs is to be *used*, not
mechanised. Pointing sideways at the inventory for twenty minutes found a dead carrier and six
private pipes, and explained why a merge nobody could schedule had been blocked for three days. No
ratchet would have found that, because a ratchet records a lesson and does not find one — which
this document already said about the other four directions and had not yet applied to itself.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-12 | Record the five directions, and audit which ones this project can see in |
| 2026-10-12 | Survey the inventory sideways, delete what it found, and check it stays deleted |
| 2026-10-12 | A standard is a validated input, and vocabulary is the unratcheted basis |
| 2026-10-12 | Withdraw fw:Carrier: no standard defines it and nothing consumed it |
