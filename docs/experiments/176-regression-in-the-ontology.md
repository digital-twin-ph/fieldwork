# 176 · Regression in the ontology

_Created 2026-11-04 · Updated 2026-11-05_

**Status:** tried — designed, decided by the practitioner, built in Regression 0.2.0; no worked example declares a design for a regression yet.

## The task

The practitioner, 2026-11-04: *"Just curious if we created ontology rules for regression"*, then *"Ontology next"*.

## What exists

| Piece | Two-by-two | Regression (0.20.0) |
| --- | --- | --- |
| Widget in `ontology/widgets.ttl` | yes | yes, a label and a manual link only |
| A class for its result | `fw:TwoByTwo` | none |
| Estimates as `fw:EpiEstimate`, each naming its interval method and level | yes | no |
| RDF facts in the receipt, so the N3 & evidence view shows it | yes | **no**: the receipt is JSON fields only |
| What a declared design licenses, read from `DESIGN_LICENCES` | yes | no: one hard-coded check in `src/core.ts`, case-control requires logistic |
| A SHACL shape over its receipt | no | no |

**Finding, 2026-11-04:** no study design licenses a **rate ratio**. `DESIGN_LICENCES` names risk, odds and prevalence
measures, because it was written for the two-by-two. A Poisson regression reports a rate ratio, and so does the Rate
ratio widget, which reads the design only to add its sentence and gates nothing. Making regression follow the licences
therefore needs a decision about rate ratios first; following them as they stand would stop every Poisson regression
under a declared design.

## Design

1. **`fw:RegressionModel`**, a `prov:Entity`: the family (logistic or Poisson), the outcome column, the exposure column
   and how it entered (numeric, categorical, spline), each adjustment and how it entered, strata, an offset, the error
   method (model-based, overdispersed, HAC with its lag), the rows used, strata used and dropped, iterations.
2. **Each coefficient an `fw:EpiEstimate`**, with `fw:estimateName` (odds ratio or rate ratio, and the term it is for),
   `fw:intervalMethod` (profile likelihood or Wald) and `fw:intervalLevel`. `fw:estimate`'s domain widens from
   `fw:TwoByTwo` to either class, so a regression's estimates are not inferred to be a two-by-two's.
3. **The receipt carries RDF facts**, as the two-by-two's does, so the fit appears in the N3 & evidence view.
4. **The design rule reads the licences**, not a hard-coded check, so the two-by-two and regression cannot disagree
   about what a design permits. Which designs license which regression measure is the decision below.
5. **A SHACL shape**: every estimate names its method and level; a value has both interval bounds, or the estimate says
   why it has none.

| Distinction | Enforced as |
| --- | --- |
| A regression's estimate is not a two-by-two's | validation rule (the widened domain, checked by the shape) |
| A measure the declared design does not license is not reported | run-time check (the step stops and says which design and why) |
| Every estimate names how its interval was made | validation rule (SHACL) |
| No design declared: the measure keeps its neutral name | limitation, as for the two-by-two |

## Decision for the practitioner

Which declared designs license a rate ratio from a Poisson regression, and which an odds ratio from a logistic one.
Proposed, kept separate from the two-by-two's tick list so its dialog does not change. **Chosen by the practitioner,
2026-11-04, as proposed** ("Cohort, ecological"), over also admitting a cross-sectional prevalence ratio from Poisson
and over describing only:

| Design | Logistic | Poisson |
| --- | --- | --- |
| cohort | odds ratio | rate ratio |
| case-control | odds ratio | stops: no population for a rate |
| cross-sectional | prevalence odds ratio | stops, or reported as a prevalence ratio |
| ecological | odds ratio (group level) | rate ratio (group level) |
| case series | stops: no comparison group | stops |

The NYC study, a time series of daily counts fitted with conditional Poisson, is none of the five designs. With no design
declared it keeps the neutral name, as today. A time-series design is a separate question and not part of this.

## What was built (Regression 0.2.0, app 0.24.0)

| Piece | Where |
| --- | --- |
| The licences and the check | `REGRESSION_LICENCES` and `regressionMeasure` in `src/study-design.ts`, read in `src/core.ts` before the fit |
| The receipt's RDF | `regressionReceipt` in `src/regression.ts` |
| Terms | `fw:RegressionModel` and 21 properties in `ontology/runtime.ttl` |
| Shapes | `fw:EpiEstimateShape`, `fw:RegressionModelShape`, `fw:ModelTermShape` in `ontology/shapes/quality-and-design.ttl` |
| Release | `widgets/releases/regression/0.2.0.json`, emitting 2 classes and 26 properties |

**Found on the way, and fixed:** `fw:intervalLower`, `fw:intervalUpper`, `fw:intervalLevel` and `fw:intervalMethod` had
`rdfs:domain fw:RateRatio`, and the two-by-two has written them on `fw:EpiEstimate` since 2026-10-26. Under RDFS
inference every two-by-two estimate was therefore a rate ratio. The same was true of `fw:estimate`,
`fw:exposureAttribute`, `fw:outcomeAttribute` and `fw:noDesignDeclared`, declared for `fw:TwoByTwo` only, which
regression now uses. Each domain is now the union of the classes that use it. Nothing ran inference, so nothing had
gone wrong yet.

**The two-by-two's receipts already met the estimate shape**, a zero cell's unavailable odds ratio included, so the
shape is held of every `fw:EpiEstimate` rather than of regression's alone.

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/regression-ontology.test.mjs` | 5 of 5: the licences for all ten design and family pairs; a Poisson receipt with numeric, spline and categorical terms and strata conforms; five broken receipts do not; an unbounded interval is written `INF` and conforms; a two-by-two receipt with a zero cell conforms |
| 2026-11-04 | the unit suite | 1,429 passed, 0 failed |

## Practitioner observation, written before the result

Whether the stop message, read under a declared design, is taken as the design being wrong or the model being wrong.

## What this does not establish

- That a declared design is the right one: it is the practitioner's claim, recorded and not checked.
- A time-series or case-crossover design. NYC runs with no design and keeps the neutral name.
- ~~That the Rate ratio widget follows the same licences.~~ Settled 2026-11-05 another way: the widget was retired into
  the two-by-two, whose rate layout reads `RATE_RATIO_LICENCES`, held equal by test to the Poisson licences here
  ([161](161-the-epi-kernel-one-table-many-exposures.md), step 6).

That the fitted numbers are right: that is the regression's parity check against R, 12 significant figures for NYC.
A shape checks that a receipt says what it must, not that what it says is true.
