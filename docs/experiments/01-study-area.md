# Study area developmental evaluation

Date: October 5, 2026. This is the first developmental evaluation of Fieldwork as a visual workflow environment for public health digital twin simulations. The bounded task is to start with an empty canvas, define an area on an online map, and inspect the resulting geometry, N3 facts, rule, and conclusion. It does not test a disease simulation or establish practitioner usability.

The subsequent discussion of computation nodes, reusable spatial scope, ontology, and browser resource constraints is recorded in [developmental evaluation notes 02](02-area-computation-and-resource-scope.md).

## Evaluation question

Can a practitioner specify a study area and explain how the visible selection becomes an input to a semantic workflow? We will observe discoverability, spatial control, understanding of the representation, correction of mistakes, and preservation of work. Automated functional checks are separate evidence; they cannot establish those outcomes.

## Step 1 Start from an empty canvas

**Task:** Open the blank experiment workspace and add Study area from the node library.

**Decision A01 — retain a separate blank workspace.** Reuse the existing workflow graph and local persistence format, with an explicit blank-workspace identity. Keep example workspaces separate so starting the exercise does not replace the heat or Old Naledi example. Adding a node is an explicit action; the empty canvas contains no hidden source or output nodes.

**Rationale:** A worked example can hide setup steps. Starting empty reveals whether the user can discover the required source and understand why the workflow needs it.

**Evidence to collect:** Whether the participant identifies Study area without prompting; time and assistance required; whether they expect the act of adding a node to select a boundary automatically.

## Step 2 View a map and select an area

**Task:** Open the Study area editor, navigate the map, and draw either a bounding box or a polygon. Name the area and apply it. Repeat using the other selection method.

**Decision A02 — use a map editor with a local geometry contract.** Bundle Leaflet locally and use OpenStreetMap raster tiles as online geographic context. Persist the selected geometry as GeoJSON coordinates in longitude, latitude order. Store the selection method separately; both methods produce a Polygon.

**Rationale:** The geographic input should be independent of the renderer and tile provider. A saved selection must remain usable when the map service is unavailable. Bounding boxes provide a quick coarse selection; polygons let participants express an irregular study boundary.

**Decision A03 — validate before applying.** This slice supports one simple exterior ring with 3–200 vertices, a closed nonzero boundary, and no crossings or touching nonadjacent edges. Bounding boxes must be axis aligned. Holes, antimeridian crossings, and polar latitudes outside ±85° are explicitly outside this drawing contract. Coordinates are retained rather than silently rounded or reprojected.

**Rationale:** Invalid or ambiguous shapes must not become valid-looking spatial facts. Drawing validation is a geometry operation, with actionable feedback in the widget.

**Evidence to collect:** Successful selection of the intended area; ability to distinguish a box from an irregular boundary; behavior when a polygon crosses itself; whether a participant can correct a vertex or cancel without losing the saved shape.

## Step 3 Inspect the translation to N3

**Task:** Compare the selected shape with its GeoJSON coordinates and N3 preview before running.

**Decision A04 — represent the geographic entity and geometry separately.** Generate a stable study-area IRI from the workflow node ID and type it as both `geo:Feature` and the application role `fw:StudyArea`. Link it to a separate `geo:Geometry` IRI using `geo:hasGeometry`. Serialize the shape using `geo:asWKT` and `geo:wktLiteral`, with the explicit CRS84 IRI. Include the user label, selection mode, bounding coordinates, and the widget's validation result. Editing updates that node's geometry; exported run receipts preserve the executed snapshot.

**Rationale:** The study area is the entity the workflow refers to; its geometry is a representation. Using GeoSPARQL vocabulary avoids inventing an incompatible spatial representation. CRS84 explicitly specifies longitude then latitude. This representation does not imply that the reasoner implements GeoSPARQL spatial query functions.

**Decision A05 — show unevaluated facts as a draft.** The editor previews generated N3, but a preview is not an inference result. Changed geometry marks previous workflow results as stale until rerun.

**Evidence to collect:** Whether the participant can identify the name, coordinates, selection method, and geometry link; what they believe changes when they move a vertex; whether they distinguish the bounding extent from the polygon itself.

## Step 4 Run the source and inspect its conclusion

**Task:** Run the study-area node before adding downstream simulation components. Inspect the saved shape and N3 conclusion.

**Decision A06 — allow an area-only graph to run.** A graph consisting only of study-area sources can produce a source preview and reasoning receipt without a fabricated analysis-output node. Larger workflows retain their explicit visual output branches.

