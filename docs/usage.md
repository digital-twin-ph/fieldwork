# Using Fieldwork

_Created 2026-10-08 · Updated 2026-10-25_

The practitioner detail that used to live in the README. The
[README](../README.md) keeps the overview, the published links and the current
capability and validation summary; this file holds the step-by-step material,
and the [design experiments](experiments/) hold the rationale behind each
decision.

## Storage, packages and layout

Workflows, attached PDFs and retained raster windows stay in your browser; export them to move between the local and published sites, which have separate browser storage.

**Encrypted ZIP** creates a password-protected project containing the workflow, referenced PDFs and retained raster windows as binary files. Enter and confirm a long passphrase, then use **Import** to restore the ZIP on another device. Generic archive entry names, counts and sizes remain visible; original PDF filenames and citations are inside encrypted content. There is no password recovery. Browser storage and the existing JSON export/run receipts remain unencrypted. The prototype supports PDFs and bounded GeoTIFF windows, with a 20 MB archive limit; original national rasters and arbitrary attachments are not embedded. See the [encrypted-package design](experiments/24-encrypted-project-packages.md).

Projects now keep a manifest alongside their workflow. Edits update its inventory of nodes, connections, embedded records, fields and references. Export/import validate this inventory and required PDF/raster contents; incomplete packages are rejected. Older workflows acquire a manifest when saved. Reference-only JSON imports require their PDF/raster assets to be available locally—use a complete bundle to move projects between devices.

On desktop, drag the dividers beside the Node library and Inspector, or between Workflow/N3 and Results, to resize the panels. Sizes are saved on this device. Focus a divider and use arrow keys for keyboard resizing; double-click it or choose **Reset layout** to restore defaults. Narrow screens keep the stacked layout. See the [panel-layout design record](experiments/23-resizable-panels.md).

Use **Hide widgets** beside the workflow tabs to collapse the left node library. The workbench and Results each have a **Full screen** control; press Escape or the same control to return to the normal layout.

## Choosing a colour theme

**Theme** in the header offers **Match device**, **Light** and **Dark**. Matching
the device is the default, so a first visit follows the operating system, and a
later change there is picked up without reloading. An explicit choice overrides
the device and is saved on this device; if the browser will not store it, the
choice still applies for the session and the interface says so. On a narrow
screen the label is hidden and the control stays.

Canvas node colours are chosen separately for dark so sources, processing and
outputs remain distinguishable. Downloaded SVG and GeoTIFF artifacts are
unaffected by the theme and stay light, because an artifact for sharing should not
carry the viewer's display preference. See the
[colour theme record](experiments/46-colour-theme.md).

## Build a workflow

The local [John Snow worked examples](examples/john-snow.md) translate pump catchments into shared primitives: **Voronoi catchments** or **Network isochrone ? Clip polygons ? Summarize points in polygons ? Map/Table/Chart**. Select workspaces 05 or 06. Historical source tables contain 250 locations and 489 deaths; the street graph is a modern OSM snapshot, not reconstructed 1854 streets. Parameterized UTM distance, travel time, direction, speed, buffer width and count/sum choices are explicit. See [design experiment 32](experiments/32-john-snow-primitives.md).

