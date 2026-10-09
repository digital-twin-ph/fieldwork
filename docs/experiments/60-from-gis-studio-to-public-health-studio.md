# 60 · From a GIS studio to a studio for public health domains

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** measurement and reframing. No widget moves and nothing is renamed here; the measurement
is the point, because it shows that one of yesterday's mechanisms is measuring the wrong thing.

The stated direction is that this could become a **semantic epidemiology studio**, or a **semantic
laboratory science studio**, not only a semantic GIS studio — because every one of those domains has
the same shape: data is collected, processed, analysed, and outputs are generated, with the meaning
of each step needing to be explicit.

**Correction, same day.** An earlier draft of this record concluded that "GIS is the first domain, not
the platform", which is wrong and would have led somewhere bad. Public health characterises a problem
in terms of **person, place and time**, and almost every problem has a place component. Place is not a
domain to be demoted beside epidemiology and laboratory science; it is one of the three axes those
domains are described along. A GIS studio for public health is well founded for that reason.

The measurement below therefore means something different from what the draft claimed. It does not
show that the application over-invested in a domain. It shows that **one axis is built out and the
other two are missing**.

## Measured, 2026-10-09

Classifying every widget by the port types it declares — a widget touching `points`, `area`,
`polygons`, `raster`, `network`, `distances` or the facility and coverage ports is spatial:

| Kind | Count | Widgets |
| --- | --- | --- |
| **Spatial** | **31 of 37** | mean centre, point-set comparison, geomasking, H3 aggregation, buffer, Voronoi, network input, isochrone, polygon clip, polygon summary, reprojection, raster input, raster clip, places, centres, nearest, outreach criteria, study area, facilities, samples, Xpert evidence, access, access policy, facility audit, area computation, input data, coverage check, map output, table output, site assignment |
| **Not spatial** | **6** | `table_input`, `alert`, `chart_output`, `output`, and the two sea-level widgets that work on tables |

So the "standard set that ships with Fieldwork" is, today, overwhelmingly a **GIS** set. Of the six
widgets that are not spatial, two belong to a domain pack, which leaves roughly four that an
epidemiology or laboratory workflow could reuse unchanged, plus the parts that are not widgets at
all: the canvas, typed ports, receipts and provenance, evidence and citations, the reasoner, the
catalog, and the validation machinery.

## The axes, measured

Looking for the other two axes in the same code, by configuration surface and by port type:

| Axis | Port types | Widgets | State |
| --- | --- | --- | --- |
| **Place** | `points`, `area`, `polygons`, `raster`, `network`, `distances`, `facilities`, `gradedFacilities`, `access`, `coverage-check`, `mean-center`, `point-comparison` — 12 of 15 | 31 | Built out, with its refusals recorded across experiments 29, 40, 48, 51 and 52 |
| **Time** | none | 1 carries a date (`alert`); two sea-level widgets carry a year inside a key | Absent as a first-class concept |
| **Person** | none | none | Absent entirely |

There is no port type for a person, a cohort, a period or a series. That is the finding: the gap is
not that place is overweight, it is that **person and time have no representation at all**, so a
workflow cannot say "cases by week of onset" or "rate per 1,000 children under five" in any way the
application could reason over.

> **Revised by [experiment 61](61-input-dimensions.md).** New port types are probably not what the
> missing axes need. The project's own John Snow data carries 489 deaths in 250 rows — person,
> aggregated, as an ordinary attribute — so the dimensions are already in the input and what is absent
> is a way to declare which column means what. That is a declaration on existing inputs, not a new type.

Because `PortType` is a closed union compiled into the application, adding a port type would be base work
rather than pack work — which is exactly the engine
[experiment 59](59-pattern-for-engineered-knowledge.md) described: a domain exercise reveals a missing
general primitive, and the primitive belongs in the host.

## What the universal layer needs, by axis

Replacing the flat list an earlier draft of this record carried, since the axes give it a structure:

| Axis | Primitive | The refusal it carries |
| --- | --- | --- |
| Person | **Case definition**, versioned | A case definition is a decision, not a filter: changing it changes the series, so a series must name the definition that produced it |
| Person | **Denominator population** | A denominator is a population at risk, not a count of records; a stratum too small for a rate must refuse to produce one |
| Person | **Linkage** | A linkage is not an identity, and de-duplication changes counts, so both must be recorded rather than performed silently |
| Time | **Period and series** | A count per week is not a rate; a period needs its boundary convention stated |
| Time | **Onset versus report date** | An epidemic curve by report date is not one by onset date, and the two must never be plotted as though interchangeable |
| Time | **Reporting completeness** | Absence of reports is not absence of cases, and a recent period is incomplete by construction |
| Place | built | recorded already: context is not frame; a route is not a flow; a table has no geometry |
| All three | **Rate**, with denominator provenance | Refuses when the denominator year, the frame vintage and the numerator period disagree ([experiment 51](51-dataset-profiles.md)) |
| Laboratory | **Result with method and limit**; **QC status** | A value below the limit of detection is not zero; detection is not infection; a failed control invalidates a batch rather than a sample |

