# 161 · The epi kernel: one table of counts, more than one exposure

_Created 2026-11-02 · Updated 2026-11-05_

**Status:** tried — steps 1 to 4 and 6 done, step 5 in narrow form, and the measures run in Rust. Step 7 is not
started. _Corrected 2026-11-05: this line said the substrate, plural exposures and the widget change were not built;
steps 2 and 3 built them on 2026-11-02._

## The task

The practitioner, 2026-11-02, after Oswego took 46 nodes
([160](160-a-line-list-reaches-a-two-by-two.md)): *"I think this is a genuine problem having more than
1 exposure"*, and then: *"Let's work on the kernel because this is upstream. And we get to test it
downstream with the worked examples."*

The direction `the-epi-kernel-is-a-kernel-not-a-palette-of-statistics` already says what to build: one
substrate and a family of measures over it, not one widget per statistic.

## What exists

| Piece | State |
| --- | --- |
| `EpiEstimate`, intervals, quantiles | Shared, in `epi-estimate.ts`, called step zero of the kernel |
| Risk ratio, odds ratio, risk difference | Formulas inside `computeTwoByTwo` |
| Rate ratio | Its own formula inside `computeRateRatio`, with its own interval code |
| Which measures a design reports | Decided by `study_design`, read by `two_by_two` only |
| Exposures | One per node, one in the study design's table |

## The design

**One substrate.** A table of counts with declared roles: the outcome, one or more exposures, what a
denominator counts, and whether a unit can have more than one event. A line list and a table of totals
are two ways of arriving at it.

**A family of measures over it.** Each is a function of counts, and names its method on the result.
The declared design decides which are reported: risks for a cohort, odds for a case-control study,
rates where the denominator is person-time.

**No new widget.** `two_by_two` becomes the kernel's node and takes one exposure or several. *Attack
rates by exposure*, proposed earlier the same day, is withdrawn: it would be a third copy, and a
statistic wearing a node type. A table with a row per exposure is a view of the kernel's result.

## The steps, each checked before the next

| Step | What changes | What must hold |
| --- | --- | --- |
| 1. Share the arithmetic | Formulas move to `epi-estimate.ts`; both widgets call them | Every output bit-identical to before |
| 2. Read the substrate | Roles over a table; a line list counted directly, with no `group_table` | Oswego's 14 tables unchanged |
| 3. Plural exposures | `two_by_two` takes several; one table of results; unrecorded answers shown per row; count of comparisons stated | Oswego in 3 nodes; Stegen's two missing codes |
| 4. Study design | Exposures plural, how they were chosen, table per exposure, checklist | The `differs` false alarm from 160 gone |
| 5. Case-control | Odds only when so declared, no attack rates | The Germany 2021 data, with two control groups |
| 6. `rate_ratio` | Folded in and retired | South London's 8.40 unchanged |
| 7. Stratified estimate | Reuse the engine's Mantel-Haenszel; see the correction below | Stegen's mousse by tiramisu |

## Audit answers, so far

- **D1.** The substrate is underneath; the practitioner asks for a two-by-two or an attack rate table by
  name, and gets them from one node.
- **D2.** The operation exists twice today, which is the finding that starts this work.
- **D3.** A rate is not a risk: `rate.ts`'s `rateKind` decides, a run-time check. A zero cell has no
  interval: a hard stop per estimate. Unadjusted multiplicity: a **limitation**, stated and not solved.
- **D10.** Oswego and Stegen instantiate it, with the Germany 2021 data for case-control.

## Correction, the same day: reuse an earlier engine's engine

The practitioner, 2026-11-02: that there is an epidemiology kernel of their own to reuse The design above was written without reading it, which was a mistake.

its Rust engine is one Rust file compiled to 28,495 bytes of WebAssembly with no imports,
Apache-2.0, exporting 81 functions: the 2x2 measures, Mantel-Haenszel and conditional stratified
estimates, Fisher and mid-P, matched pairs, trend, frequencies and means.

| Compared with FW, on the same counts | Result |
| --- | --- |
| Risk ratio, odds ratio, risk difference: 62,208 values | Identical |
| Their interval bounds: 124,416 values | Largest relative difference 2e-15 |

The stratified functions already answer step 7. Stegen, from `stegen_raw.csv`, risk ratios among people
with a known tiramisu answer:

| Exposure | Crude | Ate tiramisu | No tiramisu | Mantel-Haenszel (95%) |
| --- | --- | --- | --- | --- |
| White mousse | 2.84 | 1.08 | 11.29 | 1.23 (1.02 to 1.48) |
| Dark mousse | 4.48 | 1.05 | 16.02 | 1.27 (1.02 to 1.59) |
| Fruit salad | 2.58 | 1.03 | 12.42 | 1.17 (0.97 to 1.41) |

