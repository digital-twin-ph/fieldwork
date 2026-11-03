# 164 · Diagnose a table, then deduplicate it

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — keys, findings and the flag are built, and the deduplicate widget takes rows of one table.

## The task

The practitioner, 2026-11-02: *"We cannot refuse an upload because of a quality problem. The data quality
problem needs to be diagnosed first in the widget so the widget should be able to flag data quality issues so
the user looks at the data quality tab."*

And on keys: *"A table can have a primary key (unique) and a secondary key (may be non-unique)"*, and *"The user
should be able to judge when a column or columns is a primary key or secondary."*

On the fix: *"I would rather use the deduplicate widget, generalized to handle different formats, points,
polygons, text columns."* Polygons and point-in-polygon wait in [TODO](../../TODO.md), so tables come first.

The question was raised by the two-by-two offering Oswego's `ID` as an exposure, and by asking how a widget
could know what an identifier is. It cannot, so a person declares it and the widget checks what can be checked.

## What this supersedes

[117](117-data-quality.md) records *"refuse rather than convert"*. That stands for conversion: nothing here
casts a value. A file refused on import cannot be diagnosed, so three refusals become findings.

| Refused until 2026-11-02 | Now |
| --- | --- |
| Rows repeat the key | A finding naming the rows |
| A row has no value in a key column | A finding naming the row and column |
| A value column holds text | A finding keeping the text; the value is unknown, never zero |

Structural limits stay refusals: no rows, too many rows, a column that does not exist.

## The design

- **`keys` keeps its meaning**: columns read as labels. Oswego lists 16 of them, so `keys` could not stand for
  identity. Duplicates across all 16 together say nothing about `ID`.
- **`primaryKey`** is one or more of those columns, declared by the practitioner, and is what uniqueness is
  checked on. Undeclared, the check falls back to all of `keys`, as before.
- **`secondaryKeys`** may repeat, so they are not checked.
- A finding flags the node and the Inspector, is listed in Data quality, and goes into the write-up as a
  machined limitation.
- The two-by-two leaves declared keys out of Exposures. Its row-count guess remains for undeclared tables.

## The generalised widget, tables built 2026-11-02

`deduplicate_points` takes **Rows of one table** beside points. Its internal name is kept for now: renaming
touches the validation lab's parity record and every generated contract, and is a separate step once the
behaviour has settled. Its title is now *Deduplicate records*.

| | Points | Rows of one table |
| --- | --- | --- |
| Sources | Two or more | One |
| Blocking | Distance | Shared columns, by default the primary key |
| Merges on its own | Name and place both agree | Every compared column agrees |
| A person decides | Same place or not | Two records, or the same record and which row stays |

Measured: an exact copy merges, a pair differing in one column waits, a decision to keep the second row removes
the first, and editing either row lapses the decision. Unit tests and one browser test on Chromium and WebKit.

## Still open from the generalised widget

`deduplicate_points` becomes `deduplicate`, one widget over formats, with one source allowed. Three outcomes,
untouched sources and decisions in the receipt carry over. Exact copies merge; rows that disagree wait for a
person, because keeping the first row would silently delete a case.

Open: redefining the two thresholds over a chosen list of comparisons; blocking without a distance; keeping
existing workflows' results the same.

## What this does not establish

- That anyone reads the flag, or opens Data quality because of it.
- What each downstream widget should do with a repeated primary key. They receive the rows and a machined
  limitation; none yet stops.
- The wide-or-long question: a repeated subject still raises the shape alert during import, which is a choice
  of reader and not a verdict on quality. Whether it should remain is untested.
