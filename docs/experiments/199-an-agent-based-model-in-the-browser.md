# 199 · An agent-based model in the browser, checked against Starsim

_Created 2026-11-11 · Updated 2026-11-21_

**Status:** asked. A spike proposed 2026-11-10 and placed after MERS (TODO 29); moved ahead of MERS by the practitioner on
2026-11-17 (*"Let's investigate the ABM spike next"*), on Hagelloch's measles. **Spike run 2026-11-17: yes.** A
kernel in Fieldwork's own Rust crate gives the same tables natively and in WebAssembly, and agrees with Starsim
3.7.4 within run-to-run spread; nothing of it is in the application yet. Its measles periods were set from CDC's Pink Book, and the model declared
as data rather than written in Rust, on 2026-11-17 in [220](220-a-disease-model-configured-from-its-evidence.md). The number was reserved
in [200](200-operational-epidemiology.md) on 2026-11-09, and the proposal went unrecorded for a day. **Set beside the
recorded curve on 2026-11-21** (option 4, chosen 2026-11-19): the size and the timing of the bulk agree, the recorded
peak is twice as sharp as the model's; not fitted. **The periods measured from the record the same day** (the practitioner's choice): the timing
then agrees, the peak is still half the record's. **The three probabilities fitted, also 2026-11-21:** a better fit, the peak still not reached; the
record's peak is class 1's burst, which one probability for both classes cannot make. **A probability for each class,
also 2026-11-21:** it does not make the peak either, even at 0.6 a day in class 1. **Infectiousness across the illness, also
2026-11-21:** the best fit yet, nearly all transmission in the prodrome's last days; the peak still not made.

## The question

The practitioner, 2026-11-10, on how this relates to 200: *"we can also simulate 717 activities."* Then: *"For 199 if
we do a spike for ABM what would that be?"* And on 2026-11-11, placing it: *"Let's do it after MERS."*

A model of an outbreak is what a response is timed against, and its contact structure is what contact tracing reads.
The long aim is to port the Gaborone TB agent-based model one step at a time and to run the 7-1-7 milestones in it
(detection, notification, the seven early response actions), each with its own delay, so a target can be tested before
an event.

## The model to port, as read on 2026-11-10

A Python package on Starsim 3.3.4: about 1,100 lines of core plus analyzers. TB natural history; a care cascade timed
by the hour (care-seeking, Xpert turnaround, treatment start, loss to follow-up, contact tracing, preventive therapy);
drug-resistant TB; calibrated with Optuna over 19 notebooks of spatial and evidence preparation. Its repository is
under digitaltwin-aas: read there, ported here, never edited in place.

## Kernels already evaluated

The practitioner, 2026-11-11: *"We evaluated several Rust based ABM kernels including krabmaga."* That evaluation is
not on this machine: searched 2026-11-11 were the digitaltwin-ph and digitaltwin-aas workspaces, every session
transcript, and the Gaborone project's notes, which record only the move from Mesa to Starsim. Its findings, once
found, decide the spike's engine: Fieldwork already compiles a Rust kernel to WebAssembly for its epidemiological
methods, so a Rust ABM kernel could run in the browser on that path rather than as a new JavaScript worker. Whether
krABMaga builds for WebAssembly, and on what licence, is to check from its own documentation.

## The spike

**One question: can Fieldwork run a small agent-based model in the browser, reproducibly, that agrees with Starsim?**

| Part | What it is |
| --- | --- |
| Scope | TB natural history only: susceptible, latent, active, on treatment, recovered, at the Gaborone model's own rates. No care cascade, calibration, terrain or pollution |
| Population | Proposed as Old Naledi's homes; Old Naledi retired as an example on 2026-11-11 (docs/audits/old-naledi-audit.md). To choose: the Gaborone model's own inputs, read where they are, or Hagelloch's 188 children (the alternative below) |
| In Fieldwork | A kernel (Rust compiled to WebAssembly, or a worker; see above) that steps the agents weekly from a recorded seed and gives back a table of counts by state per week, which Chart draws; a progress bar and a full record of the run, as the space-time scan has |
| Check | The same configuration in Starsim in desktop Python, many runs each way. The random numbers differ, so the criterion is that the weekly counts fall within each other's run-to-run spread, not that they match. Desktop only if Starsim cannot run in the browser kernel, and the lab says so |
| Measured | How many agents for how many years the browser handles before it is too slow: a limit found, not chosen |
| Time box | About a day. The result is yes, no or "not like this", written here either way |

