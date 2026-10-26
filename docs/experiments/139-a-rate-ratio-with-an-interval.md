# 139 — A rate ratio, with an interval

_Created 2026-10-25 · Updated 2026-10-25_

**Status:** asked — this record is the design and its admission review, written before the
implementation. Nothing in `src/` computes a ratio of two rates today.

## Why now

The choropleth ([138](138-a-table-and-a-boundary-are-two-tables.md)) puts Snow's mortality
rates on his sub-districts. It maps a measure. It does not make his argument.

Snow's argument is a **comparison**: houses supplied by the Southwark and Vauxhall Company
against houses supplied by the Lambeth Company, in the same streets, in the same weeks. A map
of rates shows where; a ratio of rates, with an interval, is what says the difference is not
the kind a reader should shrug at. The epidemiologists this is shown to on **2026-10-30** will
read a choropleth as a description and a rate ratio as a finding.

`src/rate.ts` is the whole of the epi kernel as of today — one rate with a declared
denominator. There is no ratio, no interval, and no comparison of any kind.

## The data carries it twice, with two different denominators

Both are in the South London example, and they answer slightly different questions. Computed
2026-10-25; the practitioner asked for both to be shown.

**Houses.** `data/table-ix-first-seven-weeks.csv`, which is Snow's own per-company comparison:

| supplier | deaths | houses | per 10,000 houses |
| --- | ---: | ---: | ---: |
| Southwark and Vauxhall | 1,263 | 40,046 | 315.4 |
| Lambeth | 98 | 26,107 | 37.5 |

Rate ratio **8.40**, 95% interval **6.84 to 10.32**.

**People.** `data/table-xii-sub-districts-1849-1854.csv` carries a **declared** `water_supply`
for each sub-district — *"Southwark and Vauxhall Company only"*, *"Lambeth Company only"*,
*"Lambeth Company and Southwark and Vauxhall Company"* — and joins to Table VIII's
`population_1851` on the sub-district name. All 32 match.

| supply | sub-districts | deaths | population | per 1,000 |
| --- | ---: | ---: | ---: | ---: |
| Southwark and Vauxhall only | 12 | 844 | 167,654 | 5.03 |
| both intermingled | 16 | 652 | 300,149 | 2.17 |
| Lambeth only | 4 | 18 | 19,133 | 0.94 |

Rate ratio **5.35**, 95% interval **3.35 to 8.53**, for supplied-by-S&V-only against
supplied-by-Lambeth-only. The intermingled area sits between them at **2.31** (1.45 to 3.69)
against Lambeth only, which is the shape of Snow's argument and not only its size.

**Why both, and why they differ.** The houses figure compares houses actually supplied by each
company. The people figure compares sub-districts assigned wholesale to one supply, so the
intermingling *within* streets — the part of the setting Snow's argument rests on — is averaged
away, and the contrast is smaller for it. Neither is the correct one. The denominator is named
on each, which is the whole point of the widget that computes them: a rate ratio of 8.40 per
house and one of 5.35 per person are two findings, and reporting either as "the" rate ratio
would be the error this record exists to prevent.

In both, the two rates being divided share a denominator unit. That is the hard stop below;
dividing the 315.4 by the 0.94 would be arithmetic on two different things.

## The distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| **A rate ratio is not a rate.** It is dimensionless. "8.4 per 10,000" is not a quantity | **Hard stop** — the result carries no multiplier and no denominator unit, and there is no field to put one in |
| **Two rates divide only if their denominators count the same thing.** Deaths per house over deaths per person is not a ratio of anything | **Hard stop** — `denominatorUnit` must be equal on both sides, compared before any arithmetic |
| **A ratio across different periods is not a ratio of rates.** Snow's seven weeks against another year's seven weeks compares two epidemics | **Run-time check** — `numeratorPeriod` and `denominatorVintage` must agree, or the disagreement is stated on the result and in the receipt |
| **An interval computed from a zero cell is not an interval.** Dulwich has 0 deaths in seven weeks; the log of zero is not a number, and adding ½ to the cell is a choice, not a fact | **Hard stop** — a zero numerator on either side refuses, naming the group |
| **An interval is not a p-value, and neither is a causal claim.** 8.40 is a contrast between two supplied populations, not a measured effect of water | **Limitation** — stated on the result and in the widget's own description; nothing computes or displays a p-value |
| **A normal approximation on the log scale is poor at small counts** | **Limitation**, with the counts carried on the result so a reader can judge. Putney's 1 death yields an interval this method will report and no one should use |

