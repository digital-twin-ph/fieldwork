# A classic analysis package's commands, against the widgets we actually have

_Created 2026-11-12 · Updated 2026-11-12_

**Status:** an audit, not a disposition. Nothing is renamed, built or retired by this document.
Every mapping below was read from its command list and from this repository's own
source on 2026-10-31; where something is inferred rather than read, it says so.

## Why this exists

Three table operations were found to be commands of a classic analysis package in a single day, each by needing one:

- `derive_value` is **DEFINE** and **ASSIGN** — named by the practitioner on 2026-10-31.
- `group_table` is **SUMMARIZE** restricted to `SUM` — found while trying to bound Dulwich, and
  its own comment had named the wrong command, `MEANS`, until the source was read.
- `relate_table` is **RELATE** — which that file already knew: its first line says so.

At three it stops being a coincidence. **This application arrived independently at a subset of a classic analysis package's Data and Statistics commands and named it inconsistently**: one widget carries the
command in its documentation, one carried the wrong one, one mentions it nowhere. A practitioner
who knows a classic analysis package has to rediscover each one by reading the implementation.

The practitioner, 2026-10-31: that since the epidemiology commands are exercised only in the South London example, Fieldwork could take the established command names and adapt the complementary command set This audit is the measurement that proposal needs. It is
deliberately not the proposal.

## What this audit is NOT measuring against, corrected 2026-10-31

This document first read as though a classic analysis package were a standard to be faithful to, and said so in a
dozen places. The practitioner corrected it the same day:

The practitioner, 2026-10-31, set parity aside: the original package was defunded long ago, and their own engine was an
exploration of translating it to a browser language, Rust and then WebAssembly, so it is no longer that package.

**So there is no reference implementation to agree with, and no parity to disclaim.** A disclaimer
defends against a comparison somebody might make; nobody can make this one against a defunded
product, and writing "no parity is claimed" implies a live standard where there is none.

**What survives the correction, and it is the part that mattered:**

- **The shape is worth keeping because it is TAUGHT**, not because a program printed it. The
  direction `recognisable-not-identical-an-epi-kernel-of-our-own` says this in its own words — the
  workflow is *"codified knowledge for field epidemiology practice. That is what they teach to
  FETP trainees in more than 80 countries. And to Epidemic Intelligence Services Officers at
  CDC."* The authority is the training; the software was how it was distributed.
- **The command names are worth taking** for the same reason: they are the words a trained
  practitioner already has, which is the naming rule this project keeps.
- **Not stating a label nobody has verified** stays right, and is what `conventionalLabelSource`
  actually protects: it refuses a fabricated label, which has nothing to do with parity.

**What changes:**

- an earlier engine of the practitioner's own is the practitioner's own Apache-2.0 translation of that codified practice into
  Rust and WebAssembly. Reusing its kernel is an ordinary dependency decision about one's own
  code, not an act of fidelity to a third party.
- The `original-program` arm of `CONVENTIONAL_LABEL_SOURCES` points at something unmaintained. It was built to
  mark the stronger claim; that claim may now be unreachable, which is worth recording rather than
  leaving as an aspiration.
- Wherever this repository hedges about agreement with another package, it is hedging about the wrong
  thing. **Fourteen files carry the framing** and are listed as a sweep in TODO rather than
  rewritten here, because an audit measures and does not dispose.

## What the command set holds

`COMMAND_SET.md` lists **48 command rows** across seven legacy groups: Data 7, Variables 6,
Select/If 5, Statistics 8, Advanced Statistics 7, Output 7, User Interaction 4, plus Options.
Its own status column reads 23 `BV`, 11 `Gap`, 7 `Candidate`.

**That is a record of codified field-epidemiology practice, written down in the practitioner's
own translation of it — not a specification of ours and not a standard to match.** It is used here as
a map — a place to look when a workflow needs something this application lacks — and the
rule that decides what gets built is unchanged: D10 and the usage ledger admit a widget because a
worked example needs it.

## The mapping, measured

### Commands this application answers

