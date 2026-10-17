# Open data for exercising widgets — candidates, and what is actually known about them

_Created 2026-10-17 · Updated 2026-10-17_

The practitioner, 2026-10-17: *"There are open data sets for epidemiology and geography available
online that we can download and use for exercising widgets, can you look for them?"*

This is a **search record, not a shopping list**. Nothing here has been downloaded, and the
project's own standard applies before anything is: a source is not usable until its licence is
read at the source, its provenance is recorded with a digest, and what it must not be read as is
written down. `examples/john-snow/NOTICE.txt` is the shape to copy.

**Two of the entries below were verified against the provider's own licence page in this
session. The rest were not**, and say so. A licence claim from a tutorial, a comparison article
or a search summary is not a licence.

## Verified here, 2026-10-17

### GADM — and a risk this project already carries

**Read from [gadm.org/license.html](https://gadm.org/license.html):** *"The data are freely
available for academic use and other non-commercial use"* and *"Redistribution or commercial use
is not allowed without prior permission."* Austria's data is CC BY-SA 2.0; the rest is not open
in the sense this project needs.

**No breach today.** `ontology/gadm.ttl` is a Fieldwork-owned *profile* — 37 lines of vocabulary,
zero geometries, and it says so itself: *"No GADM geometries are bundled."* Checked.

**The forward risk is real, though.** That profile exists so GADM boundaries *can* be described,
and this project ships example data in-repo. A worked example that bundled a GADM layer would be
redistribution, which the licence forbids. Anything built on that profile has to fetch at run
time and keep nothing, or use a source that may be redistributed.

### geoBoundaries — the redistributable alternative

**Read from [geoboundaries.org](https://www.geoboundaries.org/):** **CC BY 4.0**, commercial use
allowed. Attribution is specified and non-trivial: cite Runfola et al. (2020) *PLoS ONE* 15(4):
e0231866 in written work, and display the name **geoBoundaries** with a link to
www.geoboundaries.org prominently in a product. About 1 million boundaries across 200+ entities,
offered as individual countries, global composites and simplified versions.

For a project that ships its examples, this is the one that can actually be shipped. It would
exercise `study_area`, `clip_polygons`, `summarize_polygons` and `spatial_coverage`, and give
`rate` a denominator geography.

## Found, and NOT licence-verified — do not act on these without reading the source

| Source | What it would exercise | What is actually known |
| --- | --- | --- |
| **[Project Tycho](https://www.tycho.pitt.edu/)** | `table_input`, `case_series`, `rate`, and the ruleset example's table half | 597 datasets: 93 US conditions, dengue worldwide, COVID-19 worldwide. CSV, DOI and citation per dataset, free **after registration**. A 2014 conference abstract claims CC-BY for all levels; **unconfirmed against the current site** |
| **[WorldPop](https://www.worldpop.org/)** | `raster_input`, `clip_raster`, `sample_raster`, and denominators for `rate` | GeoTIFF at 100 m and 1 km, global. A tutorial describes "open licenses"; **no specific licence confirmed** |
| **WHO Global Health Observatory** | indicator tables, denominators | **Nothing returned by the search.** Its data policy was not established |
| **Natural Earth** | boundaries, coastlines, basemap context | Believed public domain; **not confirmed in this search** |
| **[HDX](https://data.humdata.org/)** | health facilities, boundaries, population | Licences are **per dataset**. A combined UNDP product carrying WorldPop, Meta and OCHA data is ODbL, which settles nothing about any component |

Already wired, for comparison: **healthsites.io** (`find_health_facilities`, key in `.secrets`)
and **OpenStreetMap via Overpass** (`street_network`, ODbL).

## Why Project Tycho is the most interesting one for this project right now

Not because of its size. Because of what its own documentation says about its gaps:

> Pre-compiled datasets only include time intervals and locations **with counts available**, so
> gaps must be added before building a complete time series.

That is **real structural missingness** — absences that exist because of how surveillance was
collected and compiled, not because this project removed something.
[Experiment 117](experiments/117-data-quality.md) currently exercises missingness against a
copy of Snow's Table 1 that *this project damaged on purpose*, and records that as a weakness:
the shapes-and-gaps tab draws a pattern in file order and cannot say what the pattern means.

A surveillance series whose gaps are a property of the world would close that gap honestly, and
would be the first dataset here that tests the data-quality work against something nobody here
authored — which 117 lists as a closing condition: *"A file the project did not author is
profiled, and what the profile missed is written down."*

**What it would cost.** Registration, which an offline-first application cannot do at run time,
so the data would have to be fetched once, its digest recorded, and a slice bundled under
whatever licence actually applies — and that licence is the unverified part.

## What this record does not establish

- **That any of these can be redistributed.** Only geoBoundaries was confirmed as open for that,
  and GADM was confirmed as the opposite.
- **That the unverified five are usable at all.** Four of them rest on secondary sources, and one
  returned nothing.
- **That any of them fits a port.** Nothing was downloaded, so no file has been opened, no column
  inspected, and no coordinate reference system confirmed.
- **Anything about fitness for a question.** A dataset that exercises a widget is not a dataset
  that answers anything, and an example built on one still needs its own "must not be read as".