**The smaller alternative:** a measles model on Hagelloch's 188 children, houses and school classes. Simpler than TB and
on data already loaded; it ties to the replay, which says a scan would first have flagged the outbreak on 21 November:
the model could ask what a response from that day would have changed. It tests the same machinery and does not move
the Gaborone port forward.

**Proposed** on 2026-11-10: the TB spike on Old Naledi, before it retired. Its population is to choose again (above).
The Rust kernel survey (reports/Rust agent based model kernels.md, 2026-11-11) recommends a small fixed-step kernel in
Fieldwork's own Rust crate, with CDC's ixa tried beside it.

## Hagelloch as the population, 2026-11-17

The practitioner chose the smaller alternative: *"Measles, Hagelloch 188"*, and Starsim installed for the check. Then:
*"Do we have population census for that era?"* and *"Yes look for open copy, pop census"*.

**What Fieldwork holds:** 188 children, aged 0 to 15, every one a case; 69 families of 1 to 7 children; school class
0 (not at school) 90, class 1 30, class 2 68 (`examples/hagelloch-1861/cases.json`).

**What was read, and where:**

| Figure | Source | Read how |
| --- | --- | --- |
| Over 600 inhabitants first in 1849; stagnant in the 1850s and 1860s through emigration; 587 in 1871, 748 in 1900 | Stadtarchiv Tübingen, finding aid C30, Ortsarchiv Hagelloch (open PDF on tuebingen.de) | Text extracted from the PDF |
| 579 inhabitants, year not stated | Beschreibung des Oberamts Tübingen (1867), Hagelloch, on Wikisource | Read on the page |
| 188 children aged 15 and under were susceptible, and every one was infected | Groendyke, Welch and Hunter (2012), Biometrics, author's copy on cs.auckland.ac.nz (licence not stated) | Text extracted from the PDF |
| From the abstract: "nearly all children under 14 years of age" affected; deaths 12 of 187 cases, 7 of 70 under five; 82 of 187 secondary cases. From a search summary only: 577 inhabitants in 1861, 197 children under 14, the previous outbreak in 1847 | Aaby P, Thoma H, Dietz K (2022), "Measles in the European past: outbreak of severe measles in an isolated German village, 1861", J Infect 84(5):668–674, doi:10.1016/j.jinf.2022.02.010; abstract on Europe PMC (PMID 35182549) | **Full text not read**: subscription only, not in PMC; the Tübingen repository refused the connection again on 2026-11-17. The abstract was read |
| 185 of 197 infected; children born after 1847 susceptible | Neal and Roberts (2004), Biostatistics | **Not read**: no open copy found; the publisher's is closed |

**No 1861 census count is in hand.** The archive's census files (A 7) begin in 1895, and its register of residents
(A 114) in 1885. What was read brackets the village at 577 to 600 or so in the 1860s; the 577 for 1861 is unread.

