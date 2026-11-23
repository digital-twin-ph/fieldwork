# Bats: references

_Created 2026-11-23 · Updated 2026-11-23_

**Status: reference list.** Gathered 2026-11-23 for the bats-and-mines workflow, at the practitioner's request:
*"Just list the references under docs/research/bats.md"*, and *"Agree with data and movement references only"*.
Each entry says what it reports and whether an open copy was found. Nothing here is a conclusion; it is where to read.

## The occurrence data

- **African Bat Database, V2, 26 July 2026.** CC BY 4.0. 18,409 records, 19 columns, Windows-1252, `NA` for missing
  values, first column unnamed (R row numbers). Open.

  The points are **occurrence records, not roosts**: where a bat was collected or recorded. Measured 2026-11-23 —
  `Roost` is filled on 90 records of 18,409, all with the value "Yes", and **all 90 are Algeria**; DR Congo has none.
  The evidence behind the records is museum accessions (`Mus_No` on 12,034: RMCA, USNM, FMNH, BMNH), a `Reference` on
  every record, `Holotype` on 232 and `Genetics`/`Gene_seq` on 269. DR Congo holds 1,791 records. `Year` is filled on
  11,866 and `Date` on 7,518, so most records cannot be placed in a season.

  Counts in it reflect collecting effort, not abundance.

- **Monadjem et al. (2020)** — the largest single source behind the database, cited on 4,921 records.
- **Van Cakenberghe et al. (2017)** — cited on 1,807 records.
- **GBIF** — the source of 1,519 records. <https://www.gbif.org/>

## Movement and foraging

Read these with one distinction in mind: **cumulative distance flown in a night** and **distance from the roost** are
different quantities, and only the second is a radius. Several of the headline figures are path length.

- **Foraging movements are density-independent among straw-coloured fruit bats.** *Royal Society Open Science.*
  Mean distance flown per night across four colonies (9–99 km) and the number of nightly foraging sites (2–3),
  largely independent of colony size. Open:
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7277244/> · <https://doi.org/10.1098/rsos.200274>

- **Fruit bats in flight: a look into the movements of the ecologically important Eidolon helvum in Tanzania.**
  High-resolution GPS tags, bats tracked one to six nights: mean cumulative nightly flight distance 26.14 km
  (minimum 0.33, maximum 97.57). Path length, not displacement. Open:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC7402849/>

- **Pronounced Seasonal Changes in the Movement Ecology of a Highly Gregarious Central-Place Forager, the African
  Straw-Coloured Fruit Bat (Eidolon helvum).** *PLOS ONE.* Distance **from the colony** to foraging sites, by season,
  in Ghana: 3.5–36.7 km in the wet season at a population low of about 4,000, rising to 24.1–87.9 km in the dry
  season. These are the displacement figures. Open:
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4605647/>
  · printable: <https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0138985&type=printable>

- **First application of satellite telemetry to track African straw-coloured fruit bat migration.** Seasonally
  resident bats moving about 10–20 km per day against migrants averaging about 90 km per day.

- **Food availability and annual migration of the straw-colored fruit bat (Eidolon helvum).**

## What this means for a buffer radius in Fieldwork

Measured in this repository on 2026-11-23, against the figures above:

| | |
| --- | --- |
| A 50 km radius spans | 0.90° |
| The prototype holds a study area to | 1°, which a radius reaches at about 55.6 km |
| `validateBuffer` capped the radius at | 50,000 m |
| The dialog offered, until 2026-11-23 | 5,000 m |

So a dry-season displacement of up to about 88 km exceeds every ceiling the step has. It cannot be drawn as a study
area in this prototype at all; it needs the buffers kept as a polygon layer, where the one-degree limit does not
apply because a layer windows no raster. The 5,000 m dialog limit was lifted to 50,000 m on 2026-11-23, which is the
rule's own figure; the remaining ceilings are measured findings rather than chosen numbers, and are recorded here so
the next person does not have to rediscover them.

A radius around an occurrence record is not a foraging radius: a capture point may be far from where the bat roosts.
Whatever figure is used, the source belongs in Methods.
