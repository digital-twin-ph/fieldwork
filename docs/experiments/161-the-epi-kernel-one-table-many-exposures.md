# 161 · The epi kernel: one table of counts, more than one exposure

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — step 1 only. The arithmetic is shared. The substrate, plural exposures and the
widget change are designed here and not built.

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

## Correction, the same day: reuse the Epi Info AI engine

The practitioner, 2026-11-02: *"Don't forget that we have an epi kernel to reuse from Epi Info AI
workspace."* The design above was written without reading it, which was a mistake.

`epi-info-ai/wasm/engine-rust` is one Rust file compiled to 28,495 bytes of WebAssembly with no imports,
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

**FW holds its own copy.** The practitioner, 2026-11-02: *"We should not use the Epi Info AI repo on my
laptop, we should just copy the code over to FW."* And then: *"We should grow the Rust based kernel
without thinking about Epi Info AI repo."* So the code lives in `kernel/`, renamed `fieldwork-kernel`,
and grows there. A pin was proposed first and is withdrawn. Upstream is not tracked; `ORIGIN.md` and
the Apache-2.0 licence are what remains of the link.

Rust 1.99.1 was installed and the kernel built from source: 26,926 bytes against the 28,495 copied. The
bytes differ, the 81 functions do not, and 292,755 values across the estimates, intervals, chi-squares,
exact tests and Mantel-Haenszel functions are identical to the copied file. The build from source is
the one kept.

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
- That South London's rate ratio folds in cleanly. Its input is a `rate` result, not a table of counts.
- That a practitioner reads a row per exposure better than 14 tabs. That is the observation to keep.

## Validation

**Step 1, 2026-11-02.** Risk ratio, odds ratio, risk difference and rate ratio moved to
`epi-estimate.ts` as functions of counts. Every output of `computeTwoByTwo` and `computeRateRatio` was
written to JSON before and after, over 118,188 inputs: 14 cell values in all four cells at three
levels, and 3,375 rate pairs, including zero cells and refusals. The two files are **byte-identical**.
`tests/the-measures-are-functions-of-counts.test.mjs` checks the functions against formulas written in
the test. Lab checks 27 and 30 were not re-run.

Step 1 changes nothing a reader sees, so no widget release is owed.
