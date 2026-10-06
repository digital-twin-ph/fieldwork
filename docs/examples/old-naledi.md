# Old Naledi diagnostic access worked example

This example translates part of the Gaborone TB modeling pipeline into a visual Fieldwork workflow. It asks how facility evidence and service assumptions change apparent diagnostic access around Old Naledi. It demonstrates spatial computation feeding N3 reasoning and several linked outputs; it does not run the TB simulation.

Open the application with `?example=old-naledi`, or select **02 · Old Naledi diagnostic access** in the worked-example selector. Edits to the heat and Old Naledi examples are stored separately on this browser. Export a workflow to retain a portable copy.

## Source and demonstration data

The source is [Gaborone TB Agent Based Modeling](https://git.cdc.gov/digital-twin/Gaborone-TB-Agent-Based-Modeling), pinned to commit `7f183843075a6534b6699cd107cc74def1315bcd`.

- **Source geometry:** the Old Naledi MultiPolygon in `data-files/geojson/OldNaledi.geojson`, using CRS84 longitude and latitude.
- **Source facilities:** 214 records from `data-files/geojson/GaboroneHealthFacilities.geojson`. Fieldwork retains identifiers, names, ownership, service type, and coordinates. It does not include the source file's disease aggregates or telephone fields.
- **Source evidence logic:** named-facility and government-facility-type rules from cells 57–58 (zero indexed) of `06-Gaborone-Health-Facilities.ipynb`. These are historical notebook assignments, not current verification of equipment operation or service availability.
- **Demonstration locations:** a regular grid generated inside the real boundary. At the default 250-meter spacing there are 21 points. They are not observed residences, households, people, or TB cases. The prepared residential-building layer is absent from the reviewed Git tree.

[Provenance metadata](../../examples/old-naledi/provenance.json) records the source commit and SHA-256 hashes of the three source blobs. Each Old Naledi run output includes this metadata. To reproduce the extraction from an existing source clone, run `node scripts/extract-old-naledi.mjs /path/to/source/repo` from the Fieldwork root. The extraction script reads Git blobs and does not execute notebooks.

## Components and widgets

| Node | Practitioner control | Computation or reasoning |
|---|---|---|
| Study area | Boundary and provenance card | Supplies the pinned Old Naledi polygon |
| Sample locations | Grid spacing in meters | Generates a local geographic grid and excludes points outside the polygon |
| Input data: Gaborone facility registry | Shared input editor with typed ownership and service-type fields | Supplies the 214 historical point records; edits and replacements remain explicit |
| Select nearby facilities | Candidate radius in km | Selects connected facility points near the study boundary center; records missing locations and selection counts |
| Diagnostic evidence | Readable evidence hierarchy | EYE-JS derives evidence tier and diagnostic-service assignment from N3 |
| Facility access | Minimum evidence, service pathway, walking-speed proxy | Filters facilities, finds the nearest eligible point, and computes straight-line distance divided by speed |
| Access review | Review threshold in proxy minutes | EYE-JS derives Review, NoFlag, or Unknown plus an access zone |
| Evidence register | Source, service, tier, and reference columns | Keeps every candidate visible, including facilities excluded by access settings |
| Visual output | Tab name and Map, Table, or Bar chart | Creates an independent Results tab from connected results |

The default graph produces **Access map**, **Access table**, **Access zones**, and **Facility evidence**. Shared upstream nodes run once. Result selection opens the relevant run evidence in the inspector. Tables support text filtering. Expand Results to give the map, chart, or table more space.

## Try three comparisons

1. **Inspect the default.** Keep a 6 km candidate radius, 250 m sample spacing, direct plus contextual evidence, onsite-only service, and a 70 m/min speed proxy. Run the workflow. One facility qualifies; all 21 samples exceed the illustrative 30-minute threshold. Inspect a sample and find the named facility and evidence reference that support its result.
2. **Broaden the evidence assumption.** In Facility access, choose Include inferential and Include referral pathways, then rerun. With the other defaults unchanged, none of the samples exceeds 30 proxy minutes. Open Facility evidence and filter for Old Naledi Clinic: its service assignment is onsite or referral, with inferential evidence. Explain why this result does not establish onsite testing at that clinic.
3. **Remove qualifying evidence.** Choose Direct only and reduce the candidate radius to 1 km. Rerun. All 21 samples become Unknown because no facility meets the criteria. This is different from a measured long journey or proof that no service exists.

Before each rerun, Results continue to show the previous run and are labeled accordingly. Restore example resets the active example and can be undone. Switching examples preserves each one's most recently saved settings; undo history is local to the current editing session.

## Explicit method choices

The source pipeline includes network routing, raster enrichment, population allocation, and Starsim. This slice uses only the boundary, selected facility attributes, and the diagnostic-evidence hierarchy. Facility distances are haversine distances on a sphere; proxy minutes divide those distances by an adjustable speed. Streets, barriers, network snapping, transport schedules, referral delays, staffing, and current service availability are not represented.

The source's named evidence takes precedence over government facility-type rules. Unknown evidence never qualifies for an access calculation. Including referral pathways accepts known referral assignments but does not relabel them as onsite testing. The evidence table reports all candidate facilities, while the access map displays eligible facilities.

Fieldwork's displayed access zones use upper-inclusive boundaries: ≤5, >5–15, >15–30, and >30 minutes. This is an explicit convention for the worked example; the source `spatial_utils.py` helper uses lower-inclusive, upper-exclusive intervals. The configurable review rule flags values strictly greater than its threshold, independent of the fixed chart bands. N3 receives numeric facts rounded to nine decimal places, and tests cover equality at each boundary.

Missing eligible facilities produce Unknown. They are not labeled unreachable, because this slice does not calculate routes. Grid counts describe generated sample points and must not be interpreted as population coverage. The source's Starsim parameters, TB outcomes, and clinical recommendations are outside this example.

## Extension path

The typed ports separate study areas, shared point data, selected facilities, graded facilities, access calculations, and decisions. Sample locations can also feed the shared Map and Table widgets; Facility access can take ordinary Input data points, keeping missing coordinates as Unknown. A future prepared-building source can supply real spatial units with documented population semantics; a network-routing operation can replace the straight-line proxy. The source's workforce, population-allocation, and scenario components can become further widgets after their inputs and validation contracts are available. Logical English can be compared against the same facts and expected assertions without changing the geometry operations.

## Validation

Core tests verify source field selection, deterministic sampling, polygon-hole handling, dataset version checks, settings bounds, and graph dependencies. Chromium tests execute the actual EYE worker and verify evidence assignments, filter changes, explicit unknown outcomes, numeric rule boundaries, four output views, table filtering, evidence export, saved examples, offline reload, and mobile layout. The heat example remains in the regression suite. Firefox and WebKit have not been tested.
