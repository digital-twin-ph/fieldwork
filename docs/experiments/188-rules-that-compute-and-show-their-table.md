# 188 · Rules that compute a column, and show it on the table

_Created 2026-11-07 · Updated 2026-11-11_

**Status:** tried (Fieldwork 0.55.0, 2026-11-08). All five stages built; Derive a value retired. Not `validated`: the
three checks below pass in Chromium, WebKit runs in CI, and South London has no build from an empty canvas to play
back.

| Stage | What | State |
| --- | --- | --- |
| 1 | The authored tree evaluated directly; a conclusion can be a computed value | Built |
| 2 | A wide table read as one record per subject; computed values folded back as Derive a value adds them | Built |
| 3 | The dialog: computed conclusions, a rule for every record, a live Before and After | Built |
| 4 | Sort, and rules between rows | Built |
| 5 | Rebuild Nigeria and South London; the synthetic repository's workflows; retire Derive a value | Built |

## The question

The practitioner, 2026-11-07, on the rules dialog: *"I find the rule set editor a little bit dry, maybe the preview
would help, like the before and after of table processing."* Then, after reading how `DEFINE` and `ASSIGN` were split
between two widgets: *"What if we combine derive value and apply ruleset? What if apply ruleset can also create new
columns to save new compute value?"* And the condition on it: *"The problem with ruleset is the surface assumes a wide
table so the user (an epidemiologist) can recognize what the rule does to his wide tables."*

## Where things stand

Read 2026-11-07 from `src/rule-editor.ts`, `src/authored-rules.ts`, `src/derive-value.ts`, `src/data-table.ts` and
[the classic analysis commands audit](../audits/epidemiology-commands-and-our-widgets.md).

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

with each side a column or a typed number, and the four operators Derive a value has. A rule with no condition
applies to every record, which is what Derive a value does today.

**N3 is not an obstacle.** The practitioner, 2026-11-07: *"But we cannot let N3 be an obstacle to functionality."*
So the rules the dialog builds, a tree of conditions and conclusions, are what the step runs, and N3 is one way of
running them, not the limit on what can be written:

- **Where a rule can be written in N3, it is**, and the reasoner runs it, as today: a classification with its
  receipt. Arithmetic compiles to N3's own (`math:difference`, `math:sum`, `math:product`, `math:quotient`), as
  comparisons already compile to `math:greaterThan`.
- **Where it cannot**, such as a row that reads the previous row after a sort, a condition on a value being absent,
  or a nested expression, the step evaluates the same tree directly, and records a computation receipt, as 15 kinds of
  step already do without N3.
- **Both give the same answers where both apply**, checked by a test, the way B1 checked the compiler against the
  reasoner in [106](106-rule-builder-ui.md).
- **What the dialog offers is decided by what a workflow needs**, not by what N3 can express. The fixed form of
  conditions, *(a and b) or (c and d)*, stays while it is enough; it is not a reason to refuse a rule.

**3. Apply ruleset outputs a table**, so it gets the Before and After view every table step has, and anything
downstream reads the new column.

**4. The dialog previews, live, as rules are edited:**

- **Before:** the wide table as imported, with the columns the rules read.
- **Sorted**, only when the step sorts: the same rows in the named order (see 5).
- **After:** the same rows, with each new column, and a **Rule** column naming the rule that matched.
- Rows no rule matched, and rows two rules gave different values, are said in words as well as marked, so nothing
  rests on colour alone.
- Each rule shows how many rows it matched: "Rule 2 · 14 rows".

**5. A rule can read the previous row.** The practitioner, 2026-11-07: *"We can test the rules that act between
subsequent rows also with a synthetic data set. One example is where rows have a column that records cumulative
values."* A file with one row per place and week, recording cumulative cases, gives new cases as

> then **new cases** is **cumulative cases** minus **cumulative cases** in the **previous week**

