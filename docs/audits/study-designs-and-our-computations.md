# Study designs, against the computations we actually have

_Created 2026-10-28 · Updated 2026-10-28_

**Status:** an audit, not a disposition. Nothing is built, gated or renamed by this document; every
count in it was read from the code on 2026-10-28.

## Why this exists

The practitioner, 2026-10-28: *"Case control, cohort, cross-sectional studies carry with them
pathways to specific epidemiology computations. So identifying the study design is key."* And then
a reference was added — `docs/research/fieldwork-study-designs-v1.1.md`, generated elsewhere — whose
taxonomy covers twenty-two designs and whose computation registry is its own proposal.

This adapts that survey to what this application can do. A twenty-two-row taxonomy is a reading
list; the question an audit can answer is **which designs we already serve, which we serve badly,
and which we do not serve at all** — and what each answer costs.

## What we have

Four widgets in the Epidemiology group, and five table operations that feed them.

| Widget | What it emits | Vocabulary it already carries |
| --- | --- | --- |
| `case_series` | cases by period | period: day, week, month · date kind: onset, report, death, specimen-collection, other |
| `rate` | a rate or proportion, optionally by group | denominator unit: **people, houses, households, person-time, other** · kind: proportion, ratio · multiplier, minimum denominator, numerator period, denominator vintage |
| `rate_ratio` | a ratio of two rates with an interval | interval method: log-normal · the level is stated, never assumed |
| `two_by_two` | risk per group, **risk ratio** (Katz log), **odds ratio** (Wald log), **risk difference** (unpooled Wald) | — |

Feeding them: `relate_table`, `group_table`, `derive_value`, `select_rows`, `join_table_to_area`.

**Two things we already get right, and they should be credited before the gaps.** `denominatorUnit`
includes `person-time`, which is the distinction between a risk and an incidence rate — so the
estimand vocabulary is not missing it. And the widget is called `rate_ratio` rather than risk ratio,
which is the same discipline. What is missing is the **design**, not the words for the quantities.

## Which designs we serve

Restricted to the ones the widgets above can actually reach. The remaining designs in the
reference — trials, cluster and stepped-wedge, interrupted time series, difference-in-differences,
regression discontinuity, instrumental variables, diagnostic accuracy, meta-analysis, compartmental
and agent-based models — have no implementation here and are out of scope for this audit.

| Design | Served by | Licensed estimands | What we do |
| --- | --- | --- | --- |
| Case series | `case_series` | counts, proportions, onset intervals, epidemic curve | serve it |
| Cross-sectional | `rate` with a people denominator | prevalence, prevalence ratio, prevalence odds ratio | serve the arithmetic, **mislabel it** |
| Surveillance | `case_series` + `rate` over periods | incidence rates, trends | serve the pieces; no aberration detection, no completeness measure |
| Ecological | `join_table_to_area` → `relate_table` → `group_table` → `rate`/`two_by_two` | group-level rates and rate ratios | serve it, **silently** |
| Retrospective cohort | `derive_value` → `two_by_two` | risk, risk ratio, risk difference, odds ratio | serve it correctly |
| **Case-control** | nothing expresses the sampling | **the odds ratio only** | would print three inestimable quantities |

South London is the worked proof of two rows at once, which is the finding experiment 147 records:
`water-company` reads Table IX, where the supplying company is known **per house** — a retrospective
cohort, and `two_by_two` is right to print all four measures there. `contingency` reads Tables VIII
and XII, where the company is attached **per sub-district** — ecological, and the same four measures
are group-level quantities with nothing saying so.

## The two hazards, stated plainly

Both follow from one fact: **`two_by_two` has no notion of study design.** Searched 2026-10-28 —
`case-control`, `cohort`, `cross-sectional` and `estimable` appear nowhere in `two-by-two.ts`,
`epi-estimate.ts` or `rate-ratio.ts`, and no design is declared anywhere in `src/`, the glossary or
`widgets/*.json`.

1. **A case-control table gets a risk, a risk ratio and a risk difference.** None of the three is
   estimable from case-control sampling, because no population at risk is sampled. The reference's
   own Critical note says it: *"Case-control sampling generally does not identify population risk
   from sample proportions. An OR is not automatically an RR."*
2. **A cross-sectional table gets its prevalence ratio printed as `Risk Ratio (RR)`.** The
   arithmetic is right and the label is wrong, which is the worse of the two failures because
   nothing looks amiss.

The argument for why this matters is already in this repository, at the top of `two-by-two.ts`,
quoting the direction `recognisable-not-identical-an-epi-kernel-of-our-own`: *"training makes the
misreading near-certain, and this is the mechanism: the layout shows the statistics and not the
subject."* One level up, the layout shows the statistics and not the **design**, and a trained
reader will supply a design from habit.

## What is worth doing, in order

1. **Gate `two_by_two`'s measures on a declared design.** The smallest change that prevents a wrong
   number rather than annotating a right one: a case-control table offered the odds ratio alone, a
   cross-sectional one with its measures named prevalence. Separable from everything else here.
2. **Declare the design on the two South London workflows**, which costs nothing and tests whether a
   declaration carries anything: it should make the machined Methods note say that the unit of
   analysis is the sub-district.
3. **Add `estimand` and sampling design to what a receipt records.** The reference's list of what
   every result should carry is: estimand, target population, observation period, units, sampling
   design, source versions, transformations, missingness, assumptions, uncertainty method, code
   version, seeds. Our receipts already carry units, source versions, transformations, provenance
   and uncertainty method. **Estimand** and **sampling design** are the two they do not.
4. **Leave the rest alone.** Seventeen of the twenty-two designs in the reference have no
   implementation here, and adding any of them is a widget-budget decision that stands at 53 live
   against a reference of 41 — not a decision this audit makes.

## What this audit does not establish

- **That any practitioner would declare a design.** Experiment 147 records the same doubt: a
  practitioner with their own data may not be sure which design they have, and an application that
  demands the answer before computing anything would be worse than one that stays quiet.
- **That the reference's taxonomy is correct.** Nothing in
  `docs/research/fieldwork-study-designs-v1.1.md` has been verified here, no reference metadata has
  been resolved, and that file carries a block saying so. Its formulas were read and are right as
  written; its citations were not checked.
- **That gating is implementable without a design vocabulary.** Item 1 above assumes a declared
  design exists to gate on, and nothing declares one yet. The order of items 1 and 2 may therefore
  be the reverse of the order they can be built in.
- **Anything about the designs out of scope.** Their absence here is a statement about this audit,
  not a judgement that they do not matter.
