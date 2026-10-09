# 60 · From a GIS studio to a studio for public health domains

_Created 2026-10-09 · Updated 2026-10-09_

**Status:** measurement and reframing. No widget moves and nothing is renamed here; the measurement
is the point, because it shows that one of yesterday's mechanisms is measuring the wrong thing.

The stated direction is that this could become a **semantic epidemiology studio**, or a **semantic
laboratory science studio**, not only a semantic GIS studio — because every one of those domains has
the same shape: data is collected, processed, analysed, and outputs are generated, with the meaning
of each step needing to be explicit.

If that is the direction, then **GIS is the first domain, not the platform**. The measurement below
says how far the current code is from acting like that is true.

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

## The correction: two axes, and yesterday's mechanism measures only one

The classification added a day ago derives `standard` versus `domain` from a widget's vocabulary
namespace: host terms mean standard, a pack namespace means that pack's domain. That is a useful
check — it caught that the sea-level widgets had been merged into the shipped set unlabelled — but it
measures **who ships a widget**, not **which domain it serves**. Two different questions:

| Axis | Values | Derived from |
| --- | --- | --- |
| Distribution | ships with the application · installed from a pack | vocabulary namespace (implemented) |
| Domain | universal · spatial · epidemiology · laboratory · … | port types and vocabulary (not implemented) |

Under the current mechanism every shipped widget reads as "standard, applying to any domain", and 31
of them do not apply to any domain at all — they apply to spatial analysis. The label is wrong in a
way that matters for the stated direction, because it makes the universal layer look complete when
it is thin.

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

Run a domain exercise that is **not spatial at all** — laboratory results or service-coverage rates —
and record which parts of the universal layer it cannot express. Whatever it cannot express names the
next general primitive, and whether the domain layer stays thin is the test of the pattern.

A non-spatial exercise also tests something the sea-level work could not: whether a workflow whose
widgets never touch a geometry can be built, run, reasoned over and presented in this application at
all. That is the question the stated direction turns on, and it is currently unanswered.
