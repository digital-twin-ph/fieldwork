# 61 · Person, place and time belong to the input data

_Created 2026-10-09 · Updated 2026-10-09_

**Status:** admission review. Written before code, as experiments 48 and 58 were. Proposes a
declaration on existing inputs and **no new port type**.

[Experiment 60](60-from-gis-studio-to-public-health-studio.md) concluded that person and time have no
representation in the application and implied new port types would be needed. That overstated the
work. Input data already carries all three dimensions; what is missing is the ability to **say which
column means what**. The project's own John Snow data demonstrates it.

## What the data says, measured

`examples/john-snow/cholera_deaths.csv` is `FID,DEATHS,LON,LAT` — **250 rows carrying 489 deaths**.

| Dimension | Present? | How |
| --- | --- | --- |
| **Place** | yes | `LON`, `LAT`, read as a point geometry |
| **Person** | yes, but **aggregated** | `DEATHS` is a count of unidentified individual cases at one address |
| **Time** | no | this dataset has no dates; Snow's published daily series is not part of it |

So a row is not a case. It is an address with a case count, and the person dimension survives only as
an ordinary numeric attribute.

## The current state is correct by configuration, which is the problem

The shipped Snow examples handle this properly: `summarize_polygons` is configured with
`valueField: "DEATHS"`, so a catchment summary totals **489** rather than counting 250 records. That
is the right answer, reached by the workflow author remembering.

Nothing else in the application knows. Widgets that count records rather than summing a declared field
— H3 aggregation's `minOccupancy`, the coverage check's record counts, chart counts — would answer
**250**, and would be right to, because nothing told them a row stands for three people. Every such
widget is one configuration slip away from under-reporting by half, and the receipt would not say
which number was produced or why.

This is the same shape as every earlier finding in this project: the value is uninterpretable without
its key ([experiment 48](48-tabular-input.md)), the comparison without its datum
([experiment 58](58-sea-level-widgets.md)), the rate without its vintage
([experiment 51](51-dataset-profiles.md)). A count is uninterpretable without knowing what one row
stands for.

## The proposal: declare dimensions on the input, not in each consumer

Input data gains an optional **dimension declaration**:

| Declaration | Values | Meaning |
| --- | --- | --- |
| `rowMeaning` | `one-case` · `count-of-cases` · `not-cases` | What one row stands for. `not-cases` covers facilities, pumps, sites — things that are not people |
| `caseWeight` | an attribute name | Required when `rowMeaning` is `count-of-cases`: the column holding the count |
| `eventDate` | `{field, kind}` where kind is `onset` · `report` · `death` · `specimen-collection` · `other` | Which column is the date, and **which** date it is |
| place | — | already the geometry; nothing new |

Consequences, which are the point:

- A widget that counts records **uses the declared weight, or refuses** when `rowMeaning` is
  `count-of-cases` and it cannot weight. Counting 250 where 489 was meant becomes impossible rather
  than merely discouraged.
- A time widget reads the declared date **and its kind**, so a series states what it is a series of.
- Receipts record the declaration, so a reader of a result can tell whether 250 or 489 was counted
  without reading the workflow.
- Nothing needs a new `PortType`. Points stay points; the declaration travels with them.

### Refusals this creates

- **A point is not a person unless declared one.** An undeclared layer is undeclared, not assumed.
- **Aggregated counts cannot be disaggregated.** A `count-of-cases` layer cannot produce a case-level
  series, a line list, or an individual-level privacy transform, and a widget that needs one must
  refuse rather than treat each row as a case. Aggregation is one-way, and the Snow file is on the far
  side of it.
- **A curve by death date is not a curve by onset date.** The kind travels with the series and the two
  are never interchangeable; this is the time-axis analogue of families that include or exclude
  vertical land motion.
- **A geomasked aggregate is not a geomasked case set.** The existing donut geomasking moves points; on
  a `count-of-cases` layer it moves addresses carrying counts, which is a different privacy claim and
  must be stated as such.

## Compatibility, which must be exact

The declaration is **optional and defaults to unstated**. An existing workflow with no declaration
behaves precisely as it does today — the same counts, the same receipts plus one assertion that the
meaning is unstated. No saved workflow changes its results because this landed. The Snow examples gain
`rowMeaning: count-of-cases` and `caseWeight: DEATHS`, which makes their existing correct behaviour
checkable instead of incidental.

## Validation this commits to

Unit checks: a declared weight sums rather than counts; a counting widget refuses an aggregated layer
it cannot weight; `count-of-cases` without a weight column is refused at validation; a non-numeric or
negative weight is refused; an undeclared layer behaves exactly as today; and a date declaration
records its kind, with two kinds never merged into one series.

A browser check configures the Snow locations as `count-of-cases` weighted by `DEATHS`, runs the
existing catchment workflow, and asserts the summary still reports 489 while a count-based widget now
reports 489 or refuses — with the receipt stating which.

## What this cannot establish

That the declaration is true. Nothing in the application can know whether `DEATHS` counts people, and
a workflow author who declares `one-case` for an aggregated file will get wrong answers confidently.
The declaration makes the assumption **visible and checkable against the data's own provenance**; it
does not verify it.
