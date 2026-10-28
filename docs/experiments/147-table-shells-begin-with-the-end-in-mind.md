# 147 — Table shells: begin with the end in mind

_Created 2026-10-28 · Updated 2026-10-28_

**Status:** asked — and the central question was answered on the day it was asked, by the practitioner, in the section below. What remains unanswered is narrower and is named there.

The practitioner, 2026-10-28, while the join work was in progress:

> Perhaps it would be better during input of tables to assign specific variables to intended
> computations. That way, downstream widgets that do table operations will have hooks into what
> those variables mean (context).

And then the name for it, which is not a new idea and should not get a new word:

> Epidemiologists are asked to create **table shells**, what data they will need and collect to
> carry out epidemiologic computations (begin with the end in mind).

A table shell is the empty table you intend to publish, drawn before any data exists: its rows, its
columns, and what is in a cell. The data you must collect follows from it. The glossary's rule
decides the vocabulary here — *"Where a public health term already exists, we use it"* — and the
term is used nowhere in this repository today.

**This inverts the proposal, and improves it.** Annotating the columns you happen to have is a
labelling exercise, and the first phrasing invited exactly the objection recorded below. Declaring
the table you intend is a different act: the computation is what fills the cells, the variables are
what the rows and columns are, and both are stated before the first file is opened.

## What exists today

Declarations at the door are about **data types**, and nothing else:

| Where | What it declares | For |
| --- | --- | --- |
| `attribute-schema.ts` | `type`, `allowedValues`, `defaultValue`, `label` | point records only |
| rulesets, via `declaredKinds` | `ColumnKind` — number, boolean | table columns |
| `table_input` | `keys`, `valueField`, `unit`, `distinctValuesFor` | the table's shape |

What a column **means for a computation** is declared nowhere, so every computing widget asks for
it again: `rate` takes `numeratorField` and `denominatorField`, `two_by_two` takes
`exposureColumn`, `exposed`, `unexposed`, `outcomeColumn`, `caseValue` and `nonCaseValue`,
`derive_value` takes `keyColumn`, `left` and `right`, `relate_table` takes `on`, `bring` and now
`measureKey`. The same fact about one column is entered up to four times in one workflow and the
four can disagree.

The glossary already names what this would serve. A **fitness condition** is *"what a widget
requires to be true of the provenance before it will run: an elevation whose reference can be
related to the projection's baseline; a denominator whose period covers the numerator's. Checked
against declarations, not against the numbers."* The conditions exist; the declarations they would
be checked against mostly do not.

## Four things that went wrong today, each a question a table shell answers

Not speculation. Each was met while building the relate panel on 2026-10-28.

1. **The machined note states two numbers where one matters.** Nothing says which variable is a
   numerator, so the note reports that a rate of `population_1851` over `deaths_seven_weeks` is
   multiplied by 1.1157 *and* the reverse by 0.8963. The figure anybody reads is the mortality
   rate. A declaration would let it state one.
2. **`measureKey` is guessed from a magic string.** `planRelate` falls back to a key column
   literally named `measure`, because that is what `wideDataTable` writes. It is right for tables
   this application melted and says nothing about anyone else's.
3. **`wideFrame` declines the real AR6 extract.** `site_id, scenario, basis, family, year,
   quantile, value_mm` — six key columns, 288 rows, long at source because the netCDF is
   dimensioned that way. Nothing can know which key should spread into columns, so Quick Look
   falls back to 288 long rows, which is the display this project has twice been told would get
   weird looks.
4. **The join's own context is re-entered.** `on` and `bring` are facts about what the two tables
   are keyed by, which the inputs already know.

## Fieldwork already draws shells, without calling them that

Not a greenfield idea here, which is the encouraging part:

- **`two_by_two`'s parameters are a table shell.** `exposureColumn`, `exposed`, `unexposed`,
  `outcomeColumn`, `caseValue`, `nonCaseValue` describe the four cells and their margins before any
  number is computed. It is a shell entered at the computing step instead of at the door.
- **`crossTab` renders one.** A table keyed by two columns is drawn as a grid with the categories
  across the top and down the left, which is the shape a shell is drawn in — and it declines,
  correctly, where the cells cannot be added.
- **The wide-table work is the same requirement from the other end.** *"In an epidemiology
  publication, it's also wide tables so there's that too."* A shell is a wide table, which is why
  the long storage had to be pivoted for display before any of this could look right.