"Previous" needs an order and a group, so the rule names both: the date column it is ordered by, and the columns that
say whose rows these are (the place). In a file that is wide by period (`cum_w1`, `cum_w2`, …) the same sum is within
one row, and needs nothing new.

**That order is a classic analysis package's `SORT`, and it is a prerequisite.** The practitioner, the same day: that a SORT function exists to draw on Then: *"For between rows computation we can prerequisite table sort on a column. In cumulative values
a date time column would be a candidate."* The [commands audit](../audits/epidemiology-commands-and-our-widgets.md)
records `SORT` as wanted and unbuilt: a chart has a bar order, a table none.

- **A rule between rows needs the table sorted on a named column.** Until one is named, the rule does not run, and the
  step says why. The order is never taken from the file, because a file's row order is not a declaration.
- **Date and time columns are offered as the candidates**, first, because a cumulative count accumulates over time.
  Any other column can still be chosen.
- **The sort is inside Apply ruleset**, as the step that prepares its input table for the rules. The practitioner,
  2026-11-07: *"Sort can be inside ruleset as a way to prepare the input table for rule application. The preview
  then can show before, sorted, after. If no sort then it's just before and after."* No Sort step on the canvas.
- **The preview has three tables when there is a sort:** Before (as it arrived), Sorted (in the named order, grouped
  by whose rows these are), and After (with the new columns). Without a sort, it has Before and After.

What a rule between rows must keep, each said and none refused:

- **The first row has no previous one.** Its value is empty, and counted, as a division by zero is.
- **A missing period.** Whether "previous" means the previous period or the previous row recorded is the
  practitioner's choice, stated on the step; the preview shows which rows it changed.
- **A cumulative value that falls**, from a correction in reporting, gives a negative count. It is flagged on the row
  and in the run, and kept as computed.
- **Two rows for one place and period** have no single previous row. They are named, and the rows after them get no
  value rather than a guessed one.

**What the computed column must keep:**

- **A unit.** Describing the new column is the practitioner's step; the unit check that runs on every edit covers it.
- **Division by zero, counted.** Derive a value gives an empty value. In N3 the rule would not fire and the row would
  silently get nothing, so the run and the preview count these rows and name them.
- **Conflicts, shown.** Two rules giving one row different values is shown in the preview and reported by the run.

## Stages 1 to 3, as built, 2026-11-08

**Evaluated directly, and held to the reasoner.** `src/rule-evaluation.ts` reads a record as `authoredFacts` writes it
and applies rules until nothing new is concluded, so one rule reads another's value whatever their order. A ruleset
with any computed conclusion runs this way; a ruleset of categories only still compiles to N3, as before. On the
synthetic clinic visits, every comparator and a setting among them, the two give the same conclusions for every record
(`tests/rule-evaluation.test.mjs`). Arithmetic is not compiled to N3: whether EYE's arithmetic matches JavaScript's to
the last digit stays unchecked, and with direct evaluation it no longer decides anything.

**Derive a value's table, exactly.** All four published Derive a value steps, three in South London and one in
Nigeria, were run beside an Apply ruleset step with one rule for every record, the same operands, operator and name.
The two tables are the same rows, keys and values, in the same order (`tests/rules-replace-derive.test.mjs`). The
rule names no `measure`: a wide import now marks its table with its measure and subject columns, and rules read one
record per subject. Two of the four reach the rule through Total within groups, which keeps the mark when the measure
is among its groups.

**What the table cannot show is said.** A division by zero is an empty value, as Derive a value writes it, and is
counted and named; a missing operand, no value; two rules disagreeing, no value, both rules named. The run's method and
the dialog say each in words. A conflict between categories in a ruleset that compiles to N3 still stops the run, as
before.

**The dialog.** A conclusion is *a category* or *a computed value*; *+ Add a value computed for every record* writes a
rule with no condition; a rule's heading says how many records it matched. Before and After are drawn under the rules
for the first 50 records, the counts of all of them. Read on the synthetic districts in Chromium and WebKit
(`tests/rules-compute-preview.browser.mjs`).

