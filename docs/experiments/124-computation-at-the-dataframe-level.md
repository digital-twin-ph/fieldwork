# 124 · Computation at the dataframe level

_Created 2026-10-19 · Updated 2026-10-19_

**Status:** asked — the type model already is the dataframe model and the widget set barely uses
it. Whether to close that is a design decision, not a defect to fix.

## The observation

The practitioner, 2026-10-19, after four separate gaps in one afternoon turned out to be the same
gap:

> *"Note that in the case study notebooks, most of the computations are at the dataframe level."*

A notebook's unit of work is one frame that accumulates derived columns: distance to the pump, the
nearest pump's name, a distance band, a rate. Every step reads `df['x'] = ...` or
`df.groupby('x')`, and the frame carries everything computed so far. Fieldwork's unit of work is a
**typed port value**: a widget consumes declared inputs and emits exactly one output, and nothing
accumulates.

## It is not one toolchain's habit

The practitioner, 2026-10-19: *"The dataframe model is also used by R so it's not just a Python
'thing'."*

Which matters, because a cost against one notebook stack is a translation detail and a cost against
the shared idiom of statistical computing is a design position. The data frame came from **S** and
was inherited by R long before pandas, which was modelled on R's `data.frame`. So a practitioner
arriving from either language expects frame-level computation, and in this project's own domain the
lean is toward R: the epidemiological packages — and `sf` for anything spatial — all operate on
data frames and tibbles.

**`sf` is a data frame with a geometry column.** That is the same correspondence
[61](61-input-dimensions.md) drew, and 61 drew it from geopandas alone. It holds in both languages,
which makes `points` ≅ GeoDataFrame ≅ `sf` object a **language-independent** mapping rather than one
library's analogy. The claim in 61 is stronger than 61 made it.

The verbs are shared too, and they name exactly the split this document is about. `group_by` and
`summarise` are what the palette already has — `summarize_points_to_polygon`, `rate`'s `groupBy`
and `bandWidth`. **`mutate` — add a derived column — is the one with no expression here.** The
operation is canonical across the tradition, not something this project would be inventing. (The
name is not available: this codebase's values are immutable and the naming convention would refuse
it. What is borrowed is the evidence that the operation is standard.)

## And it is older than either language: epidemiologists work in line lists

The practitioner, 2026-10-19: *"That's also the way epidemiologists work, they use line lists."*

A line list **is** a data frame, and it is the native working object of field epidemiology — one
row per case, one column per attribute, derived columns added as the investigation proceeds. It
predates R, S and pandas entirely. So the idiom is not borrowed from statistical computing into
epidemiology; it is what the discipline already did, and the glossary's own rule applies: *where a
public health term already exists, we use it.*

**This repository ships one.** `examples/hagelloch-1861/cases.json` is 188 measles cases from 1861
with `case_ID`, `family_ID`, `age`, `gender`, `class`, `complications`, `date_of_prodrome`,
`date_of_rash`, `date_of_death`, coordinates — and **`infector`**, the case that infected this one.

The derived columns an epidemiologist adds to that line list, and what this application can do with
each:

| derived variable | how it is derived | expressible here |
|---|---|---|
| age group | band `age` | **no** — `rate`'s `bandWidth` groups into a table, it does not write a column |
| prodrome-to-rash interval | `date_of_rash − date_of_prodrome` | **no** — no arithmetic between two columns |
| outcome | whether `date_of_death` is null | **no** |
| case classification | a case definition over several columns | **no**, and [60](60-from-gis-studio-to-public-health-studio.md) already lists "case definition" as needed and unbuilt |
| **serial interval** | own prodrome minus the **infector's** prodrome | **no**, and it is further out: a self-join on the frame, which [60](60-from-gis-studio-to-public-health-studio.md) calls "linkage" |

The example shows it. `hagellochExample()` has six nodes — study area, the cases, `case_series` on
`date_of_prodrome`, a chart, a map, a table. Of thirteen columns it uses **one date**, and
`infector` is carried and never read. Hagelloch is the canonical serial-interval dataset *because*
it has `infector`, and the workflow draws an epidemic curve.

