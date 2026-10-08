# Experiment 47: a sea-level-rise widget pack over the IPCC AR6 projections

Date: October 8, 2026. Status: the pack repository exists at
[digital-twin-ph/widget-pack-sea-level-rise](https://github.com/digital-twin-ph/widget-pack-sea-level-rise)
with its manifest, vocabulary, shapes, widget contracts, extraction script and
worked example. It is **declaration-only and not admitted**: no widget code exists
and the host lacks the tabular port it needs. The catalog entry in
`widgets/packs.json` records that, and `npm run validate:packs` pulls the pack at
its pinned commit and verifies all eight file digests.

## Why this use case

The pack mechanism needs a first subject that is real external science rather
than a rearrangement of what this prototype already does. Coastal sea-level rise
qualifies: the projections are authoritative, versioned, published with their
uncertainty, and genuinely useful to public health planning for coastal
facilities. It also exercises every part of the pack contract — an outside
vocabulary, units and baselines, scenario semantics, and a result that is easy to
over-read.

It is deliberately not a Botswana example. Gaborone is landlocked, so this pack
cannot be demonstrated on the existing worked examples, which is itself a useful
test of whether a pack can arrive with its own data and still compose with the
base widgets.

## What FACTS and AR6 actually publish

The [Framework for Assessing Changes To Sea-level](https://github.com/radical-collaboration/facts)
(FACTS, MIT, Kopp, Garner et al., [GMD 2023](https://doi.org/10.5194/gmd-16-7461-2023))
produced the IPCC AR6 global and relative sea-level projections. The
[access guide](https://github.com/Rutgers-ESSP/IPCC-AR6-Sea-Level-Projections)
publishes, verified on this date:

| Artifact | Form | Scale |
| --- | --- | --- |
| Summary relative sea-level projections | Zenodo, [10.5281/zenodo.5914709](https://doi.org/10.5281/zenodo.5914709) | The dataset most users need |
| Full Monte Carlo samples, tide gauges | partitioned zarr on Google Cloud | **38.42 GB** |
| Full Monte Carlo samples, gridded | partitioned zarr on Google Cloud | **1.65 TB** |
| All local relative sea-level samples | not yet permanently hosted | ~10 TB |

The store index lists **51 stores** per family for each of tide-gauge and gridded
data, across seven AR6 workflows — `wf_1e`, `wf_1f`, `wf_2e`, `wf_2f`, `wf_3e`,
`wf_3f`, `wf_4` — five SSP scenarios (ssp119, ssp126, ssp245, ssp370, ssp585)
and temperature-limit experiments (`tlim1.5win0.25` through `tlim5.0win0.25`).
There are **two families that differ only by vertical land motion**,
`full_sample_workflows` and `full_sample_workflows_novlm`, plus a components
family of 109 stores.

## What this prototype can honestly consume

Nothing in that list, directly. Zarr and NetCDF readers do not exist here,
[experiment 02](02-area-computation-and-resource-scope.md) records NetCDF as
design work, the encrypted-package limit is 20 MB and point inputs are capped at
2,000 records. Experiment 39 measured what happens when a browser reaches for
externally hosted science: WorldPop sends no CORS header at all and ignores the
range requests it advertises, and Copernicus gates its assets behind
authentication. The store index itself is CORS-readable from
`raw.githubusercontent.com`, which would let a widget *list* what exists, but
listing 51 stores is not reading 38 GB of zarr.

So the pack consumes a **prepared extract**: for one or a few projection sites,
the quantiles for chosen years, under a chosen scenario and workflow. That is
tens of rows, which the existing Input data, Map, Table and Chart widgets already
handle. Preparation happens outside the browser — in the
[Validation Lab](41-validation-lab.md), where `xarray` and `zarr` are available —
and the extract travels with the project, exactly as a prepared GeoTIFF window
does. This mirrors the only pattern that has been shown to work.

## The assumptions this design was hiding

Written as reasoning, before anything is built. The section above begins at "the
pack consumes a prepared extract", which quietly assumes three things and
misnames a fourth. Each assumption is a stage of a pipeline this prototype has
only partly designed.

**Stage 1, discovery: assumed already done.** Choosing an AR6 projection is not
choosing a file. A practitioner must decide between tide-gauge and gridded data,
among seven workflows whose confidence characterisations differ, among five SSPs
and the temperature-limit experiments, and between the two families that differ
by vertical land motion. That is 51 stores per family before any of the component
files. Experiment 47 as first written assumed the practitioner arrives already
knowing which one they want, which is the least safe assumption in the document:
the choice *is* the analysis, and recording it is most of the provenance.

Only one discovery primitive has been designed here,
[`stac_discovery`](39-stac-discovery-and-remote-acquisition.md), and it is
specific to STAC. The AR6 store index is a plain JSON file served with permissive
CORS from `raw.githubusercontent.com`, so a discovery widget over it is feasible
and would emit the same kind of artifact experiment 39 settled on: a
`remote-asset-request` naming a resolved location, not data. The alternative is to
leave discovery outside the application as a documented procedure. Either is
defensible; what is not defensible is the current silence, where a prepared file
appears with no record of why that file.

**Stage 2, acquisition: assumed to exist, and it does not.** Nothing here can read
zarr, and the smallest relevant store is 38.42 GB. So whatever enters the
application is not acquired by it. Experiment 39 drew exactly this line —
discovery yields a request, acquisition yields bytes with a digest — and a pack
must not blur it. Calling a widget an acquisition widget when it reads a file
somebody else produced would repeat the naming error experiment 39 corrected when
`stac_input` became `stac_discovery`.

So the widget below is an **import of a prepared extract**, and its provenance
obligation is heavier than an acquisition's, not lighter: it must carry the
dataset DOI and version, the store path, the selection that produced it, the code
and version that performed the extraction, and a digest of the result. An
acquisition can be repeated by replaying a request; an import can only be trusted
if it says where it came from.

**Stage 3, the model: this pack does not have one.** "Sea-level rise model widget"
is the natural phrase and it is the wrong one. FACTS did the modelling; AR6
published the result. A widget here *applies* a published projection, and must
never imply that this prototype computes sea-level change. The distinction is the
same one the audit procedure already draws between a presentation and a
computation, one level up: a **projection consumer** is not a **projection
producer**. If a pack widget ever did compute a projection, it would need its own
scientific validation, which is far outside what a curated widget pack can carry.

**Stage 4, several outputs: supported in one sense, blocked in another.** A single
widget output can feed as many downstream branches as you like — all visual output
branches execute together and shared upstream nodes execute once — so a projection
feeding a Map, a Table and a Chart is already how this prototype works.

What is **not** supported is one widget emitting several *distinct result kinds*.
`NodeDefinition` declares `output: PortType | null`, a single value, and all 41
existing widgets use it that way. A consumer that wanted to emit per-site levels,
per-facility assignments and an exceedance classification as three separately
connectable results cannot, today. The options are to split it into three widgets
whose outputs are separately typed, to emit one richer result that downstream
widgets select from — which is how the shared Map and Table already take an input
mode — or to change `NodeDefinition`, which is a change to the base contract and
not a pack's business. The pack design below chooses the split, because three
named widgets state their semantics where one widget with three meanings would
hide them.

**What this means for the pipeline as a whole.** The honest shape is four stages,
and a pack must say which it supplies and which it assumes:

    discovery → request → extraction (outside) → prepared extract
      → import (with provenance) → application (consumer) → outputs

This pack supplies the last three. Discovery is a decision this design should
either widget-ise over the store index or document as an external procedure, and
extraction belongs in the Validation Lab. Writing it as a single arrow from
"data" to "widget" is what let the first draft assume its hardest step away.

## Do the import widgets this needs already exist? No, and one of them is base work

Discovery is now out of scope by decision: the practitioner has already obtained
the resource. That makes the next question concrete — can this prototype read
what they obtained?

**What exists.** Every file-reading widget produces one of three things:

| Widget | Reads | Produces |
| --- | --- | --- |
| Input data | CSV, GeoJSON, GeoPackage, synthetic, map pins | points |
| Reproject input | CSV, GeoJSON in WGS84 UTM metres | points |
| Raster input | one-band north-up WGS84 GeoTIFF | raster |
| Street network | OSMnx GraphML, Overpass JSON, graph JSON | network |
| Evidence references | PDF | a citation, not data |

Points, a raster, or a graph. Nothing else.

**What the resource is.** The AR6 summary projections are **NetCDF**: the project's
own FAQ notes that "the gridded sites are on a grid but are not stored in a
gridded fashion in the netcdf files". There is no NetCDF reader here —
[experiment 02](02-area-computation-and-resource-scope.md) records it as design
work — and no zarr reader.

**Two gaps, and the second is the real one.** The missing NetCDF reader is the
obvious gap, but it is avoidable. The structural gap is that **an AR6 projection
is not points, a raster, or a graph.** It is a table keyed by site, scenario,
workflow, year and quantile: many rows per site. Input data's CSV importer makes
one point per row, so feeding it a projection table would mint duplicate points
and lose the key. There is no tabular import in this prototype at all.

**So only one new importer is needed, and it is not a NetCDF reader.** Extraction
belongs where `xarray` already exists, in the Validation Lab, which can read the
NetCDF and write a small long-format CSV. The application then needs a **tabular
import** that reads a declared key and value column set and preserves the key
rather than flattening it to geometry. Putting a NetCDF or HDF5 reader in a
3.8 MB offline bundle to avoid a CSV would be the wrong trade, and the WorldPop
measurements in [experiment 39](39-stac-discovery-and-remote-acquisition.md) are
the precedent: prepare outside, import bounded, record provenance.

**That importer is base work, not pack work.** A table is a new result kind, and
`PortType` is a closed TypeScript union with `NodeDefinition` declaring a single
`output`; all 41 existing widgets use it that way. A pack cannot add a port type
without changing the base contract, which [experiment 43](43-widget-packs.md)
puts out of a pack's scope. So the ordering is forced: **a tabular import and its
port type must land in the application before this pack can be declaration-only.**
Discovering that is what a use case is for — the pack looked buildable until its
data turned out to have a shape the host cannot carry.

## The datasets the worked example must bundle

A worked example here bundles its data, as Old Naledi bundles a boundary and a
facility registry with `provenance.json` and SHA-256 digests. The licence allows
it: the AR6 projections are **CC BY 4.0**, with three citations the licence file
makes obligatory — the WG1 Chapter 9 chapter, the FACTS model-description paper,
and the dataset itself at its version, `20210809`, with the access date. A bundled
extract must therefore carry all three plus the Zenodo DOI, not a general
"IPCC AR6" attribution.

What would be bundled, and how small it is:

| Artifact | Content | Size |
| --- | --- | --- |
| Site subset | The Philippine entries from the published site list, which has 66,190 rows at 3.0 MB in full | 228 rows |
| Projection extract | One site, both dataset families, selected scenarios, years and quantiles | tens of rows |
| `provenance.json` | Dataset DOI and version, store paths, the selection, extraction code and version, digests, the three required citations | under a kilobyte |

The site list already supplies what site assignment needs: `MANILA` is entry 145
at 14.58 N, 120.97 E, and 228 of the published sites fall within a Philippine
bounding box. Bundling the Philippine subset rather than the 3 MB global list is
the same bounded-extract discipline applied to the index as to the data.

One consequence of bundling: a regenerated extract changes a digest, which must
move the pack version and the integration report with it. That is already
required by experiment 43, and this is the case that makes it concrete.

## Widgets, preferring reuse

**`slr_extract_import`** reads a prepared extract. It cannot reuse the `points`
port, for the reason above: a projection has many rows per site, so flattening it
to points would lose the key. It needs the tabular port that the application does
not yet have, which is why this widget is blocked on base work. Its parameters name the scenario, workflow, year,
quantile set and dataset family. It introduces no new port type, which
[AGENTS.md](../../AGENTS.md) prefers over a synonymous widget.

**`slr_site_assignment`** assigns each facility to a projection site and records
the distance. A tide-gauge projection is not a value for an arbitrary point; the
assignment and its distance are the provenance that makes the number
interpretable, and the AR6 guide itself advises tide-gauge data only where
coverage is good.

**`slr_threshold_comparison`**, a consumer and not a model, compares a projected water level against a facility
elevation that the practitioner supplies, and classifies the result. It is the
widget most likely to be misread, so its contract is mostly refusals, below.

Outputs reuse Map, Table and Chart. Nothing in the pack needs a new presentation.

## The distinctions this pack must keep, because getting them wrong changes the answer

| Must not be conflated | Why |
| --- | --- |
| Projection **with** and **without** vertical land motion | Two separate dataset families exist for this reason. Where land is subsiding, the background term can dominate relative sea-level change, so a number is meaningless without saying which family produced it |
| **Workflow** identity | AR6 reports several workflows whose confidence characterisations differ (WG1 9.6.3). A value from one workflow is not interchangeable with another, and the pack must carry the workflow id rather than a single "AR6 projection" |
| **Quantile** and **p-box** | A quantile from a distribution and a bound from a p-box are different objects. Neither is a worst case |
| **Scenario** and **prediction** | SSP1-1.9 to SSP5-8.5 are conditional pathways, not forecasts, and carry no probability of occurrence |
| **Baseline period** | AR6 values are changes relative to a stated baseline, not absolute water levels. The baseline must be read from the dataset documentation and recorded, never assumed |
| **Water level** and **inundation** | A projected level is not a flood extent. Inundation needs elevation, hydrodynamics, defences and drainage, none of which exist here |
| Projection **site** and facility **location** | The distance between them is part of the result |

## Worked example, with its refusal

A coastal health-facility exposure review: facilities along one Philippine
coastal stretch, a prepared extract for the nearest tide-gauge site, one
scenario, one workflow, three years and the median with the 17th and 83rd
percentiles. Study area, Input data, Map, Table and Chart are base widgets; only
the projection input, site assignment and threshold comparison come from the
pack.

The example must present the same facilities under **both dataset families**,
with and without vertical land motion, side by side. Somewhere with appreciable
land motion, those answers differ enough that a reader who did not know which
they were looking at would reach a different conclusion. That contrast is the
teaching content, and it is why the pack records the family in evidence.

Per experiment 43, the example must also include a connection the pack
**refuses**. The candidate is clear: connecting a projection to a raster map
output and asking for an inundation surface. Fieldwork can clip a raster and can
display one, so the ports would appear compatible, and the result would look like
a flood map. The pack must refuse that connection and say why — a level is not an
extent, and this prototype has no elevation model, no reprojection for one
([experiment 40](40-reprojection-primitives.md)) and no hydrodynamics.

## Competency questions

Added to [experiment 44](44-ontology-competency-questions.md) if this pack is
built. Answerable, and the pack is pointless if they are not:

1. Which scenario, workflow, year, quantile and dataset family produced this number?
2. Does this projection include vertical land motion?
3. Which projection site is this facility assigned to, and how far away is it?
4. What baseline period is this change measured against, and in what unit?
5. Which published dataset and version does this extract come from, and what is its digest?
6. Who prepared the extract, when, and with what code?

Refused, and a term that appeared to answer one would be a defect:

7. Will this facility flood in 2100? — a level is not an extent.
8. What is the probability this facility floods? — not derivable from these inputs.
9. Is this the worst case? — a p-box bound is not a worst case, and low-confidence processes are characterised separately.
10. Which scenario will happen? — scenarios carry no likelihood.

## Governance, licensing and CI

Curated under the project's own control, per experiment 43, with semantic,
security and regression review. Specific to this pack:

- FACTS is MIT. The projections guide repository carries no detected licence, and
  each Zenodo dataset has its own terms. The pack must record the dataset DOI,
  version and digest, and the licence under which the extract is redistributed,
  or ship a generator instead of data.
- The extract is **data, not code**, so this is a declaration-only pack: no new
  execution surface.
- Integration CI must assert that the pack fetches nothing at run time. The
  temptation to read the zarr store index live is real and should fail the build.
- A regenerated extract changes a digest, so the pack version and the integration
  report must move with it.

## Limits

Nothing here is implemented. No extract has been produced, no file in the Zenodo
datasets has been read, and the summary dataset's internal format has not been
inspected — only its published description. Whether a prepared extract preserves
enough of the AR6 uncertainty to be worth presenting is an open question, and the
answer may be that only the median and a stated range should ever be shown. The
pack would let a practitioner put an authoritative number beside a facility; it
would not make that number a statement about flooding, and the design above
exists mostly to stop it being read as one.
