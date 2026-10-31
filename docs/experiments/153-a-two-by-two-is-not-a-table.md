# 153 · A two-by-two is not a table

_Created 2026-10-31 · Updated 2026-10-31_

**Status:** asked — the distinction is stated and the admission review is open. A pure structure
for the complete table exists; nothing draws it, and which port it travels on is undecided.

## The task

The practitioner, 2026-10-31, reading South London's write-up, over four messages that each
sharpened the one before:

> This 2x2 table claims it has the risk ratio but it does not.

> The margin totals are also missing from the 2x2 … The rationale for labeling each cell A, B, C,
> D, totals A+C, etc. is because the equations map these labels, and in fact should come as a
> unit. You see the complete 2x2 table, the equations and the value substitutions, that makes for
> a very clear process in the Methods.

> And confidence intervals are reported where needed. Certain journals will even require them.

> **So a 2x2 table is not a table in the data sense, but a table to represent an epidemiology tool
> complete with its standard formatting that epidemiologists understand.**

The last one is the experiment. The first three are what it looks like from outside.

## The distinction

**A two-by-two is an instrument, not an arrangement of numbers.** It has a fixed shape an
epidemiologist is trained to read: four cells in the letters $a$, $b$, $c$, $d$; four margins; a
total that is the two named groups and not the dataset; and the estimates those letters define,
each with an interval and the method that produced it. Change the shape and it stops being the
thing. A data table has no such obligation — it is keyed by whatever it is keyed by, and any
arrangement that preserves the rows is as good as any other.

Stated as a non-identity, in the form the audit procedure asks for: **a two-by-two is not a table
that happens to have two keys.** A table is its rows; a two-by-two is its *form*.

## What the category error cost, measured

`core.ts:1350` publishes the result as `kind:'data-table'` with four rows, carrying the whole
`TwoByTwoResult` along on the value. `two_by_two` declares `output:'table'`, and in South London
its one consumer is a `table_output` node — the generic viewer, labelled by its author *"The
two-by-two, with risk ratio and odds ratio"*.

So the instrument is computed completely and then handed to a renderer that can only see rows,
keys and a value field. What it cannot see, all of it present on the value:

| computed | reaches a surface |
| --- | --- |
| `cells` a, b, c, d | as four bare counts, **without the letters** |
| `exposedTotal` (a+b), `unexposedTotal` (c+d) | only inside the Methods formulas |
| `caseTotal` (a+c), `nonCaseTotal` (b+d), `total` (N) | **nothing, anywhere** |
| `riskExposed`, `riskUnexposed` | **nothing, anywhere** |
| `estimates` — risk ratio, odds ratio, risk difference | only as typeset mathematics in the Methods note |
| each estimate's interval, level and method | only there too |

Measured on South London, 2026-10-31: a+b 167,654 · c+d 19,133 · a+c 862 · b+d 185,925 · **N
186,787**, against a source table totalling 486,936. Risk ratio **5.35** (95% CI 3.36–8.53, Katz
log), odds ratio **5.37** (95% CI 3.37–8.57, Wald log), risk difference **0.00409** (95% CI
0.00354–0.00464, Wald unpooled). **Every number in this paragraph is on the value and on no
surface.**

### The note justified itself against a table that does not exist

`equations.ts:298` declines to put a table in the note, and gives this reason:

> THE CELLS ARE A LIST AND NOT A TABLE. 151 settled that a note carries no table … The four cells
> as four bullets are prose about the letters rather than a second rendering of **the table the
> node already draws.**

The ruling is right and the premise is false. The table the node already draws has no letters and
no margins, so the note names $a$, $b$, $c$, $d$ and writes every formula in $a+b$ and $c+d$ while
the figure beside it offers nothing to map them onto. **The letters were meant to be the join
between the table and the equations, and only one end was ever built.**

This is the seventh instance of the defect family `core.ts` names: a value composed correctly and
dropped before the picture. The six before it were layers on a map. This one is a whole
instrument.

## The admission question

Which is the open part, and it is a port question rather than a rendering one.

**Option A — keep the `table` port, give the presentation a two-by-two mode.** The counts remain a
table downstream, and any surface drawing a value that carries `twoByTwo` draws the instrument.
Cheap, breaks no wiring, and has precedent: `rate` and `case_series` both emit a table with a
`chart` riding on it, and the chart is a presentation over the rows.

**Option B — give it its own output type.** A two-by-two port, a two-by-two output widget, and
`table_output` stops being able to receive one. Truer to the distinction above, and D1's second
axis supports it — a practitioner asks for a two-by-two *by name*, which is the test for whether
something earns a palette entry. It breaks the example's wiring and needs the full D1–D9 review.

**Not settled here.** What the four messages establish is that the current answer is wrong; they
do not choose between these. The pull of A is that the counts really are useful as a table
downstream. The pull of B is that under A the instrument remains, formally, a table that some
renderers happen to recognise — which is the thing the practitioner said it is not.

## A two-by-two does not know its own design

