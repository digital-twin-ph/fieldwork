# Experiment 40: reprojection primitives

Date: October 7, 2026. Status: semantic admission review, with the vector slice
implemented and the raster slice specified but not built. This closes part of the
gap left by [A24 in the CRS decision record](05-coordinate-reference-systems.md)
and is narrower than that proposal.

## Why two primitives, not one

"Reproject" names two operations with different contracts. Transforming point
coordinates is an exact per-coordinate mapping with no resampling. Warping a
raster resamples values onto a new grid and changes which source cells
contribute to which output cell. The audit procedure forbids treating similar
labels as identical semantics, so these are separate admissions with separate
shapes, releases and validation evidence.

| Term | Meaning |
| --- | --- |
| Coordinate transformation | Exact mapping of each coordinate between two CRSs; no new values are invented |
| Raster warp | Resampling of cell values onto a differently oriented grid; output cells are selected, not computed from an area-weighted model |
| Projection change | A change of planar coordinate system on one datum; distinct from a datum shift |
| Datum shift | A change of geodetic reference frame, requiring a published transformation and often a grid file; **not implemented** |

## Vector slice: what is admitted

A28. The implemented primitive is **import-time normalization**, not A24's
general transformation. `reproject` is a Sources widget that reads a local
CSV or GeoJSON file whose coordinates are WGS84 UTM easting/northing, converts
them to CRS84 longitude/latitude, and outputs the ordinary `points` contract
every existing widget already consumes.

This direction is deliberate. [spatial-reference.ts](../../src/spatial-reference.ts)
rejects any reference that is not exactly CRS84, and a `NodeDefinition` declares
one output port type, so there is no way for projected coordinates to enter or
travel through the current graph. A node emitting projected coordinates would
have no valid consumer anywhere. A24's general flow therefore still requires the
internal CRS-carrying geometry contract that record defers, and remains
proposed. What this slice removes is a narrower and real obstacle: a practitioner
holding a national or UTM-gridded file today cannot use it at all.

The CRS parameter surface reuses the `zone` and `hemisphere` controls that
Voronoi, Network isochrone and Mean center already expose, and the transformation
reuses the existing `metric(zone, hemisphere)` helper in
[catchments.ts](../../src/catchments.ts) rather than adding a second projection
path. The EPSG identifier is derived, not typed: `EPSG:326nn` north,
`EPSG:327nn` south.

Admitted source CRSs are **WGS84 UTM zones only**. That bound is the point, not
a convenience. Converting WGS84 UTM to CRS84 is a projection change on one
datum and needs no transformation grid, so it can execute offline with no
accuracy claim beyond the projection formulas. A file on a national datum such
as Cape or Hartebeesthoek requires a datum shift this prototype does not
implement, and declaring it a UTM zone would silently misplace every record by
tens to hundreds of metres. Such files are refused rather than approximated.

| Contract | Decision |
| --- | --- |
| Inputs | None; this is a source. The file and its declared zone/hemisphere are node configuration |
| Parameters | `zone` 1–60, `hemisphere` north/south, with the derived EPSG code displayed |
| Output | `points` in CRS84, longitude/latitude order, identical in contract to Input data |
| Limits | 2,000 records and 5 MB, matching Input data; easting 100,000–900,000 m; northing 0–10,000,000 m |
| Missing data | A record without coordinates is preserved with null geometry, as Input data preserves Unknown locations |
| Rejection | Coordinates outside the UTM ranges, a point falling outside the zone's ±6° validity guard, a nonfinite result, or a round-trip disagreement above 0.01 m |
| Provenance | Source filename, byte count and SHA-256; declared EPSG code and exact proj4 definition; source axis order and units; target CRS84; operation name; proj4 version; transformed and skipped counts; maximum observed round-trip error; an explicit `datumShift: none` |

Transformation happens when the file is saved, and the node stores the resulting
CRS84 collection, exactly as `network_input` stores its normalized graph and
`raster_input` stores its retained window. Execution is then a deterministic
pass-through that replays offline.

## Validation evidence and its limits

The unit checks assert **definitional invariants of the projection**, which are
independent of the implementation rather than restatements of it:

- A point on the zone's central meridian at the equator maps to easting
  500,000 exactly, and to northing 0 north or 10,000,000 south, because those
  are the false easting and northing of the UTM definition.
- Eastings are symmetric about 500,000 for longitudes equidistant east and west
  of the central meridian.
- Every transformed coordinate round-trips within 0.01 m, and the maximum
  observed error is recorded in provenance rather than assumed.
- Guard cases: an easting outside the UTM range, a point beyond the zone's
  validity, a nonnumeric coordinate, a record with no coordinates, and a file
  exceeding the record limit.

The hemisphere case deserves separate mention, because writing the browser check
exposed it. A wrong hemisphere is **not detectable**. The same easting and
northing are a valid location in both zone 35 north and zone 35 south, so a
misdeclared hemisphere converts cleanly and silently relocates every record
between continents. The browser scenario asserts this behavior deliberately, as
a record of the limit rather than a defect to be fixed: no check inside this
operation can recover information the file does not carry. Only the practitioner
knows which hemisphere their data came from.

These establish that the implementation satisfies the UTM definition and its
own stated bounds. They do **not** establish agreement with a reference geodetic
library such as PROJ or GDAL to a stated tolerance, and they make no claim about
any datum other than WGS84. The first independent comparison has since been
made: against `pyproj` 3.8.0 and PROJ 9.8.1, over nine points spanning zone 35
south, the maximum separation is 6.70 × 10⁻⁵ m against a 1 mm tolerance, and
that residual is accounted for by the nine-decimal coordinate rounding rather
than by the transformation. It ran in CPython, not a browser kernel, and covers
one zone on one datum. See [the Validation Lab record](41-validation-lab.md).

A transformed coordinate is also not a validated record location. Reprojection
cannot improve a coordinate that was captured, transcribed or digitized
incorrectly, and a clean round trip says nothing about whether the declared zone
was the right one. Choosing the wrong admitted zone produces coordinates that
pass every check in this slice and are wrong on the ground; the zone guard
catches gross errors only.

## Raster slice: specified, not implemented

A29. Warping a GeoTIFF from a projected CRS to an EPSG:4326 grid is a separate
primitive requiring decisions this note records but does not settle in code:
the output grid origin and resolution, an explicit resampling method, and
NoData propagation at edges and in gaps. The first implementation should offer
**nearest neighbour only** and say so on the operation, because any interpolation
invents values that were never observed.

One consequence must be stated on the widget itself, not only in a document:
**resampling does not preserve counts.** A population-count raster such as
WorldPop carries persons per cell. Nearest-neighbour warping changes cell
geometry and therefore the sum, so a warped count raster is no longer a valid
count surface, and any total computed from it is wrong in a way no SHACL shape
will detect. Count-preserving regridding is a different operation with its own
assumptions and is not proposed here.

## Validation record

Local gate on October 7, 2026: strict TypeScript checks for the application and
workers, the production build, **111 unit tests**, ontology SHACL validation,
widget-registry validation at 33 widgets and 63 releases, and **63 Chromium
scenarios with 1 skipped** (the skip is the pre-existing local WorldPop raster
scenario). Eleven of the unit tests and two of the browser scenarios are new
here.

Two gates in this repository refused the primitive before it was registered,
which is the behavior they exist for: `canvasN3` raised "No semantic widget
registration for reproject" until a catalog entry existed, and
`validate:widgets` reported an unregistered implementation widget until its
release file and digest were committed. The release records its ontology status
as a **gap**: a typed coordinate-transformation activity class and a runtime
SHACL shape are not yet defined, and the conversion provenance currently travels
as source information on the point layer rather than as typed RDF. Closing that
gap is the next step for this widget, and the canvas plan RDF conforms in the
meantime only because `CanvasNodePlan` covers every widget generically.

Until that slice exists, `raster_input` keeps its current contract: one band,
north-up WGS84, no resampling and no reprojection. The measured catalog
findings in [experiment 39](39-stac-discovery-and-remote-acquisition.md) are
also relevant to sequencing: the Copernicus collections that clear the CRS gate
are already EPSG:4326 and are blocked by authentication instead, so raster
warping unblocks Sentinel and Landsat UTM assets later rather than any catalog
reachable today.
