# 186 · One standard Inspector, and each widget's settings in its dialog

_Created 2026-11-07 · Updated 2026-11-09_

**Status:** tried, for Relate, Select rows and Table input. Select rows 0.4.0 (Fieldwork 0.53.0) and Table input 0.7.0
(Fieldwork 0.57.0), both 2026-11-08, followed Relate.
Relate 0.8.0 (Fieldwork 0.47.0, 2026-11-07) has the six-section Inspector and its
settings in the standard configuration dialog, `src/config-dialog.ts`. Its five browser checks pass in Chromium, and
the NYC and Brazil manuals, rewritten for the dialog, play back from an empty canvas. Not yet `validated`: no check
holds other Inspectors or dialogs to the standard, and the counts have not been recorded.

What it took, and what it changed from the table below:

- **The links moved to section 5.** On 2026-10-21 the Manual and Dive deeper links were put under the title because
  they were tiny and moved with the panel's alerts. On a six-section Inspector the panel is short, so section 5 is in
  view without scrolling, and the links keep their button size. Named *Learn and record*. The practitioner kept them
  there on 2026-11-07.
- **The dialog's frame is built once.** Only the body and the message are rebuilt as settings change, because a text
  box that commits on blur rebuilt the footer between the press on Apply and the click, and the click was lost.
- **A decision starts unchosen.** The old join dialog started on *Drop*; a dialog that writes every setting on Apply
  would have recorded that default as the practitioner's decision.

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

## The dialog, standard too

The practitioner, 2026-11-07: *"The Inspector modal dialog also has to have a consistent look, feel and behavior to
it."* Counted the same day: **24 dialogs**, headed in **four** different ways (`manual-head` 11, `dialog-heading` 4,
`area-dialog-heading` 4, `dlg-head` 1), closed with **four** different words (Close 14, Cancel 10, × 9, Done 5), and
with action bars under **seven** class names. So every widget's configuration dialog follows one shape:

| Part | The same in every dialog |
| --- | --- |
| **Heading** | The widget's name, then the step's own name; one close control, top right, always × |
| **Body** | Sections in one order: **Settings** (what the step uses), **Preview** (what it will do, with these settings, to this data), **Decisions** (anything the step will not decide for the person, such as unmatched rows) |
| **Messages** | A refusal or warning in one place, above the footer, in plain words, saying what to change |
| **Footer** | **Cancel** on the left, **Apply** on the right; Apply is the only primary button |
| **Behaviour** | Opens with focus on the first setting; Escape or × with unapplied changes asks before discarding; Apply closes and the Inspector's Settings sentence and the canvas update at once; nothing changes the workflow until Apply |
| **Size** | One width for configuration dialogs, readable text, the footer always visible |

The other 23 dialogs (notes, evidence, catalog, help …) take the same heading, close control, footer and messages as
they are touched, so the application has one dialog, not twenty-four.

## Relate first

Relate's Inspector on 2026-11-07: its own two input lists, the match key, the column to bring, "and also matched on",
three period fields, a shift field, six paragraphs, and **Open the join**, which already opens a dialog. Under the
standard:

- **Inspector**: Name; Inputs (*Table being added to*, *Table read from*); Settings — e.g. *Brings `LST_Day_1km` from
  the satellite table, matched on municipality and week, at 7 shifts* — and **Configure…**; Result; the links;
  Actions.
- **Dialog** (the join dialog, extended): what to match on, what to bring, the period, **the list of shifts**
  ([185](185-one-step-for-every-lag.md)), what happens to unmatched rows, and the preview it already shows.

## The counts, 2026-11-08

Read from the code (`STANDARD_INSPECTOR` in `src/app.ts`, and which widgets call `openConfigDialog`), and weighed by
use: how many of the **30 workflows** in the published example projects use each widget. **24** of the widgets
appear in them.