## Spatially enabled, not parallel

The direction this settles into: epidemiology workflows are **added to** the semantic GIS studio, and
what results is a spatially enabled public health workflow rather than two studios side by side. Place
is the substrate almost every problem already has; person and time extend it.

That is an architectural constraint, not a slogan. Whatever represents a person, a period or a series
must **join cleanly to the spatial ports**, or the composition is claimed rather than built: a case
series has to be mappable, a rate has to be computable per area, a cohort has to be joinable to a
point layer or a boundary. So the primitive that makes spatial enablement real is the one that lets
axes meet — **a join on declared keys** — and it should be built before, or alongside, the first
time-axis widget rather than after.

### The sea-level exercise already revealed this, and I missed it

`slr_site_assignment` is a join: a table of projected values meets a layer of published sites, matched
by proximity, with the distance kept as part of the result. It was written as a domain widget because
the exercise needed it, and by the test in
[experiment 59](59-pattern-for-engineered-knowledge.md) — a thick domain layer means a primitive is
missing underneath — it should have been read as a second missing primitive rather than domain code.

So that exercise revealed **two** general primitives, not one: tabular intake with a declared key,
which was built, and a keyed join between a table and a layer, which was not. Generalising the join
would make the sea-level widget thinner, which is the measurable form of the claim.

## The distribution axis, which is a different question

Yesterday's mechanism derives `standard` versus `domain` from a widget's vocabulary namespace.

Host terms mean standard, a pack namespace means that pack's domain. That is a useful check — it caught that the sea-level widgets had been merged into the shipped set unlabelled — but it
measures **who ships a widget**, not **which domain it serves**. Two different questions:

| Axis | Values | Derived from |
| --- | --- | --- |
| Distribution | ships with the application · installed from a pack | vocabulary namespace (implemented) |
| Domain | universal · spatial · epidemiology · laboratory · … | port types and vocabulary (not implemented) |

Under the current mechanism every shipped widget reads as "standard, applying to any domain", when 31
of them are about place specifically. The label overstates generality, which matters because it makes
the universal layer look complete when two of its three axes are missing.

## What the universal layer would have to contain

Not a plan, a list of what is missing, so the gap is explicit rather than discovered one domain at a
time. The pattern from [experiment 59](59-pattern-for-engineered-knowledge.md) says each of these
should be a general primitive revealed by a domain exercise, carrying its own refusals:

| Primitive | Needed by | The refusal it would carry |
| --- | --- | --- |
| Tabular intake with a declared key | every domain | implemented: a value without its key is uninterpretable |
| Join on declared keys | every domain | a join on names is not a join on identities |
| Filter and aggregate with stated grouping | every domain | an aggregate hides its denominator unless the grouping is declared |
| **Rate with denominator provenance** | epidemiology, coverage | refuses when denominator year, frame vintage and numerator period disagree ([experiment 51](51-dataset-profiles.md)) |
| Period and time series | epidemiology, surveillance | a count per week is not a rate, and a reporting delay is not an absence of cases |
| Case definition | epidemiology | a case definition is a decision, not a filter: changing it changes the series, so it must be versioned |
| Measurement result with method and limit | laboratory | **a value below the limit of detection is not zero**; a result without its method and units is uninterpretable; detection is not infection |
| Quality control status | laboratory | a failed control invalidates a batch, not one sample, and a result from a failed batch must not be presentable |

Those laboratory refusals are a useful test of the pattern, because they are the same *kind* of
statement as "a route is not a flow" and "a table has no geometry" — domain knowledge that prevents a
plausible wrong answer, expressible in vocabulary and enforceable by shapes.

## What this does not require

- **No code moves.** The spatial widgets stay where they are and keep working. Calling them a domain
  is a labelling change, not a refactor, and the catalog already shows a Kind column that could
  carry it.
- **No renaming of the application.** The header reads "semantic GIS studio"; whether that becomes
  something broader is a decision for the project, not a consequence of this measurement.
- **No new governance.** [Experiment 59](59-pattern-for-engineered-knowledge.md) found that building
  governance ahead of an operation created the problem. The second axis should be added when a
  second domain exercise needs it, and not before.

## The test, continuing experiment 59's

Run an exercise on an axis that does not exist yet. The sharpest is **time**: an epidemic curve from a
line list, which needs a period, a series, and the distinction between onset date and report date, and
whose refusals are already well established in practice. It composes with place immediately — cases by
week *and* by barangay — which is the triad working rather than two parallel capabilities.

The exercise is only passed if the series is **mappable** — cases by week shown by area — because
that is what distinguishes a spatially enabled epidemiology workflow from an epidemiology report that
happens to live in the same application. Record which parts the universal layer cannot express;
whatever it cannot express names the next primitive. A person-axis exercise, a service-coverage rate with its denominator, is the natural second,
because it forces the rate primitive that experiment 51 identified as the most common serious error.

Either exercise also tests something the sea-level work could not: whether a workflow organised around
time or person, rather than geometry, can be built, run, reasoned over and presented here at all. That
is the question the stated direction turns on, and it is currently unanswered.