That is not a criticism of the example, which was built to show a closed outbreak with a complete
line list, and does. It is the clearest evidence in this document: the frame is here, its most
interesting columns are here, and the operations an epidemiologist would perform on them have no
expression — so the example can only display the line list, not work it.

## Denormalized line lists, and the thing no contract here declares

The practitioner, 2026-10-19: *"And sometimes epidemiologists use highly denormalized line
lists."*

A denormalized line list carries several entities in one row — case attributes beside household,
facility or contact attributes, repeated down every row that shares them. In a notebook the analyst
holds the grain in their head. In this application it has to be declared, because the receipts
assert one `prov:Entity` per record, and a row describing a case *and* its household asserts the
household's facts once per case with a different identity each time.

**Nothing declares grain.** `AttributeDefinition` is `{key, type, allowedValues?, defaultValue?,
label?}` and `PointFeature.properties` is a flat `Record<string,Scalar>`. A column can say what
*kind* of value it holds and not which *entity* it describes.

And the repository's own line list is already denormalized, measured 2026-10-19:

- 188 cases in **69 families**; 53 families hold more than one case, covering **172 of the 188
  rows**.
- `x_loc` and `y_loc` vary within **0 of 69** families. **The coordinates are household-level.** So
  188 "points" are 69 locations, and 172 rows carry a repeated position.
- `class` varies within **37 of 69** families, so it is not household-level — which means grain
  cannot be guessed from a column's name, only declared.

The consequence is the weighted-centre problem from [122](122-a-project-holds-many-workflows.md)
arriving from the other direction, and hidden this time. A mean centre over Hagelloch's 188 records
is a **case-weighted** centre of 69 households; the household centre is a different point, and
nothing in the workflow or the receipt says which was computed. The same applies to a hull, to H3
aggregation and to any count per area: each silently weights a household by how many of its members
fell ill. With Snow's data the distinction was visible because the count sat in a `DEATHS` column
and the label said "250 addresses carrying 489 deaths". Here it is invisible because the repetition
*is* the rows.

The Hagelloch example does not currently make that error — it draws a map, an epidemic curve and a
table, and runs no spatial summary. But its map places one marker per case at household
coordinates, so 172 markers are overplotted at 53 positions, and the first spatial summary anyone
connects will be case-weighted without saying so.

## The type model already agrees with the notebooks

[61](61-input-dimensions.md) settled this at the type level and it is worth restating, because it
means the gap is not in the contracts:

> *"`table` is the DataFrame and `points` is the GeoDataFrame — records with a geometry column,
> which **may be missing per row**"*

and so `PointFeature.geometry: Point|null` is *"the GeoDataFrame model, not a defect."*

So `points → points` is exactly the signature of a dataframe computation that adds a column. The
contract for dataframe-level work exists. What is missing is widgets that use it.

## Four widgets take points and return points. Two add a column

| widget | what it does to the records |
|---|---|
| `sample_raster` | **adds** one attribute, named by the practitioner — `properties:{...f.properties,[name]:raw}` — and refuses to overwrite an existing one |
| `snap_to_network` | **adds** `networkNodeId`, `snapDistanceM`, `siteLongitude`, `siteLatitude` under fixed names |
| `reproject` | preserves what it was given |
| `donut_geomask` | **replaces** them — `properties:{name:'Moved location N'}` — which is defensible for a privacy method and means a masked layer can never be analysed by attribute |

Everything else that computes from points emits a different port type, so the value leaves the
frame and cannot be rejoined to it. The consequences, all recorded separately before they were
recognised as one thing:

- `measure_distance` emits `distances`. `rate` consumes `points`. So `rate`'s `groupBy` and
  `bandWidth` — the distance-band gradient — cannot reach a distance ([123](123-access-distance-in-three-legs.md)).
- `examples/snow-gboh/` ships `dis_bspump`, `dis_pestf` and `dis_sewers` as **precomputed
  columns**, because nothing here can derive a distance onto a layer. The repository obtained as
  data the quantities it has no widget to compute, and the frozen column is why *"what if we used
  network distance instead?"* cannot be asked of it.