**And a shell answers the pivot question, which nothing else does.** `wideFrame` declines the AR6
extract because nothing can know which of six key columns spreads into column headings. A shell
says: rows are `site_id`, columns are `year`, the cell is `value_mm` at this scenario, basis, family
and quantile. That is not extra information invented for the display — it is the table the
practitioner meant to produce. This is the one place where a shell is not merely tidier than asking
per widget; it supplies a fact the application cannot derive at all.

## The objection, and why the practitioner's phrasing survives it

A role is not a property of a column. `population_1851` is a denominator for a mortality rate and
a numerator for population per house; `deaths_1854` is an outcome in one question and a stratifier
in another. So "label each column with its role" would be wrong, and would be the kind of
vocabulary this project has to withdraw later — it already carries a withdrawn-term ratchet at 131
occurrences.

A table shell is not that. The role lives in the **shell**, not on the column: the same column is a
denominator in one shell and a numerator in another, and both shells can exist. A column in no shell
is declared by saying nothing. This is why the public health term is the better word for it — it
already locates the meaning in the intended table rather than in the data dictionary.

And that has a second virtue nobody asked for. Saying at the door what you intend to compute, and
from which columns, is a **pre-specified analysis** — which is what an FETP trainee is taught to
write before touching the data, and what keeps a result from being the best of forty tried. This
would put it where the data enters rather than in a protocol document beside the workflow.

## Settled: one declaration, two entry points

The practitioner, closing the question they opened:

> The shell works if user does not have data yet. The detection works if the user already has data
> and needs to augment it (hence a table join purpose) or to check whether it has what he or she
> needs to make those computations.

So the shell and the detection are not competing designs. They are the same declaration — what you
intend to compute and from which variables — entered at the two moments a practitioner can be in:

| You have | You need | The entry point |
| --- | --- | --- |
| no data yet | to say what to collect | **the shell**: draw the table, the requirements follow |
| data already | to augment it | **detection**: what is missing, and a join to bring it |
| data already | to check it | **detection**: does this carry what the computation needs |

**And the second row is a purpose statement for `relate_table`.** A join is not a generic table
operation that happens to be useful. It is the remedy for one finding: *this table lacks a variable
a computation I intend needs, and another table has it.* That is why the join's machined note
belongs in Methods — it records which variable was brought in and from where, which is the sentence
a reader needs in order to know what the analysis was assembled from.

The third row is a **fitness check moved to the data**. The glossary's fitness condition is about
provenance — *"a denominator whose period covers the numerator's"* — checked against declarations.
This is the same idea asked of the values: does this table carry a denominator at all.

## The hook above all three

The practitioner, continuing:

> Or instead of a table shell, the incoming tables can be inspected for columns important for those
> epidemiologic computations

> For example, what study design did John Snow apply to South London?

**Inspection has the stronger precedent in this codebase.** This application already detects the shape of an
incoming file, proposes a reading and makes the practitioner confirm it against a before and an
after — and that device exists because of a principle they stated: *"the user will have to play a
major validation role."* `column-profile.ts` is the machinery: per column it already computes
absent against missing-and-blank, distinct counts, frequencies, min/median/max, values beyond
1.5×IQR, and what a binding declared. Candidate detection is a reading of a profile, not new
infrastructure.

**One constraint decides its shape.** This application says twice, in the interface, that *"nothing
is guessed from a name"* (`app.ts:2463`, `app.ts:3276`). So inspection cannot look for a column
called `deaths` or `pop`. It has to work from VALUES — non-negative integers, cardinality of two,
a date, all-distinct keys, one column an order of magnitude larger than another — which is harder
and is the only version consistent with what the application already promises.

**And the study design is the hook above both.** The chain runs one way:

    study design → the computations it licenses → the variables they need
                 → what to look for in the incoming columns → the shells they fill

Which is why the question about Snow is the right test. **South London is two different designs,
and the repository contains both:**

| Workflow | Unit | Exposure assigned | Design |
| --- | --- | --- | --- |
| `water-company` — Table IX, deaths per house | the house | per house | retrospective cohort |
| `contingency` — Tables VIII × XII, by sub-district | the sub-district | per sub-district | **ecological** |

