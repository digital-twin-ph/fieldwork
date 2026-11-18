# 220 · A disease model configured from its evidence

_Created 2026-11-17 · Updated 2026-11-17_

**Status:** tried. Spike run 2026-11-17: **yes, for measles; not yet like this for TB, Ebola or dengue.** Measles declared
as data runs in the kernel and reproduces measles written by hand, seed for seed. Follows [199](199-an-agent-based-model-in-the-browser.md), whose kernel runs one
model with its states and networks fixed in Rust.

## The question

The practitioner, 2026-11-17, after the measles spike: *"What if we have different compartments for other diseases,
e.g., vector borne?"*, then *"And we have the Gaborone ABM for TB where we have latent TB and MDR, XDR TB"*, then:
*"One key feature of the Gaborone ABM notebooks is how we researched the parameters for the model, how we set up the
population using census data, contact networks (church, school, kombi transport routes)."* And: *"So those should
inform how we configure the widget - what the configure dialog should include, how the evidence that informs each
parameter is included, and this could be very dense."*

How is a disease model configured in Fieldwork so that each parameter carries the evidence it rests on, the
population and the contact networks are built from data in steps that can be inspected, and the result is still
readable by a person with low vision?

## What three diseases ask of one declaration

A declaration (compartments, transitions, routes of infection) that the kernel runs, rather than a model written in
Rust for each disease. Measles is the one in the kernel now; dengue and TB are the next two asked for.

| Needs | Measles (Hagelloch) | Dengue (Rio de Janeiro, 2024) | TB (Gaborone) |
| --- | --- | --- | --- |
| Time | durations, in days | durations; a mosquito's lifespan | rates over years: latent infection may reactivate decades later, or never |
| Entering a state | after a duration | after a duration | after a duration or an event: diagnosis, treatment, loss to follow-up |
| Strains | one | four serotypes, later | drug-susceptible, MDR, XDR: caught, or acquired when treatment fails |
| Step | a day | a day | a week for natural history; hours for the care cascade |
| Route | contact | person to mosquito to person; mosquitoes counted per place, not as agents | contact: household and community air |
| Check | Starsim 3.7.4 (199) | the deterministic equations of the standard mosquito-borne model, the mean of many runs on a large population | the Gaborone model itself, which is on Starsim |

## What the Gaborone notebooks bring

As described by the practitioner; being read for this experiment.

- **Parameters, researched.** How each rate and duration was found, and what it cites. Some values were fitted with
  Optuna: their evidence is the fit (the data, the method, the result), not a citation.
- **A population from the census.** People in households, by age and sex, by district.
- **Contact networks from data.** Households, schools, churches, and kombi routes: people sharing a route at the same
  time are in contact.
- **Three intervention scenarios.** The practitioner: *"Then we also have three intervention scenarios, which might be
  important for 7-1-7 work."* The scenarios of the current model are compared in notebooks 17 and 18. A scenario changes parameters and events from a date, so it is
  configured like a parameter set, each change with its evidence; where it sets the delay from an event to a response
  (detection, notification, diagnosis, treatment, contact tracing), it is the bridge to 7-1-7's targets
  ([200](200-operational-epidemiology.md)).

## The Ebola model for North Kivu and Ituri

The practitioner, 2026-11-17: *"Even more important we have an Ebola version of ABM in that workspace I think,
NordKivu-Ituri in DRC"*, and *"I don't think we completed the NordKivu-Ituri one but it should be informative."* Read
on the same terms as Gaborone. Sixteen notebooks, from health zones, buildings and population through Lake Albert
crossings, forest cover, conflict and displacement, the case time series, a Starsim kernel, calibration and
interventions; what is finished is to be found, not assumed. Ebola adds a route neither measles nor TB has: infection
from the dead before burial. Its population can come from WorldPop over DR Congo, which Raster input keeps whole at
100 m since 0.138.0.

## The two models, inventoried 2026-11-17

Read, not run, by the code, their own documents and their saved outputs. The inventories are drafts for the
practitioner and JLT to check, outside this repository; what follows is what they found, not yet confirmed by the
models' authors.