## The admission audit

**D1 · Does the distinction survive decomposition, and would a practitioner ask for it by
name?** Yes to both. "What is the rate ratio, and the confidence interval?" is the sentence,
and no arrangement of existing widgets computes it — `rate` divides a numerator by a
denominator and stops.

**D2 · Is it the same as something already here?** No. `rate` is one group's measure.
`slr_threshold_comparison` compares a value to a threshold, not two measures to each other.

**D3 · What are the typed ports?** One input, `rates`, taking a `rate` result rather than a
plain table — the declarations the comparison must check (`denominatorUnit`, `rateKind`,
`numeratorPeriod`, `denominatorVintage`) live on that result and nowhere else. Two parameters
name the group compared and the group compared **to**, which is an ordering a reader must be
told: 8.40 and 0.12 are the same finding and not the same sentence.

**D10 · Which example instantiates it?** South London, as a fifth workflow — Table IX for the
per-house comparison, and Table XII's declared supply joined to Table VIII's population for the
per-person one. The second reuses `rate`'s existing `groupBy`, which already sums numerator and
denominator within a group, so only the supply column has to reach the table.

## The method, and the one not chosen

The log-transform normal approximation: `ln(RR) ± z·sqrt(1/a + 1/b)`, back-transformed. It is
closed-form, it is what most texts give, and at 1,263 and 98 events it is sound.

**Not chosen: the exact interval** from the conditional binomial. It is the right method at
small counts, and at Snow's counts it would move the bounds by a fraction they do not carry.
Building the incomplete-beta inverse it needs, before any example requires it, is the mistake
[experiment 59](59-mechanism-before-the-operation.md) records. The method is **named on the
result**, so a reader is never left guessing which interval they are looking at, and the
refusal at zero cells covers the case where the approximation fails hardest.

## The 2x2 this emits, and the one it is not

_Added 2026-10-26._ The node now emits the contingency table the ratio was computed from rather
than the ratio alone — group against measure, four cells, in the long form every table here uses:

| group | measure | count |
| --- | --- | ---: |
| Southwark and Vauxhall Company | events | 1,263 |
| Southwark and Vauxhall Company | houses at risk | 40,046 |
| Lambeth Company | events | 98 |
| Lambeth Company | houses at risk | 26,107 |

An epidemiologist reads the counts first and the ratio second. The application was showing 8.40
and hiding the table a reader checks it against, while holding that table in memory the whole
time. The measure names its unit — *houses at risk*, not *at risk* — because a count of houses is
not a count of people, and that is the whole difference between 8.40 and 5.35.

**This is a Poisson table, and the other 2x2 is binomial.** Checked against Epi Info's documented
stratified 2x2 on 2026-10-26, whose four cells are exposed cases, exposed non-cases, unexposed
cases and unexposed non-cases — people in four boxes, which is what a **risk ratio** or an **odds
ratio** needs. This widget's four cells are events and units at risk, which is what a **rate
ratio** needs. Both are called a 2x2 and they are not interchangeable: deriving non-cases here as
population minus deaths would quietly turn a rate into a risk and change the estimator without
saying so.

### Three things that design does better, and none needs a new widget

1. **It declares which value counts as exposed and which as a case**, carrying those value labels
   on the table rather than assuming an order. Here the comparison direction is a parameter and
   the outcome is already counted, so the gap is narrower — but the principle is the one this
   project states everywhere else: nothing is guessed.
2. **Stratification is first-class**, with a combined estimate across strata by Mantel–Haenszel
   and a homogeneity test (Breslow–Day, with the Tarone correction). This widget compares two
   groups and cannot hold a third variable constant, which for Snow is the obvious next question:
   is the supply difference still there *within* a sub-district?
3. **Every statistic names its method in the TYPE**, not in prose — the odds ratio as
   Mantel–Haenszel, its interval as Robins–Breslow–Greenland, the risk-ratio interval as a log
   method. This widget names one method on one result, which was right as far as it went; a
   result carrying several statistics must name each, because "the 95% interval" is not one thing.

That design also accounts for the records it did not use — excluded for missing values, for
invalid weights, for zero weight — which is the stance `authoredDataIssues` already takes and
belongs on any future table built from records rather than from counts somebody supplied.

