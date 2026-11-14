# 214 · Editing a table's values inline, in Data quality

_Created 2026-11-14 · Updated 2026-11-14_

**Status:** tried — built 2026-11-14 in 0.114.0 (Tabular data 0.11.0, Point data 0.8.0); the practitioner observation not yet made.

## The question

The practitioner, 2026-11-10: *"One thing I have been meaning to add to data quality checks is the ability to edit
tables inline. Can be added as a widget playback exercise."* And on 2026-11-13, choosing between what TODO item 12 left
open: an empty cell may be filled **like any edit**, and the exercise is **the playback dialog** of
[173](173-a-manual-for-each-worked-example.md), designed and not built.

So: **can a person correct a value in the records an input holds, from Data quality, without the file being written and
without the correction being lost from the record?**

## What exists

| | Changes values | Recorded | Undone |
| --- | --- | --- | --- |
| Data quality's repair (117) | a whole column read as another kind, on Point data | on the step, and in the run | Remove |
| Relate spelling (experiment 193) | joins names that differ, without changing them | in the run | change the step |
| Nothing | one value in one record | | |

## The design

1. **A Records tab in Data quality**, on Point data and Tabular data: the records as the steps downstream read them, a
   page at a time, each cell a box that can be typed into. Pressing Enter or leaving the box records the edit.
2. **An edit is a declared change on the step, never a write to the file**, as a repair is (117): the record, the
   column, the value read, the value written, and when. The records the step holds stay as they were imported; edits
   are applied to a copy when the records are handed on, after any repairs.
3. **An edit says what it replaced**, and is applied only where the record still holds that value. If the data under it
   has changed, a re-import or another source, the edit is not applied, and it says so in Findings, rather than writing
   over a value nobody saw.
4. **An empty cell can be filled** (the practitioner's choice, 2026-11-13). It is an edit like any other and is
   recorded as one: the value read is *not recorded*. The log says how many edits filled an empty cell, because that is
   the act 117 calls imputation, and a reader of the evidence should be able to count them.
5. **Reversible and versioned** (the practitioner, 2026-11-13: *"The edit should be reversible and also versioned"*).
   The step keeps a log in which every change is a version and none is deleted: an edit adds one; **Take back** adds one
   that revokes an edit; **Restore this version** adds one whose values are those of an earlier version, version 0 being
   the records as imported. **Edits (n)** lists the edits in force, and beneath them the history, every version newest
   first.
6. **The run says so.** The receipt states the version it read (`fw:editVersion`) and carries each edit as `fw:CellEdit`: the step, the record, the column, the values
   before and after, when. The step's sentence counts them: *3 values edited by hand, 1 of them filling an empty cell.*
7. **The playback dialog (173)**, built in the same release: a worked example's manual step that asks for an edit plays
   back, so a learner can watch the correction made and recorded, then make it themselves.

**Not in this experiment:** editing a column's name; adding or deleting a record; editing a result table (a result is
corrected at its input, as 117 holds); editing several cells at once.

## Admission review

D1: no new widget. Data quality gains a tab on the two inputs it already serves.

| Distinction | Enforced as |
| --- | --- |
| An edit is not the file: the file and the records imported from it are unchanged | **hard stop**: edits are applied to a copy when the records are handed on |
| An edit applies only to the value it was made against | **run-time check**: a value that has changed under an edit is not edited, and is a finding |
| A filled empty cell is a supplied value, not a reading | **validation rule**: such an edit is marked, and counted apart in the log and the run |
| An edit is a person's act, and says so | **limitation**: the edit records when, not who, until projects have authors on each change |

## What it commits to, written before the result

- Unit tests: edits applied in order over a copy, the original untouched; an edit whose value read no longer matches is
  not applied and is reported; taking an edit back and restoring a version each add a version, and the values replayed
  at each version are that version's.
- A browser test: a misspelled district corrected in Data quality, the run reading the corrected value, the edit in the
  log and the receipt; Remove restores it; an empty cell filled and counted as such.
- **Practitioner observation, which can come out badly:** after an edit, can the practitioner say, from the evidence
  alone, which values in the run were typed by hand rather than read from the file?

## Validation record, 2026-11-14

- Unit: `tests/cell-edits.test.mjs`, edits over a copy with the original untouched, a stale edit not applied and
  reported, versions replayed after a take-back and a restore; passing.
- Browser, Chromium only: `tests/table-edit.browser.mjs` (1 test: a value corrected and an empty one filled, the run
  reading both, the edits stated and marked in the table, one taken back) and `tests/manual-tab.browser.mjs` (3 tests,
  one the playback of a manual's steps); passing. WebKit runs in CI after the push.
- The practitioner observation above has not been made.

## What this does not establish

That an edit is right: the application records it, and does not check it against anything. That a learner who edits
in the playback understands why a correction must be recorded rather than made in the file.
