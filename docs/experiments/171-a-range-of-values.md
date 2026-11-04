# 171 · Selecting rows by a range of values

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** tried — built on Select rows by value and used by the NYC example, Chromium.

## The task

The NYC smoke workflow keeps 1 to 14 June 2023 from 3,653 daily rows. Select rows by value offered one checkbox per
distinct value, so the fourteen days were fourteen ticks in a list of 3,653 that could not be searched.

The practitioner, 2026-11-03, looking at that list: *"And looking at the select rows by value, this is not
frictionless"*.

## The design

| Change | What it does |
| --- | --- |
| **Keep: a range** | **From** and **To**, both kept; an empty end is open. Rows keep the table's order |
| **Offered only where "between" has a meaning** | Every non-empty value an ISO date, or every one a number. Mixed or text columns get no range |
| **A long list is searched** | More than 12 values: a search box and **Ticked only**. Narrowing hides boxes; it unticks nothing, and it survives the re-render a tick causes |
| **The ticked values are kept** in range mode | Switching back loses nothing |

Dates compare as text, which is their order in ISO form; numbers compare as numbers, so 9 comes before 10. A row with
no value in the column is outside every range, so it is dropped and counted in `dropped`.

### The distinctions it carries

| Distinction | How it is enforced |
| --- | --- |
| A column with no order has no range | **Hard stop**: `selectRange` refuses it, and the Inspector does not offer it |
| An end that is not of the column's kind (`June` for a date) | **Hard stop**, naming the form expected |
| A backwards range | **Hard stop** |
| A range that keeps nothing | **Hard stop**, saying where the column runs from and to |
| What was kept | **Receipt**: `kept date from 2023-06-01 to 2023-06-14, both ends included`, with kept and dropped counts |

## Validation

Committed: unit tests on the range itself, and a browser test that builds it from an empty canvas.

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-03 | `tests/select-a-range.test.mjs` | 6 of 6: ends kept, open ends, numbers as numbers, no range without an order, the refusals, empty cells |
| 2026-11-03 | `tests/select-range.browser.mjs`, Chromium | Passed: 60 dates, search narrows to 9 and survives a tick, Ticked only, range fields typed `date` with the column's min, run keeps 14 rows, receipt method and counts |

| 2026-11-04 | Validation Lab check 32 against pandas `Series.between`, London 2002 to 2006 | Agrees, 4 of 4 row for row: August 2003 heatwave 15, ozone 60 to 90 as numbers 137, from Christmas 2006 7, one emptied cell 136. Compared as text the ozone range would keep 193 |

WebKit was not run locally; CI runs it.

## Practitioner observation, written before the result

Whether a practitioner reads **From** and **To** as both ends kept. The description says so; whether it is read is not
established.

## What this does not establish

- That a range is the right selection. A smoke period chosen to show a peak is still a choice, and the receipt records
  it without judging it.
- Ranges over text (alphabetical). Deliberately not offered.
- Datetime columns are offered a text range, and a `To` given as a date excludes times later that day.
