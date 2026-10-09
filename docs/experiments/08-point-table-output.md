# Developmental evaluation: point table output

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. The user requested an output table to display points, following the introduction of the regression gate.

## A31: an explicit Table output for point data

The node library now provides **Table** under Outputs. It creates a named Results tab and accepts either one to eight point datasets or a single Check spatial coverage result. Direct point input needs no study boundary. The coverage input contains the boundary and already evaluated records; the Table preserves those values without recomputing classifications.

The input contracts follow Map's visible connector and replacement behavior. Dragging or selecting a coverage result replaces direct point connectors. A direct point connection, or adding a point input, switches back to direct data. Undo restores the previous connections. Input types remain checked, duplicate sources are rejected and the combined 2,000-record limit still applies. A Table cannot feed another node; it is a visual output, not a data transformation.

Rows contain the layer label, original record ID, name, longitude, latitude and scalar attributes. Source identity remains distinct when two datasets reuse a record ID. Missing coordinates and excluded records remain visible. Coverage input adds spatial relation, review decision and exclusion reason; it retains area measurements and review provenance in the run output. Selecting a reviewed row opens the existing exclusion/restore and boundary-review actions.

Direct input does not assign coverage decisions. Zero and false remain values, distinct from missing/null values displayed as “Not supplied.” Property names and values are escaped as text when rendered. Dates and other typed properties retain their source definitions in the saved workflow; the table does not reinterpret their types.

## A32: bounded rendering with searchable attributes

The widget renders 100 records and up to 12 attribute columns per page, in addition to identity/coordinate/review columns. Row and attribute controls expose the remaining values. This bounds the rendered cell count even when different records introduce many distinct keys. All original rows and attributes remain in the result and exported receipt; pagination does not subset the dataset.

Search examines all records and attributes, including values on other pages. Changing the search starts at the first matching row page. Attribute paging remains independent of search; a matching value may be on another attribute page, and selecting its row exposes the record details. Tables scroll horizontally within the Results panel on smaller screens. Search and page position are transient display state; the node's label, inputs and data survive workflow export/import and offline reopening.

Table presentation emits `fw:TableView` / `prov:Activity` evidence with source references and a generated result entity. Direct point facts use GeoSPARQL features, CRS84 WKT and the existing typed attribute descriptors. A reviewed Table links to the coverage execution through `prov:wasInformedBy`. The N3 view labels this receipt **PRESENTATION NODE**, with no new inference. A browser check parses its actual facts and the ontology with EYE; the Table itself does not need to run EYE to display raw points.

Adding a second table for the same coverage check must not multiply the global review alert. Alerts are now counted once per coverage execution node, while separate checks retain their own counts.

## Exercise and evidence

1. From an empty canvas, add Input data and prepare points, including one with missing coordinates and one with typed key/value attributes.
2. Add Table and drag Input data's output to **Points 1**. Name the Results tab and run. Inspect coordinates, attributes and missing values.
3. Add a second point input with overlapping record IDs. Confirm that layer identity remains clear. Search for an attribute value and inspect its row using Enter.
4. Connect a coverage check's output to **Or: Coverage result**. Run and inspect inside, boundary, outside, missing and excluded records. Restore an exclusion and rerun; confirm the source records remain intact.
5. Exercise row and attribute pages, export/import the workflow and reload offline. Compare the displayed data and review decisions.

`tests/table-output.test.mjs` checks the no-boundary contract, immutable inputs, multiple layers, source identity, coverage preservation, invalid connections, paging/search, missing/false/zero values and escaped content. `tests/table-output.browser.mjs` exercises actual canvas dragging, Inspector settings, expandable inputs, review actions, alert counts, N3 parsing, exported receipts, saved workflows, offline reopening and mobile layout. Screenshots are generated at `test-results/point-table-desktop.png` and `test-results/point-table-mobile.png`.

These checks join `npm run check` automatically. Practitioner evaluation should observe whether users distinguish raw point attributes from coverage decisions, notice records with missing locations, and understand that paging changes the display rather than the dataset. No practitioner findings or Firefox/WebKit validation are claimed.

Validation on October 5, 2026: the full gate passed with 32 unit tests and 11 Chromium scenarios. The two Table scenarios passed again after the final reviewed-row attribute display and offline-cache update. Desktop/mobile screenshots were inspected, and local documentation links and whitespace checks passed. Existing saved workflows were preserved; tests used the separate test origin.