| | Gaborone TB | North Kivu and Ituri Ebola |
| --- | --- | --- |
| State | in use, on Starsim; its archived older model left out at the practitioner's word (*"Skip archive"*, 2026-11-17) | about half built: data preparation finished, the simulation unfinished; its fit to the case curve removed |
| Parameters in the simulation | 100: 10 cited, 10 derived, 9 fitted, 71 assumed | 52: 8 cited, 5 derived, 4 fitted, 1 placeholder, 34 assumed |
| Networks | households, neighbourhoods, kombi routes; no church or school network | zones and venues; Lake Albert crossings, roads, forest and buildings prepared but not read by the simulation |
| Timing for 7-1-7 | none: treatment start counted as notification, contacts found at once, scenarios on from the start | none: detection at once, no notification, fixed delays without a source |
| Code against its documents | 11 disagreements | 7 noted, among them an at-risk fraction labelled as evidence that the evidence does not give |

What it means here: in both, most values would show as assumed in a dialog that shows evidence, which is the dialog's
purpose rather than a fault of the models. The timing a 7-1-7 target needs is to be built, not ported. Gaborone's
calibration rests on three parameters at their bounds, which its own lessons call a red flag.

## The configuration, as first proposed

**On the canvas, not in one dialog.** The population, each contact network and the disease are separate steps, each
configured where it is built, and each inspectable before the disease runs: a map, the contacts per person. A trainee
can take the kombi network away and see what changes.

**A parameter set is loaded whole and reviewed.** For example the Gaborone TB set as calibrated. The disease dialog
opens on a summary, not a form: how many parameters, how many from a source, derived, fitted or assumed, with the
assumed ones listed first. The groups (natural history, strains and resistance, care cascade, transmission) open one
at a time.

**Each parameter is one row; its evidence opens beside it.** The row: name, value and unit, basis, source. The evidence:
the source's own words, its page, how a derived value was worked out, when it was read; for a fitted value, the fit. A
changed value asks for its new source or is marked assumed, and the run's record keeps both. Each parameter's record
follows the shape `widgets/caps.json` already gives a limit: value, basis in a closed vocabulary, evidence.

## The trainee's work, agreed 2026-11-17

The practitioner: *"So the main tasks for the trainee using an ABM workflow would be calibration?"* Not mainly. The
weight goes where epidemiological judgement is built; the model does the arithmetic, the trainee the judging. Agreed
as the workflow this experiment designs for:

1. **Gather the evidence for each parameter**: find it, judge its source (setting, year, open or closed), decide when
   an assumption is acceptable.
2. **Build the population and its contacts from data**: households, schools, routes from census counts and maps, and
   what each contact network adds.
3. **Check the model before trusting it**: does it reproduce what is known (R0, the final size, the observed curve)?
   Calibration belongs here, run by Fieldwork and shown with its evidence (the fit, its bounds, a value on a bound),
   read and questioned by the trainee rather than tuned by hand.
4. **Ask the scenario question**: what detecting in 7 days rather than 20 would change; which response action matters
   most. Possible from the start, on a model calibrated by someone else.
5. **Interpret and communicate with uncertainty**: scenarios compared, not single forecasts; what the model does not
   establish, said.

A worked example may ship calibrated, so a trainee starts at step 4 and works back: why a scenario moves so much,
which parameter it is most sensitive to, and how good that parameter's evidence is.

## Branches, added 2026-11-17

The first row of the spike's table of what the format lacked: a course that branches. Steps from the same state are
now branches, each with a `share`, a probability parameter or `rest` for one of them; recover or die for Ebola, fast or
slow latency for TB. At infection the course is walked to its end, one random number choosing at each branch, then the
period; a course without branches draws only its periods, as before.

| Check | Result |
| --- | --- |
| Measles, declared, against measles written by hand | still identical: 300 seeds natively, 500 in WebAssembly, 500 on Hagelloch's 188 children |
| A branch taken in its share | an Ebola-shaped course (recover, or die and stay infectious until burial) with a case fatality of 0.67: the share dying within four binomial standard errors of 0.67, natively over 400 outbreaks and in WebAssembly over 400 |
| The unburied dead transmit | the same outbreaks with the dead not transmitting infect fewer, over 300 seeds |
| Refused | a step never reached; a course that comes round again; a branch with no share; two `rest`; shares coming to 1.170 |

