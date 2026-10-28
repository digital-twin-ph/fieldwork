# 146 — A result that cannot be read for what left it

_Created 2026-10-28 · Updated 2026-10-28_

**Status:** tried — built and covered; the general claim below is not yet tested anywhere else.

The practitioner asked for the relate panel as one of six items, and said why on 2026-10-27:
*"If I have a widget that links two wide tables, I want to see a wider table with rows correctly
linked on the linking key. It's easier for epidemiologists to view the relate table result that
way, not in JSON."* And, on what such a view must carry: *"pandas also gives you the original keys
so you know which half of the row came from which table."*

Building it turned up a sharper problem than the one asked about.

## The finding

`relateTable` has computed four things since its first commit: rows related, rows dropped, the
left keys the right table had no row for, and the distinct categories that landed. Its own file
says so in a comment — *"Reported, never defaulted"* — and the report went into the N3 receipt and
nowhere else.

That is the surface the direction `the-practitioner-sees-their-data-not-our-description-of-it`
already names as the one nobody reads. What makes this case different from the import blobs that
direction was stated about is that **the result cannot be inspected for the missing part**:

| | pandas left merge | this application |
| --- | --- | --- |
| a left key with no match | row kept, brought column `NaN` | row dropped |
| where the reader meets it | in the frame | only in a report |
| `rowCount` of the result | the left table's | smaller, and self-consistent |

Dropping is the better default for a stratification — an invented "unknown" stratum is a stratum
nobody measured — and it is the worse default for anybody who only looks at the table. A relate of
64 rows that related 62 and a relate that related all 64 produce tables that are
**indistinguishable by inspection**: both have internally consistent totals, both agree with their
own row counts, and neither mentions the rows that left.

So on this widget the report is not a convenience. It is the only place the information exists.

## What was built

On the step, after a run: offered / related / dropped against the offered denominator, the gap
keys **named** rather than totalled, a sentence either way (a zero in a table is easy to pass
over), and which table each column came from. In Quick Look, the column origins above each
heading — what a merge writes as an `_x`/`_y` suffix, said in words because a renamed column is a
different column to everything downstream and a note is not.

`WorkflowRun.relations` carries the outcome, the way `linkages` already carried what a
deduplication found. No computation changed.

The two tables also had to be distinguishable by name, and `table_input` has no node-label control
at all: two imported tables are both "Tabular data" until a project file renames them. So a
tabular input still carrying the palette's default label is named by its filename, which is the
only name the practitioner has actually given it.

## What this does not establish

The general claim — **a finding that exists only in a receipt is the same failure as a JSON blob,
in a tidier format** — is argued here from one widget and tested nowhere. The other steps that
report something no reader can recompute from their output are not audited:

- `group_table` reports groups that held an empty cell and total to nothing known.
- `derive_value` reports the groups that got no derived row.
- `select_rows` reports values asked for that the table does not hold.

Each of those drops or omits something, and each reports it in the same place. Whether their
outputs are readable for the omission, as a related table is not, has not been checked.

Nor does anything here establish that the panel is what an epidemiologist wants to see. It was
built to the practitioner's description of a pandas merge; it has not been put in front of one.