The practitioner, 2026-10-31: *"I am wondering why we have odds ratio, did John Snow use that?"*

**He did not.** Snow's measure is deaths in each 10,000 houses — a rate over houses, compared
between the companies, which this example already reproduces as a rate ratio of **8.40** in
*Deaths per house, by water company*. The odds ratio is twentieth-century, and this project's own
citation says which design it belongs to: the interval it uses is **Woolf 1955, "On estimating the
relation between blood group and disease"**, a case-control study.

The anachronism is the smaller half. **The odds ratio is what you use when risk cannot be
estimated directly**, and South London is the case where it can: the whole population supplied by
each company is counted, so the risks are 844/167,654 and 18/19,133 and the risk ratio is simply
available. The two estimates measured here agree to two decimal places — **RR 5.35, OR 5.37** —
because deaths are 0.46% of the population, which is the rare-outcome condition under which the
odds ratio approximates the risk ratio. On this data it approximates a number already in hand.

**So `two_by_two` emits three estimates because nothing tells it which study it is looking at.**
Four cells look identical whether they came from a cohort, a case-control study or a
cross-sectional survey, and the measure that means anything differs in each: a risk ratio and a
risk difference are not interpretable on case-control data, and an odds ratio on cohort data is a
detour. The widget cannot read the design off the numbers, and it does not ask.

That makes the design a **declaration the step should take**, in the same way `rate` already makes
the practitioner declare what its denominator counts rather than inferring it.

**THIS WAS SETTLED ON 2026-10-28 AND IS NOT A NEW QUESTION**, which this record first wrote as
though it were. The practitioner, the same day: *"Earlier we talked about how epi study designs
engender certain computations, e.g., cohort study → RR, case-control → OR."* The study-design
thread was opened then and the demo moved to 2026-11-06 to make room for it, with an ordering
chosen by demonstration value:

1. **the ABCD cells and the empty-2×2 Methods note** — first, because they need no declaration
   and supply the vocabulary everything after them uses;
2. **a declared study design, carrying its period**;
3. **gating `two_by_two`'s measures on that declaration** — *"the only item that prevents a wrong
   number rather than annotating a right one"*;
4. the machined title.

Held back deliberately: the import-time mapping of columns to equation terms, and any
value-carried cascade through `relate_table`, `group_table`, `derive_value` and `select_rows`.

**WHERE THE DECLARATION LIVES WAS ALSO SETTLED**, and this record does not reopen it. The
practitioner, 2026-10-31: *"We decided we would do this at the workflow level."* The decision and
its reasoning are in `docs/directions.json`, not here:

- **Not a parameter on `two_by_two`.** The design is declared in the workflow and found by
  consumers **walking upstream**, rather than carried on port values. A cascade through
  `relate_table`, `group_table`, `derive_value` and `select_rows` is explicitly held back.
- **Not merged with `study_area`.** Decided against by measurement rather than principle: of
  South London's workflows the two that most need a design — the retrospective cohort and the
  ecological comparison — have no study area at all, while the one with a study area has no
  design. `study_area` is a spatial *operand*, not a declaration of place.
- **The design carries the study period, and does not appear in the title.** Twelve MMWR titles
  were read and none names a design; the period is the title's `<time>`, so the declaration
  reaches the title through its period rather than its name.

So the odds ratio on Snow's cohort is not a newly found defect. It is the thing step 3 exists to
prevent, observed in the wild before step 3 was built, and R6 in
[44](44-ontology-competency-questions.md) already records the application refusing to answer
*"Is this estimate the right one for this study design?"* until a design is declared.

**What this record adds is only this: step 1 is larger than "label the cells a, b, c, d".** The
margins, the total and the estimates are missing from the figure too, and they are missing
because the instrument was modelled as a data table — not because anyone overlooked the letters.

It also bears on the example. Featuring an odds ratio in a worked reproduction of Snow invites a
reader to think it is part of the argument. It is not; the rate ratio over houses is.

## What is built

`twoByTwoGrid(result)` and `twoByTwoEstimateRows(result)` in `two-by-two.ts`: pure, markup-free,
returning the complete table with its letters and every margin carrying the expression it was
computed from, and the estimates with their intervals, methods and `unavailable` reasons. **A
margin carries `a+b` rather than a bare number** so a total cannot be read as a fifth observed
count — the distinction `cellOf` already enforces when it refuses to treat an empty cell as zero.

These survive either option, because they describe the instrument rather than the port. Nothing
renders them yet.

## Mapping the variables onto the letters, and what it would cost

The practitioner, 2026-10-31: *"What about explicitly mapping the variables to A, B, C, D or to
margin totals? That can help make computations more deterministic."*

This is the item `docs/directions.json` holds back by name — *"the import-time mapping of columns
to equation terms"* — so what follows is an assessment and not a decision.

**The letters are DERIVED today, not declared.** `two_by_two` takes six parameters
(`exposureColumn`, `exposed`, `unexposed`, `outcomeColumn`, `caseValue`, `nonCaseValue`) and
`cellOf` filters the table for each cell. Nobody says "this is `a`"; `a` is whatever one row
matches two values.

