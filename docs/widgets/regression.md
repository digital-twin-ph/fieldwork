# Regression

_Created 2026-11-04 · Updated 2026-11-04_

**A model.** Logistic regression for a case-control or cross-sectional study, reporting odds ratios; Poisson
regression for counts over time or area, reporting rate ratios. Each estimate is adjusted for the variables you add.

## What it does

The two-by-two gives crude measures. A published study usually reports adjusted ones: the Salmonella outbreak's Galia
melon odds ratio adjusted for age group and sex, NYC's ozone rate ratio adjusted for the other pollutants, temperature,
holidays and time. This fits those models in Fieldwork's own kernel, by iteratively reweighted least squares, and
builds the model's columns as R does, so the same model here and in R has the same columns and the same estimates.

## What you connect

**records** — a table. The outcome and every variable are its columns: its key columns and its value column alike.
**design** — optional, the study design. A declared case-control design allows logistic regression only.

It gives back a table: one row per reported term, with the ratio, the interval limits and p.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Model** | Logistic (odds ratios) or Poisson (rate ratios) |
| **Outcome** | The column modelled. For logistic, tick which of its values are **cases** and which **controls**; rows with other values are left out |
| **Exposure** | The column whose ratio you want, as **numeric** (a ratio per unit), **categorical** (a ratio per value against a **reference value**) or a **spline** |
| **Add a variable** | Each adjustment variable, one at a time, as numeric, categorical or **Spline, 4 df** (R's `bs(x, df = 4)`, for a curved relation such as temperature) |
| **Strata** (Poisson) | Fixed effects for each value of a column, such as year, month and day of week together. Absorbed, so hundreds of strata cost nothing |
| **Offset** (Poisson) | A column holding the log of person-time or population |
| **Intervals** | **Likelihood-ratio** (the default; R's `confint()`), **Wald**, Wald **scaled for overdispersion**, or Wald with **HAC** standard errors for counts that are correlated from day to day, with the number of lags and the column giving the rows' order |

**A row missing any variable the model uses is left out**, as R does by default, and the result says how many and why.

## What it will not do

**It will not choose the variables.** It fits what it is given; deciding what to adjust for is the investigator's.

**It will not report a model that did not converge**, or one whose columns carry the same information twice
(collinear). It says which.

**It will not fit a rate ratio to a declared case-control study.** Case-control sampling fixes the number of cases, so
there is no rate to divide.

**It does not do** model selection, interaction terms, random effects, conditional logistic regression for individually
matched studies, or exact methods.

## Checked against published results

| Example | Published | Fieldwork |
| --- | --- | --- |
| NYC, ozone per 10 ppb, Poisson with 840 strata, a temperature spline and HAC errors (14 lags) | 1.061 (1.035–1.088) | 1.0609 (1.0348–1.0877); coefficient and HAC standard error equal to the authors' archived R result to 12 significant figures |
| Salmonella, Galia melon in April against classical controls, adjusted for age group and sex, likelihood-ratio interval | 96 (15–2100) | 96.4 (15.4–2067) |
| The same, against panel controls | 18 (4.6–100) | 18.4 (4.6–101) |

Experiment 167.

## What this does not establish

That a model is well specified. A ratio adjusted for the wrong variables is precise and wrong, and nothing in the fit
can tell.
