# 138 — A table and a boundary are two tables

_Created 2026-10-26 · Updated 2026-10-26_

**Status:** tried — the admission audit is here, the operation is built as a pure module
with its tests, and the widget is instantiated in the South London `choropleth` workflow,
shaded by its own mortality. What that first run cost is recorded below.

The South London example has argued for this in prose since it was published. Its catalog
entry says it plainly:

> Nothing joins a table to the parts of a study area, so the 32 mortality rates and the 32
> named boundaries cannot colour one another. That join is the choropleth this example
> argues for in prose.

It also gates the dot-density map and any chart of a measure, so it is the dependency
behind three of the four map kinds an epidemiologist would expect.

## What the practitioner said that reframed it

On 2026-10-25, asked whether this was a table-to-polygon join:

> We are not strictly joining table to polygon here. What we are joining are a table and
> another table with geometry.

That is right, and it is why the gap was invisible for so long. A GeoJSON feature, a
shapefile and a GeoDataFrame are all a row with a geometry column. **This project's
`PointFeature` matches that** — `properties: Record<string, Scalar>` with an optional
geometry. **Its `Catchment` does not**: ten named fields, each owned by one operation,
and no open bag. So the operation looked exotic when it is the most ordinary thing in GIS.

The measurement that makes this concrete: the boundary file carries **32 attribute
columns** and the import keeps two of them, `id` and `name`, because there was nowhere to
put the rest.

## The admission audit

**D1 · Does the distinction survive decomposition, and would a practitioner ask for it by
name?** Yes to both. "Join these rates to these districts" is how the request is actually
phrased, and no arrangement of existing widgets performs it.

**D2 · Does the operation already exist under another name?** Asked twice, and the second
answer was better than the first.

By port signature, the only widget taking a table and a geometry is `slr_site_assignment`,
which joins by *nearest site* — a measurement, not a match — so no duplicate. But by
operation, `deduplicate_points` is already a record linkage: blocking, a Jaro-Winkler
comparison, binary contributions, three classes and a clerical review queue. Searching by
signature missed it; searching by what the operation *does* found it.

What is reused is `normaliseName`, which settles the key question, and what is not is the
graded machinery: `Candidate` carries `coordinates` and `metres`, `nearAgrees` is a
distance test, and a polygon has no single Position. **The unit of reuse is not the unit
of use.**

**D4 · What must a port type refuse?** Nothing new. The inputs are an existing `table` and
an existing `area`; the output is existing `polygons`. A new port type here would be a
distinction nobody needed.

**D8 · Negative cases.** Four, each reported by name rather than folded into a count: a
part no row names; a row naming no part; two raw keys that normalise together; two parts
sharing one name. The last is **Streatham**, which is two polygons — the parish and its
detached part — and both take the value, because a rate is an intensity. The diagnostic
says so, because the same move on a **count** would double it.

**D10 · Does an example instantiate it?** Not yet. That is what moves this to `tried`.

## Why a keyed join and not a linkage

Every comparison is equality after a declared normalisation. No similarity, no threshold,
no review band. Measured on the real files, 2026-10-25:

| | matched |
| --- | --- |
| raw published strings | **23 of 32** |
| after folding punctuation and spacing | **32 of 32** |

The nine that fail raw differ only in a comma: the table writes `St. George, Camberwell`
where the boundaries write `St. George  Camberwell`. A join on raw keys would mishandle
28% of Snow's rows while appearing to work.

That 32 of 32 are *exact* after folding is what justifies refusing the graded path. Nothing
here needs a threshold, and building the band machinery before an example requires it is
the mistake [experiment 59](59-mechanism-before-the-operation.md) already recorded.

## What the first run found

The widget passed 32 of 32 against the real files as a pure module, and then failed on the
first workflow that used it. Three defects, all 2026-10-25, none of which the module's own
tests could have caught, because each lives in a surface rather than in the operation.

| What broke | Why the unit tests missed it |
| --- | --- |
| The run failed with `Cannot read properties of undefined (reading 'keys')` | The execution case read `inputs.table`; `inputs` is keyed by **port** name and the port is `records`. The module was called correctly in its tests and incorrectly by the application. |
| The Inspector offered no key column — *"Connect a table first"*, with a table connected | It listed the keys of a `table_input` only. The upstream here is a `rate`, which emits a table of its own whose key column no one had written down. |
| The figure's key named sites, observations and modeled catchments | A fixed string, appended to every figure this renderer has ever drawn. |

The second is the one worth keeping. A widget's columns were being read from the *kind of
node* upstream rather than from what that node emits, so every table-producing widget was
invisible to every control that offers columns. The fix names the key columns where the
tables are built — `RATE_TABLE_KEYS`, `SERIES_TABLE_KEYS`, `SITE_ASSIGNMENT_TABLE_KEYS` —
so a control and a renderer cannot drift apart. The error message was also silent about
which port it meant, which is the second time this repository has paid for an error that
names no operand.

The third is a figure defect, not a join defect, and it is
[experiment 136](136-a-figure-that-stands-on-its-own.md)'s business: a key is the part of a
figure a reader trusts without checking, so one that describes marks the figure does not
carry is worse than no key at all. It now names only the marks present, and a polygon
shaded by a joined value is called **measured** rather than modeled.

Status moves to **tried**: the widget is instantiated in `south-london/choropleth`, which
draws 33 parts for 32 sub-districts — Streatham is two polygons and both take its rate.

## What this does not establish

- **That the normalisation generalises.** It is fitted to one pair of files where all nine
  differences are punctuation. Another example may carry abbreviations or historical
  spellings, where folding fails and the review band this deliberately omits is required.
- **That a choropleth of these values is sound.** The join puts a number on a boundary. It
  says nothing about whether the rate was computed over the right denominator, whether the
  classes are honest, or whether the reader will take area for magnitude. Those are
  [experiment 136](136-a-figure-that-stands-on-its-own.md)'s business and a human's.
- **That the ten named slots on `Catchment` should stay.** The bag is additive and settles
  nothing about them; folding them in is 41 call sites and its own argument.