| a classic analysis package | Fieldwork | How faithful |
| --- | --- | --- |
| `RELATE` | `relate_table` | brings a KEY column across on a matched key. a classic analysis package relates tables; this brings one column. Narrower. |
| `SUMMARIZE` | `group_table` | `stratifyBy`→`by`, and from 2026-10-31 `SUM`, `MIN`, `MAX` of eleven aggregates. Narrower, deliberately — see `AGGREGATES`. |
| `DEFINE` + `ASSIGN` | `derive_value` | defines one new value of a key column and assigns `left op right` over four operators. No constant operand, no condition. |
| `SELECT` | `select_rows` | keeps rows whose key column takes named values. |
| `TABLES` | `two_by_two` | the four cells and the estimates. a classic analysis package's TABLES also runs tests; those are not built. |
| `FREQ` | `chart_output` over a table | counts by category, drawn. Not a frequency table with percentages and cumulative columns. |
| `READ` | `table_input` | reads a long-format table. |
| `LIST` | `table_output` | shows records. |
| `GRAPH` | `chart_output` | bars only. |
| `MAP` | `map_output` | listed as `Gap` in an earlier engine's own column; this application's strongest area. |

### Commands with no equivalent here, that a workflow has already wanted

| a classic analysis package | What it would do | How it was found |
| --- | --- | --- |
| **`MERGE`** | combine two tables sharing a key so their measures sit in one column | the Dulwich bound needs Table XII's deaths beside Table VIII's populations, and `RELATE` carries categories, not values. Found 2026-10-31 by the by-hand test failing. |
| **`MEANS`** | a report of a measure by a cross-tab | named by `group_table`'s old comment as the command it was not |
| `RECODE` | band a value into categories | `apply_ruleset` takes the PATTERN and is not the command — see below. Not a gap. |
| `IF` | a conditional | the conditional half of ASSIGN. Rules express per-subject conditions; nothing expresses a conditional assignment into a table. |
| `SORT` | order rows | `chart_output` gained a bar order on 2026-10-31; the table has none. |

### Commands out of scope, and why it is worth saying

`REGRESS`, `LOGISTIC`, `KMSURVIVAL`, `COXPH` and the three complex-sample variants have no
implementation here and none is proposed. The Output group — `ROUTEOUT`, `PRINTOUT`, `REPORT` —
is answered differently in kind: this application has a write-up assembled from machined and
authored notes, which is not a print stream. `DIALOG`, `BEEP`, `HELP` and `QUIT` belong to a
programming environment this is not.

## What the naming actually costs, measured

The practitioner's premise checks out, with two exceptions. Instantiations across every shipped
example and frozen fixture, 2026-10-31:

| widget | South London | elsewhere |
| --- | --- | --- |
| `derive_value` | 2 | — |
| `select_rows` | 2 | — |
| `relate_table` | 1 | — |
| `group_table` | 1 | — |
| `two_by_two` | 1 | — |
| `rate_ratio` | 1 | — |
| `rate` | 3 | not checked |
| `case_series` | — | **Hagelloch, John Snow** |
| `table_input` | 6 | **eleven workflows in all** |

So the set that is South-London-only is **six**, not the whole table group.

**And renaming is established machinery, not a cliff.** `RENAMED_NODE_TYPES` in `src/types.ts`
already maps six old types to new — `samples→point_grid`, `observations→point_input`,
`area→study_area`, `nearest→measure_distance`, `summarize_polygons→summarize_points_to_polygon`,
`hex_aggregate→aggregate_points_to_h3_cell` — and `validate:widgets` refuses a registry that
declares a rename the application does not perform, so a saved workflow migrates on open. This
audit corrects a claim made earlier the same day, that renaming would rewrite every saved
workflow holding the type. It would not; that is what the map is for.

## What this application has that the command set has no row for

An audit that only measured what is missing would be measuring in one direction. The practitioner,
closing the thread, named three things that have no entry in any of the seven legacy groups:

> FW also provided a better overarching framework for workflows — inputs, process, outputs.

