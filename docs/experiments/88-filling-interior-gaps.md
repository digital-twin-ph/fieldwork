# 88 · Filling interior gaps

_Created 2026-10-10 · Updated 2026-10-14_

**Status:** built and measured, after asking whether it was reusable at all.

## The question asked first

Whether a hole-filling primitive is reusable in other contexts. The answer
shaped the widget rather than following it.

Mechanically it applies to any polygon, and that is the risk. Whether filling is
*correct* depends on what a gap means in the source, and this cannot know:

| Source | What a gap means | Filling it |
| --- | --- | --- |
| `reachable_corridor` | Ground no street reached | A cartographic choice. `isochrone`'s own interface says "Keep off for corridor coverage" |
| Buffer unions around facilities | Ground outside every radius | Same trade |
| `donut_geomask` | The displacement protecting a patient | Would destroy the privacy guarantee |
| Raster-derived extents | High ground | Would assert inundation the data denies |
| Administrative boundaries | A real enclave | Would falsify the boundary |

**The port type governs the dangerous case without a special rule.**
`donut_geomask` emits points, and a study area is an `area`, not `polygons`. The
three rows where filling would be a falsification cannot reach this input at
all. Of the nine node types that can, only four produce gaps, and none of them
is a privacy mechanism. That is [D4](../audits/ontology-audit.md) working as
intended: a condition expressible as a port is not a rule anybody has to
remember.

So it is reusable, narrowly, and the honest design is to report the size of the
assertion rather than to restrict the widget by name.

## What it is, exactly

`isochrone`'s `fillHoles` as a step of its own — and the notebook's infill:

```python
new_iso = gpd.GeoSeries(all_gs).unary_union
if infill:
    new_iso = Polygon(new_iso.exterior)   # NB03 cell 64
```

**A correction.** [84](84-reachable-corridor.md) and commit `9b4279d` said the
notebook's infill is a convex hull and differs from Fieldwork's `fillHoles`.
That was wrong, and it was wrong from reading dead code. `make_iso_polys` is
defined at cell 64, called once at cell 67, and redefined at cell 94 with the
`convex_hull` form — which is never called. The `poly_gdf_dict` built at cells
71–80 and written to `outputs/isopoly_*.shp` at cells 99–105, the shapefiles
NB04 reads, all come from the cell-64 definition. The operative infill is the
exterior ring, which is exactly what Fieldwork has always done.

## How it behaves

Four bands of the Soho corridor, 25 m either side:

| Band | Unfilled | Filled | Added | Gaps |
| --- | --- | --- | --- | --- |
| 1 min | 14,982 m² | 14,982 m² | 0.0% | 0 |
| 5 min | 198,433 m² | 209,177 m² | **5.4%** | 11 |
| 10 min | 698,925 m² | 725,329 m² | 3.8% | 58 |
| 15 min | 867,199 m² | 903,493 m² | 4.2% | 81 |

It agrees with `isochrone`'s own `fillHoles` to within 0.01%, the same agreement
the unfilled chain already had, so filling introduces no divergence of its own.
The one-minute band has no gaps to fill: five junctions do not enclose anything.

## And what that does to the analysis: nothing, here

The question that matters is whether a presentation choice contaminates a
finding. Counting the 250 recorded deaths in each band, filled and unfilled:

| Band | Unfilled | Filled |
| --- | --- | --- |
| 1 min | 48 | 48 |
| 5 min | 216 | 216 |
| 10 min | 250 | 250 |
| 15 min | 250 | 250 |

Identical. Up to 5.4% more ground is claimed and not one death moves, because
the recorded deaths front the streets and were already inside a 25 m corridor,
while the filled ground is the inside of blocks.

**This is a property of these records, not a guarantee.** Points set back from a
street — building centroids, field boundaries, households recorded at a plot
rather than a door — would move between the two. The widget cannot know which it
has, so the warning travels in every result and the added area is reported as a
number.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: enclosed gaps become ground. Practitioners ask for it — "make the catchment solid". Primitive, on the palette |
| **D2** | No. `summarize_combined_area` unions and preserves holes; nothing drops interior rings |
| **D3** | See below |
| **D4** | One port, polygons to polygons. The dangerous inputs are excluded by the port type rather than by a rule |
| **D5** | **Takes no zone.** The input states the metric CRS its upstream used, and a zone asked for twice can be answered twice. Still nine widgets asking, not ten |
| **D7** | `fill_interior_gaps`. Named for what it fills, not for "holes", because the gap is the thing being asserted away |
| **D9** | Internally consistent with `isochrone`'s `fillHoles` within 0.01%. No external reference; Shapely would supply one |
| **D10** | Not yet in a worked example |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| Filling enlarges the polygon | **Validation rule** in effect: both areas and their difference are reported in the notes and the receipt |
| The added ground was never computed as covered | **Limitation**, stated in every result |
| Later measurement counts the filled ground | **Limitation**, stated in every result, with the advice to keep the unfilled polygons for coverage |
| Gaps between polygons are not interior | **Validation rule** in effect: separate polygons stay separate and nothing joins up |
| There must be a metric basis | **Hard stop**: a non-UTM input CRS is refused, because the size of the assertion could not then be stated |

## What this does not establish

That filling is ever the right choice. It makes a map read solid, and it makes
every area downstream larger. The case study fills, and its own interface warns
against filling for coverage; both can be true, because those are different
outputs from the same geometry.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add fill_interior_gaps, and correct the infill record from dead code |
