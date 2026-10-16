# 117 — Data quality: what a file will not tell you, and what to do about it

_Created 2026-10-16 · Updated 2026-10-16_

**Status:** tried — the quick look profiles every column, one repair is offered and recorded,
and the rest of the scope below is open. The practitioner, 2026-10-16: *"We should also offer
correction options for different scenarios — missing data, missingness, mixed data types — and
increase awareness of data shapes, including outliers, frequency analysis, etc."*

## The question

A ruleset classifies records against bindings a practitioner declared. Everything it concludes
rests on values being what they were said to be, and until now this application found out at the
last possible moment: the rules ran, a quarter of the records came back `Unrecorded`, and the
step reported how many afterwards.

So: **where should a file's problems be discovered, and what can somebody actually do about
them from inside the application?**

Not a rhetorical question. The alert this replaced ended with advice that had no in-app path in
it — *"correct the column at its source, bind it to a kind the values actually are, or accept
the count"*. The first sends a practitioner out of the application to edit a file that may not
be theirs; the second silently guts the rules, because `is more than` is not offered for a text
field and the bands collapse to equality matches; the third is publishing with a quarter of the
records unclassified. **A refusal nobody can act on is a dead end**, and that is what prompted
this.

## What the practitioner asked for

Four things, of which one is built:

| | | |
| --- | --- | --- |
| **Mixed data types** | a numeric column holding `"3"` | **built** — profiled, marked, and repairable |
| **Missing data** | no value recorded | profiled; no repair offered, and the reason matters (below) |
| **Missingness** | the *pattern* of what is absent — how much, where, whether it clusters | counted per column only |
| **Data shapes** | outliers, frequency, distribution | **built** for numbers and categories; no outlier *action* |

## Where the opportunity is, and why it is the quick look

Three surfaces could carry this. The quick look modal won on one argument: it is where the data
is already presented as-is, so the offending values are in front of the person deciding.

| Surface | For | Against |
| --- | --- | --- |
| **Quick look modal** | the rows are already there, and it is wide | needed the bindings passed in; it knew only columns and rows |
| Binding table in the ruleset Inspector | where the kind is *declared*, so where the mismatch is created | 292px — you cannot see the values that are wrong |
| "Prepare input data" | architecturally the home for typing columns, and it already validates | upstream of the ruleset; you must know to go back |

## What a repair has to be, in this application

The units work set the precedent and it applies unchanged: **refuse rather than convert**. A
cast that silently turned `"3"` into `3` would be the same class of act as silently converting
minutes to hours — reinterpreting somebody's data without telling them.

So a repair here is:

- **practitioner-initiated** — never automatic, never on import;
- **counted before and after** — `61 cast, 2 could not be read`, naming what it could not;
- **recorded** — `fw:ColumnRepair` in the receipt, declared in the ontology, beside the
  `fw:ReadingProblem` it answers;
- **undoable**, because it is an ordinary change to the workflow;
- **never a write to the source file.**

That last point is why this is a declared repair on the input node and not an edit. The file
stays what it was, and the workflow says what was done to it.

## Why no repair is offered for missing data

Deliberate, and the most important line in this document. A missing value has no correct
replacement that this application could choose. Filling it with a zero, a mean, a neighbour's
value or a last-observation-carried-forward is **imputation**, and imputation is a modelling
decision with consequences that belong to the practitioner and their method, not to a widget's
convenience. Offering it beside a type cast would put a statistical choice and a clerical fix on
the same footing.

What is offered instead is **awareness**: how many are missing, in which columns. A rule that
concludes `Unrecorded` for those is already the honest handling.

## What is built

**Column profiles.** Every column in the quick look carries what the file says about it:

- the values that do not match a declared kind, marked in the cells and counted in the header;
- how many values are absent;
- for numbers: minimum, median, maximum, and a count of **outliers** by the 1.5×IQR rule;
- for categories: the most frequent values and how many distinct ones there are.

The IQR rule is chosen because it states its own assumptions: it is a rank-based fence, it makes
no normality claim, and a count of points beyond it is a *prompt to look*, not a finding. The
profile says "7 beyond 1.5×IQR" and never "7 outliers", because whether a value is an outlier is
a judgement about the thing measured.

**One repair.** `Read these N values as numbers`, on a column whose binding declares a number
and whose values include numeric text.

## Can a quality problem arise *after* processing?

The practitioner, 2026-10-16: *"What I am not sure of is if data quality issues can happen
post-processing as a consequence."* They can, they do, and **this project has been answering it
one widget at a time without noticing that it was one question.**

