# 199 · An agent-based model in the browser, checked against Starsim

_Created 2026-11-11 · Updated 2026-11-17_

**Status:** asked. A spike proposed 2026-11-10 and placed after MERS (TODO 29); moved ahead of MERS by the practitioner on
2026-11-17 (*"Let's investigate the ABM spike next"*), on Hagelloch's measles. **Spike run 2026-11-17: yes.** A
kernel in Fieldwork's own Rust crate gives the same tables natively and in WebAssembly, and agrees with Starsim
3.7.4 within run-to-run spread; nothing of it is in the application yet. The number was reserved
in [200](200-operational-epidemiology.md) on 2026-11-09, and the proposal went unrecorded for a day.

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
