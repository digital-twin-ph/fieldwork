# Experiment 48: tabular input

Date: October 8, 2026. Status: semantic admission review, then implementation.
This closes the host gap that [experiment 47](47-sea-level-pack.md) found: the
sea-level pack could not be admitted because a projection is a keyed table and
this prototype imported only points, rasters and graphs.

## Admission review

**The term.** A **data table** is a set of rows, each identified by a tuple of
declared key fields, carrying one declared value field. Its key is data, not
column names: the long format

    site_id,scenario,year,quantile,value_m

rather than one column per scenario and year. Long format is what lets a generic
importer read a table without knowing its subject.

**What it is not.** A data table is **not a point dataset**. It carries no
geometry and no coordinate reference system, and if it happens to have latitude
and longitude columns those are ordinary columns with no spatial meaning. This is
the whole reason it cannot reuse the `points` port: flattening a table to points
would mint one point per row and silently lose the key. It is also not a
spreadsheet, not a cube with multiple measures, and not a join: one value field,
no aggregation, no inference.

**Roles.** The widget definition is a reusable contract; a configured node naming
its key fields, value field and unit is a plan; one import is an activity; the
resulting table is an entity. The importer performs no calculation, so the
distinction between a presentation and a computation does not arise, but the one
between a declaration and a capability does: declaring a unit does not verify it.

**Ports, units, missing data.** Output is a new `table` port type. Input: none;
it is a source. There is no CRS, by the definition above. The unit is
**author-stated and never inferred**, exactly as raster source metadata is, and
the receipt records whether one was stated rather than assuming dimensionless.
An empty value cell is retained as unknown and counted; it is never zero-filled,
because zero is a measurement and absence is not.

**The constraint that earns its place.** A long table's key must be unique. A
duplicate key tuple is rejected, which is what catches the most likely mistake:
feeding in a wide table, or a long table missing a key column, where rows collide
and one value silently overwrites another.

**Emitted triples and SHACL, before implementation.** A run emits
`fw:TabularInput` as the activity and `fw:DataTable` as the entity, with
`fw:keyField` once per key in order, exactly one `fw:valueField`,
`fw:valueUnitStatus`, `fw:tableRowCount` and `fw:tableMissingValueCount`.
`fw:DataTableShape` requires all of those and constrains the unit status to a
known value. `fw:DataTable` is declared disjoint from `fw:PointDataset`, so the
distinction this review turns on is enforced rather than described.

CSVW is the obvious alignment for a published table and is **not** adopted here:
this is an internal result, not a published CSV with its own metadata document,
and claiming a CSVW mapping without emitting one would be the kind of
declaration-as-capability this project's audit forbids. It stays a recorded
candidate.

## What it unblocks, and what it does not

The sea-level pack's `slr_extract_import` contract becomes implementable, and the
host capability it declares as missing becomes present. The pack still needs its
own widgets, so this does not admit it.

Table output gains a mode that displays a data table with its keys as columns.
Chart and Map are deliberately left out: charting a keyed table requires choosing
which key varies along the axis and whether to aggregate the rest, which is a
design decision with its own semantics, not a rendering detail. Map is
meaningless for a table with no geometry.

## Validation

Unit checks cover the long-format contract, duplicate key rejection, missing
values retained and counted, a stated and an unstated unit, declared columns
absent from the header, and the row cap. A browser check imports a real
projection-shaped extract, displays it, inspects a row and reloads offline.

Not established: that any particular table's units or values are correct, that a
practitioner reads a keyed table correctly, or anything about tables larger than
the stated cap. The importer checks shape and identity, not meaning.
