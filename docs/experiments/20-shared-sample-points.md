# Shared points for generation and facility access

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 6, 2026. Status: third implementation slice of widget standardization.

## A70 Generate a reusable point dataset

Sample locations now outputs a standard point FeatureCollection. Connect it to the shared Map, Table or Check spatial coverage widgets as well as Facility access. The existing grid algorithm, spacing limits, boundary handling and generated record IDs remain unchanged. The default Old Naledi configuration still produces 21 demonstration locations.

Each generated feature carries its name and a `samplingBasis` value of `demonstration-grid`. Source identity and CRS metadata accompany the dataset. These points are not observed households, population estimates or cases. Internal legacy rows remain temporarily available to avoid needless changes to result plumbing; the public connection contract is points.

Generation emits a computation receipt: a `fw:GridSampleGeneration` activity uses the study area, records spacing and output count, and generates a GeoSPARQL FeatureCollection with member features and CRS84 WKT geometries. It does not invoke the reasoner to perform geometry generation. Old Naledi now records four receipts: grid generation, facility selection and the two existing reasoning steps.

## A71 Accept shared input points for access analysis

Facility access's existing `samples` port now accepts the common points contract. Its internal port name is retained for saved graph compatibility. A practitioner can replace the generator connection with Input data containing imported, synthetic or manually placed points.

The operation preserves source IDs, record IDs, scalar attributes and missing coordinates. A record without coordinates receives no computed distance or time; the unchanged N3 missing-evidence rule yields Unknown. It remains in the result table, with an explanation that its location is missing. Missing facilities and missing input coordinates are distinct explanations even though both produce Unknown access.

The result identifies whether its locations came from the generator or ordinary input. Evidence inspection, metrics, map annotations and chart captions distinguish those cases. Counts remain counts of locations, not population estimates. Generic input does not imply household, patient or case semantics.

Facility selection supplies the result boundary even when input points are not generated inside it. No automatic containment filter is applied to generic locations; connect a coverage check separately when spatial review is needed. This slice accepts a single direct point dataset, not the coverage-review result bundle.

## Compatibility and registry

Sample locations and Facility access each advance to `1.0.0` because their port contracts change. Their existing node IDs, settings and connector names remain compatible, so previously saved generator-to-access graphs need no additional graph rewrite. The facility-source migration from the previous slice still applies when needed.

The registry maps the generator to its declared ontology activity and the access widget to the general spatial-operation class. This partial alignment does not claim complete SHACL port validation or a dedicated access-computation receipt. Old releases remain intact.

## Developmental evaluation

Unit checks compare generated coordinates with the existing algorithm, parse the GeoSPARQL receipt, validate a direct Table connection, and exercise zero-distance and missing-coordinate access with ordinary point input. The browser exercise connects generated samples to shared Map and Table outputs while feeding separate input points to Facility access. It inspects Unknown evidence, exported attributes, generation provenance and offline results. The established Old Naledi scenario checks the unchanged diagnostic classifications and the increased receipt count.

A practitioner can try this slice by adding a Table to Old Naledi, selecting Sample locations for Points 1, and running. To exercise alternative locations, add Input data and replace the connection into Facility access's samples port. Keep a table output to inspect missing-location records.

Shared result/visualization adapters and reusable semantic reasoning remain subsequent slices. This change does not implement a new sampler, road routing, population allocation or a digital-twin simulation engine.

Validation on October 6: TypeScript and production build passed, followed by all 54 unit tests. The full browser run passed 33 existing scenarios; the new scenario initially failed because its exact tab-name locator omitted an icon prefix. After correcting the locator and completing location-basis labels, the new scenario passed, and both Old Naledi and heat-output browser regressions passed again on the final build. Ontology validation and registry validation passed (18 identities, 24 releases). Evidence covers Chromium only and has not run in remote CI.
