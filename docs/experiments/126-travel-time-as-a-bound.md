# 126 · Travel time as a bound

_Created 2026-10-20 · Updated 2026-10-20_

**Status:** asked — the framing is settled and nothing is built. No widget reports a travel time
as a bound today, and the street network a practitioner can download cannot support the mode the
question is about.

## What was asked, and what was settled

The practitioner, on finding that the manual page for `network_input` says *walking* throughout:

> *"Regarding street network, OSMNx designates a download as walk or drive. I noticed in the
> widget manual that it talks about walk but it could be drive. Do we make that distinction when
> we download an OSM street network?"*

We do not: one list, `WALKABLE_HIGHWAYS`, is applied in the Overpass query and again when the
response is parsed, and the restriction tags read are the foot ones. That is the subject of the
direction `street-network-declares-a-travel-mode`.

What this record is for is the sentence that followed, which settles how such a number may be
reported:

> *"For 1854 Soho, driving speed limits does not matter. For current day investigations, these
> speed limits matter as a ceiling (best case travel time). Worst case travel time can be
> researched."*

A posted limit is a **ceiling**, so a time computed from it is a **best case** — not an estimate
of how long the trip takes. That is a statement about what the number means, and it has a
consequence this project has to act on before it computes one.

## The consequence: the ceiling is the wrong end for the commonest claim

The work this project is built for makes access claims — *this population is within so many
minutes of a facility*. Such a claim is conservative in the **worst** case. A best-case time makes
a facility look nearer than it is, so coverage computed from posted limits **overstates access**,
and it does so invisibly, because the output is a number of minutes like any other.

The best case is not useless. It is sound for **refutation**:

| Claim | Bound it needs | Sound? |
| --- | --- | --- |
| "Reachable within 30 minutes" | worst case | A best-case time cannot support it |
| "Not reachable within 30 minutes **even at best**" | best case | Yes, and it is falsifiable |
| "At least this far" (a floor on distance) | best case | Yes |

So the asymmetry is the finding: a free-flow travel time can rule a site **out** of a catchment
and cannot rule one **in**. Any widget that reports one owes the reader that direction, in the
result and in the receipt, not in a manual page.

## What the data supports today

Measured 2026-10-20 on `examples/john-snow/soho.graphml`, the OSMnx walk graph this repository
ships — 1,619 directed edges, 50.63 km, central London:

| | |
| --- | --- |
| Edges carrying `maxspeed` | 499 of 1,619 — 30.8% |
| Edges carrying `maxspeed`, drive-usable edges only | 469 of 701 — 66.9% |
| Drive-usable length with a posted limit | 17.54 km of 26.29 km — 66.7% |
| Distinct values present | `30 mph` (460), `20 mph` (39) |

Three facts follow. **`maxspeed` is partial** — a third of the drivable length in a well-mapped
city centre has no posted limit, and anything computed per-edge needs a declared fallback and a
count of the edges that used it. **`maxspeed` is free text** — the values here carry units, and
the wider database legally holds `50`, `RU:urban`, `walk`, `none`, `signals` and implicit zone
codes that need a country table; parsing it is a unit-and-vocabulary job. **We discard it** —
`maxspeed` appears nowhere in `src/`, and the Overpass query already asks for way tags, so the
tag arrives in the response and is dropped.

And travel time here is one scalar: `minutes × speedMPerMin`, applied to every edge identically.
`src/reachable-nodes.ts` says so in the receipt it writes — *"Every time reported here is a street
length divided by that one speed: there is no gradient, no crossing, no waiting and no difference
between travellers in this graph."* Per-edge limits mean edges carry their own traversal cost and
the single speed becomes the fallback. That is a change to the graph contract, not a parameter.

## What would close it

A decision, recorded here, on **which bound each travel-time widget reports**, built: the result
field and the N3 receipt name the bound, the edges that fell back to a declared speed are counted
in both, and a widget that can only produce a best case refuses the claim it cannot support.

Then a demonstration on current-day data — a Philippine or DRC study area, not Soho — where the
best case and a researched worst case are computed over the same graph and **differ by a measured
amount**. If they do not differ enough to change a coverage decision at any threshold a
practitioner would use, the single speed is adequate and this record closes by saying so, which
is the cheaper outcome and is not the expected one.

The worst case needs a source, and the source is the practitioner's to bring: measured speed
products, a volume-delay function such as the Bureau of Public Roads curve over assumed volumes,
or trip times collected locally. Whose data it is and what may be done with it is **not this
project's problem to solve**. The practitioner, 2026-10-20:

> *"Do not worry about the local trip time license, that is the user's problem, the thing to worry
> about is if it is recorded in the widget, a provenance note goes with it for the benefit of
> accurate reporting, for example during publications."*

So the requirement is not a licence check. It is that **a speed or trip time entered here carries
a provenance note that travels with it** — into the receipt, into the evidence panel and into
anything exported — so that a figure quoted in a publication can be attributed to where it came
from. A number typed into a box with no note is the failure: it is indistinguishable in the output
from a number this application derived, and the person writing the paper cannot tell them apart
six months later.

That is a smaller requirement than a licence regime and a harder one to leave out, because it
applies the moment any speed is configurable at all — including the single `speedMPerMin` that
already exists and carries no note today.

## What this does not establish

- **That posted limits would make a driving travel time more accurate.** Nothing here measures
  error against an observed trip. A legal limit is not an achieved speed; in a congested centre
  nobody reaches 30 mph, which is exactly why the number is a ceiling and not an estimate.
  OSMnx's own `add_edge_speeds` imputes from `maxspeed` and falls back to per-highway-type means,
  and labels the result an imputation.
- **That 66.9% coverage generalises.** One graph, half a square kilometre, central London, and
  the figure was read from a file we ship rather than from a fresh download. Sparse-coverage areas
  are the cases that matter — Buvuma Island's streets are largely untagged for anything — and they
  are unmeasured.
- **That the 1854 example is unaffected.** It is affected in one direction only: the practitioner's
  *"for 1854 Soho, driving speed limits does not matter"* settles that the historical workflows
  stay walking, which is what they already are. It does not say the walking filter is right, and
  the walking network's own prototype limits are recorded on `network_input`.
