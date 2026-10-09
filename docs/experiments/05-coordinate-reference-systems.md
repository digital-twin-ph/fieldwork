# Developmental evaluation: coordinate reference systems

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. The user asked how geographic nodes should carry a datum, default to WGS84 / EPSG:4326, and later support a Reproject node.

## A23: carry a CRS contract, with explicit coordinate order

A datum alone is insufficient to interpret coordinates. Geographic sources now store a `spatialReference` contract. The Inspector shows the default geodetic reference and the actual storage order:

```json
{
  "datum": "WGS84",
  "geodeticCRS": "EPSG:4326",
  "geometryCRS": "OGC:CRS84",
  "axisOrder": "longitude-latitude",
  "units": "degree"
}
```

The distinction is deliberate: GeoJSON uses WGS84 longitude/latitude in decimal degrees, equivalent to OGC:CRS84. EPSG:4326 formally has latitude/longitude axis order. GeoSPARQL WKT must follow the identified CRS's axis order, so the existing longitude/latitude WKT continues to identify CRS84. This metadata does not relabel a CRS84 WKT literal as EPSG:4326. [GeoJSON RFC 7946, section 4](https://www.rfc-editor.org/rfc/rfc7946#section-4), [GeoSPARQL 1.1, WKT axis order](https://docs.ogc.org/is/22-047r1/22-047r1.html#_rdfs_datatype_geowktliteral).

Source validation supplies this contract for existing workflows and rejects incompatible declarations. Study-area operations preserve it in their outputs and run receipts. Input GeoPackage support remains restricted to its existing WGS84 geographic-point contract; no new CRS decoder or coordinate transformation is implemented. Displaying an online projected basemap does not change the stored geographic coordinates.

CRS is metadata about coordinate interpretation; square kilometres/acres are measurement display units. Changing measurement units does not change the CRS.

## A24: Reproject is a future explicit transformation node

Heavy transformation implementations should follow the proposed [geoprocessing job and memory contract](06-geoprocessing-memory-lifecycle.md). Coordinate accuracy, bounded allocations and cancellation are separate validation requirements.

Proposed flow: `Geographic source → Reproject (target CRS) → transformed geographic output`.

The node should require a known source CRS, target CRS and coordinate-operation implementation. It should transform the coordinates, create a new geometry representation linked to the same geographic feature, and record source/target CRS, operation/version, axis conventions and required transformation resources in PROV evidence. Any relevant grid resources must be available locally for offline execution; an unavailable operation must produce an explicit error.

Projected coordinates must not be passed to current Turf geographic calculations or serialized as ordinary RFC 7946 GeoJSON. A future internal geometry contract must carry its CRS independently, with explicit conversion back to geographic coordinates for existing map adapters. Multi-layer operations should require compatible CRS contracts or explicit Reproject nodes, rather than silently reinterpreting mismatched coordinates.

Reprojection invalidates geometry-dependent computed values and spatial predicates. Area, bounds and coverage must be recomputed under the selected method; retained geographic measurements would need explicit provenance linking them to their original geometry. Choosing an appropriate projected CRS and testing transformations against known reference coordinates are separate tasks from providing a default CRS label.

**Implemented now:** default metadata, Inspector display, propagation and rejection of unsupported declarations. **Proposed:** executable Reproject node, projected-coordinate storage/adapters, coordinate-operation selection, grid loading and cross-CRS execution. No transformed-coordinate accuracy or practitioner-usability claim is made.

Unit checks verify default metadata, propagation through Calculate area into Map, rejection of unsupported EPSG declarations and rejection of a contradictory stored axis order. The browser regression checks preserve existing GeoSPARQL readiness, calculation and coverage behavior. These are contract checks, not coordinate-transformation validation.
