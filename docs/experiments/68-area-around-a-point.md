# 68 · An area around a point

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. One primitive, no new port type, one new
activity class.

A study area must be a polygon — `Boundary` is `Polygon | MultiPolygon` and eleven widgets
consume the `area` port — and it should stay one: scope answers containment, and containment
against a zero-extent geometry is empty. But the useful case is a point **and a distance**:
*the area this gauge speaks for*, *everything within 5 km of this facility*. That construction
exists today only welded inside `facilities` ("within a radius of the study-area center"), and
is one of the six gaps the bottom-up NB06 derivation found.

## Why one point rather than many

`buffer_point` buffers **one** named point and refuses to union several. The reason is
measured rather than aesthetic: `MAX_RASTER_CELLS` is 262,144, and the bounding box of three
Philippine gauges — Manila, Jolo, Davao — is 5.1° by 9.0°, which that cap serves at a
**1,469 m cell**. A single 5 km scope is 0.09° square and gets a **19 m cell**. A multi-place
scope makes the elevation step useless, so the refusal protects the workflow rather than
restricting it.

It is also the honest reading: three circles a thousand kilometres apart are three questions.
A facility count summed across them is a denominator for nothing.

## Contract

`buffer_point`: input `points`, output `area`. Both general carriers, no new port type.

| Parameter | Meaning |
| --- | --- |
| `pointId` | Which point defines the scope. **Required**, even when the layer holds one point: the precedent is `slr_threshold_comparison`, which requires every key component chosen even where only one value is available |
| `distanceM` | The radius in metres, 0–5,000, reusing the existing `validateBuffer` bound |

## Distinctions, and how each is enforced

| Distinction | Enforcement |
| --- | --- |
| **A buffered circle is not a surveyed boundary.** Its edge is a decision and its radius an assumption of the question, where an imported administrative boundary has a survey behind it | **Behaviour, in the receipt.** The output is still `fw:StudyArea` — it scopes the question — but carries `prov:wasDerivedFrom` the point and `fw:bufferDistance`, so a reader can tell a construct from a jurisdiction. Multiplying classes would be wrong: a scope is a scope |
| **The radius is an assumption, not a finding** | **Limitation**, stated on the node and carried in the receipt's method. A worked example using this must own its radius rather than present it as derived |
| **A polygon is not a circle** | **Behaviour, measured and recorded.** Turf's `steps` is per quadrant: 8 gives 32 vertices and 99.36% of the true circle area, 32 gives 128 vertices and 99.96%. `buffer_area` uses 8, which is ample when expanding an existing boundary; here the edge **decides membership**, so 32 is used and both the vertex count and the area fraction are recorded |
| **One point, not a union** | **Validation rule**: a missing or unknown `pointId` is refused, and several points are never combined. See the cell-size measurement above |
| **A point without coordinates cannot define a scope** | **Validation rule**, consistent with site assignment, which already refuses points without coordinates |
| **Local scopes only** | **Validation rule**, inherited: `validateBuffer` caps at 5,000 m and the existing buffer refuses spans over one degree or latitudes beyond 80° |

## Audit answers

- **D1** — Primitive, on the palette. Residual knowledge: a derived scope is not a surveyed one,
  and the polygon-versus-circle approximation is a stated quantity. A practitioner asks for it
  by name — "the area around this gauge".
- **D2** — Nothing does it. `buffer_area` is area → area; `facilities` has it welded with a
  selection and a centroid; `mean_center` is a statistical centre of a point set, not a scope.
- **D4 / D4a** — General `points` in, general `area` out. No custom studs.
- **D7** — "Area around a point" states the operation. Not "study area", which would claim the
  output's role rather than describe the act.
- **D9** — Adds one node where a scope previously had to be drawn or imported. No existing
  example changes.
- **D10** — Exercised by the sea-level example, which is what prompted it.

## Validation this commits to

Unit checks: the buffered area is within 0.1% of πr² at the recorded step count; a missing,
blank or unknown `pointId` is refused; a point with no coordinates is refused; several points
are never unioned; the distance bound and the one-degree span limit are enforced; the receipt
records the source point, the distance with its unit, the step count and the area fraction; and
the output is a valid `area` input to everything that accepted one before.

A browser check builds a scope around a named gauge, windows a raster to it and samples
elevations, then reloads offline.

## What this cannot establish

That any particular radius is defensible. The AR6 guide advises tide-gauge data where coverage
is good and states no distance threshold, so a radius is a declared assumption of the question
and this widget cannot make it a finding. Nor does it establish that the facilities inside the
scope are the right population: nothing in the application filters features by a boundary —
`coverage_check` reports what falls outside and does not select — which remains one of the six
primitives the NB06 derivation named.
