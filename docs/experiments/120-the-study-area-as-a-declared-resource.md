# 120 · The study area as a declared resource

_Created 2026-10-17 · Updated 2026-10-17_

_Created 2026-10-17_

**Status:** asked — two parts decided. The widget stays, and the friction on it stays. What
remains open is the clutter, which the multi-member proposal below addresses without
touching either.

## The question

The practitioner, 2026-10-17, after
[the process-frame classification](../audits/process-frames.md) placed `study_area`
at a position of its own ahead of ingest:

> *"To decrease workflow friction for study area, it can be required for ingest but
> within each ingest widget. And once selected, the study area or areas can be reused.
> This way there's less clutter on the canvas. When you have a study area widget or
> several when there are a few areas like comparing sea level rise in different
> cities, and you have connections flowing from those areas to the next widgets."*

And on the trade-off: *"There's pros and cons to doing this but I am for decreasing
unnecessary friction."*

This experiment records the measurement, both sides, and what would decide it.

## Decided 2026-10-17: the widget stays

The practitioner, after the trade-offs were measured: *"For now let's keep the widget
for reasons also important like N3 receipts."*

**That reason is stronger than the one this document first recorded**, and the ontology
is where it is written down. `fw:StudyArea` is a declared class,
`rdfs:subClassOf geo:Feature` — an **entity** in the provenance graph. `fw:studyArea`
is an `owl:ObjectProperty`, `rdfs:subPropertyOf prov:used`, with
`rdfs:domain fw:SpatialOperation` and `rdfs:range fw:StudyArea`.

So a bounded operation does not merely happen to record its area through an edge. It
asserts `prov:used` on an entity, and **a parameter is not an entity**. Turning the
study area into a picker would leave `fw:studyArea` unassertable against its declared
range, and the receipt would have to say something weaker — a literal, or a name — in
place of a PROV-O relation between an activity and a thing. That is not a refactor
risk to be careful about. It is a declared constraint the change would break.

**And the friction on it stays.** The practitioner, the same day: *"For study area the
friction is OK because it explicitly constrains downloads, hence it being the prominent
question asked on an empty canvas — What is your Study Area?"*

That is the criterion applied, not an exception to it. A study area is a judgment with a
cost attached — it decides how much ground a download pulls — so asking for it up front is
friction earning its keep, and the application already places it first: `STARTER_TYPES`
leads with `study_area` and an empty canvas sets its state to *"Add Study area to begin"*.

Though that string is an **instruction**, not the question. *Add Study area to begin* names
a step to complete; *What is your study area?* names a decision to make. Under this
project's own reading of where friction belongs, the second is what the prominence is for.
One string, not yet changed, recorded here rather than done on my own judgment.

This settles the widget and the friction, and nothing else. The twelve-consumer measurement stands, the
clutter the practitioner described is real, and *"I am for decreasing unnecessary
friction"* still applies to everything below.

## And the ontology already proposes the multi-city case

`fw:StudyArea`'s own comment:

> *"The current widget draws one polygon. Proposed membership supports multiple named,
> disconnected features without requiring a dissolved aggregate geometry."*

The practitioner's worked case for the clutter — *"comparing sea level rise in different
cities"* — is three study-area nodes today, each wired to its consumers. Under the
proposed membership it is **one study area with three named members**, which removes
most of those edges without removing the widget, without touching the twelve port
contracts, and without weakening a single receipt: the entity stays an entity and
`prov:used` still points at it.

That is the friction reduction asked for, reachable from a direction the ontology
already recorded and nothing has built. It is a different change from the one this
experiment opened with, and a much cheaper one.

## The measurement

**Twelve active widgets take an `area` port, and three of them are ingest.**

| Process frame | Widgets taking `area` |
| --- | --- |
| ingest | `raster_input`, `network_input`, `find_health_facilities` |
| regions | `buffer_area`, `clip_polygons`, `point_grid`, `voronoi` |
| assign | `clip_raster`, `coverage_check`, `facilities` |
| underlying operation | `measure_area` |
| view | `map_output` |

So the proposal as stated — a picker inside each ingest widget — removes a quarter of
the wiring. The practitioner's own worked case shows the scale: three cities compared
for sea-level rise, against twelve consumers, is up to 36 edges, of which fixing
ingest alone would remove nine.

`network_input` is already an exception: it reads the study area through
`previewArea` rather than through a port, so one of the three is not wired today
either.

## The precedent this would follow

`apply_ruleset` does not take its ruleset through an edge. It pins one by id and
version on the node, and the palette offers one generic widget. A study area selected
by name rather than wired is the same move, and the machinery — pinning, version
drift, a resolver that refuses a reference this build cannot satisfy — already exists
and is already tested.

## The case against, which is not only clutter

**An edge is visible; a parameter is not.** The canvas is this project's explanation of
itself: it shows that *this* raster was bounded by *that* area. Replacing the edge with
a picker makes the canvas cleaner and tells the reader less. That tension is the real
cost, and "less clutter" states only one side of it.

The resolution worth testing is that **not every edge carries the same information.**
Twelve edges from one study area to twelve consumers are the same fact repeated; they
are constraint propagation, not data flow. An edge earns its place on the canvas when
what it carries *varies*. Which suggests a rule rather than a blanket change:

> Show the connection when a widget's area differs from the workflow's declared one.
> Hide it when they are the same.

Under that rule the multi-city comparison stays fully visible — the areas differ, which
is the whole point of it — and the single-area workflow loses eleven identical edges
that told the reader nothing eleven times.

## Three things a change here must not lose

**1. The acquisition bound and the analytical extent are deliberately different.**
`buffer_area` exists for this: its Inspector tells the practitioner to connect the
expanded boundary to Street network, because a margin reduces edge effects, while
reporting and polygon clipping stay on the original. *Download this one, analyse that
one* is a judgment, and one list of study areas feeding one picker would make it
invisible. This is friction that is earning its keep.

**2. Reuse implies pinning and drift.** Once an area is referenced by name from eight
nodes, editing it changes all eight — including runs already recorded against it. This
application has met that twice, with rulesets and with compositions, and answered it
both times by pinning a version and reporting drift. A shared mutable study area would
be the one mutable reference in an application built on immutable ones.

**3. The edge is currently the provenance.** A receipt records `prov:used` on the area
a download was bounded by. As a parameter that assertion has to be made deliberately
rather than falling out of the graph, and it is the kind of thing that gets dropped in
a refactor. A bounded download whose bound is not in its receipt is not defensible
later.

## What this does not establish

**That the change is right.** The practitioner has stated a lean, not a decision, and
the strongest argument against it — that removing edges removes explanation — has not
been tested against anyone reading a canvas.

**That the rule proposed above works.** "Show the edge when the area differs" is
derived here, not observed. It may read worse than either extreme: a canvas where some
constraints are drawn and others are not could be harder to trust than one where the
convention is uniform either way.

**That ingest is the right scope.** The measurement says it is not sufficient — three
of twelve — but it does not say the other nine should change. `voronoi` and
`coverage_check` take an area as the extent they reason within, which is closer to data
than to constraint, and those edges may be carrying something the ingest edges are not.

## What would close it

A canvas with three study areas and twelve consumers, built both ways, put in front of
someone who did not build it. The question is not whether it looks cleaner — it will —
but whether a reader can still say what bounded what.
