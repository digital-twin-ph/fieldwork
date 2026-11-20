# Sea level and land motion at the coast: one framework

_Created 2026-11-20 · Updated 2026-11-20_

**Status: proposed.** Asked by the practitioner on 2026-11-20: *"We need a coherent framework to record both sea level
and subsidence for coastal countries"*; then, accepting it, *"Yes to rename repo. And this should be represented in our
FW ontology"*. The repository `tide-gauges` was renamed
[`coastal-sea-level`](https://github.com/digital-twin-ph/coastal-sea-level) the same day.

It extends what exists: the tide-gauge index (Philippines 2026-11-19; coastal Africa 2026-11-20), experiment
[47](../experiments/47-sea-level-pack.md)'s AR6 dataset families, and the glossary's **Tide gauge**, **Baseline
period** and **Dataset family**. The sources are in
[land-subsidence-sources-2026-11-20.md](land-subsidence-sources-2026-11-20.md).

## One relation holds it together

At a tide gauge, over the same years:

> **relative sea level change = geocentric sea level change − vertical land motion** (land motion positive upward)

- The **gauge** measures relative sea level: the sea against the land it stands on.
- **Satellite altimetry** measures geocentric sea level: the sea against the Earth's centre.
- **GNSS, InSAR and models** give the land's own movement.

Every number recorded is one of these three quantities, or a projection of them, so any two can be set beside the
third and checked.

## What is recorded, anchored at the gauge

The gauge, by its PSMSL ID, is the anchor: it is where all three meet and where AR6 projects. A value about a place
with no gauge (a district of Lagos with an InSAR rate) is recorded at a **site** with its coordinates and the nearest
gauge named, never moved onto the gauge.

For each country in `coastal-sea-level`:

| File | One row per | Holds |
| --- | --- | --- |
| `stations.csv` | gauge | PSMSL ID, name, list, span, completeness, flag, UHSLC numbers. The GNSS columns move to `land_motion.csv` |
| `sea_level.csv` | estimate of a rate | quantity (relative or geocentric), rate and uncertainty, first and last year, method (PSMSL trend; altimetry near the gauge), source, licence |
| `land_motion.csv` | estimate of a rate | site, rate (mm/yr, up positive), uncertainty, years, measured or modelled, method (GNSS, InSAR, altimetry minus gauge, glacial isostatic model, AR6 background term), distance from the gauge, source, licence |
| `projections.csv` | gauge, scenario, year, quantile | AR6 relative sea level with and without vertical land motion (experiment 47's two families), against its baseline period |
| `provenance.json`, `README.md` | country | one entry per source, as now |

## Rules proposed

1. **Never one number per gauge.** Several estimates of land motion sit side by side, each with its method, years and
   distance. Choosing between them is the practitioner's, in Fieldwork, not the repository's.
2. **Measured and modelled are never mixed.** AR6's land motion term is modelled; a GNSS rate 9.6 km away is measured,
   and not at the gauge.
3. **Years travel with every rate.** The relation is checked only where windows overlap; Fieldwork computes the
   difference and shows it. The repository stores no combined figure.
4. **One sign convention:** land motion positive upward, so subsidence is negative, stated in every file's header and
   README.
5. **As published, licence first, reviewed every six months**, as in `census-tables` and `boundaries`.

## In the ontology

The terms are taken from standards where a standard names them, after a dated search recorded in
`ontology/vocabulary-basis.json`, and minted only where none does. The search began 2026-11-20 (W3C SOSA/SSN and Time,
CF standard names, the NERC vocabulary server, QUDT, PROV-O); its result is recorded there, term by term.

## What it does not settle

- Which land motion estimate is right at a gauge. All are recorded, so a disagreement shows.
- Coverage. Most African gauges stop before the satellite era, so the relation cannot be checked there, and that is a
  finding.
- Altimetry near each gauge: a source not yet researched.
