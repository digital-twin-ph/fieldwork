# 230 · Years carried and compared

_Created 2026-11-23 · Updated 2026-11-23_

**Status:** asked. Nothing built; this is the design and the questions it waits on. Written before the design is tried, so the choices below can be reviewed apart from
the change that makes them.

## The question

The practitioner, 2026-11-23, after the population example ran end to end again: *"As part of provenance alignment and
accuracy, do we track and compare the years for which rasters and other assets?"*; then *"Yes as experiment to years."*

## What exists (inventory, 2026-11-23)

| Source | Where its year is | Where it shows | Compared? |
| --- | --- | --- | --- |
| Raster input (WorldPop, GRID3, GHS-POP) | `temporalCoverage` in the asset's provenance, filled by each catalogue; a hand-given raster may state none | Notes' source entry, the receipt | No |
| GHS-POP 2025 and 2030 | the same, with a note: *"A projected epoch, not an estimate of an observed year"* | The note | No |
| Census tables | the catalogue's `reference_date`, at three precisions: Botswana `2022`, Rwanda `2022-08`, Brazil `2022-07-31`; DR Congo `1984-07-01` | Figure titles' `{census}`: "2022 census" | No |
| Study area from geoBoundaries | `yearRepresented` | The receipt and N3 (`dcterms:date`) | No |
| Satellite catalogue items | `datetime`, `end_datetime`, and the search's `from` and `until` | The step's Result | No |
| DHIS2 | the period of each row, a column | The table | No |
| Rate | `numeratorPeriod` and `denominatorVintage`, typed by the person | Result, receipt (`fw:vintagesAgree`) | **Yes**, as exact text |

Two findings from the inventory:

- **The year does not travel with the values.** Sample a raster's table carries the unit the raster declared (since
  0.154.0) but not its year. Append rows then stacks a 2025 model under a 2022 census, and nothing says they are three
  years apart. In the population example the years are in the labels the practitioner typed, "WorldPop 2025" and
  "Census 2022", and nothing checks a label against the provenance.
- **The gaps can be large.** DR Congo's census in Census tables is of 1984; a 2025 population raster set beside it is
  41 years later, and nothing would say so.
- **Rate compares text.** "2022" against "2022-08" is reported as two vintages; "2025" against "2025" agrees though one
  is a projection.

## Proposed

The year is carried the way the unit is (`automate-what-the-data-states`): read from what the source states, carried
forward on the values a step makes, and said where values of different years meet. A difference is said, never refused.

### What a year is

A **reference period**: a start and an end, as ISO 8601 states them. `2022-08` is August 2022; `2025` is the year;
`2015/2030` is a range. With it, its **kind**, where the source says: *enumerated* (a census), *estimated* (a model of an
observed year), *projected* (GHS-POP 2025 and 2030), or *not stated*. Two periods are compared by their years: the same
year agrees whatever the month; otherwise the gap is stated in years.

### Where it comes from, and where it goes

| Step | Reads the period from | Carries it to |
| --- | --- | --- |
| Raster input | `temporalCoverage`, the kind from the catalogue's note | Sample a raster's table and points |
| Tabular data from Census tables | the catalogue's `reference_date`; kind *enumerated* | the table |
| Study area from geoBoundaries | `yearRepresented` | the area, for the steps that read it |
| Append rows | each table's period | the stacked table, one period per source |
| Relate, Join to area | both sides' periods | the result, both kept |
| Rate | numerator's and denominator's periods, where the data states them | its two fields, filled, still editable |

### How a difference is said

In the step's Result, one sentence: *"Values from 2022 (the census, enumerated) and 2025 (three models, one projected)
are stacked: three years apart."* And a finding in the data quality tab, on the step. A source that states no period is
said to state none, in the same place, and is never guessed.

### Admission review

| | |
| --- | --- |
| **D1** | Not a widget: a property of values, as the unit is. No palette entry. |
| **D2** | Rate's two fields are the only existing comparison; they are kept, and filled where the data states the period. |
| **D3** | A period is not a date of observation for every row: a census table's period is the census's, not each district's. |
| **D4** | Read from the source; the person corrects it where the source is wrong, as the unit is corrected. |
| **D7** | No new ports. Carried on `DataTable` and on raster and area values. |
| **D10** | The population example: census 2022 beside WorldPop, GRID3 and GHS-POP 2025. |

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A period is not a year typed in a label | run-time check: a label naming a year that differs from the source's is said |
| A projection is not an estimate of an observed year | limitation: carried as the kind, said where it meets an observed year |
| A source that states no period has none, not this year | validation rule: never filled by guess, said as not stated |
| Different years are not an error | out-of-scope decision: said, never refused (`diagnose-never-refuse-data`) |

## Validation it commits to

- Unit: periods read from each catalogue's form; `2022-08` and `2022` agree on the year; `2022` and `2025` are three
  years apart; a projected period is said as projected; none stated is said.
- The population example, both countries: Append rows says the census is 2022 and the models 2025, GHS-POP projected;
  the labels "Census 2022" and "WorldPop 2025" agree with the provenance and nothing is said of them.
- Rate over a census of `2022-08` and cases of 2022: the two agree on the year, where today they are said to differ.

## The practitioner observation, written before the result

Whether a stated year gap in a Result line is read as information, or as an error to fix. If it reads as an error, the
sentence is in the wrong place or the wrong words.

## What this does not establish

That two sources of the same year are comparable: an enumerated count and a projection of the same year are different
things, and this says which is which without judging them. That a gap of a few years matters for a given question: that
is the person's judgement, and this only puts the years where it can be made.

## Open questions for the practitioner

- Year only, or month where the source states one?
- Should a boundary's year count beside the data's?
- Which steps first: Append rows and Rate, where the population example meets it, or every step at once?
