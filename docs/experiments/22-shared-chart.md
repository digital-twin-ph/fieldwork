# Shared Chart widget

Date: October 6, 2026. Status: fifth widget-standardization slice.

## A74 Use an explicit categorical count adapter

Chart (`chart_output`, version `0.1.0`) is a shared terminal output with one `decisions` input. Its first adapter renders horizontal bar counts for the existing reasoning results:

| Input result | Grouping field | Meaning of one count |
| --- | --- | --- |
| Heat outreach | `status` | One input location |
| Facility access | `zone` | One generated sample or supplied location |
| Facility evidence register | `tier` | One candidate facility |

The result type determines the grouping. The inspector explains this contract and lets the practitioner choose the source and results-tab label. It does not yet offer arbitrary numeric attributes, chart grammars, population weighting, time series or multiple series. Direct point tables and coverage results are not accepted by this adapter. Vega-Lite remains a candidate for a later adapter; this slice uses the existing offline HTML bars without new dependencies.

Every input row contributes exactly once. Known categories remain visible when their count is zero. Missing or unrecognized category values go into an explicit Unclassified bin, distinct from a reasoner's explicit Unknown result. Empty inputs produce zero counts without an invalid scale. The access caption distinguishes supplied input locations from generated samples and says that these are not population counts.

## A75 Make aggregation visible in provenance

Counting is a computation, even when performed inside a terminal visualization widget. The run records a `fw:CategoricalCount` and `fw:ChartView` activity, its upstream entity with `prov:used`, the grouping field and input count. The generated result uses `prov:wasGeneratedBy` and `prov:wasDerivedFrom`; its `fw:CountBin` entities record category keys and counts. These local terms describe the bounded computation and reuse PROV for lineage. They do not claim implementation of the broader RDF Data Cube visualization profile.

The result retains an independent copy of the original rows, explanations, geographic context and references, plus the chart summary. Existing reasoning receipts remain available. The chart does not filter records, infer decisions or treat grid samples as people. Evidence export contains both source rows and count bins so totals can be checked independently. Old Naledi now has eight receipts: three computations, two reasoning receipts and three map/table presentation receipts.

## Compatibility and registry

Legacy `output` nodes with `view: bars` normalize to Chart on loading, without changing IDs, coordinates, labels, references or incoming edges. Normalization is idempotent and does not mutate the imported object. Legacy map/table defaults remain unchanged. The legacy registry identity advances to `0.1.2` and remains for import compatibility; the palette offers shared Map, Table and Chart.

Reasoning-mode outputs can switch between Map, Table and Chart while retaining their dependency and identity. Old Naledi directly instantiates Chart. Chart's configuration and ports are checked by application validation and the widget registry; widget-specific SHACL shapes and persisted per-node version dispatch remain future work. The existing ontology fixture validator does not certify chart correctness.

## Developmental evaluation

1. Open Heat, add Chart and select Outreach criteria as its reasoning source. Run and compare the three bar counts with the decision table.
2. Rename the chart, switch it to Table and back, then reload offline. Check that the source and label remain.
3. Open Old Naledi's Access zones. Confirm that counts refer to sample locations. Connect a Chart to Evidence register to compare evidence tiers instead.
4. Export evidence and reconcile the input row count with the sum of bins and the RDF receipt. Check that the source entity is the connected reasoning node.

Regression coverage includes legacy migration, empty/missing/unrecognized categories, all three grouping contracts, source immutability, RDF count reconciliation, shared upstream execution, browser source selection, view switching, evidence export and offline reload. Existing worked-example numerical checks remain in place. Automated runtime evidence is distinct from evidence that practitioners understand or find the interface useful.

Validation on October 6: TypeScript/build and all 59 unit tests passed; the full Chromium suite passed all 36 scenarios. A visual inspection then identified a chart-icon encoding issue and an existing reasoning-port label displaying “Points undefined.” Both were corrected, the application rebuilt, and all 59 unit tests plus five affected output browser scenarios passed again. A fresh Chart added through the palette displayed Heat's 5 review, 2 no-flag and 1 insufficient-data records. Ontology validation and the registry check passed (19 identities, 29 releases). No remote publication or Firefox/Safari validation was performed.
