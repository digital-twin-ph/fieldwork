# 162 · Polygons are records: Nigeria from an empty canvas

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — four questions run from an empty canvas. The example has no remote yet, and the
Nigerian figures are model estimates that this work did not evaluate.

## The task

The practitioner, 2026-11-02: *"let's finish the Nigeria example."* And, part way through: *"apply_ruleset
should apply to polygon records as well like geopandas."*

Nigeria is a third shape after South London and Oswego: 774 parts, modelled estimates, 25 years, no
comparison between groups.

## What the source is

WorldPop, *Modelled vaccination coverage and zero-dose estimates for Nigeria, 2000-2024*, version 1.0,
DOI 10.5258/SOTON/WP00880, CC BY 4.0. Read from the files, replacing the specification's guesses:

| | |
| --- | --- |
| Shape | 19,350 rows, 774 LGAs by 25 years, geometry on every row |
| Keys | The two archives agree on every (ID, Year) |
| Names | 769 names for 774 LGAs: Surulere, Ifelodun, Irepodun, Bassa and Obi each name two |
| Coverage | 0 to 1, with mean, sd, low, median and up; low <= mean <= up in every row |
| Zero-dose | `zd_est` only at LGA level, with no uncertainty and no population |
| Totals | LGA zero-dose sums are within 0.11% of the national figure in 2018, 2021 and 2024 |
| A trap | In the LGA file the column called `State` holds the LGA name |

## What broke, in order

| Found | Cause | Change |
| --- | --- | --- |
| Boundaries hang on "Drawing" | A study area is one extent, about 26,000 vertices; these are about 218,000 | The join takes a polygon layer |
| The layer is refused | `MAX_LAYER_VERTICES` of 200,000, whose stated basis was what the application assumes | 1,000,000 |
| Three years will not load | `MAX_TABLE_ROWS` of 2,000 counts melted rows; 774 by 3 is 2,322 | 20,000 |
| "Connect a table first", table connected | Column lookup stopped at *Select rows* and *Derive a value* | They pass through |
| No rule over two values | A join dropped what a polygon held | It keeps it |
| Rules could not read polygons | The port was points or a table | *Records arrive as* |
| The editor offered no columns | Columns were read once, before anything was connected | Read when it opens |
| Proportion refused as a unit | The unit list was time and distance | Added proportion, percent, counts |

Neither cap was in `widgets/caps.json`, and neither is now. The new values are not measured ceilings: they
are what Nigeria needed with margin. The read took 326 ms and each run under 600 ms on this machine.

## The result

| Workflow | Nodes | Result |
| --- | --- | --- |
| Where is DTP1 coverage lowest? | 4 | 774 of 774 joined on ID |
| Where are the most zero-dose children? | 4 | 774 of 774 |
| What changed from 2018 to 2024? | 6 | 2,322 rows in, one value per LGA out |
| Which LGAs have low coverage and a high burden? | 7 | 127 LGAs, equal to a count from the file |

The rule is the specification's illustration, DTP1 below 0.7 and more than 5,000 zero-dose children. Its
thresholds are arbitrary and are not programme policy.

## What this does not establish

- That any LGA should be prioritised. The specification says so, and this repeats it.
- The uncertainty. The estimates carry intervals and these maps do not show them; a mean below 0.7 may
  have an interval across it. One value per row is still the table's shape.
- The persistence question, years below a threshold, which is not built.
- Facilities, access and measles, all out of this first release.
- That the model's covariates are independent of access. WorldPop says geospatial covariates were used.
  Which ones was not read, so a link with remoteness could reflect the model's inputs.
- The change map reads well. It uses quantile classes of a sequential scale over negative and positive
  changes, so its midpoint is not zero.
- Whether a reader is confused by the priority map, which shows a value key beside the class key.
- The "773 units" the study area dialog reported from 774 selected. Not explained; that path was left.
- Performance on a slower machine.

## Validation

`tests/nigeria-from-scratch.browser.mjs` builds all four from an empty canvas. See the commit for results.
