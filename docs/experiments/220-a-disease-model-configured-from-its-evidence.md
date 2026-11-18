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
