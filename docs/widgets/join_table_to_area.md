# Join a table to the study area

_Created 2026-10-25 · Updated 2026-10-25_

**A join.** It takes a table of values and a study area whose parts are named, matches each row to
the part it names, and hands on polygons that carry the value. A map downstream can then shade
them.

## What it does

A rate per sub-district and a boundary of sub-districts are two separate things until something
puts one onto the other. Without that, the only map you can draw from a table of measures is a map
of where the rows are, which for most data is a map of where people live.

What is being joined is **a table and another table with geometry**. A GeoJSON feature, a shapefile
row and a GeoDataFrame row are each a row with a geometry column, so a boundary file carries
attributes exactly as a CSV does. This widget matches the two on one named column.

## What you connect

- **records** — a table. Any widget that emits one will do: an imported table, a rate, a case
  series. The column you match on must be one of its key columns.
- **area** — a study area whose parts carry names. An area drawn by hand has no named parts, so
  there is nothing to key on and this says so rather than drawing an empty choropleth that looks
  like a finding.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Column naming each part** | Which of the table's key columns holds the part name. Offered from the connected table, not typed. |
| **Match names** | *Ignoring punctuation and spacing*, or *Exactly as written*. |

### Choosing how names are matched

Names are compared for **equality**, never for resemblance. There is no similarity score and no
threshold to set, because a name either is the name of that part or it is not.

Ignoring punctuation and spacing is what matches `St. George, Camberwell` to
`St. George  Camberwell`. On Snow's South London files it is the difference between **23 of 32**
rows matching and **32 of 32**: the nine that fail differ only by a comma. It will **not** match an
abbreviation to a full name, or a historical spelling to a modern one, and it says so rather than
guessing.

If your files differ by more than punctuation, this widget is the wrong tool and will tell you
which rows it could not place. Fix the names at the source, where the correction is a fact about
the data rather than a setting on a node.

## Reading what you get

Polygons, one feature per part, each carrying the matched row's value and the rest of its columns.
The parts are kept separate rather than dissolved.

- **A part no row names** is drawn and left empty, in a neutral shade — never in the lowest class.
  An unmatched boundary drawn pale reads as a finding of low incidence, which is the opposite of
  what it means.
- **Two parts sharing a name** both take the value. That is true of a rate and is **not** true of a
  count: Streatham is two polygons, and both carry its rate, which is why Snow's 32 sub-districts
  draw as 33 parts.

The receipt records the column matched on, the normalisation used, how many rows matched, how many
did not, and every part left without a value, so a figure made from this can say what produced it.

## What it will not do

- **It will not guess at a name.** No similarity, no threshold, no review band. A row it cannot
  place is reported, not approximated.
- **It will not aggregate.** Two rows naming the same part are a duplicate-key problem in the
  table, and are reported as one rather than quietly summed or averaged.
- **It will not decide whether the number is worth mapping.** Whether the rate was computed over
  the right denominator, whether the classes are honest, and whether a reader will take area for
  magnitude are questions this widget does not answer.

## How it was checked

Validation Lab check **31**, `31-area-join-vs-pandas.ipynb`, against a pandas left merge. Every
part takes the value a merge gives it, nulls included, and the counts agree — 33 of 33 parts and
32 of 32 rows after folding, with Streatham's two parts carrying one value between them.

**What the folding bought, measured.** On the raw strings only 23 of 32 rows match. The nine that
need folding are all a comma: the table writes `St. George, Camberwell` where the boundary file
writes `St. George  Camberwell`. A join on raw keys would have drawn a choropleth missing 28% of
its sub-districts. The check also confirms the folding touched nothing *but* punctuation — it is
not reimplemented there, because a second copy by the same author is not a second opinion, so what
is checked is the property it must satisfy.

**And the data cannot supply a negative control**, which is worth knowing when you rely on this.
Snow's table and these boundaries contain no pair differing by more than punctuation, so nothing
in the example tests a name that *ought* not to match — 32 of 32 is also what a rule that matched
too readily would score. The check constructs one: a part renamed to `Camberwell Green`, which
this join reports unmatched. Jaro-Winkler to `Camberwell` is 0.925, so a similarity-based linkage
at the usual 0.90 threshold would have accepted it. That figure is what having no threshold here
is worth.
