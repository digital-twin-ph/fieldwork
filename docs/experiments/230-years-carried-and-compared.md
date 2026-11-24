# 230 · Years carried and compared

_Created 2026-11-23 · Updated 2026-11-24_

**Status:** tried, in its first step. The three open questions below were answered on 2026-11-24 and are recorded
there; `src/reference-period.ts` and Rate's comparison are built and unit tested. Nothing CARRIES a period yet: every
period still reaches Rate by being typed, so the design's central claim -- that the year travels the way the unit
travels -- is not yet exercised.

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

## The open questions, answered 2026-11-24

| Question | Answer | Why |
| --- | --- | --- |
| Year only, or month where the source states one? | **Carry what is stated, compare on the year.** | Census tables holds four precisions and reducing them on read would discard what the statistics office published; comparing at the finest shared precision would report Rwanda's `2022-08` against Botswana's `2022` as a difference, which is the defect, not a finding |
| Should a boundary's year count beside the data's? | **Carried and said, kept separate.** | A boundary's year is about where the units are, not how many people they hold. Folding the two together would report "the counts are three years apart" and "the districts may have been redrawn" as one sentence, when only the second is about the boundary |
| Which steps first? | **Append rows and Rate**, where the population example meets it | Rate had a live defect attached, so the smallest change proved the design against something already wrong |

## First step, built 2026-11-24 (Rate 0.6.0)

`src/reference-period.ts` holds the period and the comparison, apart from any widget: `yearsOf` reads the four
precisions Census tables states and the ISO range form, `yearGap` counts whole years between the nearest years two
periods cover, `periodWords` says a period with its kind, and `periodDifference` says what to say where two meet --
including where they are of one year and different kinds, which is two claims about the same calendar year.

Rate now compares its two fields on the year rather than as text, and says the size of a disagreement:
*"vintages 3 years apart"* instead of *"different vintages"*, with `fw:vintageGapYears` in the receipt.

**A period no year can be read from keeps the text comparison it had.** Somebody who typed "the 1854 outbreak" in
both fields meant them to agree, and they agreed before this change; failing to read a year out of either is not a
reason to start contradicting them. The existing tests of the Snow workflow's prose vintages pass untouched, which is
the evidence that this is not a regression rather than an assurance that it is not.

### What is built, and what the design still claims

| Part of the design | State |
| --- | --- |
| A reference period: start, end, and its kind | **Built**, as `ReferencePeriod` |
| Compared by their years; the gap stated in years | **Built** |
| Rate: the two periods compared | **Built**, on the year |
| Rate: the two periods *filled* from what the data states | **Not built.** Still typed |
| Raster input → Sample a raster's table | **Not built** |
| Census tables → the table | **Not built.** The catalogue holds `referenceDate` for all eight countries and nothing reads it as a period |
| Append rows: one period per source, the difference said | **Not built** |
| Relate, Join to area: both sides' periods kept | **Not built** |
| A finding in the data quality tab | **Not built.** No `TableFinding` kind for it yet |

So the comparison exists and the carrying does not, which is the half that was easy. The population example still
says its years only in the labels the practitioner typed, and experiment 224's step 4 -- Rate's vintage pre-filled
from an accepted census date -- is still open, now with somewhere for the date to go.

## What the first step does not establish

That a period survives being carried: nothing carries one yet. That the sentence reads as information rather than as
an error to fix -- Rate's new wording has not been in front of anyone. And the observation written before the result
stands unobserved: whether a trainee offered a 1984 census beside a 2025 raster reads the gap as the finding it is.