Snow called the whole thing a natural experiment — *"a ready-made experiment ... on the grandest
scale"*, which the example quotes — and he knew the second was the weaker reading. The purple wash
on his Map 2, *"the area in which the pipes of both Companies are intermingled"*, is exactly where a
sub-district-level assignment misclassifies, and experiment 145 already records that third feature
as *"the whole of Snow's design"*.

**The finding this produces is not about shells at all.** `contingency` is the chain this
experiment's sibling spent the day on: relate, group, derive, select, two-by-two, rate ratio. It
is an ECOLOGICAL analysis, and nothing in the application or in its output says so. The two-by-two
it draws is indistinguishable from an individual-level one, and the rate ratio beneath it carries
no caveat. Searched 2026-10-28: `cohort`, `case-control` and `ecological` appear nowhere in `src/`,
in the glossary, or in `widgets/*.json`.

A declared design is what would let the machined Methods note say it. The note already states what
was matched on what; it cannot state that `sub_district` is a group rather than a person, because
nothing tells it. That is the smallest version of this whole idea that does real work.

## The design licenses the computations, and nothing here checks that

The practitioner:

> Case control, cohort, cross-sectional studies carry with them pathways to specific epidemiology
> computations. So identifying the study design is key.

This is a stronger claim than "context for the widgets", and it is checkable. `two_by_two` computes
**risk in each group, the risk ratio with a Katz log interval, the odds ratio with a Wald log
interval, and the risk difference with an unpooled Wald interval** — and searched 2026-10-28,
`case-control`, `cohort`, `cross-sectional` and `estimable` appear nowhere in `two-by-two.ts`,
`epi-estimate.ts` or `rate-ratio.ts`. There is no gating of any kind.

What that means per design:

| Design | What the 2x2 licenses | What this widget would print |
| --- | --- | --- |
| cohort | risk, risk ratio, risk difference, odds ratio | all four — correct |
| **case-control** | **the odds ratio only** — no population at risk is sampled | all four, three of them not estimable |
| **cross-sectional** | prevalence, prevalence ratio, prevalence odds ratio | the same arithmetic under the labels `risk` and `Risk Ratio (RR)` |

So for a case-control table the widget prints three quantities that cannot be estimated from that
design, and for a cross-sectional one it prints the right arithmetic under the wrong names.

**The argument for why this matters is already written in this repository**, in the direction
`recognisable-not-identical-an-epi-kernel-of-our-own`, quoted at the top of `two-by-two.ts`:
*"training makes the misreading near-certain, and this is the mechanism: the layout shows the
statistics and not the subject."* The same mechanism applies one level up. The layout shows the
statistics and not the **design**, and a trained reader will supply a design from habit — which is
the failure the direction was written about, in a second place nobody has looked.

**And it leaves an open question on South London, which must not be confused with a settled one.**
`two-by-two.ts` records that the project's `rate_ratio` of 8.40 on houses sits beside a risk ratio
of 5.35 on people, and that the first explanation — rate versus risk — was **refuted** by lab check
30: a risk ratio over the same houses is 8.401853429780243, the rate ratio's value bit for bit. The
established cause of the 57% gap is the **denominator unit**, a house against a person, and nothing
here revises that.

What was not examined is that the two figures also differ in how exposure was assigned: per house
in Table IX, per sub-district in Tables VIII and XII. The second is ecological and misclassifies in
the zone Snow drew in purple, and misclassification of exposure biases a ratio **towards 1** —
which is the direction 5.35 sits in relative to 8.40. That is a hypothesis with a mechanism, not a
finding: the denominator already accounts for the gap, and nothing has been computed to see whether
anything is left over for misclassification to explain. A declared design is what would make the
question askable at all.

## Answered: the design supplies the terms

The practitioner, the same day:

> If we start with a study design the way we start with study area the workflow becomes more
> focused. The study area identifies the location (for a study it becomes part of the title). Then
> study design widget cascades metadata downstream for its computations. For example, during table
> input, the variables can be mapped to computation/equation terms already.

> The study design then also becomes part of the machined title.

**This is neither of the two options this experiment was weighing.** Not a blank table shell, which
asks a practitioner to draw a table before anything exists; not detection, which asks the
application to guess what columns mean. The design names the computations it licenses, each
computation carries **its own equation terms**, and the import offers those terms for the
practitioner's columns to be mapped onto. Nothing is invented and nothing is guessed.

    design → the computations it licenses → their equation terms → columns mapped onto the terms

