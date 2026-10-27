# 142 — An epi kernel, exercised rather than listed

_Created 2026-10-26 · Updated 2026-10-26_

**Status:** tried — three operations built, exercised end to end in the South London worked
example, and one of them checked against an independent implementation.

## The question

> *"Let's plan a better evolution of the epi kernel beginning with exercising a few in the South
> London worked example."* — the practitioner, 2026-10-26

Two words carry the design. **Evolution**, because the three widgets already in the Epidemiology
group arrived one at a time and share nothing: `rate` declares a denominator class and a vintage,
`rate_ratio` declares an interval method and a level, `case_series` declares a kind of date, and no
two of them agree on what a result owes a reader. **Exercising**, because the alternative to
evolution is a feature list — and [the Epi Info command set](../../TODO.md) had just been recorded
as a coverage checklist, which is exactly the document that invites one.

So: what does *better* mean, when a list of 48 commands is sitting there and the demo is in four
days?

## What better means

**Not more operations. One vocabulary, and operations earned by a worked example.**

A kernel is not a set of widgets in a palette group. It is a shared answer to what an estimate
owes a reader, written once, so that the second estimate inherits the discipline instead of
re-arguing it. That is [`src/epi-estimate.ts`](../../src/epi-estimate.ts), and it was written
before the first estimate that uses it: a value, an interval with its level, **the method by its
real name**, and **what Epi Info calls the same thing**, as two separate fields.

The two fields are separate because the direction
[`recognisable-not-identical-an-epi-kernel-of-our-own`](../directions.json) found that they can
disagree — `legacyBreslowDayOddsRatio` ports a Woolf weighted log-odds dispersion that the legacy
output labels "Breslow-Day test for Odds". One `label` field would force a choice between being
correct and being recognisable.

It also bought something immediately. The 95% normal quantile now exists in **one place**. Check
27 found it hard-coded as 1.9600 where it is 1.959963984540054; a second estimate typing a textbook
value into its own file would have reintroduced that defect, and now cannot.

## The operations, and what made them not arbitrary

The chain was chosen by asking what the worked example could not do, not by reading down the
command list.

| | Operation | Epi Info | State before |
| --- | --- | --- | --- |
| 1 | **Relate a column from another table** | `RELATE` | nothing joined two tables |
| 2 | **Total within groups** | `GROUP` | `rate` did it internally and emitted a rate, so the totals were unreachable |
| 3 | Derive a value | `DEFINE`/`ASSIGN` | built 2026-10-26 |
| 4 | Select rows | `SELECT` | built 2026-10-26 |
| 5 | **Two-by-two table** | `TABLES` | counts and margins, no analysis |

**The anchor, and why this is not speculative work.** The South London example carried one table
that nothing in the application could produce: `contingency`'s "People by water supply and
outcome", computed by hand and inlined into the project file with `bytes: 0` and `sha256: ""`. The
0.12.0 release notes name the cause — nothing joins two tables.

That table is **exactly reproducible from two CSVs the example already ships.** Verified before any
code was written: Table VIII and Table XII share `sub_district` on 32 keys, one to one, no
duplicates and no orphans in either direction; relating `water_supply` across, totalling within it,
and subtracting deaths from population gives all six counts to the digit.

```
Southwark & Vauxhall only   pop=167,654  died=  844  survived=166,810
Both companies              pop=300,149  died=  652  survived=299,497
Lambeth only                pop= 19,133  died=   18  survived= 19,115
```

**So the implementation had a test oracle before it had a line of code**, which is the opposite of
how `rate` was built — it still has no example exercising it, eleven days on.

## What the shape of the data forced, twice

Both new table operations hit the same wall from different sides, and the answers are different.

**A long table's value column holds only numbers.** So a *category* brought across from another
table can only be a key column, which lands on every row and **leaves the row count unchanged**.
Bringing *measures* across would add rows and has a different failure mode — two tables disagreeing
about the same measure. That is why this is `RELATE` and deliberately not `MERGE`, and the module
says so in place rather than leaving the next author to widen it by accident.

**The kept columns are named, not the dropped ones.** The reasoning is `wideDataTable`'s: name what
is kept and a column added to a file later is simply dropped, leaving the same groups; name what is
dropped and that new column silently becomes a grouping key, splitting groups without telling
anybody.

**And only addition is offered.** Epi Info separates `MEANS` from `GROUP`, and the separation is
not bureaucratic: adding counts gives a count, adding rates gives a number with no referent. This
step cannot tell a count from a rate, so it offers the operation that is right for counts rather
than a choice it has no way to police.

## What the lab check found, before the widget shipped

This is the part worth keeping.

The case for building the two-by-two was a misreading: the South London project shows a **rate
ratio of 8.40** on houses where the **risk ratio on people is 5.35**, and the direction records
that FETP training makes reading the nearest ratio as the risk ratio near-certain rather than
possible. Every document written that afternoon — the module, the manual page, the release record,
the budget entry — explained the 57% gap as **rate versus risk**.

**The fixture for [check 30](../../../validation-lab/content/30-two-by-two-vs-statsmodels.ipynb)
refuted it.** A risk ratio over the same houses is `8.401853429780243`, which is the rate ratio's
value **bit for bit**. Deaths per house *is* a risk when a house can hold at most one death, so the
two are the same division. Only the intervals differ, and only in the second decimal: 6.8410 to
10.3189 from the Poisson form, 6.8450 to 10.3128 from Katz.

So the gap is the **denominator** — a house against a person — and not the estimand. And that makes
the hazard **worse** rather than milder:

> A reader who takes 8.40 for the risk ratio beside the houses table is **right**, and is thereby
> taught that the substitution is safe. It is safe only while the outcome is rare.

The thing that moves the number is the subject being counted, and that is the one thing the taught
layout does not show. The widget's note was rewritten from naming the estimand to naming the
subject, and the fixture carries both tables because the comparison between them *is* the finding.

**That is a lab check doing the job it exists for**, four days before a demo, on a claim this
project would otherwise have shipped in a manual page and repeated out loud to epidemiologists.

## What was not built, and why

- **No tests.** Pearson, Mantel-Haenszel, Yates, Fisher exact, mid-P. A larger piece, and the rule
  from [141](141-organising-snows-notes.md) is that tests are not started to meet a date.
- **The Epi Info labels are read, from a sibling project rather than from Epi Info.** Recorded
  here as blocked on the morning of 2026-10-26 and unblocked the same afternoon by the
  practitioner: *"The Epi Info labels can be deduced from the results panel that Epi Info AI
  prints. That's the closest I got to the real thing."* Transcribed from the classic TABLES
  estimate table in `epi-info-ai/wasm/demo/app.ts` — `Risk Ratio (RR)`,
  `Odds Ratio (cross product)`, `Risk Difference (RD%)`.

  Three things that followed, and the second is the one worth keeping.

  **A second field, not a filled one.** `epiInfoLabelSource` sits beside the label, because a
  label deduced from a rendering of Epi Info and one read from Epi Info are different claims. The
  receipt writes `deduced`, and check 30 now **fails if any label claims `epi-info` as its
  source** — the criterion inverted from "the label must be null" to "the label must name where it
  came from", which polices the provenance rather than the absence and is the same purpose.

  **The qualifier is load-bearing.** `Odds Ratio (cross product)` is kept whole because that panel
  prints an `Odds Ratio (conditional MLE)` beside it, which is a different estimator and is not
  computed here. Shortening the label to `Odds Ratio` would make it claim both.

  **And one scale difference, stated rather than reconciled.** That panel prints the risk
  difference as a percentage, so Snow's `0.004093` reads there as `0.4093%`. Same quantity,
  different scale on screen. Said on the estimate, because a reader comparing the two screens must
  not conclude the implementations disagree.
- **No `MERGE` and no `MATCH`.** Two of the three join commands remain, and the module names them
  so neither is reached by widening this one.
- **No checks 28 and 29.** `relate_table` and `group_table` declare what they owe in
  `widgets/check-coverage.json` and are recorded as awaiting. The declaration names the case worth
  an independent eye for each: an ambiguous key that must be refused rather than resolved, and a
  group with an empty cell that must total to nothing known — which is a comparison against the
  behaviour pandas has *by default*.

## What this does not establish

- **That the estimates agree with Epi Info.** statsmodels is not Epi Info. No parity claim is made
  and no parity suite exists; see the direction. **Nor do the labels establish it** — they are a
  deduction about what Epi Info prints, read from a project synthesized from it, and the field
  says so.
- **That the comparison is fair.** The both-companies stratum holds 16 of Snow's 32 sub-districts
  and is **excluded by name, not controlled for**. That is Snow's own confounding and the reason he
  went to the house level. Nothing built here adjusts for anything.
- **That the chain is right because it reproduces the hand-computed table.** It establishes that
  the chain and the hand computation agree. Both could be wrong about whether a sub-district's
  1851 population is the right denominator for 1854 deaths — which is a vintage mismatch the
  example's own README has recorded for weeks, and which no widget here notices.
- **That three operations make a kernel.** They share one estimate shape and one quantile. Five of
  the taught commands remain absent, `rate` and `case_series` have not been retrofitted onto the
  shared shape, and `rate_ratio` was retrofitted only for the quantile.
- **That the names are right.** All three are `pending` in `widgets/name-review.json`, with the
  ceiling raised by three. A verdict on a name is the practitioner's and not its author's, and the
  entries record the specific tension in each: "join" is what somebody would say for `relate_table`
  and `join_table_to_area` already took the word.
- **That anybody but its author can read the output.** No epidemiologist has seen it. The demo is
  2026-10-30 and [field-questions.md](../field-questions.md) is where what to ask them belongs.

## What would close it

1. Checks 28 and 29 written, so all three operations carry independent evidence rather than one.
2. `rate` and `case_series` emitting `EpiEstimate`, so the kernel is one vocabulary in fact and not
   only in intent.
3. The Epi Info labels read off **Epi Info itself**, upgrading `epiInfoLabelSource` from
   `epi-info-ai-results-panel` to `epi-info` — at which point the words may or may not change, and
   either outcome is information. Done 2026-10-26 to the extent a sibling project allows.
4. A verdict on the three names.
5. An FETP-trained reader shown the two-by-two and asked what they take each number to be —
   specifically whether they read the denominator without being told to.

## What changed our minds

**That the gap was rate-versus-risk.** Stated in four documents and refuted by the fixture that was
written to check the arithmetic, not the prose. The corrected account is narrower, more surprising,
and worse news: the substitution a trained reader makes is arithmetically correct on this data, so
the data cannot teach them the limit. Only the denominator can, and the layout does not show it.

**That a coverage checklist tells you what to build next.** It tells you what is absent. What to
build came from a worked example that had been carrying a hand-computed table with an empty digest
since 0.12.0 — and the three commands that table needed turned out to be three of the ones on the
list, which is a better argument for the list than reading down it would have been.
