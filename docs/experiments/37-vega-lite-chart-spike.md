# Vega-Lite Chart enhancement spike

Date: October 7, 2026. Status: local architectural spike; not published or scientifically validated.

## Semantic admission

This extends the existing shared **Chart** widget rather than adding a synonymous node. Its inputs remain one reasoning result or one summarized polygon result; it has no downstream output port. The underlying categorical-count or catchment-summary computation is unchanged. The new presentation controls choose classic HTML bars (default) or locally bundled Vega-Lite bars/dots, horizontally or vertically, with title, subtitle, axis labels, optional category-color legend and source/method note. The choice is a plan, one render is an activity, and its SVG display is an artifact. A chart mark is not a new epidemiological measure. No arbitrary user-authored Vega-Lite JSON, remote data URL, silent aggregation, time series, rates, confidence intervals or general chart grammar is admitted in this slice.

The existing decision count uses `fw:CategoricalCount`; polygon charts reuse upstream catchment summaries, including overlapping cumulative isochrone memberships. The added `fw:ChartSpecification` is a `prov:Plan` linked from `fw:ChartView`, with enumerated renderer, mark, orientation, field, measure kind and unit status. `prov:wasDerivedFrom` links it to the exact source result. A node's research/method references are also linked to that specification through `dcterms:references`; references remain author-supplied citations, not executable inputs or validity proofs. GeoSPARQL geometry and CRS do not enter this category-count chart. Values are finite nonnegative counts/totals; zero and unknown bins remain explicit. The count and membership units are records/location memberships, not population. Numeric totals retain the upstream field label and visibly report when a source-reported physical unit is unavailable; no physical unit is inferred.

| Contract | Spike decision |
| --- | --- |
| Input ports | Existing `decisions` or `polygons`, exactly one connected according to mode |
| Calculation | Existing count or upstream polygon summary; rendering performs no transform |
| Field binding | Fixed result field (`status`, `zone`, `tier`, `count`, `total`) with stable category keys |
| Presentation | `html` or `vega-lite`; `bar` or `point`; horizontal or vertical; title/subtitle, axes, color legend and source note (Vega-Lite only for nondefault settings) |
| Evidence | Chart specification facts, source result IRI, count-bin facts, node references and pinned local renderer packages |
| Validation | Application enum/limit checks; SHACL positive/negative chart-spec fixtures; browser visual and offline checks |

## Bounded renderer bridge

The adapter constructs a fixed Vega-Lite v6 spec from existing bins. It supplies local inline values, mark, category/count channels, zero-based quantitative scale, fixed category order, labels, tooltip and SVG renderer. It emits no Vega-Lite `transform` or remote data URL. Duplicate display labels gain their stable keys to avoid merging categories. A color legend is allowed for at most eight categories; otherwise the user sees a bounded error. The title, subtitle, source note and axis labels are included in the rendered SVG, which offers local SVG export. An underlying values table and readable JSON specification remain available in Results. The exact generated JSON and pinned renderer versions travel in the run's N3 evidence so an exported run retains the presentation recipe. Dependencies are pinned and bundled into the service-worker asset manifest; no CDN is used. The Vega-Lite mode loads on demand. The classic HTML renderer and saved workflows without new settings remain compatible.

This spike does **not** claim a full Vega-Lite-to-RDF ontology mapping. A later profile can admit numeric fields, units, temporal axes and linked selections only with explicit computation, missing-value and provenance contracts. Candidate Data Cube alignment remains specific to genuine statistical cubes. The new SHACL shape validates structural fields and enumerations, while the application checks bin values and the browser checks actual SVG rendering. No rule asserts that a visually plausible count is epidemiologically meaningful.

## Research and design guides

These are candidate **method references**, not software dependencies or conformance standards. Practitioners can attach a URL/PDF to the Chart node using its existing Evidence references editor, choosing the Method role; the run graph links it to the chart specification.

- [Tamara Munzner, *Visualization Analysis and Design*](https://www.cs.ubc.ca/~tmm/vadbook/): frame the question, data and task before choosing an encoding.
- [Edward Tufte, *The Visual Display of Quantitative Information*](https://www.edwardtufte.com/book/the-visual-display-of-quantitative-information/): inspect how quantitative comparisons are presented.
- [Alberto Cairo, *The Truthful Art*](https://ptgmedia.pearsoncmg.com/images/9780321934079/samplepages/9780321934079.pdf): keep explanation and truthful communication in the review.
- [Cynthia Brewer and Mark Harrower, ColorBrewer](https://colorbrewer2.org/): evaluate map/chart palette choices, including print and color-vision constraints. The spike uses one fixed color and does not yet implement palette selection.

The Fieldwork policy inferred from these sources is to show the measure, preserve the underlying values, separate scientific computation from graphical encoding, expose missing categories and let a reviewer trace sources. These are our design choices, not claims that the authors prescribe this specific widget.

## Evaluation and limits

Use the Heat decision fixture to compare classic bars, Vega-Lite bars and dots against the same eight classified input records. Check all bins including zero and Unknown, inspect the N3 & evidence panel, attach a Method reference, export/reopen the workflow and rerun offline. Test an invalid mark/renderer and a negative count as failures. Repeat with the John Snow catchment chart, noting that cumulative polygons overlap and their values must not be added into a unique-location total.

Validation on October 7: TypeScript build, 100 unit tests, ontology validation and widget-registry validation passed. Four focused Chromium scenarios passed on the final chart/semantic build: legacy Chart migration, Vega-Lite settings and SVG export, offline reload, and the John Snow N3/evidence graph. A broader run passed 59 of 61 browser scenarios, with one skip; its sole failure was a chart SHACL receipt missing a unit-status field after the shape was edited while the run was in progress. The receipt was corrected and the affected semantic/browser scenarios passed after rebuild. The broad suite was not repeated in full after that correction. The offline asset manifest lists 133 assets, including a 857,966-byte minified Vega-Embed chunk; total listed build assets are about 3.77 MB before transfer compression. This cost is material for an offline-first browser app and should be compared with a smaller renderer before expanding chart types.

The browser evidence is Chromium only. Firefox/WebKit support, practitioner comprehension, color-vision evaluation, larger-data performance and scientific correctness remain untested.