**Decision A07 — make the rule boundary explicit.** JavaScript validates the drawing and supplies `fw:geometryValidated true`. EYE-JS consumes that fact together with the study-area and geometry relationship to derive `fw:readyForSpatialAnalysis true`. This conclusion means the input meets this widget's contract. It does not mean the geographic choice is appropriate for a public health question, nor that the shape is an official administrative boundary.

**Rationale:** This exposes the difference between computed or asserted facts and logical consequences. The first rule should be small enough to inspect and challenge before more consequential simulation rules are introduced.

**Evidence to collect:** Whether the participant can predict the conclusion; what they think “ready” guarantees; whether they can explain which checks ran in the widget and which inference ran in EYE.

## Step 5 Correct, save, and revisit

**Task:** Edit a saved area, cancel an edit, undo an applied edit, export and import the workflow, and reopen it without a network connection.

**Decision A08 — separate online map context from offline computation.** The application and geometry remain local and can be cached. Map tiles are requested only for the visible online map; Fieldwork does not bulk download or precache OpenStreetMap tiles. The editor reports tile availability separately from application offline readiness. No geolocation request or remote geometry upload is required.

**Decision A09 — preserve RDF term types in receipts.** Keep literal datatype and language information alongside quad values, so the inferred boolean and the WKT literal can be displayed accurately rather than rendered as IRIs.

**Evidence to collect:** Whether cancellation and undo match expectations; whether users can distinguish the saved shape from a draft; whether the offline state is understandable; whether reopening reproduces the intended boundary.

## Semantic standards and extension boundary

**Decision A10 — use established semantic terms before introducing application terms.** Each widget specification must identify its reused vocabulary, serialization and coordinate conventions, application extensions, and the component that computes or infers each assertion. Using a vocabulary does not establish conformance to every capability of its standard.

| Concern | Representation in this slice | Responsibility |
| --- | --- | --- |
| Geographic entity | `geo:Feature` with application role `fw:StudyArea` | Widget creates facts |
| Geometry relationship | `geo:hasGeometry` to a `geo:Geometry` | Widget creates facts |
| Geometry serialization | `geo:asWKT`, `geo:wktLiteral`, explicit CRS84 IRI | Serializer preserves longitude, latitude order |
| Human name | `rdfs:label` | User supplies label |
| Local editable shape | GeoJSON Polygon coordinate structure | Map editor and workflow JSON |
| Selection method and validation status | `fw:selectionMode`, `fw:geometryValidated` | Application-specific interaction and checks |
| Extent and readiness | `fw:west/south/east/north`, `fw:readyForSpatialAnalysis` | Extent computed in JavaScript; readiness inferred by EYE |

The four extent literals are convenience fields; the WKT geometry is the interoperable spatial representation. They are not presented as GeoSPARQL properties. JSON is the workflow storage format; the exported workflow JSON is not JSON-LD.

For example, this illustrative box near Old Naledi is represented as follows (it is not an official boundary):

```n3
@prefix geo: <http://www.opengis.net/ont/geosparql#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix fw: <urn:fieldwork:>.

<urn:fieldwork:area:area-1> a geo:Feature, fw:StudyArea;
    rdfs:label "Illustrative study area";
    geo:hasGeometry <urn:fieldwork:geometry:area-1>.

<urn:fieldwork:geometry:area-1> a geo:Geometry;
    geo:asWKT "<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POLYGON ((25.89 -24.7, 25.91 -24.7, 25.91 -24.68, 25.89 -24.68, 25.89 -24.7))"^^geo:wktLiteral;
    fw:geometryValidated true.

{ ?area a fw:StudyArea; geo:hasGeometry ?shape.
  ?shape geo:asWKT ?wkt; fw:geometryValidated true.
} => { ?area fw:readyForSpatialAnalysis true. }.
```

This slice uses GeoSPARQL 1.1 vocabulary and WKT representation. It does **not** implement a SPARQL endpoint, `geof:` function execution, a GeoSPARQL entailment regime, or a conformance suite. Future containment or intersection widgets should adopt the applicable standard relation (for example, `geo:sfWithin`) only after the geometry operation and boundary semantics are tested. A point on a polygon boundary must not silently be treated as strictly within it.

At this initial slice, W3C PROV-O for provenance and SHACL for RDF graph constraints were architectural candidates. The subsequent [area computation decision](02-area-computation-and-resource-scope.md) adopts PROV-O terms for computation receipts. SHACL remains a candidate; graph constraints would not replace geometric validity checks.

