# 199 · An agent-based model in the browser, checked against Starsim

_Created 2026-11-11 · Updated 2026-11-11_

**Status:** asked. A spike proposed 2026-11-10 and placed after MERS (TODO 29); nothing built. The number was reserved
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
| Population | Old Naledi, already a worked example: its households or buildings become the agents' homes |
| In Fieldwork | A kernel (Rust compiled to WebAssembly, or a worker; see above) that steps the agents weekly from a recorded seed and gives back a table of counts by state per week, which Chart draws; a progress bar and a full record of the run, as the space-time scan has |
| Check | The same configuration in Starsim in desktop Python, many runs each way. The random numbers differ, so the criterion is that the weekly counts fall within each other's run-to-run spread, not that they match. Desktop only if Starsim cannot run in the browser kernel, and the lab says so |
| Measured | How many agents for how many years the browser handles before it is too slow: a limit found, not chosen |
| Time box | About a day. The result is yes, no or "not like this", written here either way |

**The smaller alternative:** a measles model on Hagelloch's 188 children, houses and school classes. Simpler than TB and
on data already loaded; it ties to the replay, which says a scan would first have flagged the outbreak on 21 November:
the model could ask what a response from that day would have changed. It tests the same machinery and does not move
the Gaborone port forward.

**Proposed:** the TB spike on Old Naledi.

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
fit Old Naledi or any other place.
