# What Epi Info's "Breslow-Day test for Odds Ratio" computes

_Created 2026-10-26 · Updated 2026-10-26_

Asked by the practitioner on 2026-10-26, after this project cited the discrepancy as an argument
for building its own epi kernel rather than matching Epi Info bit for bit: *"I am not aware about
the Breslow-Day over Woolf weighted log-odds issue, maybe you can research the history, would be
nice to know if we can find an article or two that refers to it."*

**Short answer: the discrepancy is real and was verified in Epi Info's own published source. No
article describing it was found.** What the literature documents is the underlying statistical
distinction, which is standard; the labelling appears to be undescribed outside the Epi Info AI
method contract that raised it.

## What the source says

Checked in two of CDC's public repositories, not inferred from the derived project.

In **`Epi-Info-Python-Package/epiinfo/TablesAnalysis.py`** and the corresponding
**`Epi-Info-Community-Edition/Epi.Statistics/Single2x2.cs`**, there are three functions:

| Function | What it computes |
| --- | --- |
| `bdOR` | per-stratum log odds ratios, weighted by `1 / (1/a + 1/b + 1/c + 1/d)` — the inverse variance of the log OR — then the sum of weighted squared deviations from the pooled log OR. **This is a Woolf/Cochran heterogeneity statistic.** |
| `bdRR` | the same construction over log risk ratios |
| `bdtOR` | bisection on the expected exposed-case cell until the implied odds ratio matches the Mantel-Haenszel common OR, then `(O − E)² / var`, plus a Tarone correction. **This is Breslow-Day.** |

**The code's own comments are correct and are not the problem.** `//The Breslow-Day (uncorrected)
statistic` and `//Tarone correction to Breslow-Day` both sit *inside* `bdtOR`, where they belong.
`bdOR` carries no comment claiming to be anything.

The discrepancy is in the **output label**. In `Epi.Analysis.Statistics/Tables.cs` and in
`EpiDashboard/Controls/StratifiedTableAnalysisPanel.xaml.cs`, two rows are emitted:

- `Breslow-Day-Tarone test for Odds Ratio` — fed by `bdtOR`
- `Breslow-Day test for Odds Ratio` — fed by `bdOR`, which is the Woolf statistic

The iOS companion carries the same pair of labels. The Python package emits keys (`bdOR`,
`bdtOR`) and no display strings, so the labelling is a property of the user interfaces.

## Does it matter, or is this pedantry?

Both test the same null hypothesis — that the odds ratio is constant across strata — both use
K−1 degrees of freedom, and they are asymptotically equivalent. **In large, dense strata they
will agree**, and a practitioner comparing the two would see no difference.

They diverge where the data is sparse. The Woolf statistic is built on log odds ratios, so a zero
cell makes it undefined and the conventional repair is to add 0.5 to every cell, which is a
choice that moves the answer. The Breslow-Day construction works from expected counts under the
Mantel-Haenszel estimate and does not need that repair. Several secondary sources also note the
general weakness of both: low power with few strata, so a non-significant result is weak evidence
of homogeneity rather than evidence for it.

**Sparse strata are the normal case in field epidemiology** — an outbreak investigation stratified
by age band, by ward, or by exposure often has cells in single digits. So this is the setting
where the label matters most, and it is the setting this application is for.

## What was not found

No paper, erratum, methods note or issue thread describing Epi Info's use of this label. The
searches returned the statistical distinction in general terms, Stata's documentation (which
keeps the two explicitly apart: its `cc` command offers four tests of homogeneity including
"directly pooled, also known as the Woolf test", and separately reports a Breslow-Day χ²), and
R's `DescTools::BreslowDayTest` with its Tarone option. Absence of a published description is not
evidence that nobody has noticed; it is only what this search found.

## What this project should do with it

Nothing about Epi Info, which is not ours to correct. Two things about Fieldwork, both already
recorded in [directions.json](../directions.json) under
`recognisable-not-identical-an-epi-kernel-of-our-own`:

1. **Do not inherit the label.** If this application ever reports a homogeneity test it names the
   statistic it computed. The alternative is propagating a loose label into a teaching context,
   where it is multiplied by the curriculum.
2. **Say what Epi Info calls it.** A reader trained on that output is looking for a row called
   "Breslow-Day test for Odds Ratio". Naming our statistic honestly and noting the familiar label
   beside it serves correctness and recognition at once.

## What this does not establish

That Epi Info's result is wrong. A Woolf heterogeneity statistic is a legitimate test of the same
hypothesis, correctly computed; only the name attached to it in the interface is imprecise.

That the practical difference is ever material in a real analysis. No comparison was run on any
dataset. The claim that the two diverge in sparse strata is read from the construction of each
statistic and from secondary descriptions, not measured here.

That the search was exhaustive. Three queries, English only.

## Sources

- Epi Info Community Edition — [`Epi.Statistics/Single2x2.cs`](https://github.com/Epi-Info/Epi-Info-Community-Edition), [`Epi.Analysis.Statistics/Tables.cs`](https://github.com/Epi-Info/Epi-Info-Community-Edition), `EpiDashboard/Controls/StratifiedTableAnalysisPanel.xaml.cs`
- Epi Info Python Package — [`epiinfo/TablesAnalysis.py`](https://github.com/Epi-Info/Epi-Info-Python-Package) (repository marked deprecated, moved to `epiinfo`)
- Stata, [`epitab` — Tables for epidemiologists](https://www.stata.com/manuals13/stepitab.pdf)
- R, [`DescTools::BreslowDayTest`](https://search.r-project.org/CRAN/refmans/DescTools/html/BreslowDayTest.html)
- [Effect of a preliminary test of homogeneity of stratum-specific odds ratios on their confidence intervals](https://arxiv.org/pdf/1109.3950)
- Primary references for the two methods, cited but not retrieved here: Woolf (1955); Breslow and Day, *Statistical Methods in Cancer Research* Vol. I (1980); Tarone (1985)
