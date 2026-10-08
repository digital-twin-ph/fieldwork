# Experiment 47: a sea-level-rise widget pack over the IPCC AR6 projections

Date: October 8, 2026. Status: design specification for the first
[widget pack](43-widget-packs.md). No pack, widget, vocabulary or dependency is
implemented by this document.

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

## Widgets, preferring reuse

**`slr_projection_input`** supplies the extract as an ordinary CRS84 point
dataset with typed attributes, so it reuses the `points` port and every existing
output widget works unchanged. Its parameters name the scenario, workflow, year,
quantile set and dataset family. It introduces no new port type, which
[AGENTS.md](../../AGENTS.md) prefers over a synonymous widget.

**`slr_site_assignment`** assigns each facility to a projection site and records
the distance. A tide-gauge projection is not a value for an arbitrary point; the
assignment and its distance are the provenance that makes the number
interpretable, and the AR6 guide itself advises tide-gauge data only where
coverage is good.

**`slr_threshold_comparison`** compares a projected water level against a facility
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