**For the model:** the 188 children, as recorded, are the population; the one open source read says all were
susceptible and all were infected. The 577 and the 197 come from a search summary, not the paper, and the counts of
cases (187 in Aaby's abstract, 188 in Groendyke) are not reconciled here. Adults are left out as immune after the 1847 outbreak: an assumption, stated. If the
Tübingen repository's copy of Aaby 2022 opens later, the 197 is checked against it before any model uses it.

## The spike, run 2026-11-17

**The model.** Susceptible, exposed, infectious, recovered; one step a day; progression first, then transmission, as
Starsim orders them. Three contact networks: the household (69 families), the school class (classes 1 and 2; class 0
is not at school) and the whole village. A susceptible child is infected on a day with probability
1 − (1 − p_household)^h (1 − p_class)^c (1 − p_village)^v, h, c and v the infectious children in each. The index is
the child with the earliest prodrome (case 184, 30 October 1861), exposed on day 0. `kernel/src/abm.rs`, SplitMix64
random numbers from a recorded seed.

**The parameters are the spike's, not Hagelloch's.** Latent period 10 to 12 days and infectious period 8 to 9 days,
uniform in whole days: taken from general knowledge of measles, not yet checked against an open source (the CDC Pink
Book's measles chapter is the one to read). Transmission per contact per day 0.08 in the household, 0.02 in the
class, 0.002 across the village: chosen, not fitted. The spike tests whether two engines compute the same model, not
whether this model fits the outbreak.

**Check 1, the same seed natively and in WebAssembly.** 500 seeds on Hagelloch's 188 children: all 500 daily tables
identical. Kept as tests: `a_recorded_seed_gives_the_recorded_table` in the kernel and `tests/abm-kernel.test.mjs`
assert the same checksum (967,536) from each build.

**Check 2, against Starsim.** The same specification in Starsim 3.7.4 (`ss.SEIR`, three `ss.StaticNet` networks, a
beta per network, `ss.randint` periods, steps of one day): its timing checked first against the kernel's own test
(exposed days 0 to 9, infectious 10 to 17, recovered from 18, identical). Then 500 runs each:

| Over 500 runs | Kernel | Starsim |
| --- | --- | --- |
| Ever infected, of 188, mean | 186.93 | 186.92 |
| Peak infectious, mean | 70.98 | 70.89 |
| Day of the peak, mean (5% to 95%) | 47.07 (40 to 55) | 46.97 (40 to 55) |
| Last day anyone exposed or infectious, mean | 79.49 | 79.03 |

Two-sample tests find no difference (Mann-Whitney p 0.18 to 0.88, Kolmogorov-Smirnov p 0.56 to 0.996). Of the 600
daily means (150 days, four states), the largest gap is 0.91 of a child, and none differs by more than 2.1 standard
errors. 36 of the 600 fall outside the other engine's 5%-to-95% band, all in the tail, where most runs have ended and
the band is [0, 0]; measured by standard error, there are none.

**Measured: time and size.** 500 runs in 130 ms in the kernel (Node's V8, the engine Chromium uses; not yet in a
browser worker), 0.26 ms a run; Starsim took 280 ms a run in desktop Python. One run of 150 days, copies of
Hagelloch side by side: 188 children 1 ms; 18,800 50 ms; 188,000 0.57 s; 940,000 3.3 s, the module's memory at 112
MB. Linear in the children, because the village is counted once a day rather than drawn pair by pair as Starsim
does: exact for mixing evenly across the village, and to be rethought for any structure finer than that.

**The Starsim side is not in this repository.** The script and the harness ran in the session's scratch folder; to
be kept, pinned, in the Validation Lab, which is where an independent recomputation belongs.

**What this establishes:** the kernel computes what Starsim computes for this specification. **What it does not:**
that the periods or probabilities fit Hagelloch, that the model reproduces the outbreak as recorded, or how it runs
in a browser worker on a slower laptop. Comparing the model with the recorded curve is a calibration question, and
the practitioner's to put.

## The model beside the recorded curve, 2026-11-21

The practitioner chose option 4 on 2026-11-19: compare the model with Hagelloch's recorded curve. Not a fit: each
declared model in `models/` runs as declared, 500 seeds, on the 188 children in their households and classes, and its
children per day are set beside the record's. `scripts/abm-hagelloch-curve.mjs`; 0.4 s for all three in Node.

| Model run | Set beside | Its event |
| --- | --- | --- |
| SEIR, `measles-hagelloch-spike` | the recorded rash less 4 days | becoming infectious |
| SEIR, `measles-hagelloch-pink-book` | the recorded rash less 4 days | becoming infectious |
| Prodrome and rash, `measles-hagelloch-prodrome-rash`, scenario `hagelloch-as-in-1861` (school shut on Sundays) | the recorded rash | the rash |

The rash less 4 days is the Pink Book's start of infectiousness ("transmissible from 4 days before through 4 days
after rash onset", page dated 24 April 2024, read again 2026-11-21). Every curve counts from the index child's own day
(case 184, earliest prodrome); one child's rash comes before the index's.

Median, with 5% to 95% over the 500 runs:

| | Recorded | SEIR, spike | SEIR, Pink Book | Prodrome and rash, 1861 |
| --- | --- | --- | --- | --- |
| Children reached | 187 + 1 | 187 (185 to 188) | 187 (185 to 188) | 187 (185 to 188) |
| Half reached by day | 29 | 33 (30 to 37) | 31 (28 to 34) | 34 (32 to 41) |
| Peak day | 31 | 29 (25 to 41) | 27 (22 to 37) | 34 (31 to 41) |
| Children on the peak day | **26** | 13 (11 to 17) | 14 (11 to 18) | 16 (12 to 22) |
| Last day | 82 | 60 (53 to 72) | 55 (49 to 66) | 60 (52 to 70) |
| Children after day 60 | 1 | 0 (0 to 2) | 0 (0 to 1) | 0 (0 to 3) |
| Recorded days inside the band | | 61 of 83 | 66 of 83 | 60 of 83 |

**Found:**

- **The size agrees**, as it must when nearly every child is reached.
- **The timing of the bulk agrees for SEIR**: half the children by day 29 recorded, 31 (28 to 34) with the Pink Book's
  periods. The prodrome-and-rash model, with Sunday closures, is later: 34 (32 to 41), the recorded day outside it.
- **The recorded peak is twice as sharp as any model's.** 68 children came out in the rash on 5, 6 and 7 December
  1861 (25, 17, 26): 33 of class 2's 68 children (aged 10 to 15) and 35 of the 90 not at school (aged 0 to 7), and none of class 1's 30 (mostly 8 to 10). The models'
  95th percentiles for those three days sum to 29 to 36.
- **The last day** is one late child (day 82); the models allow up to 3 after day 60, so it is not a tail they miss.

**What this does not establish:** why the record is sharper. A burst in the older class and among the young children at home
is what a single shared exposure would give, but the three probabilities are assumed, not fitted, and a fit is the
next question, not this one. Nor does it say whether the recorded dates are heaped, or how the model runs in a
browser worker on a slower laptop.

## The periods from the record, 2026-11-21

The practitioner chose, of the two next steps, to read the periods from the record before fitting anything. The record
gives each child's prodrome and rash, and an infector for 184 of the 188: the putative source, as the record gives it,
not an observed transmission.

- **The prodrome**, from prodrome to rash, all 188 children: 0 to 13 days, 10th centile 2, median 4, 90th 6, mean 3.95;
  72 children had 4.
- **From the infector's prodrome to the child's**, 184 pairs: 7 to 16 days, median 10; 10 in the 68 school-class pairs,
  11 in the 77 household pairs, 10 in the other 39.
- **The latent period** that leaves: a classmate can be infected only in the infector's prodrome, while the infector
  is at school. Taking the middle of the infector's prodrome as the day of infection gives 6 days (10th centile), 8.5
  (median) and 10.5 to 11 (90th), the same in each kind of pair. No single number fits: of the 68 class pairs, at
  most 41 allow any one value (9 or 10 days).

Declared as `measles-hagelloch-from-the-record`: latent 6 to 11 days, prodrome 2 to 6, drawn evenly (means 8.5 and
4); the rash's 5 infectious days kept from the Pink Book, since nothing in the record marks when a child stopped
being infectious; the three probabilities kept as assumed, so that only the periods change. Run as the prodrome-and-rash
model was, as in 1861, 500 seeds:

| | Recorded | Prodrome and rash, Pink Book's periods | Prodrome and rash, the record's periods |
| --- | --- | --- | --- |
| Half reached by day | 29 | 34 (32 to 41) | 30 (25 to 38) |
| Peak day | 31 | 34 (31 to 41) | 30 (23 to 39) |
| Children on the peak day | **26** | 16 (12 to 22) | 13 (11 to 17) |
| Last day | 82 | 60 (52 to 70) | 54 (45 to 65) |
| Recorded days inside the band | | 60 of 83 | 72 of 83 |

**Found:** the record's periods bring the timing in: half the children by day 30 against the record's 29, and the
recorded curve inside the band on 72 of 83 days. The peak does not come: the 95th percentiles of the three peak days
sum to 40, against the 68 recorded. Shorter, spread periods widen each generation rather than narrow it. Whatever makes
the record sharp is not in the periods.

**What this does not establish:** that the infectors are right (they are the record's attribution); the shape of either
period (drawn evenly, the model gives as many 2-day as 4-day prodromes, where the record has 29 against 72, a shape the
structure cannot yet declare); or why the peak is sharp. That is the probabilities' question, and the fit's.

## The three probabilities fitted, 2026-11-21

The practitioner, 2026-11-21: *"Yes start"*. `scripts/abm-hagelloch-fit.mjs` fits household, class and village
together, with the periods of `measles-hagelloch-from-the-record` held and the school shut on Sundays. The measure is
the Poisson deviance of the record's rashes per day, days 0 to 89 from the index child's, against the model's mean over
its runs. A grid of 8 × 10 × 8 points at 100 runs each, then 7 × 7 × 7 around the best at 300, then the best at 1,000:
83 s in Node. Declared as `measles-hagelloch-fitted`, each value's basis "fitted".

| | Assumed (0.08, 0.02, 0.002) | Fitted |
| --- | --- | --- |
| Household, per day from one infectious housemate | 0.08 | 0.47 (0.25 to 0.9) |
| Class, per day from one infectious classmate | 0.02 | 0.0035 (0.0017 to 0.007) |
| Village, per day from one infectious child elsewhere | 0.002 | 0.0052 (0.0041 to 0.0052) |
| Deviance | 203 | 154 |
| Half reached by day (recorded 29) | 30 (25 to 38) | 27 (23 to 32) |
| Peak day (recorded 31) | 30 (23 to 39) | 28 (22 to 34) |
| Children on the peak day (recorded **26**) | 13 (11 to 17) | 17 (14 to 21) |
| Recorded days inside the band | 72 of 83 | 76 of 83 |
| The three peak days' 95th percentiles (recorded 68) | 40 | 52 |

The ranges are the points of the fine grid within 4 of the best deviance (38 of 343). The household's is flat to the
top of the grid: a household's children are reached either way. The fit moves transmission from the school class to the
village.

**Where the record's peak comes from.** Class 1 (30 children, mostly 8 to 10; the index child, aged 13, was in class 2)
came out in the rash almost together: 25 of the 30 on days 18 to 21. The record names class 1's children as the
infectors of 34 of the 68 rashes on the three peak days, and class 2's of 25. Generation 3 in the record's tree holds
102 children. One synchronous class infects a synchronous next generation.

**The periods as a sensitivity**, fitted again with them replaced for the run only (`--periods`):

| Periods | Deviance | Peak day count | Three peak days, 95th |
| --- | --- | --- | --- |
| Latent 6 to 11, prodrome 2 to 6 (the record's, declared) | 154 | 17 (14 to 21) | 52 |
| Latent 8 to 9, prodrome 2 to 6 | 141 | 17 (14 to 21) | 54 |
| Latent 8 to 9, prodrome 3 to 5 | 152 | 18 (15 to 23) | 59 |
| Latent 10, prodrome 4, fixed | 406 | 18 (15 to 24) | 45 |

Narrower periods do not make the peak: no run in any of these peaks near 26 at the 95th percentile. Fixed periods fit
far worse.

**Found:** the fit is better than the assumption, and the timing agrees, but no setting of these three probabilities,
with these periods or narrower ones, makes the record's peak. The structure gives both classes one probability; the
record has class 1 infected in one burst and class 2 over longer.

**What this does not establish:** whether a probability for each class, or a single shared exposure (a day at school,
a gathering), would make the peak; that is a change to the structure, not to a value. Nor that the fitted values are
right in any other village: the household's is barely determined, and the deviance against a mean curve rewards a
model whose runs agree on timing, not one whose runs are each sharp. The fit's last day is 41 (35 to 47), against the
record's 82, which is one late child.

## A probability for each class, 2026-11-21

The practitioner, 2026-11-21, agreeing to try it first: *"Agree with probability suggestion"*. Declared as the structure
`measles-prodrome-rash-household-classes-village`, a network for each class over its own pupils only, with
`hagelloch-as-in-1861-by-class` shutting both on Sundays. The periods of `measles-hagelloch-from-the-record`; four
probabilities fitted together by `scripts/abm-hagelloch-fit.mjs --by-class` (5 × 8 × 8 × 6 points at 100 runs, then
5⁴ at 300; 199 s).

| | One class probability | A probability for each class |
| --- | --- | --- |
| Household | 0.47 (0.25 to 0.9) | 0.10 (0.05 to 0.21) |
| Class 1 | 0.0035 | 0.030 (0.011 to 0.043) |
| Class 2 | 0.0035 | 0.015 (0.011 to 0.021) |
| Village | 0.0052 | 0.0043 (0.0030 to 0.0043) |
| Deviance | 154 | 152 |
| Children on the peak day (recorded **26**) | 17 (14 to 21) | 16 (14 to 20) |
| Three peak days, 95th percentiles (recorded 68) | 52 | 50 |

Ranges as before: the fine grid's points within 4 of the best deviance (37 of 625).

**Pushed by hand** (`--at`, 500 runs each), since a fit to the mean curve could pass over a sharp but late-or-early run:

| Household, class 1, class 2, village | Deviance | Peak day, median (95th) |
| --- | --- | --- |
| 0.10, 0.03, 0.015, 0.0043 (the fit) | 153 | 16 (20) |
| 0.10, **0.3**, 0.015, 0.0043 | 163 | 17 (20) |
| 0.10, **0.6**, 0.015, 0.002 | 187 | 14 (18) |
| 0.10, **0.6**, **0.1**, 0.002 | 277 | 15 (19) |

**Found:** a probability for each class neither improves the fit nor makes the peak. With class 1 at 0.6 a day, every
pupil is infected within a day or two of the first infectious classmate, and the peak still does not rise: the
burst is made, but the next generation spreads out again over the periods. The fitted classes are close (0.03 and
0.015, their ranges touching), so the record does not ask for two.

**What this does not establish:** what does make the peak. Left: how infectious a child is across its prodrome (the
model makes every infectious day alike; if most transmission falls on the prodrome's first days, a burst would stay
a burst); a single shared exposure; and whether the record's dates are heaped. Nor is this a finding about measles: it is
about this model against one record.

## How infectious each day is, 2026-11-21

The practitioner, 2026-11-21: *"Yes let's go with infectiousness"*. Until now every infectious day counted alike. The
kernel now takes a weight for each state (`STATE_WEIGHT`): an agent counts as that many infectious contacts, 1 by
default, so a model that declares none draws exactly as before (the kernel's 55 tests, and the declared model against
the hand-written one, unchanged). A structure declares a weight as a `relative` parameter on an infectious state.

Declared as `measles-prodrome-split-household-class-village`: the prodrome in two parts, its early days (`P1`, 1 to 4)
and its last before the rash (`P2`, 1 to 2), the record's 2 to 6 days with the same mean of 4; the late prodrome counts
as 1, and the early prodrome (`w_early`) and the rash (`w_rash`) are fitted with the three probabilities
(`--split`; 5 × 6 × 5 × 4 × 4 points at 100 runs, then 7³ × 3 × 3 at 300; 651 s). Declared as
`measles-hagelloch-fitted-split`.

| | Every infectious day alike | Weighted by part of the illness |
| --- | --- | --- |
| Early prodrome, against its last days | 1 | **0.15** |
| With the rash, against the prodrome's last days | 1 | **0** (0 to 0.07) |
| Household | 0.47 | 0.33 (0.08 to 0.33) |
| Class | 0.0035 | 0.04 (0.02 to 0.05) |
| Village | 0.0052 | 0.016 (0.013 to 0.02) |
| Deviance | 154 | **143** |
| Children on the peak day (recorded **26**) | 17 (14 to 21) | 16 (14 to 21) |
| Three peak days, 95th percentiles (recorded 68) | 52 | 52 |

The village's best lies at the top of the fine grid, and was checked past it by hand: 0.025 gives a deviance of 217,
0.035 one of 413.

**Pushed by hand** (`--at`): with every child infectious only in the prodrome's last one or two days, the peak day is 12
(95th 16); raising the village's probability does sharpen it, to 22 (95th 28) at 0.05, but the outbreak then runs far
too fast (deviance 676).

**Found:** the best fit of any so far puts nearly all transmission in the last days before the rash, and none after it.
That is what Pfeilsticker reports: the prodrome transmits, the rash-to-rash interval in a household 10 or 11 days and not
14 (see `measles-hagelloch-prodrome-rash`). The peak is still not made.

**What this does not establish:** the split of the prodrome, which is assumed (nothing in the record marks it); that the
weights are measles's rather than this record's; why the peak is sharp. Of the three left on 2026-11-21, a single shared
exposure and the record's dates heaped remain.

## Left for later, step by step, if the spike says yes

1. The care cascade.
2. Contact tracing.
3. The 7-1-7 milestones as events in the model, each with a delay to vary: *"if this outbreak had been detected on
   day X and responded to within 7 days, what changes?"* This is where 199 meets 200 and the MERS ruleset (TODO 8).
4. Calibration.

## Validation it commits to

- The Starsim agreement above, by run-to-run spread, with the number of runs and the spread stated.
- The browser's limit, measured and recorded.
- **Practitioner observation, before it is known:** whether a person reads a simulated count as a forecast of what
  will happen, or as what the model's assumptions imply.

## What this does not establish

Nothing yet: it is asked. Agreement with Starsim would show the port is faithful, not that the Gaborone model's rates
fit any place.
