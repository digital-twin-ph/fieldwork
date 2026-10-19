# 123 · Access distance in three legs

_Created 2026-10-19 · Updated 2026-10-19_

**Status:** asked — the three legs are each implemented and nothing composes them. What is open is
the FORM, not whether: the practitioner has settled that the method is core. *"D1 + D2 + D3 becomes
a core method for different types of access problems, given a street network."* So the question is
one widget, a composition over existing ones, or a kernel the examples call — and what it is
called.

## The question

The practitioner, 2026-10-19, reading the Soho street network against the houses and the pumps:

> *"that is how one will solve the street network-based routing distance from origin to
> destination. D1 + D2 + D3 or distance 1 + distance 2 + distance 3."*

and then, on whether it is worth a primitive:

> *"Given we have applied this approach in other case studies (household access to COVID testing
> labs in Kampala), it is not a one-off application of the method."*

## The precondition, and it is already satisfiable

*"Given a street network"* is the condition, and the application can acquire one for any study
area: `network_input` takes `inputMethod:'osm'`, and `src/street-network.ts` runs bounded Overpass
queries across several endpoints, filtered to `WALKABLE_HIGHWAYS` and scoped by an area with a
margin. So three of the four studies below lack a network because nobody has acquired one, not
because they cannot have one. Only Soho's is in this repository.

One consequence worth stating: that filter makes D2 a **walking** network. Right for households on
foot, which is all four studies as described — and wrong for the vehicle-access variant of a
food-desert measure, where the threshold differs precisely because the mode does. **The network is
a parameter of the access question, not a fixed input to it.**

## The method

An origin is not on the street network and neither is a destination. So a network distance from one
to the other is three legs:

| leg | what it is | where it already exists |
|---|---|---|
| **D1** | origin → the node where it joins the network | `snap_to_network` writes `snapDistanceM` onto each feature and refuses beyond `maxSnapM` (default 150 m), recording an `offNetwork` list |
| **D2** | node → node along the streets | `costsWithin` in `src/reachable-nodes.ts`, settled-set Dijkstra over each edge's `lengthM` |
| **D3** | the destination's node → the destination | the same `snapDistanceM`, computed and unused for routing |

Nothing in the decomposition is missing. `costsWithin` even takes the first leg as its starting
cost already — `new Map([[originId,spentM]])`, with `spentM` documented as *"Where each origin
joins the network, and what the first leg costs."* What is missing is the **composition**, and a
Dijkstra that stops when the target settles rather than when a budget is spent.

The module anticipated it: *"Takes no UTM zone **while it is only routing**."*

## Why it is not one example's trick

Three studies, three countries, three diseases, one operation — origin to service point, through
the network, with both off-network legs counted:

| study | origins | destinations | domain |
|---|---|---|---|
| Soho, 1854 | 250 death locations | eight water pumps | water-borne outbreak |
| Old Naledi, Gaborone | settlement households | diagnostic facilities | diagnostic access |
| Kampala | households | COVID testing laboratories | testing access |
| Food deserts | neighbourhood households | places selling nutritious food | food environment |

The fourth is the one that settles the generalisation, because its destination is **not a health
facility at all**. Three studies about reaching a service could be one domain wearing three hats; a
greengrocer is a different kind of thing, and the operation is unchanged.

The Kampala study is the practitioner's, outside this repository. **What it used is not recorded
here**: whether it measured network or straight-line distance, whether it counted the off-network
legs, and what its data was. That is a gap in this note, not evidence against it.

**The method generalises and the destination acquisition does not.** `overpassQuery` in
`src/health-facilities.ts` emits `nwr["healthcare"~...]` and `nwr["amenity"~...]` and nothing else,
so only those two OSM keys are reachable. A supermarket is `shop=supermarket`, a greengrocer
`shop=greengrocer`, a farm shop `shop=farm` — **the `shop` key is never queried**, and the widget's
own comment that an unlisted kind "can still be typed in, because OSM tagging is open" is true only
inside those two keys. `OVERTURE_CATEGORY_KINDS` maps sixteen categories and every one is clinical.
Meanwhile `amenity` does carry `fast_food`, `restaurant` and `cafe` — so as it stands this
application could retrieve a neighbourhood's fast food and not its greengrocers, which is the
opposite of what a food-desert study needs.