Most of the crude association falls away among tiramisu eaters. The strata disagree, and the
no-tiramisu cells hold single digits, so a pooled figure may not be the right summary here.

**What changes.** The computation is reused. FW's own work is what the engine does not have: the
substrate and its roles, plural exposures, what a declared design licenses, and the receipts and notes.
Step 7 stops being undesigned. The arithmetic of step 1 moves into the Rust kernel if a run can wait for
WebAssembly, which is not yet checked.

**FW holds its own copy.** The practitioner, 2026-11-02: that the code should be copied into Fieldwork rather than read from another repository on the laptop And then: that the Rust kernel should grow on its own from here So the code lives in `kernel/`, renamed `fieldwork-kernel`,
and grows there. A pin was proposed first and is withdrawn. Upstream is not tracked; `ORIGIN.md` and
the Apache-2.0 licence are what remains of the link.

Rust 1.99.1 was installed and the kernel built from source: 26,926 bytes against the 28,495 copied. The
bytes differ, the 81 functions do not, and 292,755 values across the estimates, intervals, chi-squares,
exact tests and Mantel-Haenszel functions are identical to the copied file. The build from source is
the one kept.

**The application now runs on it, 2026-11-02.** A run could already wait, so the four TypeScript formulas
were removed. The kernel is embedded in `src/kernel-bytes.ts` and loaded once by a top-level await in
`src/kernel.ts`, so there is no fetch to fail offline. `rate_ratio` was added in Rust, the first measure
written here. Over the same 118,188 outputs nothing changed in kind: every refusal, message and undefined
case is identical. 27,822 numbers differ in their last digits, none shown at any reported precision:

| Numbers | Differ | Worst relative |
| --- | --- | --- |
| Risk ratio bounds | 27,456 | 1.3e-11 |
| Odds ratio bounds | 346 | 1.8e-15 |
| Rate ratio bounds | 20 | 8.7e-16 |

The largest are on extreme tables, such as 166,810 / 3 / 1 / 0. FW wrote `1/a - 1/(a+b)`, subtracting two
nearly equal numbers, where the kernel writes `b/(a(a+b))`, so the kernel's value should be the more
accurate of the two. That was reasoned from the formulas and not tested. Lab checks 27 and 30 were not
re-run, and their tolerance of 1e-9 is wider than these differences.

**What stays from `recognisable-not-identical-an-epi-kernel-of-our-own`.** Each method is named by what it
is, and FW claims no parity. `stratified_legacy_woolf_*` exist in the engine and are not surfaced, since
the direction's objection was to a statistic labelled as something it is not. The validation lab stays
independent of both.

## What this does not establish

- That one node can carry this without its panel becoming the new overload. Step 3 has to show that.
- Whether intervals should be adjusted for the number of comparisons. Stating the number is the only
  decision made; the evidence has not been read.
- That the kernel's exact methods are right. They were compared with the copied file, which shows the build
  is faithful and says nothing about correctness. FW's own values were compared only for the 2x2 estimates.
- ~~That South London's rate ratio folds in cleanly. Its input is a `rate` result, not a table of counts.~~
  Settled by step 6, 2026-11-05: the two-by-two reads Table IX, which the Rate read, so the `rate` result was never
  needed for the ratio.
- That a practitioner reads a row per exposure better than 14 tabs. That is the observation to keep.

## Validation

**Step 1, 2026-11-02.** Risk ratio, odds ratio, risk difference and rate ratio moved to
`epi-estimate.ts` as functions of counts. Every output of `computeTwoByTwo` and `computeRateRatio` was
written to JSON before and after, over 118,188 inputs: 14 cell values in all four cells at three
levels, and 3,375 rate pairs, including zero cells and refusals. The two files are **byte-identical**.
`tests/the-measures-are-functions-of-counts.test.mjs` checks the functions against formulas written in
the test. Lab checks 27 and 30 were not re-run.

Step 1 changes nothing a reader sees, so no widget release is owed.

**Step 2, 2026-11-02.** `two_by_two` 0.6.0 takes a declared role, each row is one subject. Oswego's 14 foods
give identical cells and estimates from the rows and through `group_table`'s count, and one question now
takes three nodes. The role is on the node and not yet on a substrate of its own, which is as far as one
exposure needs; step 3 decides whether that holds. The step also found that an empty cell means different
things in the two readings, and that unnamed outcome values were being dropped without a word.

