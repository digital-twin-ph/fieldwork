# Regression

_Created 2026-11-04 · Updated 2026-11-12_

**A model.** Logistic regression for a case-control or cross-sectional study, reporting odds ratios; Poisson
regression for counts over time or area, reporting rate ratios. Each estimate is adjusted for the variables you add.

## What it does

The two-by-two gives crude measures. A published study usually reports adjusted ones: the Salmonella outbreak's Galia
melon odds ratio adjusted for age group and sex, NYC's ozone rate ratio adjusted for the other pollutants, temperature,
holidays and time. This fits those models in Fieldwork's own kernel, by iteratively reweighted least squares, and
builds the model's columns as R does, so the same model here and in R has the same columns and the same estimates.

## What you connect

**records** — a table. The outcome and every variable are its columns: its key columns and its value column alike.
**design** — optional, the study design. A declared design decides what the result may be called, and which model it allows.

It gives back a table: one row per reported term, with the ratio, the interval limits and p (with several exposure
columns, one row per model and term; see below). The table says which
statistic is the ratio and which are its limits, so **Chart** draws each ratio with its interval without guessing
from the names.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what model it will fit, and **Configure…**, where
these are set and applied with **Apply**. After a run, the panel says the main estimate and how many rows were used and
left out.

| Setting | What it decides |
| --- | --- |
| **Model** | Logistic (odds ratios) or Poisson (rate ratios) |
| **Outcome** | The column modelled. For logistic, tick which of its values are **cases** and which **controls**; rows with other values are left out |
| **Exposure** | The column whose ratio you want, as **numeric** (a ratio per unit), **categorical** (a ratio per value against a **reference value**) or a **spline** |
| **Add a variable** | Each adjustment variable, one at a time, as numeric, categorical or **Spline, 4 df** (R's `bs(x, df = 4)`, for a curved relation such as temperature) |
| **Strata** (Poisson) | Fixed effects for each value of a column, or for each combination of several: choose a column, then **Together with** for each further one. Municipality, year and month together compare each week only with weeks of the same municipality, month and year. Absorbed, so thousands of strata cost little |
| **Offset** (Poisson) | A column holding the log of person-time or population |
| **Intervals** | **Likelihood-ratio** (the default; R's `confint()`), **Wald**, Wald **scaled for overdispersion**, or Wald with **HAC** standard errors for counts that are correlated from day to day, with the number of lags and the column giving the rows' order |

**A row missing any variable the model uses is left out**, as R does by default, and the result says how many and why.

### One model per exposure column

Under **Exposure**, **Also fit, one model each, with** lists the table's other columns. Tick one or more, and the step
fits one model per column: the same model each time, with only the exposure swapped. This is for a lag-response
question, where **Relate a column from another table** has brought the temperature at several shifts, one column each.

- **Each model is fitted on its own rows.** A week with no value at one shift is left out of that shift's model only.
  Fitting every model on the weeks that have a value at every shift would be a different analysis, and is not done.
- **The models come out as one table**, one row per model, term and statistic. Its columns are **exposure** (the
  column the model is for), **shift_days** (the shift Relate recorded, as a number of days; only when there is one),
  **role** (*exposure* or *adjusted for*), **term** and **statistic**. To chart one point per lag, keep the rows whose
  role is *exposure* with **Select rows by value**, and choose **shift_days** as the chart's category column.
- **A column that cannot be fitted is a row saying so**, with empty values, and the result says why. The step stops
  only when no column can be fitted.
- **The result says how many intervals there are**, and that none is adjusted for the number of comparisons.

**An adjusted variable can follow the shift.** With several models, each adjusted variable has a box, *follows the
shift: each model is adjusted for its own column*. Tick it, and a column is chosen for each model, filled in Relate's
order and each one changeable. The 2010–2025 Brazil workflow uses it: the model of the temperature 2 weeks before is
adjusted for the rainfall 2 weeks before, from a second Relate that brings the rain at the same lags. The result says
*each adjusted for precip_total_semana at its own shift*.

Untick every column to go back to one model.

## What it will not do

**It will not choose the variables.** It fits what it is given; deciding what to adjust for is the investigator's.

**It will not report a model that did not converge**, or one whose columns carry the same information twice
(collinear). It says which.

**A declared study design decides the measure**, read from the same declaration the Two-by-two table reads:

| Design | Logistic | Poisson |
| --- | --- | --- |
| cohort | odds ratio | rate ratio |
| case-control | odds ratio | stops: case-control sampling fixes the number of cases, so there is no population for a rate |
| cross-sectional | prevalence odds ratio | stops: each subject is measured once, so there is no follow-up time |
| ecological | odds ratio, of groups | rate ratio, of groups |
| case series | stops: no comparison group | stops |

With no design connected the measure keeps its plain name, odds ratio or rate ratio, and the receipt says no design was
declared. The NYC study, a time series of daily counts, is none of these five and is run without one. Experiment 176.

**In the N3 & evidence view** the fit is a `fw:RegressionModel`: the family, the outcome, the exposure and each
adjustment with how it entered the model, strata, an offset, how the intervals were made, and the rows used. Each
coefficient is an `fw:EpiEstimate` naming its term, interval method and level, and two SHACL shapes check that it
says so.

**It does not do** model selection, interaction terms, random effects, conditional logistic regression for individually
matched studies, or exact methods.

## Checked against published results

| Example | Published | Fieldwork |
| --- | --- | --- |
| NYC, ozone per 10 ppb, Poisson with 840 strata, a temperature spline and HAC errors (14 lags) | 1.061 (1.035–1.088) | 1.0609 (1.0348–1.0877); coefficient and HAC standard error equal to the authors' archived R result to 12 significant figures |
| Brazil, two municipalities 2010–2025, cases on weekly air temperature and rainfall, strata of municipality × year × month, overdispersed | statsmodels, one indicator per stratum (Validation Lab check 37) | The same 1,613 rows and 364 strata; coefficients and Pearson-scaled standard errors equal to the digits printed, in CPython and Pyodide |
| Salmonella, Galia melon in April against classical controls, adjusted for age group and sex, likelihood-ratio interval | 96 (15–2100) | 96.4 (15.4–2067) |
| The same, against panel controls | 18 (4.6–100) | 18.4 (4.6–101) |

Experiment 167.

## What this does not establish

That a model is well specified. A ratio adjusted for the wrong variables is precise and wrong, and nothing in the fit
can tell.