So a fourth study does not just add weight to the admission case. It names a second gap: the
destination source is name-attached to a domain *and* tag-bound to it.

This bears directly on the standardization rule of 2026-10-12 — *"a widget may not be
name-attached to a worked example"* — under which twelve release files had declared themselves
`example-specific` while nothing read the declaration. A method reused across three unrelated
studies is the opposite case, and it is the strongest reuse evidence any candidate in this
repository currently has.

## Measured in Soho, as the control

Computed 2026-10-19 against `examples/john-snow/network.json` (738 nodes, 1,619 edges) and the 250
death locations:

| | n | min | median | p75 | max | mean |
|---|---|---|---|---|---|---|
| **D1** house → nearest node | 250 | 0.6 | **13.5** | 21.1 | 42.3 | 15.6 m |
| **D3** pump → nearest node | 8 | 2.2 | **11.4** | 18.8 | 20.9 | 12.0 m |

Per pump, D3: Warwick 2.2, Rupert 5.6, Kingly 8.8, Broadwick 10.9, Regent 12.0, Ramillies 17.1,
Bridle 18.8, Dean 20.9 m.

Against the straight-line distance to the Broadwick Street pump — mean **125.9 m** — the two
off-network legs average **26.5 m**, or **21.0%** of the whole. No house and no pump exceeds the
150 m snap default, so that refusal never fires here.

**The useful finding is not the size but the variance.** In Soho the correction is nearly
*constant*: a dense graph, 1,619 edges in a few hundred metres, no house further than 42.3 m from a
node. A near-constant offset barely reorders houses by distance, so the mortality gradient's shape
survives ignoring it — while every absolute claim ("within 100 m of the pump", any threshold rule)
is wrong by about a quarter. And it lands hardest in the 0–50 m band, where the gradient is
steepest at 1.867 deaths per house.

**A threshold turns that 21% from an inaccuracy into a misclassification.** Soho's rule compares a
hull's area to 250,000 m² and concludes `NoFlag`; a food-desert measure compares a household's
distance to a half-mile or a mile. Where the output is a category rather than a number, an omitted
26.5 m does not make the answer slightly wrong — it moves households across the line. That is the
strongest reason to count both off-network legs, and it comes from the fourth study rather than
the first.

So Soho is the **control**, not the demonstration: the place where the correction is small and
well-behaved. Old Naledi is where it should not be — sparse network, irregular plots — and the
Kampala study is where someone has already needed it.

## The output is a table, and two separate things stop it being analysed

The practitioner, 2026-10-19, on the shape of the result:

> *"If the measure distance is done by batch (rows of origin, destination points), it is possible to
> output a result table. If it's just two points then it's just one row of D1, D2 and D3."*

> *"Once those (D1, D2 and D3) show up in a resulting table, they can then be analyzed as derived
> variables."*

and, recalling the isochrone study, that the three legs appeared in the dataframe *"like receipts of
the computation"*.

The shape is already right. `measure_distance` is batch by construction — one row per origin — and
its `distances` output is `NearestRow`, which carries `distance`, `unit`, an `attributes` bag and
**`minutes?`**. That last field is the precedent: `travel_time` adds a derived column to the same
rows, so three more legs is the established move and not a new kind of thing.

What does not yet work is everything after the table, and it is two unrelated gaps:

- **It cannot be displayed.** `table_output`'s modes are points, coverage-check, table, polygons and
  decisions. There is **no `distances` mode**, and the heat example shows the consequence: its only
  consumer of `measure_distance` is a ruleset, `{from:'nearest',to:'criteria',port:'distances'}`. So
  a measured distance table reaches a table output only by having rules applied to it first. A
  declared `distances` mode on `table_output` fixes this and nothing else.