**It also dodges the objection recorded above.** A role is not a property of a column — correct, and
under this scheme the role is not on the column. The term belongs to the **equation**; the mapping
says which column plays that term in that computation. `population_1851` can be a denominator in a
mortality rate and a numerator in population-per-house, and both mappings can exist, because they
belong to different equations.

**And the term lists already exist here, written longhand.** This experiment already observed that
`two_by_two`'s parameters are a table shell entered at the computing step. They are also the term
list: `exposureColumn`, `exposed`, `unexposed`, `outcomeColumn`, `caseValue`, `nonCaseValue`. So are
`rate`'s: `numeratorField`, `denominatorField`, `denominatorUnit` — which already distinguishes
`person-time` from `people`, and so already distinguishes an incidence rate from a risk. The terms
are not a vocabulary anybody has to design; they are the parameters four widgets already have, moved
to where the data enters.

### The terms are a, b, c, d, and we already use them

The practitioner, closing the vocabulary question this experiment had left as a risk:

> That's why labeling the 2x2 cells as a,b,c,d helps with the mapping to rate and ratio
> computations

This is the answer to the objection recorded below as *"that the computation set is stable"*. The
term vocabulary does not have to be invented, kept small by discipline, or withdrawn later. It is
four letters, it is what every textbook formula is written in, and the reference added the same day
opens with it: *"For a 2×2 table with exposed cases `a`, exposed noncases `b`, unexposed cases `c`,
and unexposed noncases `d`"*.

**And this application already uses them.** `src/two-by-two.ts:144`:

```ts
const {exposedCases:a,exposedNonCases:b,unexposedCases:c,unexposedNonCases:d}=cells;
```

The letters are the computation's own vocabulary and are surfaced nowhere. `TwoByTwoCells` declares
long names, the receipt emits `fw:exposedCaseCount`, the grid carries no cell labels, and nothing
can be mapped onto them. Promoting a local destructuring to the declared interface is a much
smaller change than anything else in this experiment.

**Why it reaches `rate` and `rate_ratio`, which is the practitioner's point.** Every measure is a
function of the same four letters, so one mapping serves three of the four epidemiology widgets:

| | in the letters |
| --- | --- |
| exposed risk | `a/(a+b)` |
| unexposed risk | `c/(c+d)` |
| risk ratio | `[a/(a+b)] / [c/(c+d)]` |
| risk difference | `a/(a+b) - c/(c+d)` |
| odds ratio | `ad/bc` |

`case_series` is the exception: it needs a date, not a table of four cells.

**It would have made the 8.40/5.35 investigation legible on sight.** `two-by-two.ts` records that
the project's rate ratio of 8.40 on houses sat beside a risk ratio of 5.35 on people, that the first
explanation was refuted by lab check 30 — *"a risk ratio over the same houses is 8.401853429780243,
which is the rate ratio's value BIT FOR BIT"* — and that the cause is the denominator unit. In the
letters that is immediate: one computation took `a+b` as houses and the other took `a+b` as people.
The conclusion needed sixteen significant figures from an independent implementation to establish;
stated in terms, it is visible in the terms.

**The audience already knows them**, which is the D9 argument and the practitioner's: *"FETP
trainees know the ABCD cells."* They are trained on them. So the mapping question becomes one a
trainee can answer on sight — *which column is `a`?* — where `exposureColumn`, `caseValue` and
`nonCaseValue` are this application's words and have to be learned first.

That also **inverts a hazard this repository already recorded**. The direction
`recognisable-not-identical-an-epi-kernel-of-our-own`, quoted at the top of `two-by-two.ts`, says
*"training makes the misreading near-certain, and this is the mechanism: the layout shows the
statistics and not the subject."* Training is strong and automatic either way. It works against a
layout that shows statistics without their subject, and it works **for** a vocabulary the reader was
trained in. Same fact about the audience, opposite sign, depending on whether we use their words.

**And it makes the design gating precise rather than a gesture.** The design decides which functions
of a, b, c, d are estimable:

| Design | What `a+b` and `c+d` are | Estimable |
| --- | --- | --- |
| Cohort | populations at risk | `a/(a+b)`, the ratio, the difference, `ad/bc` |
| Case-control | artefacts of how many cases and controls were sampled | `ad/bc` only |
| Cross-sectional | populations at a point in time | the same arithmetic, named prevalence |

### The shell is also the Methods presentation

The practitioner, closing the loop:

> In fact when presenting computations in Methods, it would be good to show the empty 2x2 tables and
> the variables that will go into the cells, and table mappings to the variables. That makes the
> paper very readable.

This reconciles the two halves of this experiment. A table shell is not only something drawn before
data exists; **shown in Methods with its mappings, it is the presentation**. Same object, two times:

| When | What it is | What it is for |
| --- | --- | --- |
| before data | a shell to fill | says what to collect |
| in Methods | an empty table with its mappings | lets a reader audit the analysis before seeing a number |

What it looks like for South London's contingency table:

```
                              Died   Survived   Total
Southwark & Vauxhall only        a          b     a+b
Lambeth only                     c          d     c+d
```

| Cell | Variable | From |
| --- | --- | --- |
| `a` | `deaths_seven_weeks` where `water_supply` = Southwark & Vauxhall only | Table VIII, with supply related from Table XII |
| `b` | `population_1851` − `deaths_seven_weeks`, same stratum | derived |
| `c` | `deaths_seven_weeks` where `water_supply` = Lambeth only | as `a` |
| `d` | `population_1851` − `deaths_seven_weeks`, same stratum | derived |

**Every part of that is already computable here.** `two_by_two`'s parameters give the row and column
headings; `cellOf(table, request, exposed, caseValue)` is precisely the mapping from a letter to a
(column, value) selection; the source of each variable is in the table input's provenance and in the
relate's machined note. Nothing has to be gathered that the widget does not hold.

**Two consequences for what was built on 2026-10-28.**

A machined note is `text:string`, and this is a **table**. It would carry its shell as markdown
inside the text, which renders in a write-up and is what the Notes work already assumes — that
prototype offers insert-table among its editing tools.

And `two_by_two` becomes the **second** producer of machined notes, which `relate-table.ts` already
anticipates in a comment: *"Defined here because `relate_table` is its only producer. When there is
a second, this type moves to `results.ts` and nothing else about it changes."*

**Why it makes the paper readable**, stated as the mechanism rather than as a preference: a reader
meets the design of the analysis before meeting its result, so the result cannot do the arguing for
the method. It is the pre-specification virtue of a shell, surviving into the write-up — and it is
also the reconciliation check of experiment 146 applied to the 2×2, because a reader given the cell
mappings can verify that the four cells were filled from the variables claimed.

### Two openings, not one

`study_area` declares **where**, and a workflow already starts with it. Nothing declares **how**.
Both belong at the opening, and both reach the machined title — which makes the title the cheapest
demonstration of what a declaration buys, because it visibly improves: *"Cholera mortality by water
supply, South London, 1854"* without a design, *"A retrospective cohort study of cholera mortality
by water supply, South London, 1854"* with one.

A machined title differs structurally from a machined note, and the difference matters for where it
can live. A note is owned by one widget and rides on that widget's receipt. A title is **assembled
from the workflow** — design, place, outcome, period — so it is a run-level product and cannot be a
per-node note.

### What remains open, which is narrower than what this experiment started with

1. **The cascade costs four widgets.** `relate_table`, `group_table`, `derive_value` and
   `select_rows` sit between a declaration and a `two_by_two`, and each must carry the design
   through rather than drop it. That is the price, and it is not the widget budget.
2. **How a table input learns the design.** Either it gains an input port, which stops it being a
   source, or the import dialog finds the design by walking the workflow — which is what
   `declaredKinds(workflow, nodeId)` and `upstreamKeyValues` already do, and is the cheaper answer.
3. ~~**A title needs a study period and nothing declares one.**~~ **Answered the same day:**
   *"Study period is part of study design."* Which is right in substance — a design specifies its
   observation window, and the window's SHAPE is design-determined: a cross-sectional study is at a
   point and yields prevalence, a cohort runs over an interval and yields incidence. So declaring
   the design decides which period fields are even asked for.

   And it fixes something already shipped. `rate` requires `numeratorPeriod` and
   `denominatorVintage` as free strings (`rate.ts:49-50` refuse them empty) and then checks their
   agreement at `rate.ts:98` as **string equality**:

   ```ts
   vintagesAgree:text(options.numeratorPeriod)===text(options.denominatorVintage)
   ```

   The glossary defines a fitness condition as *"a denominator whose period **covers** the
   numerator's"* — a covering relation — and the implementation is `===` on two hand-typed strings.
   On South London the two are "1854 outbreak" and "1855 map", so the check can only ever report
   that the strings differ, which is true and is not the question. A study period declared once on
   the design makes the comparison a real one, states the period in one place instead of twice per
   rate, stops two rates in one workflow claiming different periods, and gives the machined title
   its date.