**Found on the way, 2026-11-02.** `render()` called `history.replaceState` on every edit, and WebKit throws
after 100 calls in ten seconds, which stopped the edit. The long Oswego build reached that limit on an
idle machine and passed the gate on a loaded one, so a passing run had hidden it. It now writes only when
the address changes.

**Step 3, 2026-11-02.** `two_by_two` takes several exposure columns of a line list and gives one table,
in `src/exposure-table.ts`. Oswego is rebuilt from an empty canvas as two workflows of 3 nodes each, in
place of one of 46, with every count checked against the CSV. The panel holds: ticking 14 boxes is one
list, and the single-exposure dropdown goes away in this mode. Stegen, run through the same code from
a throwaway script and not yet through the app, gives tiramisu 94/121 against 7/165, ratio 18.31 (8.81 to 38.04),
and counts its `NA` and `9` answers as not recorded rather than as a third group.

The ratio beside each exposure comes first in the design's list, so a table reports one measure. A
reader wanting the odds ratio beside the ratio has not been served. Whether trainees read a row per
exposure better than separate tables is still the observation to keep.

**Step 4, 2026-11-02.** `study_design` asks how the exposures were chosen, and the checklist reports how many
were compared in place of the false `differs` from 160. The declared table stays one table described in
general words, which holds where one description fits every exposure; an exposure needing its own
description is not served. **The new question has no evidence review**, unlike the others in the tree, so
its wording is a proposal: the report's standard is that every branch and caveat is backed. It was not
exercised by declaring a design on Oswego, which stays undeclared.

**Step 5, narrow form, 2026-11-02.** Under a declared case-control design the table shows the four cells and
the odds ratio, and no attack rate. A second control group is a choice of non-case value, and the result
names the other as left out, so `not recorded` became `left out`, which is true of both kinds of row. Run
by a throwaway script on Luczynska et al., Germany 2021 (Zenodo 10.5281/zenodo.7333295, CC-BY 4.0, codebook
read for the case variable only, paper not read): 31 foods on one node, 3 unusable and named. Galia melon
is 12/3 against 20/107, odds ratio 21.4 (5.5 to 82.7), with classical controls, and 12/10 against 20/146, 8.8
(3.4 to 22.9), with panel controls. These figures are not compared with the paper. The example has not been
built in the app and is not a repository.

**Step 6, 2026-11-05.** The practitioner: *"It should be in the Epi kernel 2x2 widget I think that's what we
decided."* `two_by_two` 0.7.0 reads a table as **events and units at risk** as well as cases and non-cases, and
`rate_ratio` is retired outright, as the regime in AGENTS.md allows while nobody outside uses it.

| Distinction | Enforced as |
| --- | --- |
| A unit at risk is not a non-case: a house can hold two deaths, person-time counts nobody | validation rule: the layout is declared, and has no $b$, $d$ or risk ratio |
| Events are counts; units at risk may be person-time | run-time check: a fractional event count stops the step, a fractional unit does not |
| A rate ratio is reported only where the design licenses one | run-time check before the computation, cohort and ecological, the same designs as a Poisson regression and held equal by test |
| A group with no events has no ratio | the estimate carries the reason and the counts stay; the Rate ratio widget refused the whole step |
| A line list has no units at risk | hard stop, as does the layout with several exposures |

| Check | Result |
| --- | --- |
| South London w6 through `executeWorkflow` | 8.401853429780243 (6.84096208049671 to 10.31889085553658), bit-identical to the retired widget |
| Lab check 27, re-run from the two-by-two (lab `962e1e3`) | 4 of 4 comparisons agree with statsmodels `confint_poisson_2indep(method='wald-log')`, built from tables the South London workflows produce |
| `tests/two-by-two-rates.test.mjs` | 7 of 7 |
| `tests/two-by-two-rates.browser.mjs` | 2 of 2, Chromium |
| Unit suite | 1,422 passed, 0 failed, before the two new test files |

**Found on the way.** The declared cohort's sentence, appended to the result, ends *"a/(a+b) is a risk"*, which is
false of events over houses. The rate layout now carries the rate-ratio licence's own reason. The four-cell
licence's reasons are written for $a/(a+b)$ and nothing had checked them against another layout, because there was
none.

**Not done.** No rate difference: the retired widget had none, and adding one is a separate decision. The study
design dialog's tick list does not list the rate ratio, so a practitioner cannot withhold it while keeping the design.
A saved workflow holding the retired widget refuses to open rather than being rewritten: the rewrite would have to
follow the Rate back to its table, and South London, the only workflow that used it, is rebuilt.