## Implementation and validation record

Implemented locally on October 5, 2026. The geometry contract and N3 generation are in `study-area.js`; Leaflet interaction is in `study-area-map.js`; `core.js` executes the source and EYE rule; `reasoning-worker.js` retains RDF term types. This record describes the local working tree following base commit `3b9a5d8`; it is not a claim that these changes have been published.

Validation used Node.js 22.20.0 and Chromium through Playwright, with the local server at `127.0.0.1:4173`. `npm test` passed all 9 tests. `npm run test:browser` passed all 3 browser suites, including the existing heat and Old Naledi examples. Firefox and WebKit were not tested.

| Step | Observed functional evidence | Test or artifact |
| --- | --- | --- |
| 1 Empty canvas | Zero nodes, disabled Run; adding Study area leaves geometry unset | `tests/study-area.browser.mjs`; `test-results/study-area-empty.png` |
| 2 Selection | Real OpenStreetMap tiles loaded; box and polygon clicks created editable shapes; crossing polygon rejected; vertex drag and undo-point worked | Browser suite; `test-results/study-area-editor.png`; drawing contract tests in `tests/study-area.test.mjs` |
| 3 Translation | GeoSPARQL feature/geometry terms, explicit CRS84 and WKT datatype checked; draft marked unevaluated | Core tests and browser preview assertions |
| 4 Execution | Actual bundled EYE produced typed boolean readiness; receipt preserved input and one geometry output | Browser suite; `test-results/study-area-evidence.png` |
| 5 Recovery | Cancel preserved saved box; undo/redo restored shapes; export/import retained polygon; offline reload reran EYE and reopened geometry; 390-pixel layout had no horizontal overflow | Browser suite; `test-results/study-area-mobile.png` |

Screenshots are local test artifacts in the ignored `test-results/` directory and can be regenerated. The tests verify interaction and data preservation, not geographic suitability or full accessibility. Numeric coordinate entry and drag-to-draw boxes are implemented; the automated box creation check uses two corner clicks.

The checks exposed two implementation defects: React Flow updates discarded measured node dimensions, intermittently hiding a node when switching examples; map animation callbacks could outlive a closed dialog. Updates now retain node measurements, and the dialog disables zoom/fade animations and cleans up pending layout work. The complete browser suite passed after those fixes.

The offline exercise also showed why `navigator.onLine` is advisory: it can report online after a cached navigation even when browser networking is disabled. Tile load/error status and an explicit basemap switch remain separate from offline computation. The test explicitly turns the basemap off while verifying saved geometry is editable.

No participant observation has been recorded yet. Do not treat functional test results as evidence that the workflow is usable, improves reasoning, or supports effective public health decisions.

## Observation record for each session

### Labeling refinement — October 5, 2026

The user requested the ability to apply a study-area label. The initial editor already offered a name field inside the map dialog; this request motivated a more visible **Study area label** field with an **Apply label** button in the node Inspector. The map dialog uses the same terminology, and the label appears on the drawn boundary and the executed geometry preview.

**Decision A11 — separate the human label from identity.** Store one label in the node parameters and emit it as `rdfs:label` on the drawn area's `geo:Feature`. Renaming retains the node IRI, geometry IRI, and coordinates. It marks existing run results as previous results until rerun, preserving the label used by the earlier receipt. Labels remain editable before a geometry is selected. Label text is escaped in rendered markup and serialized as an RDF string.

The browser exercise checks renaming through the Inspector, unchanged identifier and geometry, canvas/map/N3 agreement, and label persistence through export/import and offline reopening. This request is design feedback; it does not establish why a participant would miss the original name field or whether the revision improves discoverability.

Record the application revision, date, participant role and relevant GIS experience, selection task, assistance given, observed action sequence, misunderstandings, successful recoveries, and proposed design changes. Avoid recording sensitive study content or identifying participants unnecessarily. For each finding, distinguish direct observation, participant explanation, and evaluator interpretation. Repeat the task after changes to examine whether the original friction is resolved.

## Technical references

- [Leaflet 1.9.4 API](https://leafletjs.com/reference.html): map interaction and local GeoJSON rendering.
- [OGC GeoSPARQL 1.1](https://docs.ogc.org/is/22-047r1/22-047r1.html): geometry representation, WKT literals, and CRS84 axis order.
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/): attribution, visible map use, and no bulk offline tile download.