**Found while building it:**

1. **A table's numeric key columns cannot be read as numbers by a rule.** A row's key columns are text, so a rule
   bound to one as a number read every value as unreadable. A wide import is now read as numbers per subject, which
   is the case 188 needed; a long table whose numbers sit in key columns is not.
2. **Apply ruleset had no manual page.** Written.
3. **The preview sits under the rules**, so with several rules it is out of view while a rule is edited. The
   practitioner, 2026-11-08, asked whether it should stay under the rules or sit beside them: *"Under rules"*.
4. **50 rows drawn is a chosen number**, not measured.

## Stage 4, as built, 2026-11-08

**A rule can read the previous row.** Either side of a computed value can be a column *in the previous row*: *new
cases* is *cumulative_cases* minus *cumulative_cases in the previous row*. Evaluated directly, in the step's order, so
the previous row's computed values can be read too.

**The sort is inside the step**, above the rules: *Sort by* a column, dates offered first; *Within each*, the columns
that say whose rows these are, ticked for every column that is not a date or a number the rules read; and *The
previous row is* the row recorded before, or the day, week or month before. A rule reading the previous row does not
run until a column is chosen, and the dialog says why. The preview is then Before, Sorted and After, and the table
comes out sorted.

**Every case in the synthetic file, under both meanings, as worked by hand.** `data/cumulative-cases-by-week.csv`,
40 rows out of date order, against `expected/new-cases.csv` (`tests/rules-previous-row.test.mjs`): the sorted rows,
new cases for every row under *the row recorded before* and under *the week before*, and the reason for every row
that is not plain.

| Case | What the step does | Rows |
| --- | --- | --- |
| The first week of a place | No value: *the first of their place* | 4 |
| East has no row for 3 February | Under *the week before*, 10 February has no value: *no row for the previous week*. Under *the row recorded before*, it reads 27 January | 1 |
| South's count falls at week 7 | −2, kept as computed, and named: *fell below the previous row* | 1 |
| West has 27 January twice | Both rows, and every later West row, have no value: no single previous row | 2 + 6 |

The run's method names each, by place and week. The month before 31 March is 28 February, not 3 March. The dialog was
built and read in Chromium (`tests/rules-previous-row.browser.mjs`); WebKit runs in CI.

**Found while building it:**

1. **"Previous week" needs a date column.** On any other column it is refused with what to choose instead; the
   previous row recorded works on any column.
2. **A wide table is not sorted.** Its records are subjects, and a rule between them has not been asked for; the
   sort applies to a long table's rows and to points.
3. **Within each offers every other column**, the count column among them. Ticking a number would group by it, which
   no one is likely to want; it is offered rather than hidden, and not ticked.

## Stage 5, as built, 2026-11-08

**Nigeria and South London, rebuilt.** Each of the four Derive a value steps is an Apply ruleset step with one rule for
every record, the same two columns, operation and new column, each column's unit stated: proportion for DTP1 coverage,
as Nigeria's other rule already states it; a count for houses, deaths and people. Every output of the four workflows,
nine in all, gave the same rows before and after, by digest. Those digests are kept in
`tests/fixtures/derive-retired.json`, and `tests/rules-replace-derive.test.mjs` holds the published projects to them
now that Derive a value is gone. Nigeria's change in coverage is built through the rules dialog from an empty canvas
(`tests/nigeria-from-scratch.browser.mjs`). South London has no such build: it was checked by its outputs only.

**Derive a value is retired** (1.0.0), outright: nobody outside this project uses it. A saved workflow holding one
opens with it migrated to an Apply ruleset step with the same rule, stamped. It never recorded units, so the migrated
step asks for them before it runs, rather than guessing.

