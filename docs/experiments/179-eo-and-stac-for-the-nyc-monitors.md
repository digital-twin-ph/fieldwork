# 179 · EO and STAC, for the NYC monitors

_Created 2026-11-05 · Updated 2026-11-05_

**Status:** tried — the practitioner's requirements, and phase 1's first side experiments (S1 to S8 done), and both widgets built in 0.28.0, UI first. Phases 0 and 1 of
[the 2026-11-04 plan](../research/eo-stac-nyc-architecture-and-plan-2026-11-04.md) come next.

## The task

The practitioner, 2026-11-05: *"After this let's work on the EO and STAC widgets. Because the pollution data in NYC was
sourced from ground stations we can compare relevant remote sensing data for those variables."* Then: *"The EO and STAC
widgets should identify the open data sources very easily"*, and *"EO identifies the satellite groups for those
variables and STAC zeroes in on the source URLs."*

The plan and the two repositories it adapts are the practitioner's own work with JLT, a colleague on Fieldwork who
wrote [JupyterLite-EO-Satellite-Guide](https://github.com/jltobias/JupyterLite-EO-Satellite-Guide) and
[JupyterLite-STAC-Browser](https://github.com/jltobias/JupyterLite-STAC-Browser), both MIT. The practitioner,
2026-11-05: *"We planned the EO and STAC research together"*, and *"Those repos have code and UI specs already we can
adapt for widget use."* So the widgets adapt that code and those specs, credited by repository and commit, and a
question about either goes to JLT.

## Requirements, as stated

| Requirement | Meaning for the design |
| --- | --- |
| Compare remote sensing with the ground stations | The six ozone monitors Point data places ([178](178-points-from-xy.md)), a satellite raster, and Sample raster at points: a satellite value per monitor per date beside the station's |
| Identify the open data sources very easily | Finding a usable source is the first thing the widgets do. Open and browser-readable sources first; the rest listed, marked, with the reason |
| EO identifies the satellite groups for a variable | Variable → missions, instruments and products, each with what it measures (column, optical depth, surface) and its unit |
| Future-proof Fieldwork for remote sensing workflows (*"The EO and STAC widgets should future proof FW for remote sensing workflows"*) | NYC's three pollutants are the first instance, not the design scope. Variables, missions, products and catalogs are data, versioned and added without code, as rulesets are; the widgets' contracts carry any variable, area and interval; nothing NYC-specific is compiled in. Tested against at least one non-NYC case before it is called general |
| Sources needing no sign-in first (*"Before sign in lets use those that don't require sign ins first"*) | Routes a browser reads with no account, an anonymous token included, are built and offered first. A route behind sign-in is listed, marked as such, and left for later |
| Make the user aware of quality issues in what was downloaded, here its completeness (*"widget has to make user aware of download data quality issues in this case completeness"*, agreeing with S6's finding) | Per date and per place: how many pixels covered it and how many passed the product's quality threshold, stated, never an empty value. A date with pixels and none usable is a finding the widget reports, as the data quality tab does for a table |
| An accompanying citation for Notes (*"And accompanying citation for notes"*) | Every product used is a reference in the write-up's References, through the citation Fieldwork already keeps for an input (`Citation`, with a DOI where one exists), beside the licence's attribution sentence. Planetary Computer's collection record names ESA as producer and carries no DOI or citation text, so the citation is taken from ESA's product documentation and recorded with where it was read; a product with none says so, as `citationGaps` does for a table |
| A map of the citations each data source requires, in the STAC widget (*"We probably need to map those citations required for each data source in the STAC widget"*) | A curated citation map, as data: per catalog and collection, the licence read from the licence itself with where and when it was read, the attribution sentence for original and modified data, the dataset citation and DOI for References, and whether sign-in is needed. A catalog's own licence field is not trusted on its own (S7: `proprietary`, a dead link, no citation). A file STAC returns takes its attribution and reference from its entry; a source with no entry, or an unread citation, is shown as such |
| STAC zeroes in on the source URLs | From the product EO chose, over the study area and dates, to the items and their asset URLs, each with licence and whether this browser can read it |

## The current widgets, examined first

| Widget or piece | What it gives | Gap |
| --- | --- | --- |
| `raster_input` | a window of a local GeoTIFF around the study area | no URL or STAC source |
| `sample_raster` | the cell value at each point | none for this purpose |
| `clip_raster` | a raster masked to an area | none for this purpose |
| Extract catalogue, WorldPop catalogue | a dated, curated catalogue offering sources that cover the study area | the pattern to reuse; no EO entries |
| STAC routing (experiment 91) | 40 of 45 public STAC catalogs answer a browser; Earth Search Sentinel-2 ranges read | measured, not in the palette |

## What JLT's repositories provide, read 2026-11-05

Read at EO Satellite Guide `684833c` and STAC Browser `945d8b3`, code and documents only; nothing run against live
endpoints.

| | EO Satellite Guide | STAC Browser |
| --- | --- | --- |
| Runs as | plain browser JavaScript, data inlined at build | plain browser JavaScript ES modules, no Pyodide in the Explorer |
| What to adapt | `data/research-topics.json` (15 KB): 8 topics with aliases, cautions and sources; 9 curated routes, each a catalog endpoint and collection id with format, access note and verification date. The whole-phrase alias matcher | search request builder (bbox, datetime, paging to 500 items, 20 s timeout); CORS, HTTP and timeout messages; `auth:refs` detection; `RangeSource` (206 only, never a whole download) and `clipRaster` on GeoTIFF.js; the `fieldwork-stac-selection/1` profile, which nothing in Fieldwork yet reads |
| NO₂ | 3 routes: Sentinel-5P TROPOMI (Copernicus CDSE), TEMPO V04 (NASA CMR), OMI (NASA GES DISC) | — |
| Aerosol | 2 routes: Sentinel-3 SYN AOD (Planetary Computer), MODIS MAIAC MCD19A2 (NASA, HDF-EOS2). The route note: AOD is not surface PM2.5 | — |
| Ozone | **no topic and no route**; collections exist uncurated (S5P O3, TEMPO O3TOT, OMI OMTO3, OMPS, DSCOVR EPIC tropospheric O3) | — |
| Formats | — | reads and crops **GeoTIFF/COG only**; NetCDF is download-only; HDF, Zarr and atmospheric products absent |
| Access | free-text access notes; NASA routes "Earthdata Login may be required" | **no URL signing**: unsigned Planetary Computer ranges failed its own audit; a CDSE token path for one product only |
| Missing as fields | licence, unit, column or surface, coverage dates, temporal resolution | — |
| Licence | MIT; `catalog.json` and the mission registry are CEOS MIM data, CC BY 4.0 | MIT; vendored GeoTIFF.js, Proj4js, Geoman (MIT), Leaflet (BSD-2) |

**Ontology in the two repositories, read 2026-11-05** (the practitioner: *"I am not sure how much ontology integration
is in those two repos"*). The EO Guide has `data/research-ontology.ttl`, 60 lines under its own `eo:` namespace: 9
classes and 11 properties aligned to SKOS (a research topic is a `skos:Concept`), SOSA (`eo:observableProperty` ranges
over `sosa:ObservableProperty`), DCAT (`eo:STACCollection` is a `dcat:Dataset`), PROV (`eo:MissionGroup` is a
`prov:Entity`), GeoSPARQL and schema.org; and `data/catalog.jsonld`, 958 satellites as `sosa:Platform` hosting
instruments. No SHACL shapes and no rules. The STAC Browser has no RDF: a JSON Schema for its hand-off file only. So
Fieldwork reuses the `eo:` vocabulary, vendored at a pinned commit as the sea-level pack's is, and maps to it rather
than minting near-duplicates. What is Fieldwork's own to add: what a run chose, fetched and from where; the licence
and citation as read; completeness by its three kinds; and the shapes that hold real receipts to them.

**The finding:** the routes NYC needs are curated for NO₂ and aerosol, and all of them are NetCDF or HDF, behind sign-in
or URL signing. The crop path that works in a browser covers GeoTIFF. So the first use needs, beyond adaptation: an
ozone route, the fields that make "open" visible (licence, unit, measured quantity, coverage), a reader for NetCDF or
HDF, and an answer to signing and sign-in. TEMPO's operational record is understood to begin in August 2023, after the
June pilot; that is to be read from its STAC extent, not assumed.

## Phase 1, first measurements: Sentinel-5P NO₂, 7 June 2023, over NYC

The practitioner, 2026-11-05: *"I have used Sentinel5P before and it may need log in."* Checked by catalog search and
response headers only, with the browser's `Origin` set to Fieldwork's; no data file downloaded.

| Route | Search from a browser | The file | Can a browser read it? |
| --- | --- | --- | --- |
| Copernicus CDSE, `sentinel-5p-l2-no2-offl` | yes, `*`; 2 swaths over NYC that day | `s3://eodata/…nc`, `auth:refs` s3 and OpenID Connect | **No without sign-in**: the asset is an S3 address behind a Copernicus account. The practitioner's experience, confirmed |
| Planetary Computer, `sentinel-5p-l2-netcdf` | yes, `*`; 2 NO₂ swaths (near-real-time processing) | `https://sentinel5euwest.blob.core.windows.net/…nc`, NetCDF, 63.2 MB | **Yes, with no account.** The token service answers a browser anonymously (`*`) with a short-lived token; signed, the file answers 200 with `Accept-Ranges: bytes`; the Range preflight from Fieldwork's origin is allowed. Unsigned it answers 409 |

**The same check for aerosol and ozone, routes with no sign-in only** (*"Before sign in lets use those that don't require
sign ins first"*). Planetary Computer, 7 June 2023, over NYC:

| Variable | Collection and product | Swaths that day | What it measures |
| --- | --- | --- | --- |
| NO₂ | `sentinel-5p-l2-netcdf`, `L2__NO2___` | 2 | tropospheric NO₂ column |
| Ozone | `sentinel-5p-l2-netcdf`, `L2__O3____` | 2 | **total** ozone column, mostly stratospheric; not surface ozone. No tropospheric ozone product among that day's items |
| Aerosol | `sentinel-5p-l2-netcdf`, `L2__AER_AI` and `L2__AER_LH` | 2 each | UV aerosol index (absorbing aerosol, such as smoke) and aerosol layer height; neither is PM2.5 |
| Aerosol | `sentinel-3-synergy-aod-l2-netcdf`, `NTC_AOD.nc` | 2 (Sentinel-3A and 3B) | aerosol optical depth; not PM2.5 |

Every one is NetCDF. Both collections give their licence as `proprietary`, linking the Sentinel Data Legal Notice,
which has not been read here; that is the catalog's word, recorded as it stands. MODIS MAIAC AOD, which JLT's guide
routes through NASA, is not on Planetary Computer; it is the sign-in route, kept for later.

So the first open route for NO₂ needs no login, only an anonymous token the browser fetches for itself; JLT's STAC
Browser does not sign, which is why its own audit found Planetary Computer ranges failing. **The remaining gap is the
format**: a 63 MB NetCDF-4 (HDF5) swath, of which NYC needs a few pixels. Whether a browser reader can fetch only the
needed chunks by range, rather than the whole file, is the next measurement.

## Phase 1: how much of a swath NYC needs, measured 2026-11-05

The practitioner approved reading parts of one file: `S5P_NRTI_L2__NO2____20230607T172349_…_20230607T175810.nc`,
63.2 MB, Planetary Computer, with an anonymous token. `scripts/s5p_range_probe.py` reads it by HTTP range in 64 KB
blocks, as a browser reader would, counting every request, capped at 20 MB. Read through h5py, so the cost is the
file's layout and not one JavaScript library's.

| Step | Requests | Bytes so far |
| --- | --- | --- |
| Open the HDF5 structure | 5 | 0.33 MB |
| Latitude and longitude, `(1, 373, 450)` float32, one gzip chunk each | 19 | 1.25 MB |
| NO₂ and `qa_value`, scanlines 19 to 29 only | 35 | **2.25 MB of 63.2 MB** |

58 pixels fall in the five boroughs' bounding box (W −74.26, S 40.49, E −73.70, N 40.92), all with `qa_value` ≥ 0.75;
their mean tropospheric NO₂ column is 3.86 × 10⁻⁵ mol m⁻², the product's own unit.

**Corrected 2026-11-05, the same day: none of the 58 passes `qa_value` ≥ 0.75.** The sentence above compared the
STORED quality values, 0 to 100, against 0.75: h5py does not apply the variable's `scale_factor` of 0.01, and the probe
did not either, so almost any pixel passed. Applied, every one of the 58 reads 0.74. Found because h5wasm, in S6, read
the scale factor and counted none; the two readers then agreed once the probe was fixed. The mean 3.86 × 10⁻⁵ mol m⁻²
is of 58 pixels the usual threshold excludes, and is not a result. The byte cost is unaffected.

**What this does not establish:**

- **That a browser can do it.** h5py read it; a JavaScript HDF5 reader that makes range reads is still to be chosen
  and measured. The byte cost is the file's layout, so a reader that reads only what h5py read should cost the same.
- **That the cost holds for every product.** This is a near-real-time granule of 373 scanlines. The offline product is
  a whole orbit, about ten times as many scanlines, so its latitude and longitude chunks may cost more.
- **The borough outlines.** The bounding box takes in parts of New Jersey; the five outlines would take fewer pixels.
- **Anything about the monitors.** 58 pixels of about 3.5 × 5.5 km over the box, against six points, is the next step's
  question.

## Side experiments, logged

The practitioner, 2026-11-05: *"Please record these side experiments also in 179."* Every probe made for this record,
including the ones not yet run, so what was measured, what was only read and what is pending stay distinguishable.

| # | Date | Side experiment | How | Status | Record |
| --- | --- | --- | --- | --- | --- |
| S1 | 2026-11-05 | What JLT's EO Satellite Guide provides | read-only review of the repository at `684833c`, by an agent; no code run | done | *What JLT's repositories provide*, above |
| S2 | 2026-11-05 | What JLT's STAC Browser provides | read-only review at `945d8b3`, by an agent; no code run | done | the same table |
| S3 | 2026-11-05 | Can a browser get Sentinel-5P NO₂ without sign-in? | catalog searches and response headers from Copernicus CDSE and Planetary Computer, `Origin` set to Fieldwork's; no data | done: CDSE needs sign-in, Planetary Computer does not | *Phase 1, first measurements* |
| S4 | 2026-11-05 | Which aerosol and ozone routes need no sign-in? | Planetary Computer collection list and item searches over NYC, 7 June 2023; licence links read from the catalog, the legal notice itself not read | done: S5P O₃ (total column), S5P aerosol index and layer height, S3 SYN AOD; MODIS MAIAC is not there | the same section |
| S5 | 2026-11-05 | How many bytes of a swath does NYC need? | `scripts/s5p_range_probe.py`, h5py through counted 64 KB range reads, capped at 20 MB; one 63.2 MB file, approved by the practitioner | done: **2.25 MB in 35 requests** | *Phase 1: how much of a swath NYC needs* |
| S6 | 2026-11-05 | Which browser HDF5 reader can read by range? | installed into a scratch folder outside Fieldwork with the practitioner's approval, licences read first: `jsfive` 0.4.2 (public domain, after pyfive) and `h5wasm` 0.10.3 (NIST notice; bundles the HDF5 library). Run in Chromium by `scripts/probes/h5wasm-range-probe.mjs`, the storage requests counted, capped at 20 MB | done: **jsfive cannot** (its README: "only for reading HDF5 files as an ArrayBuffer representation of the file", so all 63.2 MB; not run). **h5wasm can**, in a worker, through Emscripten's lazy file: 1 header request and 7 range reads of 1 MB, **6.58 MB of 63.2 MB**, the same 58 pixels and the same quality values as h5py. Slow: 2 and 8 minutes on two runs, each 1 MB block a synchronous request in turn | *S6, measured* below |
| S7 | 2026-11-05 | Reading the Sentinel Data Legal Notice | the notice the catalogs link, read in full (2 pages, European Commission, DG GROW; PDF created 2015) | done: **open, with attribution**. See *S7* below | *S7* |
| S8 | 2026-11-05 | Best practice for gaps in satellite NO₂, AOD and ozone in health studies | four researchers and a report writer, open evidence only; each source marked as read in full or seen only as an abstract or snippet | done | `reports/Satellite data gaps in health studies.md` in the workspace; summarised below |

## S6, measured: a browser reads the swath by range

| Reader | Reads by range? | Bytes for NYC | Requests | Notes |
| --- | --- | --- | --- | --- |
| h5py (S5, the yardstick) | yes, 64 KB blocks | 2.25 MB | 35 | Python; not a browser reader |
| `h5wasm` 0.10.3 in a Chromium worker | **yes**, 1 MB blocks (Emscripten's lazy file, `FS.createLazyFile`) | **6.58 MB** | 8 | needs the server to expose `Accept-Ranges` and `Content-Length`, which Planetary Computer's storage does to any origin; 14.7 MB package |
| `jsfive` 0.4.2 | **no** | would be 63.2 MB | — | reads only from a whole file in memory; not run |

So NetCDF-4 is a reader to add, not a blocker: h5wasm in a worker reads NYC's part of a Sentinel-5P swath with no
account, at about a tenth of the file. **Not established:** whether the lazy file's block size can be lowered to bring
6.58 MB toward h5py's 2.25 MB; why the two runs took 2 and 8 minutes, which looks like the network and sequential
requests and was not measured; whether h5wasm's 14.7 MB can be loaded only when a satellite file is opened; and any of
this in WebKit.

**Completeness has three kinds, and they are not the same gap** (the practitioner, 2026-11-05: *"So the data gap is
dates without readings?"*). A date can have no overpass, so no reading at all; an overpass whose pixels carry the fill
value, so no retrieval (clouds, failure); or pixels with values the product flags below its quality threshold, which is
what 7 June shows. Per monitor there is a fourth view: usable pixels over the city, and the one containing a monitor
missing or flagged. The widget reports which, per date and per monitor. Only one of that day's two NO₂ swaths was read,
so "no usable NO₂ on 7 June" is not established.

**The quality finding stands on its own.** That day's near-real-time swath over NYC has every pixel at 0.74, so a
practitioner applying the documented threshold gets nothing for that overpass. A widget has to say so, per date,
rather than show an empty value.

## S7: what the Sentinel licence says

Both Planetary Computer collections give their licence as `proprietary` and link
`https://sentinel.esa.int/documents/247904/690755/Sentinel_Data_Legal_Notice`. **That host no longer resolves**: the
link a catalog gives for a licence is dead. The same document is served at `https://sentinels.copernicus.eu/…`, and was
read there.

| Question | The notice |
| --- | --- |
| Open? | "free, full and open access", without warranty; under Regulation (EU) No 377/2014 and Delegated Regulation 1159/2013 |
| Uses allowed | reproduction; distribution; communication to the public; adaptation, modification and combination with other data |
| Limits | "in the rare cases of security concerns, protection of third party rights or risk of service disruption" |
| Attribution, original data | 'Copernicus Sentinel data [Year]' |
| Attribution, modified data | 'Contains modified Copernicus Sentinel data [Year]': what values sampled at the monitors are |
| Registration to use | none required by the notice. The sign-in met in S3 is the Copernicus hub's access policy, not a condition of the data |
| Liability | no warranty; the user waives claims against the EU and the providers |

**So these products are open**, and the catalog's word `proprietary` misdescribes them. Two consequences for the
widgets: the EO catalogue states licences from the licence itself, not from a catalog's licence field, and records where
it was read; and a dead licence link is a finding the widget shows, not a reason to call a product closed. Every output
built from Sentinel data carries the attribution sentence, as the figures already carry a source note.

## Gaps and imputation: provisional statements

The practitioner, 2026-11-05: *"If missing can we impute data? Are there best practices for doing this with EO data?"*
Answered from general knowledge, no paper read; three statements proposed and agreed (*"Yes to all"*). They are
statements to explore, not rules, and S8 reviews the evidence for them.

1. **The station comparison is not imputed.** Imputed satellite values compared with the stations would partly compare
   a model with the ground. Compare where both exist, and report completeness by its three kinds.
2. **Imputation is a separate, declared step, never a default.** Imputed values keep their own column and flag, their
   method goes in the receipt and the Notes, and the complete-case result can be shown beside the imputed one.
3. **A ready-made gap-filled product is a model, not an observation.** A reanalysis (CAMS, MERRA-2, GEOS-CF) or a
   full-coverage estimate is offered under its own label in EO, never as satellite data.

The reason behind all three: satellite gaps are not random. Clouds remove NO₂ and AOD retrievals, and cloudy days differ
in weather, which itself bears on pollution and on asthma, so missing-not-at-random is the default.

## S8: what the evidence says about gaps

From `reports/Satellite data gaps in health studies.md` (workspace root). Product documents read in full are the
strongest evidence; health-effect evidence is thin and mostly from abstracts.

| Finding | Strength | Bearing on this design |
| --- | --- | --- |
| TROPOMI NO₂: keep `qa_value` > 0.75; the documents disagree on the operator ("above" in the readme, "greater than or equal to" in the manual's table); stored as integers 0–100 scaled by 0.01 | product documents, read in full | compare the stored integers and state the operator used |
| A cloud radiance fraction above 0.5 multiplies `qa_value` by 0.74 | the manual's factor table, read in full | 7 June's 58 pixels at 0.74 are most likely error-free but cloudy; to confirm, read their cloud fraction. Whether smoke was registered as cloud is not established |
| Total ozone `qa_value` > 0.5; the tropospheric ozone product covers 20° S to 20° N only; aerosol index ≥ 0.5, > 0.8 to remove sun glint; MAIAC QA bits 8–11 = 0000 | product documents | no TROPOMI ozone product is near-surface over NYC; the tropospheric one covers the Philippines |
| Use the offline stream for June 2023: reprocessed data end mid-July 2022 | TROPOMI readme | the near-real-time granule S5 read is not the recommended one |
| Surface NO₂ at US monitors is 36% higher on cloudy days than clear, 61.7% in the Northeast; a model overstated the gap (+58.7%) and was judged unfit to fill it | Goldberg et al. 2025, ACP, read in full | gaps are not random, and a clear-sky comparison describes clear-sky days only |
| Ignoring missing AOD pulled odds ratios toward the null for 2 of 3 child ED outcomes | dissertation abstracts only | the direction of bias for NO₂ and ozone is not established |
| No gap-filling error has been measured inside cloud gaps; validations hold out observed pixels | absence across the sources read | no fill is shown accurate where it is needed |
| No source says "do not validate with imputed data"; every validation found uses filtered retrievals with a stated time window and pixel rule | validation papers read in full | supports statement 1, and adds a reporting duty: threshold and operator, stream, window, pixel rule, near-road status, completeness with its denominator |
| For NYC in June 2023 there is no daily, openly licensed, observation-based gap-filled NO₂ or AOD product. GEOS-CF (model, no sign-in, no CORS, licence unread), NOAA NAQFC (forecast, browser-readable), ACAG (CC BY, monthly), CAMS reanalysis (CC BY, needs an account); TEMPO starts 2023-08-02 | catalog reads and command-line probes, not browser tests | statement 3: what fills a gap here is a model, and is labelled so |

**The three provisional statements are supported**, with the reporting duty above added to the first and auxiliary
variables (cloud fraction, snow, model output) to be recorded by any imputation step. The report lists the Sentinel
notice as unread: its writer did not have S7, which read it.

## Admission review: two widgets, 2026-11-05

The practitioner chose the names (*"Find products / Search catalog"*) and the style (*"Let's follow FW style for
dialogs"*): JLT's layouts, step order and wording, in Fieldwork's own dialogs. UI first (*"build the UI for the widgets
initially using as much of the design from the EO and STAC repos by JLT"*).

| | `find_satellite_products`, "Find satellite products" | `search_satellite_catalog`, "Search a satellite catalog" |
| --- | --- | --- |
| Asks | which satellites and products measure a variable, and what each measures | where the files are, for a chosen product, over the study area and dates |
| Adapted from | the EO Guide's *Start with a research question* panel: chips, alias matcher, chain, caution, route cards | the STAC Browser's three columns: *Connect & discover*, *Coverage, in context*, *Inspect & reuse* |
| Inputs | none | `product` (`satellite-product`), `area` (`area`) |
| Output | `satellite-product`: the route chosen, with what it measures, its unit, licence as read, sign-in, attribution and citation | `satellite-files` (UI-first: declared, consumed by nothing yet): the items and their files, each with licence, readability and completeness |
| Group | Sources: it chooses where data will come from, and takes no data | Sources: it acquires, with the study area as its scope |

- **D1.** A practitioner asks for both by name: *"EO identifies the satellite groups for those variables and STAC zeroes
  in on the source URLs."* Neither decomposes into anything that exists.
- **D2.** Examined first (the table above): nothing in the palette finds products or searches a catalog. Raster input
  reads a local file; the extract and WorldPop catalogues are the pattern reused, not an equivalent.
- **D4.** Two new port types. `satellite-product` exists because the wrong connection must be impossible: a search
  without a chosen product is a search of nothing, and a table or a layer carries no route. `satellite-files` names what
  a search hands on, so a consumer cannot mistake a list of remote files for data already read. Both are custom studs
  under D4a, one producer and one consumer, recorded as such.
- **D11.** The residual function of each is its own: a curated route choice, and a bounded catalog search with access
  facts per file. Reading pixels stays with a reader (h5wasm, S6) behind Raster input or a sampling step, not inside
  either widget.

| Distinction | Enforced as |
| --- | --- |
| A satellite column, an optical depth and a surface concentration are different quantities | each route states what it measures and its unit; the caution is shown with the routes (limitation, stated) |
| Open means the licence was read, not a catalog's licence field | the route's licence carries where and when it was read (validation rule, by shape, when receipts are written) |
| Sign-in needed is shown before anything is fetched | a field per route, and routes needing none come first (run-time ordering) |
| A gap-filled product is a model | a route's kind: observation or model (validation rule, by shape) |

**Data, not code.** JLT's `data/research-topics.json` is vendored at `684833c` with its digest and MIT notice, credited
in the file and in `NOTICE`. Fieldwork's additions, keyed by route id, sit beside it: the no-sign-in routes S3 and S4
found (Planetary Computer Sentinel-5P NO₂, O₃, aerosol index; Sentinel-3 AOD), and for every route the fields JLT's
routes lack. The `eo:` vocabulary is vendored with it, as the sea-level pack's is.

**Not in the first slice:** reading pixels, the citation map's dataset citations (unread for every route so far), the
imputation step, and the hand-off to Raster input. The UI says what it cannot do yet.

## Built, 2026-11-05 (0.28.0)

| Widget | What was checked | Result |
| --- | --- | --- |
| Find satellite products 0.1.0 | `tests/satellite-products.test.mjs`, `tests/find-satellite-products.browser.mjs` | 4 of 4 and 1 of 1, Chromium: JLT's file vendored at its digest; the matcher; the open product first for NO₂; an unread licence refused unless said to be unread |
| Search a satellite catalog 0.1.0 | `tests/satellite-catalog.test.mjs`, `tests/search-satellite-catalog.browser.mjs` | 5 of 5 against a stubbed catalog (paging, the product filter, the 500-item bound, the failure messages, a receipt claiming completeness refused); 1 of 1 in Chromium against a stub **and against the live Planetary Computer catalog**: over the five boroughs on 7 June 2023 it returned 20 items and kept the 2 NO₂ overpasses _(corrected 2026-11-05: 2 NO₂ items, one overpass, orbit 29273, in the near-real-time and offline streams; see "Built: Sample satellite files at points")_ |

**A rule amended on the way.** `source-consumes-data` fired on Search a satellite catalog, which requires a
`satellite-product`. A scope says what a source acquires and carries no data: `area` says where, a chosen product
says which collection. It was added to the rule's scope types, rather than recorded as a violation.

**Seen in the live run, for evaluation:** a Sentinel-5P swath is far larger than New York City, so in *Coverage, in
context* the boroughs are a small box inside it.

## On Pages: the area typed in the dialog, 2026-11-05 (0.28.1)

The practitioner opened Search a satellite catalog on Pages with no Study area connected, set the dates, and found
Search grey: *"I think the search catalog UI is not enough for the search and there is no point from satellite
files."* Then: *"My bad I did not add a study area."* The cause was the practitioner's to name, but the defect is the
dialog's: its only guidance was one muted line, and nothing inside it led anywhere. JLT's STAC Browser sets the area
inside the browser (a drawn rectangle, a W/S/E/N field, the map extent). 0.28.1 adopts the W/S/E/N field. The area
port is optional; with none connected, four edges are typed, checked as typed, and drawn in column 02 before the
search. The receipt states `fw:searchAreaFrom`, "study area" or "typed extent".

Found while testing it: an edge's `change` re-rendered the whole dialog, so moving to the next edge replaced the field
being typed into and its value was lost. Only column 02 is redrawn now. The browser test types the edges in the order
a person tabs through them.

The second half of the remark, *"no point from satellite files"*, stands: nothing yet reads the files. That is the
next widget, reviewed below.

## Admission review: Sample satellite files at points, 2026-11-05

The practitioner, asked whether to extend Sample raster at points or add a widget: *"Sample satellite files seems to
be more straightforward and less confusing."* So `sample_satellite_files_at_points`, "Sample satellite files at
points", under Spatial operations beside Sample raster at points, which stays unchanged.

**The current widgets, examined first.** Sample raster at points does the same operation, the value of the cell
containing a point, on a regular grid already loaded from a local GeoTIFF, and returns the point layer with one
attribute. A Sentinel-5P swath is not a regular grid (each pixel has its own corners), is remote, comes as one file per
overpass, and carries a quality value per pixel. Extending it would make its output depend on its input, a layer for a
raster and a table for satellite files; the practitioner judged that the more confusing of the two.

| | |
| --- | --- |
| Inputs | `points` (the monitors, from Point data) and `files` (`satellite-files`, from Search a satellite catalog) |
| Output | `table`, long: one row per point per overpass, with the value, its unit as the file states it, the quality value, whether it passed the product's rule, and the kind of gap where there is no usable value |
| Reading | by HTTP range in a browser worker (h5wasm, S6), only the bytes a point's pixel needs, with Planetary Computer's anonymous token |

- **D1.** A practitioner asks for it by name: the satellite value at each ground monitor, per overpass.
- **D2.** Sample raster at points is the near miss, for the reasons above; nothing else reads a swath.
- **D4.** No new port type: it takes `points` and the existing `satellite-files`, and emits `table`, so the result
  meets the chart, relate and regression widgets beside the station readings. `satellite-files` gains its consumer.
- **D11.** The residual function is reading a swath at points, with its quality rule and completeness.

| Distinction | Enforced as |
| --- | --- |
| The value is the pixel containing the point, not an interpolation | the method, stated on the result; kept from Sample raster at points |
| No overpass, no retrieval, and below the quality threshold are different gaps | a column per row naming which; never an empty value standing for all three |
| The quality rule's operator, where the documents differ, is stated | on the result and in the receipt |
| A satellite column is not a surface concentration | the unit and measured quantity travel on every row, from the product |
| Imputation is not done here | out of scope (provisional statement 2): this widget reads, it never fills |

**Three widgets, and why that is the lighter choice.** The practitioner, the same day: *"Considering this is remote
sensing and earth observation discipline I can live with three widgets if they collectively reduce friction of EO data
use"*, and *"The alternative is information overload."* Find, search, sample: each asks one question a practitioner
recognises, where one widget doing all three would put every product, item and pixel decision in one panel.

**Not in the first slice:** products other than Sentinel-5P Level 2 swaths; reading by the borough outlines rather
than at points; averaging over pixels near a point. Each is said where it is met.

## Built: Sample satellite files at points, 2026-11-05 (0.29.0)

Built to the admission review above, with one change of rule and three findings met on the way.

**One overpass, two items.** The search over NYC on 7 June 2023 returned two NO₂ items, and 0.28.0's changelog, the
search manual and this record (the validation table above) called them two overpasses. They are one: orbit 29273,
published as a five-minute near-real-time granule (`NRTI`, 373 × 450 pixels) and as the whole orbit processed offline
(`OFFL`, 4,172 × 450, 606 MB). The catalog states both on each item, `s5p:processing_mode` and `sat:absolute_orbit`.
Sampling both would count one reading twice. The search now shows the stream and orbit and, where an orbit has an
offline item, does not keep its near-real-time items by default; the sampler records a finding if one orbit is read
twice. S5 and S6 read the near-real-time granule, so their numbers stand.

**The cost is the chunk, not the pixel.** Read with h5py over counted range requests:

| Dataset, offline NO₂ file | Chunk | One pixel costs |
| --- | --- | --- |
| latitude, longitude | 2,086 × 225 | 2.1 MB each |
| nitrogendioxide_tropospheric_column | 2,086 × 225 | 3.2 MB |
| qa_value | the whole orbit, 4,172 × 450 | 2.1 MB |
| latitude_bounds, longitude_bounds | 2,086 × 225 × 1, sixteen per variable | not finished: the read timed out; eight more chunks |

**The pixel rule changed: nearest centre, not containing pixel.** The corners would roughly double a read, to about
25–30 MB an overpass, against 10–15 MB. The two rules differ only for a point near a pixel's edge, on pixels about
3.5 × 5.5 km. Asked, the practitioner chose the nearest centre. The reader takes latitude and longitude one chunk at
a time, later scanlines first for a northern point (a daytime orbit runs south to north), and stops once every point
has a centre within one and a half times half the pixel spacing; a point with none is off the swath.

**The browser here is slow against that storage.** From the machine this was built on, Chromium fetched 1 MB ranges
from the storage in 35–55 seconds, inside the command sandbox and outside it; curl fetched the same ranges in 1–4
seconds, and later, from Python, 2 MB took 179 seconds. S6 had already met it (2 and 8 minutes for 6.58 MB). Not
diagnosed. Whether a practitioner's browser elsewhere is as slow is not known.

**The stored integer.** `qa_value` is an 8-bit integer with `scale_factor` stored in 32 bits as 0.0099999998, so a
stored 75 multiplies out to 0.74999998 and would fail "at or above 0.75". The rule compares integers. A first note
blamed 32-bit arithmetic for the product; the unit test showed the product rounds back to 0.75 in 32 bits, and the
trap is the 32-bit scale factor multiplied in 64 bits.

**Sizes are hidden from the page.** The storage sends no `Timing-Allow-Origin`, so the browser reports 0 bytes for
every range request. The first live result said "0.0 MB in 15 requests"; it now says the requests and that their size
is not visible.

**Two more defects found by the live run.** The table viewer pivots a long table on its last key column when every
other key describes the row, and it pivoted `gap`, showing "below quality threshold" as a column heading. A final
`measure` column naming the variable, Fieldwork's convention for a melted table, fixes it. And a workflow holding the
new node did not load at all until the widget had its release and registry records: the canvas was empty with no
error.

### Validation, 2026-11-05

| Check | Platform | Result |
| --- | --- | --- |
| `tests/satellite-sample.test.mjs` | Node | 7 of 7: the nearest centre tile by tile, off-swath, tile order; the three gaps and the integer rule; the long table and its `measure` column; one orbit read twice as a finding; hidden sizes; the receipt conforms and refuses `fw:imputed true`, `fw:completenessRead false` and an unknown operator |
| `tests/sample-satellite-files-offline.browser.mjs` | Chromium | 1 of 1: a Sentinel-5P-shaped file made by h5wasm in Node (4 × 6 pixels, two column chunks), served by range; the real worker reads one point per outcome |
| `tests/sample-satellite-files.browser.mjs`, `SATELLITE_LIVE=1` | Chromium | 1 of 1, 8.3 minutes: the real offline file at two NYC ozone monitors. Queens College 2, scanline 2409, ground pixel 74: 4.21 × 10⁻⁵ mol m⁻², qa 0.74. IS 52, scanline 2411, pixel 73: 2.53 × 10⁻⁵ mol m⁻², qa 0.74. Both below the threshold, as S5 found for the whole city that day |

**What this does not establish.** No independent recomputation: `check-coverage.json` records the check as owed.
Nothing about WebKit or Safari, which CI runs. Nothing about a month of readings: one day was read. Whether a
practitioner understands the three gaps from the table is not observed. The nearest-centre rule's disagreements with
the containing pixel were not counted.

## What is already known to be a limit

A satellite does not measure what a station measures. NO₂ from TROPOMI or TEMPO is a tropospheric column, not ppb at
the surface; aerosol optical depth is extinction through the column, not µg/m³ of PM2.5; most ozone products are total
columns. The comparison is whether the two move together over time at each monitor, not whether they agree in value,
and every surface says which quantity it holds.

## Next

Phase 0 and 1 together: a source matrix for NO₂, AOD/PM2.5 and ozone over New York City, each entry checked by reading
real bytes in a browser at the six monitors for the pilot interval, the June 2023 smoke. A product that fails is a
result. Each file fetched beyond metadata is named, with its size, before it is downloaded. That matrix is the EO
catalogue's first content.

## What this does not establish

Anything yet. It records what was asked.