> FW also made explicit the currency of those workflows — tables, points, polygons, rasters, study
> area, study design.

> and notes that become substrate for publications all resting on ontology foundations.

**A stage, not a sequence.** `STAGE_VERBS` declares ten — discover, acquire, extract, import,
check, compute, relate, summarize, classify, view — and the palette gates on the first of them: an
input must be on the canvas before anything that processes one is offered. A command language runs
top to bottom and a statement's place in the file is the only thing that says where it belongs.
Here the stage is declared, a composition states which one it is in, and the reveal measurement in
experiment 112 reads the same declaration the palette does.

**A declared currency, which the glossary calls a port type**: *"the declared name of what one
port carries, and the thing a connection is actually checked against"*. Seventeen of them —
`points`, `table`, `polygons`, `raster`, `area`, `design`, `network`, `decisions` and the rest.
a classic analysis package has one currency, the current dataset, and every command acts on whatever it is. **That
single fact is what makes the new economy above possible**: because what flows is typed and
checked, one widget can serve several commands' worth of work without ambiguity about what it is
acting on, and a wrong connection is impossible rather than reported afterwards. `design` is the
newest of them and was added on 2026-10-31 for exactly that reason — a study design is not a
table, and giving it the `table` port would have made it checkable only by convention.

**Notes that become the publication.** a classic analysis package's Output group is a print stream — `ROUTEOUT`,
`PRINTOUT`, `REPORT` — which sends a rendering somewhere. This application has no analogue and
does not want one. A note is machined by the step that earned it or authored by a practitioner,
it carries its section, its function and its edges, the write-up is assembled from the project's
notes at render time, and References is assembled from what those notes cite. **The output is not
a thing printed at the end; it is accumulated as the work is done.** That is why a forked note
keeps the wording it diverged from, and why a declared exclusion writes its own caveat into
Methods.

**And all of it asserts into an ontology.** Every step emits a receipt, the receipts are N3,
`validate:ontology-coupling` refuses a term the ontology does not declare, and a result can be
read as facts rather than as a rendering. A command language has no equivalent because it has no
need of one: its output is for a person to read, and once printed it makes no further claim.

**None of these is a gap this audit found. They are the reason the command set reads as a map
rather than as a specification** — four of the seven legacy groups describe a procedural
environment this application deliberately is not.

## What this audit does not establish

- **What a borrowed name obliges.** The first version of this section said a renamed widget must
  state that no parity is claimed. After the correction above that is defending against the wrong
  thing. What a shared name does oblige is narrower and still real: a practitioner who was taught
  `SUMMARIZE` will expect the aggregates they were taught, and this one offers three of eleven.
  The obligation is to say what is NOT there, which `AGGREGATES` already does, rather than to
  disclaim an agreement nobody can check.
- **That the mappings above are faithful.** Each row was read from one source file and this
  application's implementation. None was run side by side against a classic analysis package or an earlier engine of the practitioner's own, and
  the "how faithful" column is an argument rather than a measurement.
- ~~**Whether `apply_ruleset` is RECODE.**~~ **Withdrawn the same day — it was the wrong
  question.** See *What we are actually looking for* below.
- **That a split vocabulary is coherent.** This is a GIS studio as well as an epidemiological
  one, and `buffer_area`, `isochrone` and `study_area` have no equivalent in a classic analysis package. Adopting its names for the epi half produces a deliberately two-vocabulary palette. That may be right —
  each half named in the words of the practitioners who use it — but it is a decision somebody
  has to make, not a consequence of this audit.
- **That the command set should be completed.** It is a map of another application's surface.
  Building toward it as a target would invert the rule that a widget is admitted because a worked
  example needs it, and the budget already stands at 55 against a reference of 41.

## What we are actually looking for: patterns, not commands

The practitioner, closing the parity question: *"What we are looking for are the right patterns to
incorporate in FW."* And then the example that makes it concrete: *"The apply_ruleset widget is an
example of not seeking parity, if we think about geometry."*

