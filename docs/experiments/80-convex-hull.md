# 80 · Convex hull

_Created 2026-10-10 · Updated 2026-10-15_

**Status:** admission review, written before the code. One primitive, no new port
type, no new carrier.

## Competency question

**What area do these points cover?**

Asked whenever a boundary should come from the data rather than be drawn: the
extent of observed cases, the region a set of facilities serves, the envelope to
clip a Voronoi diagram to.

## Where it comes from

Derived, not invented. Both PHI advanced case studies compute one — Advanced-2
NB02 builds a hull to bound its Voronoi diagram, Advanced-1 NB03 hulls the
reached network. `docs/research/john-snow-voronoi.md` recorded in October that
hull and buffer "should not be hidden inside Voronoi", and they still are.

It is also step one of six for [78](78-trying-compositions-on-isochrone.md), and
the only one of the six that is unblocked today.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: the smallest convex outline containing a set of points. Nothing else here computes it. Asked for by name — "the area the cases cover" |
| **D2** | No. `voronoi` bounds by the study area or a rectangle; `buffer_area` expands an existing area; `hex_aggregate` tiles |
| **D3** | A hull is not a density, a service area or a boundary anyone agreed to. Carried as a limitation on the node, since nothing can enforce how a shape is read |
| **D4** | Ports only: points in, polygons out. No graph-level condition |
| **D5** | **Fails the same way five widgets already fail.** It needs a metric CRS and must take a zone, because a layer cannot say what CRS it is in ([40](40-reprojection-primitives.md)). This makes six |
| **D7** | `summarize_hull`. Summarise because many points become one shape, which is the test that separated computing from summarising |
| **D9** | Unmeasured |
| **D10** | Not yet. The Snow examples would use it where they currently draw a rectangle |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| A hull of two points is a line, not an area | **Validation rule.** Refuse fewer than three non-collinear points |
| A hull is computed in metres, not degrees | **Validation rule.** Zone required, as for `voronoi` |
| A hull contains points that were never observed | **Limitation.** It is convex; a concave distribution gets filled in |

## What this does not establish

That a hull is the right boundary for anything. It is the smallest convex one,
which is a mathematical property, not a claim that the phenomenon is convex. An
outbreak along a river is not convex, and a hull of it asserts area nobody
observed.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add the convex hull, first of six primitives an isochrone composition needs |
| 2026-10-10 | Add summarize_combined_area, and fix the hull's spelling |
