# 188 · Rules that compute a column, and show it on the table

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. Nothing is built; this is the design, read from the code. It comes after Relate's standard dialog
([186](186-one-standard-inspector.md)), so the preview reuses that dialog's Preview section.

## The question

The practitioner, 2026-11-07, on the rules dialog: *"I find the rule set editor a little bit dry, maybe the preview
would help, like the before and after of table processing."* Then, after reading how `DEFINE` and `ASSIGN` were split
between two widgets: *"What if we combine derive value and apply ruleset? What if apply ruleset can also create new
columns to save new compute value?"* And the condition on it: *"The problem with ruleset is the surface assumes a wide
table so the user (an epidemiologist) can recognize what the rule does to his wide tables."*

## Where things stand

Read 2026-11-07 from `src/rule-editor.ts`, `src/authored-rules.ts`, `src/derive-value.ts`, `src/data-table.ts` and
[the Epi Info commands audit](../audits/epi-info-commands-and-our-widgets.md).

- **The rules dialog shows no data.** It shows conditions, conclusions and a count of compiled rules. What the rules do
  to the records is seen only after the rules are kept and the workflow is run.
- **Table steps have a Before and After view**; Select rows also greys the rows it drops. Apply ruleset has none,
  because it declares no table output.
- **`ASSIGN` is split by kind of value.** Apply ruleset assigns a category, with a condition. Derive a value assigns a
  number: `left` minus, plus, times or divided by `right`, with no constant and no condition. A number assigned under a
  condition ("if age < 5, dose is weight × 10") fits neither.
- **Derive a value shows the long table.** The practitioner picks a key column (`measure`) and two of its values
  (`dtp1_2024`, `dtp1_2005`): the internal shape on the surface. Its two uses in worked examples are Nigeria (*What
  changed from 2005 to 2024?*) and South London (`houses` minus `deaths`, Table IX).
- **Wide is the default at the door** (practitioner, 2026-10-26: *"We have to assume wide in as default, that's the
  epidemiology mindset."*). A wide import records its subject columns, its value columns and its measure column, and
  `rate.fromTable` already turns the long table back into one record per subject.

## The design

**1. The surface is wide.** The dialog shows the table as it was imported: one row per subject, the columns as the
file names them. Rules read those columns. The long table stays inside: records are rebuilt from it as `rate` does,
the rules run, and the result is folded back in. Nothing on the surface says "key column" or "measure".

**2. A rule can conclude a computed value.** Beside "*band* is *Short*", a conclusion can be

> then **change 2005 to 2024** is **dtp1_2024** minus **dtp1_2005**

with each side a column or a typed number, and the four operators Derive a value has. It compiles to N3's own
arithmetic (`math:difference`, `math:sum`, `math:product`, `math:quotient`), as comparisons already compile to
`math:greaterThan`. A rule with no condition applies to every record, which is what Derive a value does today.

**3. Apply ruleset outputs a table**, so it gets the Before and After view every table step has, and anything
downstream reads the new column.

**4. The dialog previews, live, as rules are edited:**

- **Before:** the wide table as imported, with the columns the rules read.
- **After:** the same rows, with each new column, and a **Rule** column naming the rule that matched.
- Rows no rule matched, and rows two rules gave different values, are said in words as well as marked, so nothing
  rests on colour alone.
- Each rule shows how many rows it matched: "Rule 2 · 14 rows".

**What the computed column must keep:**

- **A unit.** Describing the new column is the practitioner's step; the unit check that runs on every edit covers it.
- **Division by zero, counted.** Derive a value gives an empty value. In N3 the rule would not fire and the row would
  silently get nothing, so the run and the preview count these rows and name them.
- **Conflicts, shown.** Two rules giving one row different values is shown in the preview and reported by the run.

## What would close it

**`tried`** when a rule can conclude a computed value in the dialog, the dialog previews Before and After, and the
Nigeria and South London workflows are rebuilt with Apply ruleset in place of Derive a value and their manuals play
back from an empty canvas.

**`validated`** when:

- every value of the rebuilt workflows equals Derive a value's exactly;
- a test fails if a division by zero leaves a row with no value and no count;
- a test fails if two rules give one row different values and neither the preview nor the run says so.

**Then Derive a value is retired, once the new Apply ruleset works.** The practitioner, 2026-11-07: *"If the new apply
ruleset works then we retire derive a value. "works" means we exercise the ruleset features in a worked example (repo)
with workflows using synthetic data sets."*

So "works" is not the two rebuilt workflows alone. It is a worked-example repository whose workflows exercise every
ruleset feature on synthetic data made to reach each one:

- a category concluded under a condition, and a value computed under one;
- a value computed for every row, with no condition;
- each comparator offered, `is recorded` and `is not recorded` among them, and a condition against a step setting;
- a computed column with its unit described, and a unit that disagrees, refused while the rule is written;
- a division by zero, counted and named;
- rows no rule matches, and rows two rules give different values, said in the preview and by the run.

Each workflow's manual plays back from an empty canvas, and a test rebuilds it. The data are synthetic so that every
case is present by design rather than by luck, and so the repository can be published without a source's licence.
Creating the repository is a human step; once it exists, it is pushed under the standing authorisation for example
repositories.

**`retired`** if either fails, recorded with what was tried:

- the wide records cannot be rebuilt from a table plainly enough that the Inspector needs no word for the long shape;
- the reasoner's arithmetic does not reproduce Derive a value's values exactly.

## What this does not establish

- That EYE's arithmetic matches JavaScript's to the last digit. Not checked.
- Arithmetic **between rows**: "this week minus last week" in Brazil's file, which is one row per municipality and
  week. A wide surface cannot say it, and nothing needs it yet. Recorded as a limit, not designed around.
- How a table that arrived long, with no wide import recorded, is shown. The design assumes each row is a record, as
  the file gives it; that is not tested.
- That a preview makes the dialog less dry. That is the expectation, not a finding.
- Which rows the preview shows when a table is large. Not designed; to be measured, not capped.