## The widget names groups; it cannot say why one is the exposure

_Added 2026-10-26, on the practitioner asking why a water company counts as an exposure._

It does not. Being a Southwark and Vauxhall customer is not what anybody thinks caused cholera.
The exposure is **water drawn from the reach of the Thames that received London's sewage**, and
the company is a PROXY: by 1854 Lambeth had moved its intake upstream, above the tidal reach,
and Southwark and Vauxhall had not. The company is the label the data happens to carry.

This widget has `compared` and `reference`, and nothing on it says which is believed exposed or
why. The direction encodes a hypothesis and records only its arithmetic consequence. A reader of
the result sees "Southwark and Vauxhall Company against Lambeth Company: rate ratio 8.40" and
cannot tell from it whether that ordering means anything or was a coin toss.

**Epi Info's design carries this and ours does not**, which is the third time its 2x2 has been
the better record: its table declares `exposedValue` and `unexposedValue`, so the table itself
says which value counts as exposed rather than leaving it in the order of two parameters.

What that would need here is small and is NOT the same as computing anything: a declared note on
the comparison saying what the exposure is taken to be and why this group stands for it, carried
onto the result and into the receipt beside the method. The project already does exactly this
one layer down -- `rateKind`, `denominatorUnit`, `numeratorPeriod` and `denominatorVintage` are
all declarations that change no number and without which the number cannot be read.

**And the thing that makes the proxy credible is not in the data at all.** The two companies'
pipes ran intermingled in the same streets, so their customers were otherwise alike. That is a
fact about the setting, it is what makes the comparison worth making, and no interval computed
here speaks to it. It belongs in the example's prose, where it now is, and a widget that implied
otherwise would be overclaiming.

## Why Poisson, and where that assumption fails

_Added 2026-10-26, on the practitioner asking._

For a count `a` of events over an exposure `T`, if `a` is Poisson with mean `λT` then
`Var(ln â) ≈ 1/a`, and two independent counts give `Var(ln RR) ≈ 1/a + 1/b`. That is exactly the
interval this widget states. **The denominator cancels out of the variance**, which is why only
the event counts appear in it, and why Lambeth's 18 deaths set the width of that comparison's
interval rather than its 19,133 people.

**Why not binomial.** A binomial model requires each unit to experience at most one event. Table
IX counts 1,263 deaths among 40,046 houses, and a house can have several deaths, so there is no
non-case house to count. Poisson is the model that admits more events than units — which is the
same distinction `rate.ts` already draws between a `proportion`, which cannot exceed one, and a
`ratio`, which can.

**Where it fails here, and it is not a technicality.** Poisson assumes events are INDEPENDENT.
Cholera is transmitted: deaths cluster in households, in streets, around a pump. That is the
assumption failing, and it fails in one direction — correlated events are over-dispersed relative
to Poisson, so a Poisson interval is **too narrow**. The 6.84 to 10.32 is more confident than the
data warrants, and the point estimate being unaffected is no comfort, because the interval is the
claim being made.

So the honest statement: Poisson is chosen because it is the standard estimator for counts over
an exposure and the one an independent implementation checks against, **not** because these
events are independent. A practitioner presenting this should expect the question and should not
have to discover the answer at the venue.

What would address it rather than restate it: a dispersion-tolerant interval (quasi-Poisson or
negative binomial), or an estimate of the design effect from clustering. Neither is built, and
neither should be bolted on without deciding what this project is willing to claim about
transmission.

## What this will not establish

- **That the comparison is fair.** The two companies' customers were not randomised, and the
  interval says nothing about confounding. Snow's own argument rests on the intermixing of the
  supplies within the same streets, which is a fact about the setting and not about the data.
- **That a ratio is available for each sub-district separately.** The supply groups above pool
  12, 16 and 4 sub-districts. Table VIII gives deaths by supplier within each sub-district, but
  neither houses nor population by supplier within one, so a single sub-district cannot be split
  between the two companies. An earlier draft of this record said the per-supplier denominators
  did not exist at all; that was wrong, and the practitioner caught it. They exist at the supply
  group, which is what the people figure uses.
- **That the interval is well behaved at this example's small counts.** It is not. Putney's
  single death is in the data as a case that the method will answer badly and the refusal will
  not catch.
