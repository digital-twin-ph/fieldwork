# 100 · Choosing the metric CRS

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** tried — the defaults are now derived from the workflow's own data and a disagreeing
zone is reported with what it costs, both built and tested on 2026-10-11. The guard is
untouched, and whether reporting changes anybody's choice is unmeasured, so this is not
`validated`.

Prompted by the practitioner asking whether there is an automated UTM selector based on
location. There was not.

## The question asked

*Do we have an automated UTM selector based on location?*

**No.** Nine widgets take `zone` and `hemisphere` as hand-entered parameters —
`mean_center`, `compare_point_sets`, `isochrone`, `voronoi`, `reachable_corridor`,
`snap_to_network`, `summarize_combined_area`, `summarize_hull`, `reproject` — and the palette
defaults them to **30 / north**, which is Soho, or **35 / south** for `reproject`, which is
Old Naledi. A practitioner adding a widget anywhere else starts from the wrong zone and has to
know to change it.

Two things do exist, and neither is a selector.

**A guard.** `metric()` refuses a coordinate more than 6° from the zone's central meridian, or
in the wrong hemisphere, with *"Coordinates fall outside this prototype's UTM zone/hemisphere
guard."* So a wildly wrong zone fails loudly.

**One widget that inherits.** `fill_interior_gaps` reads the zone from its input layer's
declared CRS with `utmFromCRS` instead of asking. It is the only one.

## What happened when the guard was measured

**The guard is a zone too wide.** A UTM zone spans 6°, which is ±3° from its central meridian.
The guard allows ±6°. Measured on zone 30, whose proper extent is −6° to 0°:

| Longitude | Guard | Actually in zone 30? |
| --- | --- | --- |
| −10° | refused | no |
| −8° | **accepted** | no — zone 29 |
| −3° | accepted | yes, central meridian |
| −0.14° | accepted | yes — Soho |
| +2.5° | **accepted** | no — zone 31 |
| +3.5° | refused | no |

So **an off-by-one zone passes silently**, which is precisely the mistake a practitioner would
make: picking the neighbouring zone, or leaving the Soho default while working one zone east.

What that costs, as a UTM point scale factor:

| Distance from the central meridian | At 51.5°N | At 15°N |
| --- | --- | --- |
| 0° (on the meridian) | −0.040% | −0.040% |
| 3° (zone edge, correct zone) | +0.013% | +0.088% |
| **6° (one zone out)** | **+0.172%** | **+0.471%** |
| 9° (the guard's limit) | +0.436% | +1.110% |

A 500 m buffer read one zone out measures 500.86 m at London's latitude and **502.36 m at 15°N**
— and the Philippines, which this project exists for, is at 5–20°N. The guard's own limit allows
over 1%.

## The second way metres and degrees come apart here

Found while checking `buffer_point` ([98](98-the-coverage-ratchet.md), check 17) and again while
drawing the donut map, and it is **not** about zone choice: several widgets convert metres to an
angle using a **mean sphere** of radius 6,371,008.8 m, while every projection in the application
is on the **WGS84 ellipsoid**.

At 51.5°N the ellipsoid's local radius of curvature is 6,374,604 m along the meridian and
6,391,253 m across it. The same angular displacement therefore covers **0.06% more ground north
to south and 0.32% more east to west.** Measured on the geoprivacy example's 250 donut
displacements, the ratio of projected to spherical distance runs **1.000651 to 1.003263** —
bracketed by exactly those two numbers, which is what identifies the cause.

**That is 25 times larger than the UTM scale factor at the same place**, and the first write-up
of the donut card blamed the scale factor. It was wrong, and the arithmetic that disproved it
took one line. Corrected the same day in the card, in the browser test's comment, and here.

So a 500 m buffer is 500 m on a sphere and up to 501.6 m on the ground; a 50–125 m donut reads
50.8–125.2 m. Small, direction-dependent, and nowhere stated before these two checks.

## What was built

Two of the four options below, chosen because they are the two that do not refuse anything a
practitioner can do today.

**The palette default is derived.** `suggestUTM` reads every coordinate the workflow already
holds — point layers, network nodes, drawn boundaries — and takes the zone of their **mean
longitude**, so a study area straddling a boundary lands on the side holding most of it. A
widget added to Old Naledi now arrives as **35S** where it used to arrive as 30N. The parameter
stays: a straddling area has no single right zone and the practitioner has to choose a side.

**A disagreeing zone is reported, with its cost.** One note serves all nine widgets, appended
once rather than written into each of the five places a zone field is rendered. It states the
zone the data is in, the measured worst-case stretch at the chosen zone as a percentage, and —
when the data spans more than one zone — that no single answer is right. It offers a button
that sets the zone **and the hemisphere** together, because a zone without its hemisphere is
half an answer and the two defaults were wrong together.

`utmScaleFactor` is in the same module, so the percentage shown is computed rather than
asserted, and `tests/utm.test.mjs` pins the +0.17% and +0.47% figures this document records.

**What was not built, and why.** Tightening the guard from ±6° to ±3° is one character and
would start refusing workflows that run today, including a legitimate choice near a boundary.
It needs a check against the shipped examples first, and reporting is the cheaper half of the
same protection.

## The options as they stood

| | |
| --- | --- |
| **Suggest a zone from the connected layer** | **Done.** Derived from every coordinate the workflow holds, not only from a connected input, which avoids needing the widget to see its input at configuration time |
| **Tighten the guard to ±3°** | One character, and it would start refusing workflows that run today — including, possibly, legitimate ones near a zone boundary where a practitioner deliberately chose one side. Needs a check against the shipped examples before it could be called safe |
| **Warn rather than refuse** | **Done**, in the Inspector rather than the receipt: a practitioner choosing a zone is the person who needs it, and the receipt is read afterwards |
| **Say nothing** | What happened until 2026-10-11 |

The second and third are not exclusive. The third is done; the second is still open.

## What would close it

The guard. Tightening `metric()` from ±6° to ±3° is one character and would start refusing
workflows that run today, so it needs a check against the shipped examples first. This moves to
**validated** when the guard matches the zone it names, or to a recorded refusal if the examples
show that a boundary-straddling area legitimately needs the wider tolerance.

## What this does not establish

**That the defaults caused errors in practice.** Nobody has used this application outside the
two worked examples, whose old defaults were correct for one of them. The claim was that the
defaults were wrong *for anywhere else* and that nothing said so; both halves are now
addressed, and neither is evidence that anybody was ever misled.

**That reporting changes a decision.** The note states a percentage. Whether a practitioner
reads it, believes it, or acts on it is unmeasured, and the button exists because stating a
cost without offering the fix would be the cheaper half of the job.

**That a derived zone is always right.** A study area straddling a zone boundary has no correct
single zone, and a suggestion would have to be overridable — which is an argument for keeping
the parameter and improving its default, not for removing it.

**And nothing about the sphere-to-ellipsoid conversions.** They are measured in two widgets and
unexamined in the rest. `circleAround`, used by study-area circles, takes the same route;
whether anything else does has not been audited.

**Audited 2026-10-12** in [101](101-metres-into-angles.md), which found eight sites sharing one
error, and found that the figure recorded in this document — 0.06–0.32% at 51.5°N — is the
**best** case of the four latitudes measured, not the typical one. At the equator it is −0.56%
to +0.11%, and at Manila's latitude −0.49% to +0.13%.
