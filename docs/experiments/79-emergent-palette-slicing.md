# 79 · Slicing the palette by purpose, from use rather than by decree

_Created 2026-10-10 · Updated 2026-10-15_

**Status:** proposal, with one measurement already in hand.

## The claim

The palette can be filtered by **purpose**, and purpose has at least two axes:

- **Skill level**, when the person is learning.
- **Public health scenario** — outbreak investigation, epidemiological study,
  surveillance, service access, climate exposure.

**Split across surfaces, 2026-10-11.** These looked like one feature with two
parameters and are two features for two places. Scenario is field work and
stays in the browser application; skill level is learning and moves to the
desktop build, with the reasoning in
[desktop and browser for learning](../research/desktop-and-browser-for-learning.md).
The emergence argument below applies to both and is unaffected by where each
runs.

Neither can be assigned at the outset. **Which widgets belong to which scenario is
not knowable in advance; it emerges from what people actually build.** So the
mechanism has to collect the classification rather than declare it.

## Skill level has a definition already, from the case study authors

The PHI studies were graded by their authors on a stated criterion: Advanced-1 is
advanced **because it introduces concepts the Basic notebooks do not**. That makes
level derivable rather than a label.

| Level | What it introduces |
| --- | --- |
| Basic | point data, a basemap, markers, a mean centre |
| Advanced-1 | a street network, graph projection, snapping, reachability |
| Advanced-2 | convex hull, Voronoi partition, spatial join, clipping |

A level is the set of concepts a learner meets for the first time. A learner at a
level sees the widgets whose concepts they have met.

## The structure is already in the data

Measured 2026-10-10 across seven worked examples, counting how many each widget
appears in:

| Appears in | Widgets |
| --- | --- |
| 6–7 examples | `observations`, `map_output`, `table_output`, `area` |
| 3 | `chart_output`, `table_input` |
| 2 | `clip_polygons`, `summarize_polygons`, `case_series` — all in the two Snow catchment cases |
| exactly 1 | 22 widgets |

**Nobody decided those first four were core.** No document lists them. They
emerged from being needed by every case, which is the claim demonstrated rather
than argued.

The pairs are suggestive too: `clip_polygons` and `summarize_polygons` appear
together, in both catchment cases and nowhere else. A scenario vocabulary is
visible before anyone has named one.

## What is missing, and it is small

**Worked examples carry no scenario label.** They are named for their case —
"heat outreach", "old naledi access", "snow voronoi" — not for the kind of public
health work they are. Add that one field and widget-to-scenario becomes a
computation over data that already exists, the same way `usage:widgets` already
computes widget-to-example.

## The trap in the measurement

"Appears in exactly one example" conflates two different things, and reading it as
one would be wrong.

- `voronoi` appears once because catchment partition is **specific to that kind of
  question**.
- `find_health_facilities` appears once because it was **added yesterday**.

Frequency alone cannot tell them apart. It needs the scenario label, and it needs
time. A widget used in one scenario for a year is specific; a widget used once
last week is undemonstrated.

## Why this is emergent and must stay so

Two things would corrupt it.

**Declaring the classification.** Assigning widgets to scenarios in a document
produces a tidy table nobody tested, and the project has spent today finding out
what those are worth.

**Counting use as worth.** The least used widget may carry the hardest-won
distinction. A filter that hides the rarely used is not a filter, it is a quiet
deletion — recorded already under widget use tracking in TODO.

A filter helps someone find what they need. It must not become a judgement about
what deserves to exist.

## What this does not establish

That filtering helps. A learner shown fewer widgets may compose sooner, or may
never meet the one that would have answered their question. That is
[27](27-workflow-learning-and-gamification.md) territory and needs people.

Nor does it establish that two axes are enough, or the right ones. They are the
two a practitioner named. Others — data you have, question you are asking — may
turn out to matter more, and the way to find out is to label the examples and see
what the counting says.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Slice the palette by purpose, from use rather than by decree |
| 2026-10-11 | Decide: the browser app is for field work, learning is the desktop build's |