**The arithmetic is already deterministic; the MEANING is not.** Given a table, `cellOf` returns
the same four numbers every time. What varies is what those numbers count, and the audit found it
in this repository: South London carries a rate ratio of **8.40 on houses** and a risk ratio of
**5.35 on people**, both correct, and *"in the letters one computation took a+b as houses and the
other as people"* with nothing on either figure saying so. **That is the determinism worth
buying**, and part of it was bought on 2026-10-31 without any mapping at all: the instrument now
prints what the cells count beside the declared unit of analysis, so South London's ecological
two-by-two reads *"unit of analysis: sub-district · cells count people"* — two different subjects,
both stated, which is the ecological fallacy made legible rather than inferred.

**What an explicit mapping would add beyond that.**

- **A table already in two-by-two shape could be used as one.** `cellOf` requires long form with
  exactly one row per combination; a published 2×2 has to be reshaped first.
- **Margins as input.** Published tables often give `a`, `a+b`, `a+c` and `N` — Snow's own do —
  and the rest is subtraction. Today all four cells are required.
- **Declared once and reused.** The directions entry's actual argument: the mapping belongs at
  table input, so a column's role is stated where the data enters rather than re-entered at every
  computing widget.

**And what it would cost, which is the part to design carefully.** The derivation is not only a
convenience; it is where four refusals live, and a direct mapping gets none of them for free:

| Refusal today | What it catches | Under a direct mapping |
| --- | --- | --- |
| more than one row matches a cell | an un-totalled table silently summed | nothing knows rows were collapsed |
| a cell has no row | a missing combination read as zero | the cell is simply whatever was pointed at |
| a value is not a whole number | a table of rates or percentages | the same, unchecked |
| `strataLeftOut` | **South London's "Both companies" — N of 186,787 against a table of 486,936** | nothing knows other strata exist |

The last one is the serious one. The stratum warning is the commonest way a two-by-two misleads,
and it exists only because the widget sees the whole table and knows which values were *not*
named. **Point at four cells directly and that check cannot be made at all.**

**Margins bring a refusal of their own.** If `b` is derived as `(a+b) − a`, and the margin and the
cell came from different rows of a published table, they can disagree — so a mapping that accepts
margins needs a consistency check (`a + b = a+b`, and the four cells summing to `N`) that nothing
needs today, because today the margins are computed rather than supplied.

**TWO KINDS OF MAPPING, AND THE TABLE ABOVE ONLY INDICTS ONE.** The practitioner, correcting this
the same day: *"The data tables are inputs to the computational epi widgets (2x2) so columns
(variables) can be mapped to 2x2 cells."* That is the distinction the cost table missed.

| | what is declared | refusals |
| --- | --- | --- |
| **cell → number** | this number is `a` | **all four lost**: the widget never sees the table |
| **column+value → cell** | `a` is `water_supply = "Southwark and Vauxhall only"` × `measure = "deaths_seven_weeks"` | **all four kept**: the widget still reads the whole table |

The second is what the practitioner means, and it is **what `two_by_two` already does** — the six
parameters encode exactly that mapping, and `cellOf` IS the letter-to-(column, value) function.
What is missing is not the mapping but its VISIBILITY: nothing on the Inspector or the figure says
which column and which value define `a`. The audit's item 2a says the same thing from the other
end — *"the parameters give the headings, `cellOf` is the letter-to-(column, value) mapping"*.

So the work is **surfacing a mapping that exists**, not replacing a derivation with a pointer. The
cost table above stands only against the cell → number form, and that form should not be built:
it buys directness and pays with the stratum check, which is the commonest way a two-by-two
misleads.

Margins remain the one genuinely new input, and the consistency refusal above is theirs.

## What this does not establish

- **That the standard formatting is one formatting.** This asserts the letters, the margins and
  the total as the shape an epidemiologist reads, on the practitioner's statement and on
  `epi-estimate.ts`'s Epi Info labels. Which way round the exposure runs, and whether cases go in
  the first column, are conventions this has not checked against a textbook.
- **That reporting an interval satisfies a journal.** It reports the interval, its level and the
  method. A journal requiring an interval requires one computed a particular way, and nothing here
  checks a method against a journal's instructions.
- **That the estimates belong on the figure at all.** 151 ruled that a note carries no table; the
  mirror question — whether a figure carries the estimates or only the counts, with the estimates
  staying in Methods — is open, and the practitioner's "as a unit" argues they travel together
  without saying which surface holds them.
- **Anything about the other epidemiological widgets.** `rate` and `rate_ratio` emit tables with
  the same arrangement and may carry the same error. Not looked at.

## What would close it

The option is chosen and recorded with its review; a two-by-two drawn anywhere in the application
shows its letters, its four margins and its total, with the estimates and their intervals beside
it; and the Methods note's substitutions can be checked against cells a reader can see. A test
asserts that N is the two named groups and not the source table, which is the one number this
instrument is most often read as meaning the other thing.
