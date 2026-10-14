# 81 · Combined area

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Second of the six
primitives [78](78-trying-compositions-on-isochrone.md) needs.

## Competency question

**What area do all of these cover together?**

Asked whenever separate areas have to be treated as one: the territory several
facilities serve between them, the ground a set of catchments reaches, the extent
covered by any of a number of outbreaks.

## Where it comes from

The isochrone decomposition. Advanced-1 NB03 buffers the reachable segments,
hulls them, then unions the result, and Fieldwork's `isochrone` unions inside
itself — `polygonClipping.union` is already called there to fill holes. The
operation exists in the codebase and has never been a widget.

Taken second because the decomposition is being built backwards from its output,
so each new primitive can be tested against the one before it. The hull is
built, and it emits polygons, which is what this takes.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: overlapping and touching areas become one, and separate ones stay separate. Asked for by name — "the area they cover between them". GIS calls it dissolve |
| **D2** | No. `clip_polygons` intersects with the study area; nothing combines |
| **D3** | A combined area is not a claim that the parts are equivalent, nor that anything was observed throughout it. Carried as a limitation |
| **D4** | Ports only: polygons in, polygons out |
| **D5** | Needs a metric CRS to report an area, so it takes a zone. **That makes seven** |
| **D7** | `summarize_combined_area`. Summarise, because many polygons become one. Spelled `-ize` to match `summarize_polygons` |
| **D9** | Unmeasured |
| **D10** | Not yet |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| Areas that do not touch stay separate | **Validation rule** in effect: the result is a MultiPolygon with as many parts as there are groups, and the count is reported |
| The combined area is not the sum of the parts | **Limitation**, with both numbers reported so overlap is visible |
| Combining discards what distinguished the parts | **Limitation.** Which facility a piece belonged to is gone; that is the operation, not a defect |

## What this does not establish

That combining is appropriate. Two catchments overlapping means two facilities
reach the same ground, and a union erases that — it answers "is anywhere reached"
and not "how well is anywhere reached". A practitioner wanting the second needs
the parts, not the whole.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add summarize_combined_area, and fix the hull's spelling |