- **It cannot be analysed.** `rate` takes `inputs:[['records','points']]`, as does every other
  Summaries widget. Only `travel_time` and `policy` consume `distances`. So `rate`'s `groupBy` and
  `bandWidth` — which are exactly the distance-band gradient — cannot reach a leg sitting in a
  `distances` row. And a widget has one output port, so `measure_distance` cannot emit both the
  table and points annotated with the legs.

The second gap is the one the practitioner identified earlier from the opposite direction, when
`snow-gboh` turned out to carry `dis_bspump` as a precomputed column: **nothing writes a computed
value back onto the records it came from.** `sample_raster` does it for a raster value,
`snap_to_network` for two fixed fields, and there is no general form. One widget that joins a
derived value onto a layer under a named attribute would close this gap and the `dis_bspump` case
with the same mechanism, and it is the difference between a number you can read and a variable you
can analyse.

## What this does not establish

- **That the composition belongs in the palette.** The widget budget is 46 live against a target of
  41, and [64](64-widget-streamlining.md) exists to retire nine example-bound widgets. Three
  studies is strong reuse evidence and it is not an admission decision.
- **That D1 and D3 vary in Old Naledi.** Asserted from the shape of an informal settlement, not
  measured. The settlement boundary and facilities are in `examples/old-naledi/`, and no street
  network for it is. Until that is acquired the claim that Soho is the easy case is reasoning, not
  a result.
- **Nothing about Snow's actual walking distances.** `network.json` records *"date of OSM extraction
  unknown; not an 1854 street reconstruction"*, so D1 measures 1854 house positions against a
  modern graph and part of that 15.6 m median is streets having moved. The numbers above measure
  the **method's** sensitivity; they are not historical distances, and D2 inherits the same limit.
- **That three legs is the right decomposition rather than two.** An origin and a destination are
  treated symmetrically here. A destination that is a building with a known entrance is not the
  same kind of thing as a household centroid, and nothing here tests that.
- **That the three legs cover delivery.** The practitioner's phrasing is *"sold or delivered"*, and
  delivery inverts the model: the household does not travel, so there is no D1, no D2 and no D3.
  A delivery service has a service area, which is a containment question and not a distance one.
  Nothing here addresses it, and a food-access study that counted only travelled distance would
  misclassify every household a delivery round reaches.
- **That distance classifies a food desert.** The common measures pair a distance threshold — around
  half a mile or a mile in urban areas, ten miles rural — with an income condition, and it is the
  conjunction that defines the category. Distance alone, with no denominator and no income, is not
  a food desert, which is this repository's most repeated finding in a fourth setting.
- **Nothing about travel time.** Every number is metres. `travel_time` converts distance at a flat
  speed, which is not a claim about walking a street network, and no part of this measures that.

## What would close it

1. Compose the three legs over the existing kernels and reproduce the Soho table above from inside
   the application, rather than from a script beside it. The numbers to match are in this document.
2. Terminate `costsWithin` on the target instead of the budget, and show the two agree where both
   apply.
3. Acquire a street network for Old Naledi and measure D1 there. The claim to test is that its
   distribution is wide where Soho's is narrow; if it is also narrow, the three legs are a
   correction and not a finding, and this note over-argued.
4. Record what the Kampala study actually did, from the practitioner, so the reuse evidence is a
   fact in this repository rather than a recollection in it.
5. Declare a `distances` mode on `table_output`, so the result table can be seen without a ruleset
   standing between the measurement and the reader.
6. Settle how a derived value becomes a record attribute, which is the gap above and is not
   specific to distance. Until it is settled, D1, D2 and D3 are readable and not analysable.
7. Decide admission against [the widget audit](../audits/widget_audit.md)'s criteria with those
   numbers in hand — including whether it is a widget at all, or a composition.

A Dive Deeper notebook on the descriptive statistics of D1 and D3, and of both against D2, is the
practitioner's proposal and belongs after step 1: the lab reproduces what the application computes,
so there has to be something in the application to reproduce. The notebooks live in
`../validation-lab/content`, and a parity entry naming the notebook is what makes it reachable from
the widget.
