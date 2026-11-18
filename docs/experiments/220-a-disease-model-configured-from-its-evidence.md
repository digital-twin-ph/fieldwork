# 220 · A disease model configured from its evidence

_Created 2026-11-18 · Updated 2026-11-18_

**Status:** asked. Nothing built. Follows [199](199-an-agent-based-model-in-the-browser.md), whose kernel runs one
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
  important for 7-1-7 work."* In the repository as Do Nothing, Bare Minimum, and Optimal and Integrated (appendix
  notebooks 11 to 13), compared in notebook 17. A scenario changes parameters and events from a date, so it is
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
| State | in use; scenarios on the current Starsim model and, for the three named ones, on an older Mesa model | about half built: data preparation finished, the simulation unfinished; its fit to the case curve removed |
| Parameters in the simulation | 100: 10 cited, 10 derived, 9 fitted, 71 assumed | 52: 8 cited, 5 derived, 4 fitted, 1 placeholder, 34 assumed |
| Networks | households, neighbourhoods, kombi routes; no church or school network in either the current or the older model, where church and school appear only in comments; the older model's runs, at one step a day, read as home contact only | zones and venues; Lake Albert crossings, roads, forest and buildings prepared but not read by the simulation |
| Timing for 7-1-7 | none: treatment start counted as notification, contacts found at once, scenarios on from the start; the three named scenarios (older model) set only daily chances, unsourced, with detection about 500, 125 and 67 days on average | none: detection at once, no notification, fixed delays without a source |
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

## Open questions

- Reading the Gaborone model and its notebooks, under digitaltwin-aas. The practitioner, 2026-11-17: *"Yes you can
  read the Gaborone repo. That repo is the work of JLT and myself."* Read only; nothing there is edited.
- How many parameters there are, how they group, and which sources are open. Under the open-evidence rule a closed
  source is replaced by an open one or stated as a gap.
- How a fitted value's evidence is shown.
- Where a church network's data comes from: likely the least documented of the four.

## What it commits to, written before the result

First an inventory of every Gaborone parameter (group, value, basis, source, open or closed) for the practitioner to
check; then a mockup of the dialog from that real list; then the declaration format, with measles reproducing 199's
recorded seed exactly.

## What it does not establish

Anything yet. The design above is drawn before the notebooks were read, and may not survive them.
