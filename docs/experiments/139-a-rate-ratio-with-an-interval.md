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