Not yet: the check of a branching model against Starsim 4.0's Ebola, which needs its release candidate installed;
rates over years, strains and a weekly step, the other rows of that table. The Ebola-shaped course is a check of the
format with assumed values, not an Ebola model.

## Homes, kombis, and a laptop, 2026-11-17

**Homes from classified buildings.** The practitioner: *"For home transmission, in Gaborone, I remember classifying
buildings as residential vs. non-residential."* Notebook 03b, read: 156,275 footprints, OpenStreetMap's with Overture's
and Copernicus's where OpenStreetMap is thin, classed non-residential by their `building`, `amenity` or `landuse` tag
(school, kindergarten, church, mosque, place of worship, clinic, retail and others). Most carry only `building=yes` and
default to residential; GHSL's settlement zones (GHS-BUILT-C, 10 m, 2018) move some to non-residential. Floors come
from GHS-BUILT-H height at 3 m a floor, a missing height taking the neighbourhood's mean with a flag. Notebook 04
spreads people over residential buildings by floor area, and a building's residents are a home. Two consequences here:
"residential by default" is an assumption about most of the city, and shows as one; and 03b reads which buildings are
schools and churches and then discards the type. Kept, those buildings are the places a school and a church network
start from, which neither Gaborone model has.

**Kombi contact, as the model has it.** The practitioner: *"I don't remember how we modeled exposure to crowded kombi
buses. We reconstructed the kombi bus routes by hand."* As read in the current model, the hand-traced routes
(`GaboroneCombiRoutes.geojson`, from the 2015 combi map, appendix notebook 05a) feed an access score and the pollution
proxy, not contacts. Contacts: 55% of people commute, each placed at random in one of a set of groups of 15 (riders per
kombi, unsourced), every pair in a group in contact, groups fixed for a year, each contact at half weight; the kombi
rate held at an assumed 0.03 a year, where an earlier fit had 0.388. Where people live and which route they ride play no
part. The practitioner: *"It might have been a simplification out of necessity."*

**On a laptop, not a cluster.** The practitioner: *"We ran the notebooks in a Kubernetes cluster to speed things up,
but that's not the direction we want to take as not everyone in the world esp in low resource settings can run
simulations in a cluster."* And: *"I remember running the simulation on a VM for almost a day for Gaborone."* A model
here runs in one browser tab on an ordinary laptop. The kernel counts infectious people per group, so a group's cost is
per person, not per pair: riders on one route in one time window are a network like a household, whatever their number,
and route-based kombi contact costs no more than the random groups of 15. Starsim keeps contacts as pairs, 105 for a
group of 15.

