# 167 · Regression in the kernel

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** asked — designed and audited here. Nothing is built.

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

## What this does not establish

- That any published adjusted figure will be reproduced. Salmonella's final models came from stepwise selection, which
  is not planned; its single-variable adjusted ratios are the realistic target.
- Model selection, interaction terms, random effects, robust standard errors or exact methods.
- That a practitioner chooses adjustment variables well. The widget fits what it is given.
