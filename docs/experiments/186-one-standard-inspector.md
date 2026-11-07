# 186 · One standard Inspector, and each widget's settings in its dialog

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. The standard is written here before any widget is moved to it; Relate is the first.

## The question

The practitioner, 2026-11-07, across one afternoon of [184](184-heuristic-evaluation-in-the-lab.md):

- *"The widget configuration dialog approach is not consistently applied some widgets have overly complicated
  inspector panels, with stale non working or unused elements."*
- *"We need to have consistent language and behavior for Inspector based port actions."*
- *"The more predictable Inspector looks and behaves the less cognitive overload and dissonance we have."*
- *"There are Inspector configuration items that should simply be standard and the function specific ones go in the
  modal dialog."*
- And, as Relate was being widened for [185](185-one-step-for-every-lag.md): *"As we work on Relate widget let's
  think about the standardization of the Inspector already."*

## The standard

**Every Inspector shows these, in this order, worded the same, and nothing else:**

| # | Section | What it holds |
| --- | --- | --- |
| 1 | **Name** | The step's label, editable |
| 2 | **Inputs** | One list per input, named in plain words: "Not connected", then every step that can feed it. Absent for a source step |
| 3 | **Settings** | One plain sentence saying what the step will do with its current settings, and **Configure…**, which opens the widget's dialog. Absent for a widget with nothing to configure |
| 4 | **Result** | One status line after a run: what came out, and what was left out or empty, counted |
| 5 | **Manual · Evidence · Version** | The same three links on every step |
| 6 | **Actions** | Duplicate, Remove |

**Everything specific to what the widget does lives in its dialog**: its settings, previews, decisions and the
explanation of them. Explanation that only records how the widget was designed goes to the manual or the record, not
the dialog ([184](184-heuristic-evaluation-in-the-lab.md)'s first lens).

## Relate first

Relate's Inspector on 2026-11-07: its own two input lists, the match key, the column to bring, "and also matched on",
three period fields, a shift field, six paragraphs, and **Open the join**, which already opens a dialog. Under the
standard:

- **Inspector**: Name; Inputs (*Table being added to*, *Table read from*); Settings — e.g. *Brings `LST_Day_1km` from
  the satellite table, matched on municipality and week, at 7 shifts* — and **Configure…**; Result; the links;
  Actions.
- **Dialog** (the join dialog, extended): what to match on, what to bring, the period, **the list of shifts**
  ([185](185-one-step-for-every-lag.md)), what happens to unmatched rows, and the preview it already shows.

## What would close it

**`tried`** when Relate meets the standard and its tests and the Brazil manuals pass against it.

**`validated`** when a check fails for any Inspector that adds a section outside the six, or orders them differently,
and the count of Inspectors meeting the standard is recorded, of 70.

## What this does not establish

That six sections are the right six; that every widget's settings fit a dialog without losing something a person
needs to see beside the canvas; that a predictable Inspector reduces overload — that is the practitioner's
expectation, and the reason, not a finding.
