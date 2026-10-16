# 117 — Data quality: what a file will not tell you, and what to do about it

_Created 2026-10-16 · Updated 2026-10-16_

**Status:** tried — a **data quality dialog per input widget** profiles every column, offers one
repair and takes it back, and the rest of the scope below is open. The practitioner, 2026-10-16: *"We should also offer
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
| **Missingness** | the *pattern* of what is absent — how much, where, whether it clusters | **built** — drawn per record in file order |
| **Data shapes** | outliers, frequency, distribution | **built** — distributions with the fence drawn where it falls; no outlier *action* |

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

**A shapes-and-gaps tab**, added 2026-10-16 at the practitioner's request. It answers the thing
this record had listed as open: a count of absences is not a description of them.

- **A nullity matrix**, adapted from missingno: every column against the same records, so two
  columns that go missing together can be told from two that do not, with a completeness
  sparkline that makes the worst *records* findable. Opening workflow D shows its damage is
  *every fourth record* — perfectly periodic, so systematic rather than random. "63 of 250"
  cannot tell anyone that.
- **How much of each column arrived**, as a bar each.
- **A distribution** per numeric column, equal-width bins, with the 1.5×IQR fence drawn where it
  falls rather than reported as a number to work out.
- **Frequencies** per category — except where every value is unique, which is named as an
  identifier instead, because five bars of one is a chart with nothing to say.

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

The practitioner asked, 2026-10-16: *"What I am not sure of is if data quality issues can happen
post-processing as a consequence."* This record first answered **yes, and they are the worse
kind**, with a table of six widgets said to create them. The practitioner then took the table
apart, and it did not survive. What follows is the corrected version, because the first one
mushed four different things together under one word.

| Step | First claimed | What it actually is |
| --- | --- | --- |
| **Snap to network** | moves every site; a quality problem | **a redundant primitive.** Its own header reads "which network node each site attaches to, and how far that is from the site" — D2's first row, *nearest-neighbour with distance*, already implemented three times. It is a fourth, and the access leg it records is explicit, so nothing is lost to account for |
| **Isochrone / catchments** · sites that reach nothing | a quality problem | **a finding.** The site genuinely has no road access within the budget. That is a result about the world |
| **Isochrone / catchments** · routes charged a straight line | a quality problem | **a method artifact** — the step asserts a walk that may not exist. Not the data's fault and not a finding; a property of how the answer was produced |
| **Cases by period** · unparseable dates | a quality problem | **a quality problem.** Stands |
| **Apply ruleset** · no rule matched | a quality problem | **an ELSE, and still a bin.** A ruleset may decline to classify ([65](65-ruleset-as-data.md)); the record is classified as "none of these", which is a category. Reporting it as a shortfall rather than naming it as a bin is a presentation defect, not a data one |
| **Apply ruleset** · unreadable values | a quality problem | **a quality problem, or file corruption.** Stands — it is this experiment's subject |
| **Reproject, hull, aggregate** | "produce values that were in no file" | **badly put, and not a quality problem.** It meant that a projected coordinate, a hull, a centroid or a cell count is *computed rather than observed*. That is a derived-versus-observed provenance concern, which this project already marks, and it has no business in a table about data quality |

### What that costs the argument

The corrected table has **two** genuine data-quality rows, and both are about values that arrived
wrong in a file: a date that will not parse, and a number written as text. Everything else is a
finding, a method artifact, an implicit category, or provenance — each with its own existing
treatment.

So the claim this record made — that quality degrades most invisibly downstream, therefore
inspection should be bound to anything carrying records — **does not follow from the evidence it
cited**. The practitioner's original proposal, a data-quality dialog **per input widget**, is
better supported: genuine quality problems overwhelmingly originate in files, and a file is what
an input widget holds.

### Keeping the original, which is what makes the rest safe

The practitioner, 2026-10-16: *"A processing stage problem can be mitigated by keeping the
original file not overwriting it. Like pandas or geopandas, there is always an option to use a
copy, not the original."*

This landed on code written the same day. The repair built above **rewrote the input node's
stored properties**: after it ran, the `"3"` the file held was gone from the saved workflow and
the only evidence it had existed was a count in the receipt. Undo recovered it; nothing else
did. A workflow exported at that moment carried altered records described as imported ones.