| Step | What it does to the data | Recorded today |
| --- | --- | --- |
| **Snap to network** | moves every site to a junction — a pump in a yard is now on the road | the distance each site moved, and an alert past the snap limit |
| **Isochrone / catchments** | some sites reach nothing; some routes are charged a straight line | `unconnected`, `offNetwork`, as a node alert |
| **Cases by period** | a record whose date cannot be parsed is in no bin at all | `undatedRecords` and the list of them |
| **Apply ruleset** | a record no rule matched carries no conclusion | `fw:unmatchedSubjectCount` |
| **Apply ruleset** (this experiment) | a value it could not read is treated as absent | `fw:ReadingProblem` |
| **Reproject, hull, mean centre, aggregate** | produce values that were in no file | partially, per widget |

So the answer is not merely yes. It is that **the downstream problems are the worse kind**, for
a reason worth stating plainly:

> An input-stage problem is visible and permanent. The `"3"` is still in the file; it can be
> looked at tomorrow. **A processing-stage problem is destroyed by the step that creates it.**
> Once a site is snapped, its coordinates *are* the junction's, and nothing in the output says it
> travelled 200 m to get there. The only surviving record is whatever the step chose to keep.

That is why `snap_to_network`'s manual says to check the snap distance every time, and why the
step records it at all. Each of those widgets reached the same conclusion independently and
invented its own vocabulary for it. The consolidation — one frame for "what this layer will not
tell you", wherever the layer came from — is not built.

### What follows for where the dialog lives

The practitioner proposed a data-quality dialog **per input widget**. The evidence above argues
for inspecting anything that carries records, with one asymmetry that falls out naturally:

- **Inspect everywhere.** A derived layer has quality properties, and they are less visible than
  an input's, not more.
- **Repair only at the source.** A derived layer cannot be repaired — there is nothing to
  correct, only a step to re-run. The repair belongs where the records are held, which is the
  input, and on a derived layer the dialog should say where to go instead of offering a button
  that cannot work.

Neither is built. `profileColumn` is already generic — it takes columns and rows and knows
nothing about inputs — so the obstacle is the plumbing and the frame, not the statistics.

**Not to be confused with [experiment 51](51-dataset-profiles.md)**, which uses "profile" for
something else entirely: which *classes of dataset* a problem type requires. One is about
planning what to obtain; this is about what arrived.

## What this does not establish

- **That the profile's summary statistics are the right ones.** Min, median, max and an IQR
  fence were chosen because they survive a skewed distribution and need no parameters. Nobody
  has checked them against what a practitioner looks at first.
- **That the IQR count means anything in a worked example.** Snow's per-building deaths are
  counts with a long tail; the fence flags the dense addresses, which is a property of the
  distribution and not a data-quality problem. Reading it as one would be a misuse this document
  cannot prevent.
- **That a practitioner would find the repair before running.** Every path to it today goes
  through the quick look, which somebody has to open.
- **That missingness is addressed.** Counting absences per column is not a description of their
  pattern. Whether they cluster in a period, a region or a source is the question, and nothing
  here answers it.
- **Anything about whether this catches the problems real files have.** The only files tested
  are Snow's, one of them damaged deliberately by this project.

## What would close it

1. The three unbuilt scenarios have a stated decision each: what the application offers for
   missingness and for data shapes, or a recorded reason for offering nothing.
0. A decision on scope: whether quality inspection is bound to input widgets, as proposed, or to
   anything carrying records, as the evidence above argues. Until that is settled the dialog
   should not be built, because the two answers produce different dialogs.
2. A repair is reachable from where the problem is *reported*, not only from the quick look —
   the alert naming 63 unreadable values should lead to the thing that fixes them.
3. A file the project did not author is profiled, and what the profile missed is written down.

## What changed our minds

The repair was going to be an automatic cast at import — the plan recorded as option (a) when
the practitioner asked how a CSV distinguishes absent from unreadable. Writing it down against
the unit precedent killed it: the same argument that forbids converting minutes to hours forbids
converting `"3"` to `3` without saying so. The practitioner's question — *"how will the user
resolve it in the widget UI modal dialog?"* — then located the remedy where the values already
are, which is a better answer than the one being designed.

A second change, smaller: a CSV cannot have mixed types at all. Every cell is text and the
quotes are syntax, so `3` and `"3"` are the same value, and `dataTable` already casts the value
column at import and refuses a non-numeric cell by row number. Mixed types are a property of
**typed** formats — GeoJSON properties, spreadsheets, databases — which is where this work
belongs and where it had not been done.
