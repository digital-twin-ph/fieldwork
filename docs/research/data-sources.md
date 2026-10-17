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

## Case data: line lists, outbreak investigations, surveillance

The practitioner, on the first version of this record: *"What I meant by data sets are open data
sets from epidemiology cases, outbreak investigations, surveillance, etc."* The first search had
aimed at geography — boundaries, population rasters — which is infrastructure for the widgets
rather than the thing they classify. Redone.

### The R `outbreaks` package — twenty outbreaks, and a licence problem

**Read from [CRAN](https://cran.r-project.org/package=outbreaks) and its reference manual:**
version 1.9.0, *"Empirical or simulated disease outbreak data"*, **License: GPL (≥ 2)**. Twenty
datasets:

`covid19_england_nhscalls_2020`, `dengue_fais_2011`, `dengue_yap_2011`, `ebola_kikwit_1995`,
`ebola_sierraleone_2014`, `ebola_sim`, `fluH7N9_china_2013`, `influenza_england_1978_school`,
`measles_hagelloch_1861`, `mers_korea_2015`, `nipah_malaysia`,
`norovirus_derbyshire_2001_school`, `rabies_car_2003`, `sarscov2_who_2019`, `sars_canada_2003`,
`smallpox_abakaliki_1967`, `s_enteritidis_pt59`, `varicella_sim_berlin`, `zika_girardot_2015`,
`zika_sanandres_2015`, `zika_yap_2007`.

**The licence is the obstacle, and it is this project's.** Fieldwork is **Apache-2.0**. GPL code
may include Apache-2.0 work; the reverse does not hold, so copying the package's data files into
this repository would make the result GPL. The underlying records are a different matter — the
Hagelloch data is from an 1863 thesis and the facts are not the package's to license — but
whether a table of historical facts is copyrightable at all is a legal judgement this record
will not make. **The route is the original source, not the R package.**

### `measles_hagelloch_1861` — the best fit found, by some distance

**Read from [the package documentation](https://www.rdocumentation.org/packages/outbreaks/versions/1.9.0/topics/measles_hagelloch_1861):**
188 cases, individual-level, from Pfeilsticker (1863), re-analysed by Oesterle (1992).

| Column | | Exercises |
| --- | --- | --- |
| `x_loc`, `y_loc` | house coordinates, **in metres** | every spatial widget, without a reprojection step — this project works in metres and takes a UTM zone for exactly this reason |
| `date_of_prodrome`, `date_of_rash` | two different onsets | `case_series`, which already asks which **kind** of date it is being given |
| `date_of_death` | **`NA` means the patient recovered** | see below — this is the interesting one |
| `age`, `gender`, `class`, `complications` | attributes | `apply_ruleset`, with real categories instead of invented ones |
| `family_ID` | household grouping | `summarize_polygons`, `hex_aggregate`, and a denominator for `rate` |
| `infector` | putative source case | nothing we have; a transmission chain is not a widget here |

It is historical, it is small enough to read, and **it has a place and a date on the same
record**. That is exactly the limit [john-snow-data-sets.md](john-snow-data-sets.md) established
for this project's existing case study on 2026-10-08, in its own terms: *"place is excellent,
time exists separately, person exists only as houses, and the three cannot be joined at the level
of a case."* The ruleset example built on 2026-10-16 is shaped entirely by that limit — two
workflows that share nothing, because Table 1 carries no place and a location carries no date.

Hagelloch joins all three. It is the dataset that would let this project build the workflow its
own research note says the Snow data cannot support.

### What Hagelloch would break, and why that is the point

`date_of_death` is `NA` for everyone who recovered. **That `NA` is not missing data. It is a
recorded outcome.**

This project's quality model, built on 2026-10-16, would read it as `fw:ValueAbsent` — *"no value
was recorded"* — and a rule reading the column would be told the value is not there. Both are
wrong here. The value is *known*; the encoding is that absence means survival.

That is a third case the `absent` / `unreadable` pair cannot express, and no amount of profiling
finds it: a column of `NA`s looks identical whether the nulls mean "nobody wrote it down" or
"this did not happen". Only the practitioner knows, and the application currently has no way for
them to say so. Recorded in [117](experiments/117-data-quality.md).

### Kaggle and the other hosts — a discovery surface, not a source

The practitioner, 2026-10-17: *"We can also look at Kaggle, and similar websites."* Worth looking
at, and worth one caution that applies to all of them, this project more than most.

**A host is not a source.** On Kaggle, Zenodo, figshare and Hugging Face, the licence field is
chosen by *whoever uploaded the file*, which is frequently not whoever produced the data. A CC0
label on a re-upload says what an uploader believed, or wanted; it does not change the
originator's terms. Google's own COVID-19 Open Data states the pattern plainly — the aggregate is
CC-BY-4.0 while *"each individual data source has its own license"*.

**And the cost is documented, not hypothetical.** A BMC Medicine study examined two widely used
Kaggle health datasets — stroke and diabetes prediction — and found **neither had verifiable
provenance**: no record of when, where, why or how the data were assembled. Those two datasets
were linked to **125 clinical prediction studies**, which reached **86 review articles**, of which
**three were used in clinical practice**. A separate study of Google Dataset Search found only
52% of indexed datasets related to research at all and **15% reusable**.

For a project whose receipts record a file's digest, its licence IRI and what it must not be read
as, that is disqualifying as a *citable* source and perfectly fine as a *search index*: find a
dataset on Kaggle, then go to whoever made it, read their terms, and cite them. If the trail ends
at an upload with no origin, the dataset is not usable here — not because the data is necessarily
wrong, but because this application would have to print a provenance statement it cannot support.

## Geography and infrastructure, verified 2026-10-17

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
