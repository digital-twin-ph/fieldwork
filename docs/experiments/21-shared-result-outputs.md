# Shared Map and Table widgets for reasoning results

_Created 2026-10-06 · Updated 2026-10-06_

Date: October 6, 2026. Status: fourth widget-standardization slice. The historical bar-chart limitations below are superseded by [the fifth slice](22-shared-chart.md).

## A72 Keep a shared widget with explicit input modes

Map and Table now support two input modes:

| Mode | Contract | Behavior |
| --- | --- | --- |
| Point layers or spatial coverage | Existing point/area inputs or coverage-result alternative | Existing direct-data and coverage-review behavior |
| Reasoning results | One `decisions` connector | Presents the supplied result rows, geography, decisions, explanations and evidence without new inference |

The inspector declares the mode explicitly. Reasoning mode has one input and no expandable point ports. Changing mode removes the current input connectors and marks the workflow changed; Undo restores them. This prevents a reasoning result from being silently combined with unrelated direct points or another boundary.

The decision presentation adapter uses the existing typed result structures for heat, diagnostic access and facility evidence. It does not turn every arbitrary RDF graph into a visualization or flatten source-specific evidence into a generic point table. Result rendering retains the existing scientific columns and explanations while sharing the widget identity, configuration and connection handling.

Within reasoning mode, Display as can switch between shared Map and Table while retaining the node ID, title and input dependency. Selecting Bar chart returns to the legacy output implementation. Direct point/coverage mode does not offer this chart conversion because a common chart data contract remains future work.

## A73 Preserve legacy outputs and their scientific meaning

The heat template and Old Naledi map/table outputs now instantiate the shared widgets. On loading an older workflow, `output` nodes with map/table views normalize to `map_output` or `table_output` with `inputMode: decisions`. Missing legacy view settings retain the historical map default. IDs, labels, references, edge endpoints and legacy selected-output IDs are retained. Validation works on a clone and normalization is idempotent; old exported files are unchanged.

Legacy bar charts stay unchanged. Their rules and counts are not migrated to a new chart grammar in this slice. Output widgets remain terminal; composition connectors for reports or dashboards are still proposed.

Each shared reasoning view receives an independent copy of the result payload. It adds a `fw:MapView` or `fw:TableView` presentation activity using the upstream result entity, and a generated entity derived from that result. There are no rule premises, new conclusions, exclusions or scientific recalculations in this receipt. Existing inference receipts remain available alongside presentation provenance.

Heat now has one reasoning receipt and two presentation receipts. The default Old Naledi workflow has two computation receipts, two reasoning receipts and three shared-view presentation receipts; its legacy bar chart does not add a new receipt.

## Registry and compatibility

Map and Table advance to `0.2.0`, adding reasoning mode while preserving their direct-input contracts. The legacy output entry advances to `0.1.1` to record map/table normalization. Earlier releases remain unchanged. The registry declares the mode selector, validates its single decision port against the implementation, and records the migration adapter.

Ontology mappings remain the established MapView and TableView activities. Full visualization specifications, renderer version pinning, general SHACL port validation, an independent Chart widget and dashboard composition remain future work.

## Evaluation

Unit checks exercise legacy normalization, selected-output compatibility, idempotence, rejection of mixed inputs and missing reasoning dependencies. They also verify one upstream inference for both views, identical result values, independent copies and parseable derivation provenance.

The browser exercise imports a legacy heat workflow, inspects shared controls, switches input modes, restores connections with Undo, switches Map to Table and back, exports evidence and reopens offline. Existing heat and Old Naledi scenarios retain their numerical expectations. Their expected receipt counts change because the views now record presentation provenance.

To try this slice, select an output in Heat or Old Naledi. Its shared inspector should show Reasoning results and the connected reasoning node. On a new Map or Table, choose Reasoning results before connecting a decision-producing node. Use Point layers or spatial coverage for direct input data and spatial review.

Validation on October 6: strict TypeScript/build and all 56 unit tests passed. The full Chromium run passed 34 scenarios; the older heat-output test still used a legacy label-control ID in one locator. After updating that locator, its complete scenario passed on the same build, giving passing evidence for all 35 scenarios across the suite and focused rerun. Ontology and registry validation passed (18 identities, 27 releases). No remote CI or Firefox/Safari validation was performed.