- `mean_center` emits one point, so a weighted centre cannot be compared against its unweighted
  one inside a workflow; the 2.1 m was measured in a script beside the application.
- A widget has **one** output port, so no widget can emit both a result and the frame it enriched.

## The trade this was, and it was never stated

The port graph is not a worse dataframe. It buys the thing this project cares about most: a
receipt per step. A frame carrying twenty derived columns records nothing about which operation
produced which column, and `prov:wasGeneratedBy` per node is the whole reason a Fieldwork run can
be read backwards. A notebook's provenance is its own source code, which is why the notebooks are
the lab and not the application.

So this is a **trade, paid without being named**: dataframe ergonomics for per-step provenance. The
cost has been showing up one widget at a time as "this cannot reach that".

And there is a middle path already half-built, which is the reason to record this rather than
accept it. `sample_raster` writes a practitioner-named attribute, **asserts `fw:sampledAttribute`
in its receipt**, and refuses to overwrite. That is a derived column *with* provenance for the
column — the frame and the receipt at once. Nothing generalises it, and `NearestRow`'s
`attributes?:Record<string,Scalar>` bag plus its `minutes?` field are two more partial admissions
of the same model.

## What this does not establish

- **That the dataframe model should be adopted.** Every argument above is about a translation cost;
  none measures it. Nobody has counted how many notebook steps have no Fieldwork expression, and
  that count is the evidence this document lacks.
- **That one derived-attribute mechanism would serve all four cases.** It is asserted from four
  resemblances. A distance onto points, a band onto a table, a weighted centre's inputs and a
  masked layer's lost attributes may not want the same thing.
- **That `donut_geomask` is wrong to drop attributes.** Attributes are disclosive and dropping them
  is the safe default. It is recorded here as a consequence, not a defect.
- **Nothing about the three cholera datasets.** They cannot be joined because a location carries no
  date and a dated count carries no place — that is the data, not the architecture, and no
  dataframe would fix it.
- **That a serial interval should be computed here at all.** It needs a derived column and a
  self-join, and a transmission chain may want its own model rather than a frame with an `infector`
  column. Nothing here tests that, and `linkage` is listed in [60](60-from-gis-studio-to-public-health-studio.md)
  as deliberately undefined until the work needs it.
- **That R and Python want the same thing in detail.** Both have data frames; `dplyr`'s verbs and
  pandas' idioms are not identical, and a mechanism satisfying one may fit the other awkwardly.
  Nothing here was tested against an R user's expectations.
- **That `points` is the right frame for every case.** A long-format table keyed by period is a
  frame too, and `table_input` and `rate` already work on one. This document is written from the
  spatial side and may be mistaking a general question for a `points` question.

- **That grain belongs on the column.** It could belong to the dataset, to a declared key, or to a
  separate entity-and-relationship model. Long-format tables already carry a `keys` tuple
  (`table_input`), which is one existing answer to the same question, and this document did not
  compare them.

## What would close it

1. Count it. Walk the case-study notebooks and classify every computation as expressible in the
   palette today, expressible only by leaving the frame, or not expressible. Count the `mutate`-shaped
   steps separately, since those are the ones with no expression at all. The research note
   [cholera-notebooks-to-primitives.md](../research/cholera-notebooks-to-primitives.md) did this for
   five notebooks and found three gaps; the question here is what fraction of all steps are
   frame-level, which it did not ask.
2. Specify a derived-attribute mechanism against `sample_raster`'s existing rules — a
   practitioner-named attribute, never overwriting, with the receipt asserting which widget wrote
   which attribute — and say whether it is one widget, a capability several widgets declare, or a
   port contract.
3. Say what declares grain, and whether an undeclared one is refused or assumed. The test case is
   in the repository: a mean centre over Hagelloch should be able to say whether it centred 188
   cases or 69 households, and today it cannot.
4. Decide against [66](66-ports-as-schema-binding.md), which is the base-contract reframe this
   would sit on, and which says it should be settled before work that depends on it.