**`apply_ruleset` is the proof that this already works.** It does what `RECODE` is for — declare
how values become categories, and keep the declaration where a reader can check it — and it does
it as authored rules compiled to N3 and run by a reasoner, over records that may carry geometry.
a classic analysis package had no spatial record to classify, so there is no command to be faithful to and nothing
was lost by not being faithful to one. The widget is recognisable in what it ACCOMPLISHES and
owes nothing to how the accomplishment was spelled.

So this audit's question *"is `apply_ruleset` RECODE?"* was the parity frame returning by the back
door. It treats a command as the thing. **A command is how a pattern was spelled; the pattern is the thing.**

Read that way, the mappings earlier in this document change meaning without changing content.
They are not a fidelity scorecard. They record which patterns this application has already
arrived at, which it has arrived at under a different name, and which it has not met yet:

| pattern | carried by a classic analysis package as | Fieldwork |
| --- | --- | --- |
| declare how values become categories, auditably | `RECODE` | `apply_ruleset`, over geometry too — **a wider realisation, not a narrower one** |
| name a new variable and say how it is computed | `DEFINE` + `ASSIGN` | `derive_value`, without a constant or a condition |
| aggregate within strata, emit a dataset | `SUMMARIZE` | `group_table`, three aggregates of eleven |
| bring one table's column onto another's rows | `RELATE` | `relate_table`, categories only — values are the gap |
| combine two tables sharing a key | `MERGE` | **not met** |
| the recognisable two-by-two: cells, margins, estimates, tests | `TABLES` | cells, margins and estimates; **tests not met** |

### One widget carried two commands, and that is the economy

The practitioner: *"And IF is in apply_ruleset, so in effect we combined two commands in one
widget, I think that's new economy."*

It is, and the count is arguably three. An `AuthoredRule` is
`any: [{all: [conditions]}] → then: [conclusions]`. The conditions ARE `IF`. The conclusions are
`RECODE` where they band a value into a category, and a conditional `ASSIGN` where they assert a
fact about a subject. a classic analysis package files those in two different groups — `IF` under Select/If,
`RECODE` and `ASSIGN` under Variables — because in a command language they are separate
statements. **In a rule language the condition and the conclusion are one form, so one widget
carries what three commands carried.**

**That inverts the widget-budget worry.** 55 widgets against a reference of 41 reads as inflation
only if a widget is the unit a command maps onto. It is not: `apply_ruleset` is one entry in the
palette and several entries in the command set. Counting widgets against commands measures the
wrong thing in the wrong direction, and the honest comparison — which this audit does not make,
because nobody has done the mapping for the spatial half — would have to count PATTERNS served,
not palette entries.

**And it shows where the split actually falls.** Fieldwork does not divide assignment by command;
it divides it by KIND. `derive_value` is arithmetic assignment — `DEFINE` plus an arithmetic
`ASSIGN`, unconditional, over numeric measures. `apply_ruleset` is categorical assignment —
conditional, over declared vocabulary, auditable as N3. a classic analysis package's line runs between statements;
this one runs between kinds of value. That is a substrate decision and it is why the two widgets
do not overlap despite sharing `ASSIGN` between them.

**So the measure of a good realisation is how many commands it collapses without losing what each
accomplished** — and the failure mode to watch is the opposite one, a widget that collapses two
commands and quietly drops what one of them did. `apply_ruleset` does not: the conditions are as
expressive as `IF` needs for a classification, and the conclusions are checkable in a way a
procedural `RECODE` never was, because they compile to facts with a receipt.

**The test for adopting a pattern is not whether a classic analysis package had it.** It is whether a field workflow
in this application needs it — which is the rule D10 and the usage ledger already enforce — and
whether this application's own substrate can realise it better than the command did. `RECODE` to
`apply_ruleset` is the case where the answer was yes and the realisation is wider.

## What a sweep of this would look for next

Whether `apply_ruleset` is RECODE; whether `rate` appears outside South London; and whether the
five commands in the "already wanted" table above are wanted by anything other than the one
example that found them.
