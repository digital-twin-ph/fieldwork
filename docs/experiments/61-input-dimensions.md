# 61 · Person, place and time belong to the input data

_Created 2026-10-08 · Updated 2026-10-15_

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

## Place becomes place at one gate, and the gate had no CRS

_Added 2026-10-12. Written after the code, which is unusual for this record and is the point: this
section reports a thread the practitioner drove, where each step corrected the step before._

**The frame is pandas and geopandas**, and it is the practitioner's: coordinates can be columns in
a DataFrame, and are a geometry in a GeoDataFrame, and geopandas converts one into the other by
naming which columns hold them. Mapped onto this project, `table` is the DataFrame and `points` is
the GeoDataFrame — records with a geometry column, which **may be missing per row**, which
geopandas supports and tracks separately from any predicate.

So `PointFeature.geometry: Point|null` is the GeoDataFrame model, not a defect. And
`points_from_xy` is **the gate by which table values become GIS coordinates** — the one boundary
where this record's "place" stops being a column and starts being a location.

### What the gate was

`csvPoints` in `src/input-data.ts` is that gate, and it declared no CRS at all. It is called from
two places, with the same two slots meaning different things:

| Caller | `longitude` slot | `latitude` slot |
| --- | --- | --- |
| the ordinary CSV import | longitude, in degrees | latitude, in degrees |
| `reproject-ui` | **easting, in metres** | **northing, in metres** |

The unit lived in what the caller did next — `reproject-ui` converts immediately — and nothing in
the signature or the data carried it. geopandas refuses to build a GeoDataFrame without a CRS and
complains loudly when one is missing; this gate had no notion of one.

Two changes followed. The slots are **`x` and `y`**, because the explicit mapping is *longitude is
x, latitude is y* and the same ordering holds for projected metres where x is easting — the
ordering was always right and only the names were true of one caller. And **`units` is required
with no default**, so neither gate can omit it.

### What it still cannot see, measured

A swap is undetectable by range whenever |longitude| ≤ 90, because the swapped pair is a valid
coordinate pair somewhere else entirely:

| | Swapped | |
| --- | --- | --- |
| Manila (120.97, 14.58) | **refused** | latitude out of range |
| Soho pump (−0.1366, 51.5135) | accepted | lands off Somalia |
| Gaborone (25.91, −24.65) | accepted | lands in Algeria |

**Both worked examples this project ships are in the second category.** What catches a swap is the
study area: every record reads Outside and `coverage_check`'s `canProceed` goes false. The gate
cannot, and `tests/input-coverage.test.mjs` records that rather than implying otherwise.

### Three corrections, which are the substance of the thread

- **"A point with no coordinates is unknown, not outside"** — withdrawn. That came from the code's
  `MissingLocation` relation, not from GIS, and restating a data-quality state as a claim about
  points is a category error: a point *is* coordinates. What survives is narrower — a missing
  geometry is not a spatial *relation*, so `MissingLocation` does not belong in `SpatialRelation`
  beside Inside, Boundary and Outside. With that removed the relation is three-valued, which is
  also what makes a set-level boolean expressible.
- **"UTM metres are accepted silently"** — withdrawn as stated. That was `csvPoints` in isolation;
  the import path already refused at `core.ts`, which checks |x| ≤ 180 and |y| ≤ 90 and whose
  message already said *"Use longitude, latitude in CRS84"*. The guard existed. What the gate adds
  is an earlier refusal naming Reproject as the fix, and a guard on the metre path, which
  reprojects before anything validates.
- **The cast that hid a break.** `input-data-ui` built its mapping with
  `Object.fromEntries(...) as unknown as CSVMapping`. When the interface gained `x`, `y` and a
  required `units`, that cast kept it typechecking while producing a mapping with none of them —
  the ordinary CSV import would have failed at run time with `tsc` satisfied. The mapping is
  written out at the call site now. Second `as unknown as` to conceal a real defect in one day,
  after `case_series`.

### What this means for the proposal above

**This record's binding mechanism now has a second caller, and it arrived first in practice.**
Declaring which column means what is proposed here for person, place and time; the gate needs
exactly that for x, y and a unit; and [65](65-ruleset-as-data.md) needs it again for binding
ruleset roles. Three callers, one mechanism, and the only one with working code today is the gate —
reachable from two file dialogs and from no workflow.

Which is the gap worth naming: **nothing converts a `table` already in the graph into `points`.**
Three widgets consume `table` and all three emit a table or decisions, and the only sources of
`points` are `observations`, `samples` and `find_health_facilities`. A practitioner who imports
their own CSV with latitude and longitude columns cannot make it spatial. That is a new widget, so
it is recorded in `docs/todo.md` rather than built, with the contract this thread settled.

## What this cannot establish

That the declaration is true. Nothing in the application can know whether `DEATHS` counts people, and
a workflow author who declares `one-case` for an aggregated file will get wrong answers confidently.
The declaration makes the assumption **visible and checkable against the data's own provenance**; it
does not verify it.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-08 | Locate person and time in the input data, where the John Snow file already carries them |
| 2026-10-08 | Add the time axis, and give it John Snow's own daily table |
| 2026-10-12 | 61: the gate where place stops being a column |