**How cost grows with population, to measure.** The practitioner: *"It depends on the number of agents."* Committed:
one model at several sizes (1,000, 10,000, 100,000 and Gaborone's 385,500), timed in Starsim and in the kernel, so the
growth of each and the largest population a laptop browser runs in reasonable time are found, not guessed; measles
once branching is in, TB once the kernel runs it. Gaborone's `sweep_rate_vs_n.py` timed one run at 25,000 to the full
population, but its output was not kept. An extrapolation from Hagelloch (the kernel about 900 times Starsim's speed;
940,000 children over a run in 3.3 s) puts a Gaborone TB run at seconds to minutes in a tab; it is not a measurement,
and TB carries more than measles. Calibration's hundreds of runs stay out of a tab and ship done.

## How far each value's evidence travelled, agreed 2026-11-17

The practitioner, asked what happens when an adaptation lacks evidence for some parameters: *"somewhere in the
digital-twin-aas repo we actually automated evidence parameter search and came up with the conclusion that sometimes
the evidence could be directly relevant (same place, same time), relevant (same place, different time), adjacent
(same time, nearby setting), or generalized (the weakest)."* Found, read only, in the Community Health Simulation
Platform's evidence module (digitaltwin-aas, `digitaltwin/src/chsp/evidence/`, schema `chsp_core.yaml`), the
practitioner's and JLT's work. It grades place but not time: no grade for the period was found there.

A model still runs when evidence is thin; a value is refused only when it is missing. Each parameter's evidence record
carries:

| Field | Values | From |
| --- | --- | --- |
| Basis | cited, derived, fitted, assumed | this experiment |
| Place | direct, adjacent, national, regional, global | CHSP's `GeoFidelity`, as it stands |
| Time | same period, or a different period and how far apart | the practitioner's tiers; new |
| Directness | direct, indirect, very indirect | GRADE, as CHSP uses it |
| Credibility | indexed, preprint, unverified, unresolved | CHSP, which never counts it against a local or national journal outside the major indexes |

The practitioner's four tiers follow from place and time together: **directly relevant** (direct, same period),
**relevant** (direct, another period), **adjacent** (adjacent, same period), **generalized** (national, regional or
global, any period). The dialog lists the weakest first: assumed, then generalized. A range may stand in for a single
assumed value. After a run, a sensitivity check shows which uncertain values moved the result most, so evidence is
sought where it would change the conclusion; and the run's record states, as a limitation, how many values are
assumed or generalized and which one the result depends on most.

## What the research found, 2026-11-17

Report: reports/Declaring disease models with evidence.md, in the workspace beside this repository, with its notes;
every source marked open or closed and by how it was read. In short:

- **No declaration format is reused whole.** Starsim's 4.0 release candidate (MIT) is the only one that declares all
  four diseases as transitions, as agents or compartments, with a rate per network, strains, places and mosquitoes
  counted per place; its Ebola keeps the dead infectious until burial. It has no JSON form of the transitions found,
  its API is not final, and its parameter `source` is free text: its library values say "Illustrative". AMR and MIRA
  are compartmental only, with ontology grounding; SimInf has an event table worth borrowing.
- **Proposed:** Fieldwork's own JSON with Starsim's meaning; units, distributions and ontology terms after AMR and
  MIRA; events after SimInf; each parameter an evidence record whose basis is cited, derived, fitted or assumed. The
  compartmental part exported to AMR for an outside check.
- **Checks that can run by themselves:** the agents' mean against the deterministic model of the same declaration,
  R0 from the next-generation matrix, the final size; for TB, the published progression curves.
- **Values:** much of the TB care cascade in Botswana has open sources; preventive therapy among household contacts,
  acquired MDR on treatment and an HIV multiplier for progression do not. For Ebola in eastern DR Congo, onset to
  isolation, serial interval, case fatality, ring vaccination and the effect of insecurity are open; incubation, onset
  to death, death to burial and infections in health facilities have no open primary source found.
- **7-1-7:** no published model scores it from its own events. To do so a model must date emergence (for an endemic
  disease, by a declared threshold), detect through an observation process apart from infection, notify, and date the
  start of each of the seven actions.

## The spike, 2026-11-17

The practitioner: *"Spike"*. One question: can measles, declared as a model structure and a parameter set with the
evidence for each value, run in the kernel Fieldwork ships and give exactly the runs already recorded?

**What was built.** `kernel/src/declared.rs`, a runner that steps whatever is declared: the states, the state an
infection takes a person from and to, which states transmit, the chain of periods drawn at infection, and the contact
networks, each a set of groups or everyone, with a daily probability per infectious contact. `src/disease-model.ts`
checks a declaration, names a parameter set's missing values, counts its values by basis, and compiles both for the
kernel. Two declarations in `models/`: the structure `measles-seir-household-class-village` 1.0.0, and two parameter
sets for it, `measles-hagelloch-spike` (all five values assumed, as 199 ran them) and `measles-hagelloch-pink-book`
(the two periods derived from CDC's Pink Book with their working, the three probabilities assumed).

The Pink Book periods, as derived: **10 days** infected and not yet infectious (14 days from exposure to the rash, less
the 4 days a person transmits before it) and **9 days** infectious (4 before the rash, its day, 4 after). The chapter
gives averages only, so no spread is assumed: every child takes 10 and 9. Its secondary attack rate of more than 90%
among susceptible close contacts would need at least 0.23 a day in a household over 9 days, against the 0.08 assumed;
recorded on the value, not acted on, since a Hagelloch household is not the chapter's setting and the probabilities are
to be fitted.

| Check | Result |
| --- | --- |
| Measles declared against measles written by hand, natively | 300 seeds: same table, same count, same day of infection for every child (Rust, `declared.rs`) |
| The same in WebAssembly, the module Fieldwork ships | 500 seeds: the same (`tests/declared-model.test.mjs`) |
| The recorded seed | 16 infected, table checksum 967,536, as recorded in 199 |
| Hagelloch's 188 children, the spike's set | 500 runs: identical to the hand-written kernel's, 0.33 ms a run |
| An empty parameter set | valid to hold; refused when run, naming the five missing values |
| A derived value with no working or no source; a set for another structure; a probability of 1.4 | refused |

**With the Pink Book periods, against Starsim 3.7.4**, 500 runs each on the 188 children:

| | Fieldwork, declared | Starsim | KS p |
| --- | --- | --- | --- |
| Children ever infected | 187.13 ± 0.94 | 187.18 ± 0.89 | 0.999 |
| Peak infectious | 77.99 ± 5.01 | 77.85 ± 5.16 | 0.989 |
| Day of the peak | 43.91 ± 4.38 | 43.63 ± 4.33 | 0.498 |

The largest difference in a day's mean infectious is z = 2.74, on day 90 of 150, in the tail where few remain
infectious; over 150 days compared, a largest |z| of about that size is what chance alone gives. Starsim took 287 ms a
run, the kernel 0.32.

**The format, tried on paper against the other three diseases.** Where it breaks:

| Needed | Measles | Ebola | TB | Dengue |
| --- | --- | --- | --- | --- |
| A course that branches (die or recover; fast or slow latency), added 2026-11-17, below | no | yes: death to an infectious unburied state | yes: fast or slow at infection | no |
| A period given as a rate, not whole days between bounds | no | no | yes: reactivation over years | no |
| More than one state an infection can come from | no | no | yes: reinfection of the latent | yes: a second serotype |
| Strains | no | no | yes: drug-susceptible, MDR, XDR, with resistance acquired on treatment | yes: four serotypes |
| A population counted, not agents | no | no | no | yes: mosquitoes by place |
| Events from the care system | no | yes: isolation, safe burial, vaccination | yes: diagnosis, treatment, loss to follow-up | no |
| A step other than a day | no | no | yes: a week | no |

Measles needs none of these, which is why it passed. Each row is an addition to the structure's format, and the
measles reproduction is the regression that each must keep passing.

**What the spike does not establish.** That the format will hold once branching, rates and strains are added; the
evidence dialog, which was not built; anything on a population other than Hagelloch's 188 children; that the Pink Book
periods suit 1861 Hagelloch: they are a 2024 reference for children of another century, placed `global` and
`indirect` on their records; or that the three probabilities are right, which no one has fitted.

## Open questions

- Reading the Gaborone model and its notebooks, under digitaltwin-aas. The practitioner, 2026-11-17: *"Yes you can
  read the Gaborone repo. That repo is the work of JLT and myself."* Read only; nothing there is edited.
- How many parameters there are, how they group, and which sources are open. Under the open-evidence rule a closed
  source is replaced by an open one or stated as a gap.
- How a fitted value's evidence is shown.
- Where a church network's data comes from: likely the least documented of the four.
- **A second Gaborone model in JupyterLite, after the TB model is in Fieldwork**: for a future experiment to answer.
  The practitioner, 2026-11-17: *"do you think we can build version 2 of the Gaborone ABM in JupyterLite after we build
  the ABM for TB in FW?"* Two routes, neither checked: Starsim in Pyodide (it may depend on numba, which does not run
  in the browser), or the notebooks calling Fieldwork's own kernel in WebAssembly, one engine behind two interfaces with
  Starsim as the outside reference for both. Either way calibration and the heavy data preparation would ship done.
  That experiment would begin with a spike: does Starsim load in JupyterLite, and can Pyodide call the kernel.

## What it commits to, written before the result

First an inventory of every Gaborone parameter (group, value, basis, source, open or closed) for the practitioner to
check; then a mockup of the dialog from that real list; then the declaration format, with measles reproducing 199's
recorded seed exactly.

## What it does not establish

Anything yet. The design above is drawn before the notebooks were read, and may not survive them.
