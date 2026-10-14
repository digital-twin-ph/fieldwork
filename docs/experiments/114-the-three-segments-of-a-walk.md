# 114 — The three segments of a walk, and who is excluded by the missing ones

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** validated — all three segments are charged and the exclusion is gone.
What remains is what the two straight legs assume, which is stated rather than fixed.

Raised by the practitioner on 2026-10-14, from the routing notebooks:

> Routing is three segments: **D1** is origin location to nearest node, **D2** is
> network distance, **D3** is from network nearest node to destination location.

Then, on what the omission costs:

> Not using D1 may penalize where there are no roads where people live.

And then the fix:

> Where home (origin) is far from roads, we can only assume a route "as the crow
> flies".

## What the code does

_As found on 2026-10-14. All three rows changed the same day; what they are now is under
"What landed" below, and this table is kept because it is the state the rest of this
record argues against._

| Segment | Status when found | Today |
| --- | --- | --- |
| **D1** origin → nearest node | **measured, recorded, and not charged** | charged, as a straight line at street speed |
| **D2** network distance | correct — Dijkstra over edge lengths | unchanged |
| **D3** last node → destination | **not modelled**; a uniform `bufferM` halo stands in for it | charged: `min(bufferM, the budget left)`, tapering to nothing at the frontier |

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
less wrong in a stated direction. (Written before D3 was modelled later the same
day; the sentence that followed said D3 remained unmodelled, and it no longer
does. What the modelled D3 still assumes is under "What landed".)

It does not establish that `travel_time`'s straight-line proxy is the right
fallback, only that it exists and is honest about being a proxy.

## What would close it

D1 charged, the exclusion replaced by a recorded off-network segment, and the
shipped isochrone example re-measured — its output will change, and the pinned
test values with it, which is the result rather than a regression.

_Closed 2026-10-14. All three done; what they cost and what they left is below._

## What landed, 2026-10-14

### 1. D1 is charged

The snap node starts at `snapDistance` rather than zero, in `isochrone` and in the
`reachable_nodes` primitive, so the budget pays for the walk onto the network.
Re-measured on the shipped Snow isochrone:

| Quantity | Before | After |
| --- | --- | --- |
| Locations in the 1-minute band | 48 | **35** |
| Deaths in the 1-minute band | 110 | **89** |
| Band areas (1 / 5 / 10 / 15 min) | — | **−18.5% / −7.8% / −1.7% / 0%** |

The effect shrinks as the budget grows, which is what charging a fixed 10.9 m leg
against a growing budget does. The pinned test values moved with it; that is the
result, not a regression.

### 2. The exclusion is gone, in both directions

Past `maxSnapM` the site is **routed anyway**. The straight line to the nearest
junction is charged against the budget at the street speed, the catchment carries
`fw:offNetworkMetres`, and the site is listed in `fw:offNetworkSites`. `maxSnapM`
no longer decides whether a site is answered — it decides whether the answer says
what it assumed. `snap_to_network` does the same and drops nothing; the points it
emits carry `offNetworkMetres` so a widget routing from them can repeat the caveat.

What replaced the throw, in order, on one day:

| Behaviour | What a distant site got |
| --- | --- |
| until 2026-10-14 | an error that ended the run, discarding every other site's result |
| for a few hours | no result, reported |
| now | a result, charged for the walk, marked as resting on an assumed line |

**One case still has no answer, and should not have one.** When the walk to the
nearest street alone spends the whole budget, nothing is reachable. No polygon is
emitted, because the only shape available is a corridor-width disc around a junction
the site cannot reach — which is what this widget drew, silently, whenever `maxSnapM`
was set wider than the budget. That site is named in `fw:unconnectedSites` and in the
alert. "Reaches nothing in five minutes" is the finding.

### 3. D3 is modelled

On the practitioner's instruction, later the same day:

> Model D3 — connect D1, D2 and D3 and that's what you buffer.

The corridor was a constant `bufferM` strip around every reached street, including the
streets at the very edge of the budget. Someone standing there has nothing left to walk,
so the catchment claimed 25 m of ground beyond its own time, all the way round its
boundary. The widget's note called the strip a halo standing in for D3, which is a way
of saying the third segment was not modelled at all.

It is now **a leg with a budget**: at any point on the route the walk off the street is
`min(bufferM, what is left)`. The region is the whole route buffered — D1, then D2, then
D3 — so it is full width while there is time to spare and tapers to nothing where the
time runs out. The catchment now stops at the time it is drawn for.

`bufferM` stops being a drawing width and becomes **the furthest anyone is assumed to
walk off a street at the end of a route**. The cap matters: without one the model lets
you leave the network at the origin and walk the whole budget in a straight line, which
is the crow-flies proxy that network routing exists to avoid.

Re-measured on the shipped Snow isochrone, holes unfilled, against the same reach drawn
the old way:

| Band | Before | After | Change |
| --- | --- | --- | --- |
| 1 min | 12,206 m² | 7,414 m² | **−39.3%** |
| 5 min | 186,035 m² | 160,415 m² | **−13.8%** |
| 10 min | 685,799 m² | 656,937 m² | −4.2% |
| 15 min | 867,199 m² | 867,199 m² | 0.0% |

The 15-minute band does not move, which is the check that the taper only bites where the
budget binds: at 15 minutes this network runs out before the time does, so every reached
point still has the full leg to spare. The shortest band moves most, because almost all of
it is frontier.