**The synthetic repository's workflows.** [example-workflows-rulesets](https://github.com/digital-twin-ph/example-workflows-rulesets)
holds four, built by its `manual.json` from an empty canvas (`tests/rulesets-from-scratch.browser.mjs`, Chromium), one
per data set. Each feature on the list under *What would close it* is reached; the last, a computed column's unit, from 0.56.0:

| Feature | Where | Reached |
| --- | --- | --- |
| A category under a condition; a value computed under one | Clinic visits: band, fever; a dose under 5 with a weight | Yes |
| A value for every row | Districts: houses without a death | Yes |
| A computed value read by a second rule | Districts: deaths per house, then × 10,000 | Yes |
| Every comparator, *is recorded*, *is not recorded*, a setting | Clinic visits | Yes |
| A unit that disagrees, refused while the rule is written | Clinic visits: a fever setting in °F against °C | Yes |
| A computed column with its unit described | Every workflow: each new column's unit, stated beside its rule (0.56.0) | Yes |
| A division by zero, counted and named | Districts: Harbour | Yes |
| New cases from a cumulative column, with a first week, a missing week, a fall and a repeated week | Cumulative cases, long | Yes |
| Rows no rule matches; rows two rules give different values | Districts: level | Yes |

**Found while building it:**

1. **A condition on a category never held.** A value typed for a category column, *clinic is Hillside*, was stored as
   the text "Hillside", which the compiler quoted; a record's category is the term `fwa:Hillside`. Neither the
   reasoner nor direct evaluation could ever match it. No test wrote such a condition through the dialog; the
   published rulesets write their terms by hand. Fixed: the value typed becomes the term.
2. **Every number column needed a unit**, not only those the rules read: Nigeria's wide table offers twenty years, and
   a rule on two was refused until all twenty had one. Now only what the rules read.
3. **No setting could be declared in the dialog**, so the feature *a condition against a step setting* could not be
   reached from an empty canvas. Added: name, value and unit.
4. **The Inspector of a step whose rules are written here had no Inputs list**, so it could be connected only by
   dragging to its port ([186](186-one-standard-inspector.md)).
5. **Unit words.** *years*, *kilograms*, *degrees Celsius*, *houses* and *deaths* were not recognised, so a unit typed
   as any of them counted as none.
6. **The run's notice said "could not be read as declared"** for values that are simply empty. From 0.56.0 it counts the two apart.

## A use on real data, from 185

Experiment [185](185-one-step-for-every-lag.md)'s lag chart is to be tried two ways (2026-11-07). The second needs a
column computed from a key column of Regression's table: *then weeks_before is (3 − shift_days) ÷ 7*. That is item 2's
computed conclusion on the Brazil models, beside the synthetic repo.

## What would close it

**The repository** is [example-workflows-rulesets](https://github.com/digital-twin-ph/example-workflows-rulesets),
created by the practitioner on 2026-11-07. It holds the synthetic data and the answers worked by hand; the
cumulative file is deliberately out of date order, so a rule that does not sort gives visibly wrong answers.

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
- a computed value read by a second rule (deaths ÷ houses, then × 10,000);
- each comparator offered, `is recorded` and `is not recorded` among them, and a condition against a step setting;
- a computed column with its unit described, and a unit that disagrees, refused while the rule is written;
- a division by zero, counted and named;
- new cases from a cumulative column, by place and week, with a first week, a missing week, a fall from a correction,
  and a repeated week among the rows;
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
- Whether a rule between rows can be written in N3 at all. Every compiled rule today is about one record (`?s`). If it
  cannot, the step evaluates it directly, which is not yet built either.
- Which receipt a reader trusts more, one from the reasoner or one from direct evaluation. Earlier the practitioner
  judged that nobody but the project opens N3 receipts.
- How a table that arrived long, with no wide import recorded, is shown. The design assumes each row is a record, as
  the file gives it; that is not tested.
- That a preview makes the dialog less dry. That is the expectation, not a finding.
- Which rows the preview shows when a table is large. Not designed; to be measured, not capped.
