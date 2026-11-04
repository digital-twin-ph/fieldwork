# 167 · Regression in the kernel

_Created 2026-11-03 · Updated 2026-11-04_

**Status:** tried — built as the Regression widget and used by the NYC and Salmonella examples, Chromium.

## The task

The two-by-two gives crude measures. The three examples under way, or next, publish adjusted ones:

| Example | The authors' model | Published figure to reproduce |
| --- | --- | --- |
| Salmonella, Germany 2021 | Unconditional logistic regression, adjusted for age group and sex; controls frequency-matched, not matched one to one | Galia melon, April, each food alone adjusted for age group and sex: 96 (15–2100) classical, 18 (4.6–100) panel, Results text. The multivariable 55 and 12 of Table 4 came from stepwise selection |
| NYC child asthma, 2016–2025 | Time-stratified Poisson regression on daily counts, several pollutants | Ozone, 1.061 (1.035–1.088) per 10 ppb; the authors' archived Table 2 |
| London ozone and deaths, 2002–2006 | Poisson regression with seasonal splines and temperature, allowing for overdispersion | 0.991, 1.007, 1.003 per 10 µg/m³ |

The practitioner, 2026-11-03: *"So do we need a regression widget?"*, then, on reusing Epi Info AI's: *"Let's just
write our own regression for the kernel."* Epi Info AI implements only conditional logistic regression, which none of
the three uses. The kernel's rule since 2026-11-02 stands: it grows without thinking about that repository.

## The design

**One fitting engine in the Rust kernel:** iteratively reweighted least squares for a generalised linear model.

| Family | Link | Reports | For |
| --- | --- | --- | --- |
| Binomial | logit | odds ratios | case-control and cross-sectional studies |
| Poisson | log | rate ratios | counts over time or area, with an offset for person-time or population |

Each fit takes an outcome, one exposure, adjustment variables, optional strata as fixed effects, and an optional
offset. It returns coefficients, standard errors, Wald intervals, the log-likelihood, iterations and whether it
converged. Overdispersion is estimated from the Pearson statistic and widens the intervals when chosen.

**Later, not first:** a natural cubic spline basis for season (London needs it), conditional logistic regression for
individually matched case-control studies, and likelihood-ratio intervals.

**The kernel's memory.** Today every kernel function takes and returns plain numbers. A fit needs a design matrix, so the
kernel gains an exported buffer that the caller writes the matrix into and reads the result from. This is the first
change to how the kernel is called since it was copied in.

## Design audit, `regression` (proposed name)

- **D1.** A practitioner asks for it by name: "logistic regression", "Poisson regression", "adjust for age and sex". It
  does not decompose into the two-by-two: adjustment for several variables at once is the residual function.
- **D2.** Nothing in Fieldwork fits a model. The two-by-two, rate and rate ratio compute closed-form measures.
- **D3, distinctions and how each is enforced:**
  - *An adjusted ratio is not a crude one.* The output names every variable adjusted for, and the machined note writes
    the model. A limitation: nothing stops a reader comparing it with a crude figure.
  - *A model that did not converge has no estimates.* No ratio is reported; the run says so. A run-time check.
  - *A case-control design licenses odds ratios, not risk or rate ratios.* With a declared case-control design only the
    binomial family is offered. A validation rule, through the design port the two-by-two already reads.
  - *A stratum with no variation in the outcome tells the fit nothing.* It is dropped and counted. A run-time check.
  - *Overdispersion is a choice.* The receipt says whether intervals were widened. A limitation, stated.
- **D4.** Input is a `table`, the same port as the two-by-two. Output is a `table` of estimates. No new port type.
- **D5–D9** are recorded as proposals in the rule audit and are not applied here.
- **D10.** The Salmonella example first: a fourth workflow adjusting Galia melon for age group and sex. Then NYC.

## Validation it commits to

- **Arithmetic:** unit tests on fits whose answers are known in closed form: a two-by-two as logistic regression must
  give the same odds ratio and Woolf interval as the two-by-two, and an unadjusted Poisson model the same rate ratio as
  the rate ratio widget.
- **Independent:** the validation lab refits each example in R, which Fieldwork does not read.
- **Published:** each example's figures above, with any difference stated, not tuned away.

## Built, 2026-11-04

The practitioner, 2026-11-04: *"Why don't we develop the regression widget"*.

| Part | What was built |
| --- | --- |
| Kernel (`kernel/src/glm.rs`) | IRLS for logistic and Poisson with an offset, as R's glm.fit; Poisson strata absorbed through the conditional likelihood, which has the indicators' coefficients without their columns; inverse information; HAC (Newey-West, Bartlett) over the rows' order |
| Model (`src/regression.ts`) | The design matrix as R's model.matrix builds it for these terms: intercept, treatment-coded categories with the first level as reference, `bs(x, df, degree = 3)` with knots at R's type-7 quantiles. Complete cases, counted by reason. Wald, overdispersed, HAC and likelihood-ratio (profile) intervals |
| Widget `regression` 0.1.0 | Outcome, cases and controls, exposure, variables added one at a time, strata, offset, intervals; the optional design port refuses Poisson under a declared case-control design |

**What changed from the design.** Two things the design put "later" were needed first. *Splines*: NYC's model adjusts
for temperature as `bs(tmean_lag03, df = 4)`, so R's B-spline basis was built rather than a natural spline.
*Likelihood-ratio intervals*: Salmonella's published intervals are asymmetric on the log scale, 96 (15–2100); Wald
gives 96 (10.3–903) on the same model, the profile gives 96 (15.4–2067). And HAC standard errors, not in the design at
all, are what NYC's published interval uses. **Found on the way**: the Salmonella paper's age adjustment is the
seven-group variable; the file's other three groupings give 90 to 92 and 20 to 21.

## Validation

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `kernel/src/glm.rs` tests | 5 of 5: a two-by-two as logistic regression gives ad/bc and Woolf's standard error to 1e-9; an unadjusted Poisson model gives the rate ratio; absorbed strata give the indicator model's coefficient and standard error to 1e-8; collinear columns refused |
| 2026-11-04 | NYC primary model on the authors' file, `tests/regression.test.mjs` with `NYC_PKG` | Coefficient 0.0591331329660 and HAC SE 0.01272768228 against the archived 0.059133132965951 and 0.0127276822785079; N 3,643; 840 strata. The offset model and the other two pollutants agree to the same precision |
| 2026-11-04 | Salmonella, `tests/regression.test.mjs` | 96.4 (15.4–2067) and 18.4 (4.6–101) against the published 96 (15–2100) and 18 (4.6–100) |
| 2026-11-04 | Built by hand in the browser, Chromium: NYC manual's fourth workflow and Salmonella's from-scratch test | Passed: 1.061 (1.035 to 1.088) and 96.4 shown in Results |

The independent laboratory refit is not done: the widget awaits a lab check. WebKit was not run locally.

## What this does not establish

- That any published adjusted figure will be reproduced. Salmonella's final models came from stepwise selection, which
  is not planned; its single-variable adjusted ratios are the realistic target.
- Model selection, interaction terms, random effects, robust standard errors or exact methods.
- That a practitioner chooses adjustment variables well. The widget fits what it is given.
