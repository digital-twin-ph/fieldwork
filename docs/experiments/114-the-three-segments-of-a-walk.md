# 114 — The three segments of a walk, and who is excluded by the missing ones

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** tried — the defects are measured; the fix is designed and not built.

Raised by the practitioner on 2026-10-14, from the routing notebooks:

> Routing is three segments: **D1** is origin location to nearest node, **D2** is
> network distance, **D3** is from network nearest node to destination location.

Then, on what the omission costs:

> Not using D1 may penalize where there are no roads where people live.

And then the fix:

> Where home (origin) is far from roads, we can only assume a route "as the crow
> flies".

## What the code does

| Segment | Status |
| --- | --- |
| **D1** origin → nearest node | **measured, recorded, and not charged** |
| **D2** network distance | correct — Dijkstra over edge lengths |
| **D3** last node → destination | **not modelled**; a uniform `bufferM` halo stands in for it |

The isochrone measures D1 and then throws it away:

```js
snapDistance=dist(coords.get(snap.id),origin);          // D1 — measured
snaps.push({siteId:f.id,nodeId:snap.id,distanceM:snapDistance});  // and recorded
const budget=params.minutes*params.speedMPerMin;        // D1 never subtracted
const distances=new Map([[snap.id,0]]);                 // the snap node starts at ZERO
```

So the walk from the site onto the network is free, and the isochrone reaches
further than the stated time allows.

**Measured on the shipped Snow isochrone**: budget 375 m (5 min × 75 m/min),
D1 = **10.9 m**, reach overstated by **2.9%**.

## Why 2.9% is the wrong number to take away

Soho in 1854 is densely noded, so D1 is small. **D1 is largest exactly where
access is worst** — a home set back from any mapped road — and that is where an
access analysis is used to argue for investment. Ignoring it flatters the
under-served.

**And the worse case is not an overstatement at all.** Beyond the snap limit, the
site is not understated; it is *excluded*, and it takes the whole run with it:

```js
if(distanceM>node.params.maxSnapM)
  throw new Error(`${f.properties.name}: the nearest network node is ${Math.round(distanceM)} m away, beyond the ${maxSnapM} m snap limit.`);
```

Both `snap_to_network` and `isochrone` do this, and `maxSnapM` is capped at
1000 m. One site past the limit ends the run, so the surviving finding is the one
about the well-connected neighbourhood.

That inverts this project's own rule. `fw:Unknown` is *"a result, not a failure:
missing evidence stays unknown rather than defaulting to no flag."* Here missing
**road** data produces no answer at all rather than Unknown.

The bias is structural rather than random: **OSM footpath coverage is itself
unequal**, and informal settlements are under-mapped. The exclusion lands hardest
on the populations the analysis exists to make visible.

The project already knows this one layer over. Old Naledi — the informal
settlement example — **cannot route at all**: it uses `measure_distance` and
`travel_time`, the ruleset's predicate is literally `fw:proxyMinutes`, and its
basis records `status: "proxy"`, *"not a clinical recommendation or routed travel
time."* The honest fallback exists. What is missing is that the routed path does
not degrade toward it; it throws.

## The fix, as the practitioner put it

**Where the origin is far from roads, assume the route as the crow flies.** Three
changes, in order of how much they settle:

1. **Charge D1 to the budget.** One line: start the snap node at `snapDistance`
   rather than `0`. The quantity is already measured and already in the receipt.
2. **Never exclude a site for being far from the network.** Past `maxSnapM`,
   charge the crow-flies leg anyway and mark the result as containing an
   off-network segment, naming the site and the distance. A site nobody can route
   to is a finding about access, not an error in the run.
3. **Say what the corridor is.** `bufferM` is a cartographic halo standing in for
   D3, and the widget's note calls the polygons approximate without saying which
   segment the approximation replaces.

### What the crow-flies leg must not claim

A straight line assumes you can walk it — through yards, over walls, across a
river or a railway. In the settlements where D1 is large, the walked path is
routinely longer than the crow flies. So a crow-flies D1 is a **lower bound on
the real first segment**, not a measurement of it, and must be stated as one. It
makes the isochrone smaller and still optimistic.

The same applies to the speed: walking off-path is slower than walking a street,
and charging D1 at the network speed is a second optimistic assumption. Declaring
it beats burying it; a separate off-network speed is a knob this record does not
ask for.

## Where an assumption is written down

The practitioner's rule, stated on 2026-10-14 while this was being recorded:

> Those assumptions can be revealed in the Dive Deeper Notebooks not to clutter
> the UI.

> Assumptions can be embedded also in code documentation so agent can see them.

Three audiences, three places, and the same assumption in each:

| Reader | Where | What it carries |
| --- | --- | --- |
| practitioner | the lab's Dive Deeper section | what the assumption costs, measured, with the equity reading |
| whoever reads the source — human or agent | a comment at the line that makes it | the assumption, the measurement, and the one edit that changes it |
| the application's user | **nothing** | deliberately: a caveat nobody can act on mid-task is clutter |

**The notebook already asked the question.** `19-snap-vs-pyproj.ipynb` carries
*"Dive deeper · snapping moves the site"*, which prints each site's displacement
against the five-minute budget and asks *"whether that displacement matters"*. It
measures D1 and stops there, because nobody had checked what the widget does with
it. The answer now sits under it.

**The code did not.** `src/catchments.ts` computes `snapDistance`, pushes it into
`snaps`, publishes it as `fw:networkSnaps` — and the next line starts the node at
zero with no comment. This defect was found by reading those two lines together;
an assumption stated at the line that makes it would have shown it to anyone, or
any agent, who opened the file. Both sites now carry `ASSUMPTION, UNCHARGED` and
`ASSUMPTION, EXCLUDING` markers naming the measurement and the edit that would
change them.

**One gap this exposes.** `isochrone` has no lab check of its own, so it links
only the projection notebook (the Dive Deeper work of 2026-10-14). The two
notebooks that now discuss its assumptions — 19 for the snap, 08 for the corridor
— belong to other widgets, and the widget whose correctness depends on them
points at neither. A `fw:networkSnaps` reader has nowhere to go.

## What this does not establish

It does not establish the size of the effect anywhere but Soho. 2.9% is one site
on one well-mapped network, and the quantity that matters — D1 where roads are
sparse — is unmeasured here because no example routes in such a place.

It does not establish that charging D1 makes the isochrone *correct*. It makes it
less wrong in a stated direction. D3 remains unmodelled, and the corridor buffer
is unchanged by any of this.

It does not establish that `travel_time`'s straight-line proxy is the right
fallback, only that it exists and is honest about being a proxy.

## What would close it

D1 charged, the exclusion replaced by a recorded off-network segment, and the
shipped isochrone example re-measured — its output will change, and the pinned
test values with it, which is the result rather than a regression.