4. **One shape of the earlier reading was wrong.** A design cannot be a pass-through threaded
   between a table and its computation, because the mapping happens *at* table input — so the
   design sits upstream of everything, as `study_area` does.

## What would close this

0. **Nothing here is urgent, and the ordering is now obvious.** Detection serves the practitioner
   who already has data, which is every FETP trainee with a line list and every user of this
   application today; the shell serves a practitioner who has not collected yet, which is nobody
   currently using it. Detection first, and the shell when somebody is planning a collection.
1. **Write the three shells South London already argues from**, by hand, as the shells an
   epidemiologist would have drawn in 1855: deaths by water supply; deaths per house by company;
   the two-by-two. The example's own published tables are the answer key, so this costs nothing and
   settles whether a shell is expressible at all before anything is built.
2. **Draw a shell for the AR6 extract**, which is the hard case and is on this machine. Six key
   columns, 288 rows, nothing saying which one spreads. If a shell cannot say, the claim above is
   wrong and this is smaller than it looks.
3. **Decide whether a shell replaces the per-widget parameters or feeds them.** Feeding is cheaper
   and leaves two sources of truth. Replacing is the point, and is a migration across six widgets
   whose parameters are the shell written out longhand.
4. **Ask on 2026-10-30.** Epidemiology colleagues see this application that day, and every one of
   them has written table shells. Whether they would draw one in a tool, or only in Word before
   opening the tool, decides whether this is a feature or a document.
5. **Declare the design on the two South London workflows**, which costs nothing and is the
   smallest test of the chain above: `water-company` is a retrospective cohort, `contingency` is
   ecological. If a declared design cannot make the machined note say "the unit of analysis is the
   sub-district", the hook is not carrying anything.
6. **Gate the 2x2's measures on the design**, which is the first place a declaration would prevent
   a wrong number rather than merely annotate a right one: a case-control table should not be
   offered a risk ratio, and a cross-sectional one should not have its prevalence called risk.
   This is separable from everything else in this experiment and is worth doing on its own. Worked
   out against the widgets we actually have in
   [the study-design audit](../audits/study-designs-and-our-computations.md), which also records
   the two things this application already gets right: `denominatorUnit` carries `person-time`, and
   the widget is named `rate_ratio` rather than risk ratio, so the estimand vocabulary is not what
   is missing -- the design is.
7. **Settle the 8.40 / 5.35 remainder.** The denominator unit accounts for the gap; whether
   anything is left for ecological misclassification has not been computed. The lab is where that
   belongs, since the expectation must come from outside this application.

## What this does not establish

- **That the computation set is stable.** Six widgets today, and this project adds and retires
  widgets in days — twelve arrived in three days and three were retired in one. A shell keyed to a
  moving set of computations may be worse than none.
- **That a shell drawn here would be the shell they publish.** A table shell in epidemiology is a
  document for a protocol and a journal, and this application is not a word processor. Whether a
  shell entered here is the same artefact or a second one that can disagree with the paper is
  unexamined, and a second one would be a new way to be wrong.
- **That a practitioner would fill it in.** A declaration at the door is work before any result,
  and the honest comparison is against the current behaviour, where the same context is entered
  later but only when a widget actually needs it. Nothing here is evidence about which an
  epidemiologist would rather do.
- **That it fixes the AR6 case.** The argument above says a shell supplies the pivot. It has not
  been tried, and the obvious failure is a long extract loaded before any shell exists, or loaded
  for several — in which case the pivot is undetermined again and the display needs its own answer.
- **Nothing was built.** The four failures above were worked around rather than fixed, and the
  workarounds shipped: both rate directions, the `measure` fallback, and a stated refusal where
  the frame declines.
- **That inspection from values can actually find these columns.** The profiler computes the
  statistics; no rule over them has been written or tested, and the failure mode is a confident
  wrong candidate. A two-valued column is as likely to be a data-entry flag as an exposure.
- **That declaring the design is cheap.** It is asserted above on the strength of two workflows
  whose designs are known from a book. A practitioner with their own data may not be sure which
  design they have, and an application that demands the answer before it will compute anything
  would be worse than one that stays quiet.