| Widget | Workflows using it | Input lists | Six-section Inspector and standard dialog |
| --- | --- | --- | --- |
| table_input | 25 | no inputs | **yes**, 0.7.0 (2026-11-08) |
| table_output | 16 | standard, except its point layers in spatial mode | no |
| map_output | 12 | its own, in the layer manager | **yes**, 0.21.0 (2026-11-09) |
| select_rows | 11 | standard | **yes**, 0.4.0 (2026-11-08) |
| study_area | 10 | no inputs | **yes**, 0.7.0 (2026-11-09) |
| chart_output | 7 | standard, except its reasoning input | no |
| polygon_input | 7 | standard | no |
| join_table_to_area | 7 | standard | no |
| two_by_two, study_design | 6 each | standard | no |
| point_input | 5 | standard | no |
| group_table | 5 | standard | **yes**, 0.3.0 (2026-11-08) |
| relate_table | 5 | standard | **yes** |
| rate | 4 | standard | **yes**, 0.4.0 (2026-11-09) |
| derive_value, regression, find_satellite_products, search_satellite_catalog, sample_satellite_files_at_points | 4 each | standard | no |
| stack_polygons, map_image_input, append_rows | 2 each | standard | no |
| case_series | 1 | standard | no |
| apply_ruleset | 1 | standard | **yes**, 0.8.0 (2026-11-08) |

**1 of 24** widgets in use met the standard on 2026-11-08, Relate; of the 13 used in five or more workflows, 1. Select rows followed the same day, so **2 of 24**; Table input, the most used, made **3 of 24**; Total within groups, touched for [191](191-shares-within-groups.md)'s shares, **4 of 24**; Apply ruleset, touched for [192](192-is-not-and-otherwise.md), **5 of 24**; Map, touched for Sierra Leone, **6 of 24** (the practitioner, 2026-11-09: *"Standardization for widgets when we touch them, always"*). Deduplicate records, touched for [193](193-relate-allows-for-spelling.md), moved the same day; no example uses it, so the count of widgets in use stays **6 of 24**. Rate and Study area, touched for Sierra Leone's district rates the same day, made **8 of 24**. Table, touched for [195](195-the-sea-level-example-reports-a-sea-level.md), made **9 of 24**, counted against the 24 of 2026-11-08. The standard input lists
are one function every step shares, so they reach every step with inputs except where a widget draws its own.

## What would close it

The practitioner, 2026-11-08: *"moving them to the standard is how we close 186."* So 186 closes when **every widget
in use** has the six-section Inspector and, where it has settings, the standard dialog, taken in order of use. A
widget derive_value's retirement in [188](188-rules-that-compute-and-show-their-table.md) retires, is not moved.

**`tried`** was reached with Relate: its Inspector and dialog meet both standards and its tests and the Brazil
manuals pass against them.

**`validated`** when every widget in use is moved, the table above is recounted with every row *yes*, and a check
fails for any Inspector that adds a section outside the six, or orders them differently, or any configuration dialog
that departs from its shape.

**Table input, a source and a dialog that is a workflow of its own.** Its import dialog kept its steps (file, shape,
keys, values, unit, Before and After) and took the standard frame around them: heading, ×, the message slot, Cancel
and Apply. Rewriting its body as Settings, Preview and Decisions was not attempted. *Fetch the table* moved out of a
notice into Settings: in the dark theme, inline in orange text, it did not read as a button (the practitioner,
2026-11-08).

**The order:** Select rows (11), Join to area (7), Chart (7), then the rest by use; Table output after Sierra Leone, as
the practitioner set it.

**And whenever a widget is touched.** The practitioner, 2026-11-08: *"As we touch widgets let's be opportunistic and
standardize them."* A widget changed for any reason moves to the standard in the same pass, whatever its place in the
order above; Find health facilities ([190](190-find-health-facilities-from-a-list.md)) is the first. Table input, Study area and
Polygon layer are sources, with no Inputs section; Map output keeps its layer manager as its Inputs.

## What this does not establish

That six sections are the right six; that every widget's settings fit a dialog without losing something a person
needs to see beside the canvas; that a predictable Inspector reduces overload — that is the practitioner's
expectation, and the reason, not a finding.