The counts the worked example reports follow: the one-minute band falls from 35 locations
and 89 deaths to **21 and 65**, and the five-minute band from 212/425 to **204/409**. Of
the 110 deaths the one-minute catchment claimed before any of this work, **45 were inside
only because two of the walk's three segments were free**.

**The chain agrees.** `snap_to_network → reachable_nodes → travel_time_band →
reachable_corridor` reproduces the monolith to 2×10⁻⁵ of area at every band, which is
union ordering in floating point. Getting there required two changes beyond the taper:
`snap_to_network` now keeps the site's own coordinates on the point it moves — it kept
only the distance, so nothing downstream could draw the first leg — and `reachable_nodes`
passes them on to whatever draws the corridor.

**What it costs**, four bands on the Snow network:

| Subdivide every chunk, unpooled | 15.0 s |
| Subdivide the frontier only, unpooled | 6.1 s |
| **Subdivide the frontier only, pooled** | **4.7 s** |
| The same streets at a constant radius — the shape before the taper | 4.1 s |

Two optimisations make the difference between 15% over the halo it replaced and three
times the work: only the frontier is subdivided, since everywhere with more than
`bufferM` left takes the full width anyway; and chunks are pooled so a street reached from
both ends is buffered once. The pooling replaces `reachedStreets`, which pooled by street
and has been removed along with `bufferedCorridor` — both were unreachable once the
corridor stopped having a single width.

### 4. The feedback loop

The practitioner's instruction:

> The route widget should alert the user that there are sites that did not
> connect. That is a feedback loop that can be acted on by the user.

The widget **glows red** on the canvas with a count, and the Inspector names each
site, what happened to it and the distance that decided it. The spread through
`clipPolygons` and `summarizePolygons` carries both findings downstream, so a
summary over seven of nine catchments glows too.

### What the degraded answer still assumes

_Added 2026-10-14, alongside the section of the same purpose above, which was
written before any of this was built._

The off-network leg is **a lower bound charged at the wrong speed**. A straight line
assumes it can be walked, and walking off-path is slower than walking a street; both
assumptions push the same way, so an off-network catchment is optimistic. The widget
says so; it does not correct for it, and this record does not establish how large the
error is anywhere, because no example routes where roads are sparse.

**D3 is modelled, not measured.** The final leg is capped at `bufferM`, a number nobody
has calibrated: 25 m is a plausible distance from a street to a door in Soho and has no
standing anywhere else. The taper makes the catchment stop at its own time, which is a
different and smaller claim than making it right.

Both straight legs — D1 and D3 — assume ground that can be walked and charge it at street
speed. Where that is false, which is exactly where streets are sparse, the catchment is
still too generous.

The 2.9% figure stands as one site on one well-mapped network. The quantity that
matters — D1 where roads are sparse — remains unmeasured.

### Validation

| Check | Result |
| --- | --- |
| `node scripts/test-unit.mjs` | 492 pass, 0 fail |
| chain against monolith, four bands | areas agree to 2×10⁻⁵ |
| `tests/reach-chunks.test.mjs` | 7 new: where the cut falls, walking stopping at the budget, vertices kept, two-way reaches pooled, radii quantised downwards |
| `tests/unconnected-sites.browser.mjs` | 4 pass (Chromium + WebKit): the glow, the named sites, `--danger-3` on the ring, the downstream glow, `fw:offNetworkSiteCount`, `fw:offNetworkMetres`, `fw:unconnectedSiteCount`, and the alert clearing when the limit is raised |
| `npm run validate:ontology-coupling` | the five new terms are declared; it caught two of them asserted and undeclared |
| practitioner reading of the alert | **not done** — whether "Routed off-network" is understood as "optimistic" rather than "broken" is unobserved |

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-14 | The three segments of a walk, and who is excluded by the missing ones |
| 2026-10-14 | D1 charged in `isochrone` and `reachable_nodes`; Snow isochrone re-measured (1-min band 48 → 35 locations, 110 → 89 deaths; band areas −18.5%/−7.8%/−1.7%/0%) and pinned values moved with it |
| 2026-10-14 | Exclusion past `maxSnapM` replaced by a report: `unconnected` on the value, a note, `fw:unconnectedSiteCount`/`fw:unconnectedSites` in the receipt, a red glow on the widget and a named list in the Inspector. Same change in `snap_to_network`. The routed crow-flies leg step 2 asked for is still not built |
| 2026-10-14 | Opening table and "What this does not establish" marked where the day overtook them: both were written before D3 was modelled, and a reader meets them first |
| 2026-10-14 | D3 modelled: the corridor is the whole route buffered by the leg the budget still allows, tapering to nothing at the frontier instead of claiming a constant 25 m beyond it. Snow bands −39.3% / −13.8% / −4.2% / 0%; 1-min counts 35/89 → 21/65. Chain and monolith agree to 2e-5. `reachedStreets` and `bufferedCorridor` removed; `snap_to_network` now keeps the site's own coordinates |
| 2026-10-14 | The crow-flies leg built: past `maxSnapM` the site is routed with the straight line charged, carrying `fw:offNetworkMetres`; `snap_to_network` drops nothing and marks the point instead. `unconnected` now means only "the walk alone spends the budget", which also removed a disc this widget drew around a junction whenever the snap limit was wider than the budget. Status validated; D3 remains unmodelled |