A repair is a **declaration** now — which column, read as what — applied to a copy at the moment
the records are handed on. What the node holds stays byte for byte what was imported, so
removing the declaration restores the original without an Undo and without re-importing. The
run still sees the repaired values, and the receipt still states what was done.

That also settles the graph's wider behaviour, which was never in doubt but had not been stated:
every step here produces a new value and the inputs persist, so no step overwrites its source.
The repair was the one place that did, and it no longer does.

The one observation worth keeping from the first version is narrower than it was stated, and is
about method artifacts rather than quality: a straight-line charge, like a snap displacement, is
destroyed by the step that creates it unless the step chooses to keep it. That is an argument
for those steps recording what they did, which they already do, and not an argument about where
data quality is inspected.

**Not to be confused with [experiment 51](51-dataset-profiles.md)**, which uses "profile" for
something else entirely: which *classes of dataset* a problem type requires. One is about
planning what to obtain; this is about what arrived.

## A sideways look at missingno

The practitioner, 2026-10-16: *"There's a Python library called missingno that draws great data
quality visuals."* The same **sideways** move as [116](116-model-builder-sideways.md) — *does the
thing we are building already exist, and what did they learn that we have not?*

**What this is read from, and its limit.** The library's documentation and summaries of it.
Nobody here has used it or read its source. What is adopted below is an idea, not an
implementation, and a concept taken from documentation is a concept taken from its description.

missingno (Bilogur) draws four things. Two were worth taking, two were not:

| | What it is | Taken |
| --- | --- | --- |
| **Matrix** | the nullity pattern row by row, revealing patterns *within and between* columns | **yes** — and it corrected a real defect |
| **Bar** | per-column completeness, the same information in a simpler form | **yes** |
| **Heatmap** | nullity *correlation* between pairs of columns, −1 to 1 | no, with a condition |
| **Dendrogram** | columns clustered by nullity, for datasets too wide for the heatmap | no |

### What the matrix corrected

The drawing built an hour earlier put each column in **its own figure**. That shows the within-
column pattern and makes the between-column one invisible: two columns that go missing together
looked exactly like two that never do. missingno's matrix shares one row axis across every
column, which is the whole point of drawing it as a matrix rather than as strips, and the fix
was to do the same. The completeness sparkline down the right is theirs too — it makes the worst
*records* findable, where everything else here is organised by column.

### What was declined, and the condition on one of them

**Nullity correlation** is genuinely informative and was left out for two reasons. It is only
defined for columns that are *partially* missing — a column with no absences, or nothing but,
correlates with nothing — and this project's example data has one such column, which makes the
plot degenerate rather than wrong. And it is a correlation between *indicator vectors*, not
between the data: reading "these two columns are 0.8 correlated" as a statement about the
measurements is an error the picture invites. It is worth building when there is data with two
or more partially-missing columns to exercise it, and not before.

**The dendrogram** clusters columns by nullity for datasets too wide to read as a heatmap. An
input here has a handful of columns; the matrix shows what the dendrogram would summarise.

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
- **That the missingness drawing says what the pattern MEANS.** It shows where marks fall in
  file order, which is the only order available. If the records are sorted by date a run is a
  period; if the order is arbitrary the same run is a coincidence, and nothing here can tell
  which. Drawing it against a date or a region — the question actually worth asking — needs a
  column declared as that, and is not built.
- **Anything about whether this catches the problems real files have.** The only files tested
  are Snow's, one of them damaged deliberately by this project.

## What would close it

1. The three unbuilt scenarios have a stated decision each: what the application offers for
   missingness and for data shapes, or a recorded reason for offering nothing.
0. ~~The per-input data-quality dialog is built~~ — done 2026-10-16, on the scope the
   practitioner proposed and this record wrongly argued against. It inspects, repairs, and
   **removes** a repair, because a repair that cannot be taken back is a decision a practitioner
   cannot revisit.
0. `snap_to_network` is reconsidered against D2 rather than left as a fourth implementation of
   nearest-neighbour-with-distance, and the outcome recorded wherever D2 is settled.
0. A ruleset's unmatched records are presented as the bin they are, rather than as a shortfall.
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