The local in-development workspace 07 uses those 250 death locations for a [geoprivacy design experiment](experiments/35-cholera-geoprivacy-workflow.md). It branches from the private source to **Move points in a donut** and **Aggregate points in hexagons**, each with before/after map and table tabs. A **Mean center** widget runs on each point branch. **Compare point sets** takes both centers, their corresponding point sets and eight pump locations; its Comparison map shows the two maps side by side on one extent with projected mean centers, center shift and nearest-pump distances. The UTM projection is visible as a computation parameter and in N3 evidence. The after tabs offer a demo GeoJSON download containing derived geometry only. The editable project, before tabs, comparison map, N3 view and run receipt retain source coordinates and must be treated as private. The seeded movement is predictable, cell occupancy is not an anonymity guarantee, and neither method is cleared for real sensitive data. Contextual **Hide data** and calibrated encrypt/decrypt/evaluate operations remain TODO; the widget notes link to the [geoprivacy notebooks](https://git.cdc.gov/jupyterlite/2026-Map-Encryption-Library).

**▤ Catalog** in the header lists every widget definition this build contains: its version, the
first characters of the release digest a run receipt cites, the ports it declares, and whether an
external implementation has independently recomputed it (`agrees`, `partial`, or `not checked`).
The same identity appears in the inspector for whichever node is selected, with the measured
result of its check. Nothing in the catalog is fetched or installable, and a digest identifies a
description rather than certifying anything. Below 850 pixels the header control is hidden and the
way in is **Widget catalog ›** beside the node library; `?catalog=1` opens it directly.

**Tabular data** imports a long-format CSV, which is the shape most published model output arrives in: one row per observation, with the columns that identify the row chosen as **key columns** and one column holding the **value**. Open **Import tabular data**, select the file, confirm which columns are keys, choose the value column, and state the unit if the source states one. The editor proposes the value column from its name and treats the rest as keys; correct it before saving. Every key tuple must be unique: if two rows share the same key, the import is refused and names both rows, because one value would otherwise overwrite the other. A wide table — one column per year, say — therefore has to be reshaped to long format outside Fieldwork first. A unit is recorded exactly as you type it and is never inferred from the file, so a table whose source states no unit is displayed as *unit unstated*. An empty value cell is kept as unknown and counted, never read as zero. A table carries **no geometry**: columns named latitude and longitude are ordinary columns, and the vocabulary declares a data table disjoint from a point dataset so the reasoner cannot treat one as the other. Use **＋ Display as table** to create a Table output in Tabular data mode. Limits are 2,000 rows and 5 MB. See the [tabular-input record](experiments/48-tabular-input.md).

When a table will later be joined to administrative boundaries, key it on an official code rather than a place name — for the Philippines, the PSGC code — and record which boundary vintage those codes came from. Names collide across provinces, and a silent join to the wrong polygon is the error this widget's unique-key rule exists to make visible.

**Street network** is a specialized input: upload directed WGS84 GraphML/JSON or explicitly download a bounded OSM walking candidate graph. Connect **Study area ? Buffer study area ? Street network** to expand acquisition while keeping the original area for reporting. Existing saved networks change only on upload/download. Study area also offers centre-and-dimension square/rectangle controls in addition to free boxes and polygons. Saved normalized networks are included in project export and offline replay; raw uploaded network files are represented by their hash, not embedded.


Heat and Old Naledi now use the shared **Map** and **Table** widgets for reasoning results. Choose **Input mode** to distinguish a reasoning result from direct points/coverage; changing modes clears input connectors and can be undone. Legacy map/table outputs migrate on load with their identities and evidence intact. See the [shared result-output record](experiments/21-shared-result-outputs.md). The shared **Chart** widget now replaces legacy bar outputs, with explicit categorical counts and source provenance. Connect a reasoning result and name its Results tab. See the [chart standardization record](experiments/22-shared-chart.md).

**Sample locations** now supplies shared point data to Map, Table and coverage widgets. **Facility access** also accepts points from Input data, preserving missing coordinates as Unknown results. The [shared sample-point design](experiments/20-shared-sample-points.md) records the contract, provenance and compatibility changes.

Old Naledi now separates **Input data: Gaborone facility registry** from **Select nearby facilities**. Edit the connected records through the shared input form; the selection node retains the radius control and feeds the unchanged diagnostic rules. Existing saved Old Naledi workflows gain the explicit source on load. See the [facility-input standardization record](experiments/19-facility-input-standardization.md).

Heat outreach's **Neighborhoods** and **Cooling centers** now use the shared **Input data** widget and its full editing form. Older saved sources are normalized on load while retaining their IDs, labels, scalar attributes, references and connections. The [first widget-standardization experiment](experiments/18-shared-input-standardization.md) documents this migration and the remaining work for Old Naledi and output widgets.

For the first developmental evaluation, open `http://127.0.0.1:4173/?example=blank` or choose **New empty canvas**. Add **Study area**, open **Select area on map**, draw a bounding box or polygon, and apply it. Inspect **N3 & evidence**, then run to see the geometry preview and inferred readiness. The [study-area experiment record](experiments/01-study-area.md) documents each task, architectural decision, standards mapping, and evidence to collect. Readiness means the geometry meets the widget's input contract, not that the selected area is scientifically appropriate.

Select nodes to edit their settings. Add nodes from the library and connect compatible ports. All visual output branches execute together, and shared upstream nodes execute once.

Add **Map** under Outputs to display a study polygon and point layers. Connect the Study area (or Calculate area) and Input data. Map and Table offer **Add point input** for multiple datasets with one boundary. Map highlights outside points, lists records without coordinates and lets you toggle layers. See the [map/layer exercise](experiments/04-map-layers-and-attribute-contracts.md).

Add **Table** under Outputs to display point coordinates and attributes in a named Results tab. Connect Input data to **Points 1**. Direct point input needs no study area. Tables support multiple layers, search, row/attribute paging, record inspection, saved workflows and offline use. See the [point-table exercise](experiments/08-point-table-output.md).

Selecting an output node on the canvas opens its result. The Results panel switches to that node's
tab and marks it, so the two panels agree about what you are looking at; a node that produced two
tabs, as a coverage check does, keeps whichever of its own tabs is already open rather than jumping.
Selecting a node that produced no result leaves the open tab alone and clears the mark.

Workflow and N3 & evidence are the main views. Each visual output node creates a named Results tab; choose Map, Table, or Bar chart in its inspector. Select a location in a map or table to inspect the inputs and assertions behind its result. Expand Results for a larger view or filter table rows by text.

Use the worked-example selector to open **Old Naledi diagnostic access**, or visit `http://127.0.0.1:4173/?example=old-naledi`. Its widgets control sample spacing, facility search radius, minimum evidence, diagnostic-service pathway, speed proxy, and review threshold. The [worked-example guide](examples/old-naledi.md) explains the source data, assumptions, and three comparisons to try. Each example retains its own local edits when you switch.

Changes mark existing results as belonging to the previous run until you run again. Export a workflow to transfer it, or export a run receipt to preserve the executed workflow, N3 inputs, conclusions, and output data. Existing saved workflows remain local; Restore example replaces the current workflow with the latest example and can be undone.

## Local execution and offline use

The local clipping prototype now supports all-touched inclusion and a 0-1 pixel outer margin. TypeScript/build and 76 unit tests passed; all 47 Chromium scenarios passed across the full run and correction of one test baseline, with the actual Botswana WorldPop file enabled. See the [validation record](experiments/29-raster-edge-inclusion.md). Clip raster owns its cutline and settings; Map displays their result.

Open the dedicated [Old Naledi raster clipping workspace](http://127.0.0.1:4173/?example=raster), or choose **04 · Old Naledi raster clipping** in Workspace. Study area, Raster input, Clip raster and Map are already connected. Prepare your local GeoTIFF and its source citation, use **Clip parameters → Preview and adjust**, then **Run workflow**. This workspace saves separately from diagnostic access and your blank canvas. It waits for a raster before automatically running; no national raster is bundled with the app.

For a raster exercise, connect **Study area → Raster input → Clip raster → Map**, with Study area also connected to Clip raster. In Raster input choose **Prepare GeoTIFF input**, select the local file and **Save raster window**. Select Clip raster, connect its raster input, and choose **Preview and adjust**. Drag polygon vertices or enter bounding coordinates; inspect the cell counts, then apply the clip parameters and run. Opacity is a display control. Out-of-coverage drafts cannot be applied; Cancel and Undo preserve or restore the prior cutline. Clip adjustments leave the shared Study area unchanged; masked-out space appears transparent in the output. See [preview parameters and decisions](experiments/28-raster-preview-and-adjustment.md).

Choose **Add raster map** to display the clipped result. A default Map also exposes **Or: Raster**; connecting there switches its input mode to **Raster**. Undo restores the previous inputs. The Results toolbar offers **Download GeoTIFF**. Only the bounded input window is saved; the original national file remains on disk. Expanding beyond the saved window requires preparation again. Use **Prepare GeoTIFF input** again to enter or edit the separate **Source metadata and citation** fields without re-uploading. Source details follow the clip into N3, packages and downloaded GeoTIFF metadata; the exact Botswana filename offers an explicit WorldPop template. See [source provenance](experiments/26-raster-source-provenance.md) and [the WorldPop clipping experiment](experiments/25-raster-input-and-clipping.md) for metadata, pixel rules and resource limits.

For input and spatial exceptions, open `http://127.0.0.1:4173/?example=coverage`. **Input data → Prepare input data** offers synthetic generation, CSV, GeoPackage, GeoJSON and map pushpins with predefined/custom fields and automatic location/time. **Keep points inside the area** combines the source with a Study area, passes on the points inside it and counts what fell outside; a Map draws what it set aside. It replaced **Check spatial coverage**, which was retired on 2026-10-21 — with it went the ability to exclude a single record by judgement with a written reason. The [input and review exercise](experiments/03-input-data-and-spatial-review.md) documents each step, decision, limit and evaluation question.

Add **Reproject input** under Sources when your points are in UTM metres rather than degrees. Choose **Import and reproject points**, select a CSV or GeoJSON, set the UTM zone and hemisphere, and map the easting and northing columns. The inspector shows the derived source EPSG code, the converted record count and the maximum round-trip error; the stored output is ordinary CRS84 points, so Map, Table, Keep points inside the area and the catchment widgets all accept it. Conversion happens once on import, so saved projects replay offline. Only WGS84 UTM zones are admitted: a file on another datum, such as Cape or Hartebeesthoek, needs a datum shift this prototype does not implement, and declaring it a UTM zone would misplace every record. A clean conversion does not confirm that the declared zone was the right one. See the [reprojection primitives record](experiments/40-reprojection-primitives.md).

Pushpin key/value pairs support text, number, whole number, yes/no and date types, with optional allowed values entered one per line. Value sets become dropdowns. Shared form fields and per-pin attributes retain their definitions in the saved workflow; invalid values/defaults are rejected. Geographic sources carry explicit WGS84 metadata and longitude/latitude storage order. The [CRS decision record](experiments/05-coordinate-reference-systems.md) distinguishes EPSG:4326 from CRS84 and specifies the future Reproject node; reprojection is not implemented yet.

Use **Save Edits** in Prepare input data to keep changes on your device, including a pending key/value pair. **Delete Pin** edits the draft until saved. **Generate UUIDs for new pins** assigns stable record IDs without renaming existing pins. Category is an optional location label; Notes is free text. See the [pushpin editing and identity record](experiments/09-pushpin-editing-and-identity.md).

Canvas ports are blue for inputs and red for outputs. Nodes are shaded gray for sources, orange for processing and green for visual outputs. See the [canvas color decision](experiments/10-canvas-colors.md).

Add **Calculate area**, choose its **Boundary input**, select a metric or imperial **Area unit**, and run. It outputs the same study area with its measurement attached, so you can connect **Study area → Calculate area → Keep points inside the area**. The calculation measures the polygon using a spherical approximation and records canonical square metres as `geo:hasMetricArea`. The [follow-up evaluation notes](experiments/02-area-computation-and-resource-scope.md) explain the operation, units, reusable study-area ontology, and proposed resource-aware asset subsetting. Bounded GeoTIFF input and clipping are implemented; NetCDF loading remains design work.

Spatial distance uses a JavaScript haversine calculation. EYE-JS 21.1.24 runs in a worker and derives Review, NoFlag, or Unknown assertions from N3 facts and rules. The explanations combine run inputs and returned assertions; they are not EYE proof certificates.

The [geoprocessing memory lifecycle record](experiments/06-geoprocessing-memory-lifecycle.md) proposes disposable workers, bounded output ownership and cancellation for future heavy jobs. It distinguishes reusable Wasm allocations from browser memory reclamation. This executor and its resource budgets are not implemented yet.

Application assets and the bundled EYE engine are cached after the first successful visit. Wait for Available offline before disconnecting. This caches the application, not your data: a workflow that reaches a remote service — Find health facilities, Street network download — needs a network when you retrieve its data, though not when you run it afterwards, and a basemap needs one to draw. Acquire remote data before disconnecting, not only the application. Workflows are stored in browser localStorage without encryption. Clearing browser storage removes local workflows, attached PDFs, retained raster windows and offline assets, so export work you want to keep. Package installation requires network access; workflow execution runs locally. The map editors request OpenStreetMap tiles when their online basemaps are enabled. Saved geometry, pushpin editing and inference work offline; map tiles are not precached for offline use.

After updating the application, reload to install the updated service worker, then reload again if the old interface remains visible.

## If the version on screen is not the version you built

Fieldwork caches itself so it can run offline, which means a browser can go on serving a build
you have since replaced. The version is shown in the header, next to the Fieldwork mark, and
hovering it names the build actually serving the page.

When the two disagree the header says so — **`v0.7.0 · cached`** — and offers to update. If you
want to clear it yourself, or you are reading this in an embedded browser with no developer
tools, such as VS Code's Simple Browser:

```
http://localhost:PORT/?reset-cache=1
```

That unregisters every service worker for the page, deletes every cache it owns, and reloads
with a one-time cache-busting parameter so the browser's own HTTP cache cannot answer either.
**Your saved workspaces are untouched** — they are in local storage, and this clears the
application rather than your work.

The equivalents, where you do have developer tools, are a hard reload, Application → Service
Workers → Unregister, or Application → Storage → Clear site data.

**And check what is serving the page, because the other cache is not Fieldwork's.** Serve the
directory with `npm run dev`, which runs this repository's own `server.mjs` on port 4173 and sends
`Cache-Control: no-cache`. A general-purpose static server may not: `http-server` defaults to
`max-age=3600`, and on 2026-10-23 that hid a new tab in the interface for an hour while the server
was returning the new file all along. The browser simply never asked. Nothing in Fieldwork can
correct that — the service worker treats `index.html`, `build/app.js` and `styles.css` as
network-first precisely so a change reaches you, and a server that tells the browser its copy is
still fresh defeats that upstream of the application. A hard reload is the one-off fix; `npm run
dev` is the one that stops it recurring.

## Retired widgets, and what replaced them

Seven widgets were retired on 2026-10-12. **A retired widget never runs**, so a saved workflow holding
one is rewritten when it loads and the Inspector names the replacement on the node itself. This
table is here so a name in an old file, a screenshot or a migration notice can still be looked up.

| Was | Did | Replaced by |
| --- | --- | --- |
| **Neighborhoods** (`places`) | Loaded one demonstration's neighbourhood points | **Input data** (`observations`), which edits any point layer |
| **Cooling centers** (`centers`) | Loaded one demonstration's cooling-centre points | **Input data** (`observations`) |
| **Visual output** (`output`) | One display node with a view setting for map, table or bar chart | **Map**, **Table** or **Chart**, chosen from the view the node had saved |
| **Outreach criteria** (`policy`) | Flagged a location when an alert was active and its distance exceeded a threshold | **Apply ruleset** (`apply_ruleset`) with the *Outreach criteria* ruleset |
| **Access review** (`access_policy`) | Flagged a location whose proxy travel time exceeded a threshold, and banded it into a zone | **Apply ruleset** with the *Access review* ruleset |
| **Diagnostic evidence** (`xpert`) | Graded a facility's evidence level and expected service against a published hierarchy | **Apply ruleset** with the *Diagnostic evidence grading* ruleset |
| **Facility access** (`access`) | Found each location's nearest facility that met an evidence and service threshold, and estimated walking minutes | **Nearest point** with a candidate filter, then **Travel time from distance** |

The last three were one widget each for one set of rules. Their rules are now **declared artifacts**
with an identity, a version and a stated basis, and one widget applies any of them — so what was
three node types is one node type and three rulesets you can read. Each migrated node pins the
ruleset at the version that produced that widget's results, because a change to a rule changes a
result.

**Five of the seven migrate silently-but-stamped**, and their release files name the widget that
replaces each, so a saved workflow opens and the Inspector tells you what changed.

**`Facility access` is the exception, deliberately.** It was three operations in one node, so no single
widget replaces it and a saved workflow holding it **refuses to open**, naming it. Rebuild that step as
**Nearest point** with a candidate filter, then **Travel time from distance**, then **Apply ruleset**
with the *Access review* ruleset. The filter is where the evidence and service thresholds went: an
attribute name and the values to match, which is the same condition form the rule builder uses.

## References and provenance

**08 · Manila coastal exposure** is the worked example for sea-level projections. It holds 60 OpenStreetMap health facilities in a Manila bounding box, the eight published AR6 tide gauges for the Philippines, and the 288-value projection extract, and it assigns each facility its nearest gauge with the distance. It runs offline; everything is bundled. Two licences apply and both travel with anything you derive: the projections are CC BY 4.0 and oblige three citations, the facilities are ODbL and share-alike.

It stops before comparing a projected level to an elevation, because no elevation is supplied. That comparison needs a terrain model and a stated vertical datum, and neither can be fetched from a browser today. Nothing in this example is an inundation model: it accounts for no drainage, defences, waves or hydrodynamics.

**Find health facilities** retrieves health facilities inside the connected study area. Choose a source. **OpenStreetMap, live query** asks Overpass for facilities in the area. **HDX country export** downloads the prepared country-wide extract from the Humanitarian OpenStreetMap Team and clips it to your area. **Overture Maps Places** reads the Overture dataset straight from cloud storage, taking only the parts that cover your area. None needs an account. The first two are OpenStreetMap-derived and under the Open Database License, which is share-alike; Overture is a Meta and Microsoft conflation under CDLA Permissive 2.0, which is not, so a database derived from it carries no obligation to adopt the same licence.

Overture is worth understanding before you trust its numbers. It catalogues commercial places, which is broader than a health facility: measured in a Manila study area it offered 1,120 health places where the live OpenStreetMap query found 47, and the extras included individually named doctors, a wellness spa and a training course. It reported 207 places under “hospital” where OpenStreetMap returned 47 hospitals and clinics together. So it states a confidence for each place and the widget filters on it, defaulting to 0.70, and its categories are mapped onto facility kinds conservatively, with the vaguest categories not mapped at all. Each facility keeps Overture’s own category and confidence so you can check the mapping. Counts from Overture are not comparable with counts from the OpenStreetMap sources. Name the facility kinds, then press **Retrieve facilities**. The study area is the scope of the query rather than a filter applied afterwards, so it must be connected first.

Retrieval needs a network; running the workflow afterwards does not. The facilities are stored in the workflow, so the same workflow produces the same result with the network off — this is how every network-dependent widget here works, the street-network download included. The panel and the receipt state how many records were dropped and why: of an unrequested kind, outside the area or without coordinates, or without a name. ODbL is share-alike, so a database you derive from this must be offered under the same licence with the attribution intact.

One thing to keep in mind when reading the result: these are the facilities the source records, not the facilities that exist. OpenStreetMap coverage is uneven and states no completeness, so an absence on the map is not evidence of absence on the ground, and no comparison against an official facility register has been made.

**Credentials** opens a separate, session-only credential manager. Choose **Create empty collection**, add named API keys and their allowed HTTPS origin, then **Download encrypted credentials** with a long passphrase. Keep the `.fwcredentials` file on your computer. To reuse it, select the file and unlock it. Keys are excluded from project exports and browser persistence; reload, manual Lock or 15 minutes of inactivity clears the session. Editing downloads a new file rather than overwriting the original. No current input node consumes these keys. The facility source that needed one, healthsites.io, was excluded because it sends no cross-origin header and a browser cannot read its response; see [69](experiments/69-healthsites-acquisition.md). See the [credential-file design and security boundary](experiments/30-local-credential-files.md).

Select any node and choose **Manage references** to attach a PDF or URL, identify its author/year and passage, and explain how it supports the data, method or assumption. **Save reference** persists the citation; uploaded PDFs remain local and are available offline. **Export** includes referenced PDFs in a portable workflow bundle; **Run receipt** includes a snapshot of references, file hashes and provenance for the run. URL contents are not downloaded. Limits are 5 MB per PDF and 10 MB total per workflow. See the [evidence-reference design experiment](experiments/13-node-evidence-references.md).

Citation metadata uses PROV-O and Dublin Core alongside the spatial GeoSPARQL facts. Attaching a document records the workflow author's supporting reference; it does not parse the PDF, verify its claims or insert its contents into rule premises.

## NB04-style isochrone views

The John Snow network example now pairs an SVG plot with an interactive map of cumulative 1/5/10/15-minute catchments, mortality locations and all pump locations. Travel-time and infill settings remain in the processing widget. Selecting a canvas widget highlights its source primitive in the library. See [worked example](examples/john-snow.md) and [design experiment 33](experiments/33-isochrone-plot-and-interactive-map.md). Existing saved workspaces are preserved; Restore example loads the revised template.

### What a travel-time catchment does not include

A walk has three parts: from where you are to the nearest street junction, along
the streets, and from the last junction to where you are going. **The catchment
charges all three**, and what it draws is that whole route.

- The walk onto the network is measured, charged against the time budget, and
  shown in the run's evidence as `fw:networkSnaps`. It is charged as a **straight
  line at street speed**, which is a lower bound on the real walk: it assumes you
  can cross whatever lies between. On the Soho example it is 10.9 m of a 375 m
  budget.
- The walk from the last junction to a doorway is the **final walk off the street**
  on the widget, charged like the rest: the full width where that much time is left,
  narrowing to nothing where it runs out. So the catchment stops at the time it is
  drawn for. The number itself — 25 m by default — is a plausible distance from a
  street to a door and has been calibrated nowhere.
- A site further than the snap limit from any mapped street is **routed anyway and
  marked**. Its catchment carries `fw:offNetworkMetres`, the widget glows red, and
  the Inspector names the site and the leg it was charged. A site whose walk to the
  nearest street would spend the whole budget gets **no catchment**, and is named in
  the same place: there is nothing it reaches, and no honest shape to draw.

The third matters most, and not equally for everyone. Streets and footpaths are
mapped unevenly — informal settlements least of all — so the places that would
show the worst access are the ones whose results rest on the longest assumed
lines. Read a catchment over sparsely mapped ground as optimistic, and check the
alert and `fw:networkSnaps` in the evidence for how far each site had to go to
reach a street.

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
measures this on the example data, and
[experiment 114](experiments/114-the-three-segments-of-a-walk.md) records what
would change it.

The [semantic audit procedure](audits/ontology-audit.md) defines admission and worked-example checkpoints, and opens with a glossary of the ontology vocabulary these records use, so the work can be reviewed without a background in description logic. [Experiment 34](experiments/34-widget-ontology-audit.md) records canvas RDF, runtime provenance and SHACL regression coverage, with explicit remaining semantic gaps.
