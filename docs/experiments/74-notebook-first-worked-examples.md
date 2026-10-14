# 74 · Start a worked example as a notebook

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** method, proposed by the practitioner. It has one worked instance and
one counter-instance, both already in this repository.

## The method

1. Write the analysis as a notebook: narrative and computation together.
2. List the operations it performs — the **observed workflow**.
3. Map each operation to a Fieldwork primitive.
4. Where no primitive fits, that is a candidate for a new one, **derived from a
   real analysis rather than asserted**.
5. Record what was adapted and why.

## It has already been done once

`docs/research/john-snow-voronoi.md` and `john-snow-isochrones.md` have exactly
these sections: *Observed workflow* listing NB02 to NB05, *Fieldwork primitive
mapping*, *Adaptation decisions*, *Reuse and validation boundary*. The John Snow
workspaces came out of that reading. The method worked and was never named.

The adaptation decisions are the valuable part, because they record where
Fieldwork deliberately differs. One example from that file: the notebook attaches
EPSG:4326 to generated polygons without projecting first, and Fieldwork makes the
metric explicit instead.

## And not done for sea level, with a measurable result

The sea-level work went the other way: primitives first, example after. Three
widgets were built on 2026-10-09 — `buffer_point`, `find_health_facilities`,
`sample_raster` — and on 2026-10-10 `npm run usage:widgets` showed none of them
in any worked example. One has since been placed. Need was argued in an admission
review rather than derived from an analysis somebody had actually run.

## Where the notebooks belong

In the validation lab, as JupyterLite. That makes the narrative runnable with
nothing installed, and it puts the explanation where there is room for it.

This is a **third purpose** for that repository. It already serves two —
independent recomputation for parity, and off-Fieldwork data preparation — and
worked examples are neither. The independence rule still holds and matters more
here, not less: a notebook that teaches an analysis must not import Fieldwork's
code, or it stops being independent evidence that the analysis is right.

## The licence boundary, which already exists

The upstream case studies are `1854-Cholera-Outbreak-London-Basic` (Apache-2.0),
three Advanced repositories, and JupyterLite adaptations under GPL-3.0. The
existing research notes state the rule: *source inspection only; no notebooks
executed or upstream implementations copied into Fieldwork*. **Inspect, map,
adapt — do not copy.** The GPL adaptations make that more than hygiene.

## First full application: the three cholera studies

Done 2026-10-10, notebook by notebook, in
[cholera-notebooks-to-primitives.md](../research/cholera-notebooks-to-primitives.md).
Eleven notebooks across Basic, Advanced-1 and Advanced-2, read and mapped against
the palette.

It produced three candidate primitives, each derived from an operation a notebook
performs and the palette cannot express:

| Gap | Where | Why it matters |
| --- | --- | --- |
| **Weighted mean centre** | Basic NB02 | `mean_center` is unweighted. 250 locations carry 489 deaths, so the two centres differ |
| **Convex hull** | Advanced-2 NB02, Advanced-1 NB03 | A boundary derived from the data instead of drawn |
| **Routing between two points** | Advanced-1 NB02 | `isochrone` answers reachability, not "how far from here to there" |

The hull was already recorded in this repository — `john-snow-voronoi.md` says
hull and buffer "should not be hidden inside Voronoi" — and the method re-derived
it without being pointed there. That is weak evidence the method works, and it is
the first evidence of any kind.

## A third axis D1 does not have: can a learner take it apart?

Raised by the practitioner after the mapping above. Voronoi and isochrone hide
their steps **on purpose**, because composing them from parts asks a non-GIS
public health professional to make too many leaps at once. The opposite argument
is equally real: taking a workflow apart is how someone's skill advances. Both
are true, which makes it a developmental-evaluation question rather than a design
error.

The audit cannot express the tension. `voronoi` and `isochrone` are classified
**Primitive** — "residual knowledge, enforced, asked for by name" — and that is
correct on D1's two axes, reuse and use. Neither axis asks whether a learner
should be able to see inside. By that third question the same widgets are
composites: Advanced-2 does `convex_hull → buffer → Voronoi → clip → spatial
join`, and Fieldwork collapses it to one node.

**The three gaps found above are all steps the notebooks teach and the palette
collapses.** Weighted mean centre is the Basic study's second computation. Convex
hull is how Advanced-2 derives a boundary. Routing is Advanced-1's first network
operation. That is what you would predict if a palette were optimised for getting
an answer and not for learning how the answer is made — so it is weak evidence
the tension is real and not theoretical.

`classification.json` carries two values, `standard` and `domain`. There is no
notion of a teaching tier, and the primitive-versus-composite judgement lives in
an audit document that the application never shows anybody.

What would settle it, and neither is done:

- **Does a learner who only ever used composites go on to compose something
  new?** Experiment 27 already has a progression vocabulary — attempted,
  practised — and an exercise sequence for Old Naledi. That is where this could
  be observed rather than argued.
- **Does showing the decomposition reduce the leaps or add to them?** A composite
  could state the steps it stands for without requiring anyone to wire them.
  Untested, and the obvious risk is that it makes the palette look harder.

### The mechanism that would hold both sides is already specified

Twice, and unbuilt.

[31](31-facility-access-primitives.md): "Common tasks may be presented as a
**reusable subworkflow with an expandable internal graph**, rather than requiring
a beginner to configure every step."

[prior-art](../research/prior-art.md), on the QGIS Model Designer: "Future
reusable subworkflows should **expose a small public parameter set and retain the
internal graph**."

An expandable composite is not a compromise between the two sides; it is both of
them. A practitioner who wants the answer uses one node. A practitioner who wants
to learn opens it and sees the steps. Nobody has to choose on anyone else's
behalf, which is what a tier scheme would do.

The practitioner's addition goes further than the prior art: **the compositions
are made by users, not shipped.** The project supplies core primitives; a
practitioner wires the ones they repeat and keeps that as their own routine
primitive. That changes who decides what a composite is — and the audit's nine
"example nodes", which bake one demonstration's specifics into a shipped widget,
are the strongest argument for it. Those should have been somebody's saved
composition, not a palette entry.

Recorded as a tension with a candidate mechanism, not a plan. The temptation is
to invent a tier and sort 42 widgets into it this afternoon; the project has
enough rules written in one sitting.

## Sea level: the notebook will be written, not found

The organisation has no repository about sea level, tide gauges or coastal
exposure, and that is not an obstacle. **It is the next thing to make.** John
Snow is the special case — four notebooks already existed and were read. For a
new analysis the ordinary path is to write the notebook first.

That is the place to explain what the analysis means, at a length a tooltip
cannot hold. **What a tide gauge is** is the immediate example: the term appears
in three experiments and was defined nowhere until today. The glossary now
carries a short definition; the narrative belongs in the notebook.

Writing it would also settle the two remaining increments honestly. Reading
elevation at facilities needs `sample_raster`; a study area around a named gauge
needs `buffer_point`. Both widgets exist and neither is demonstrated. If the
notebook turns out not to need them, that is information worth having.

## The risk, which is different when you write your own source

Reading someone else's notebook has a check built in: it was written without
knowing what primitives exist, so it cannot be bent to fit them. **Authoring
removes that check.** The danger is writing the analysis around the palette you
already have, finding every operation conveniently covered, and calling that
derivation.

Two things make it harder to fool yourself:

- **Write the analysis before opening the palette.** Decide what a practitioner
  would do about coastal exposure in Manila, and only then ask which primitives
  it needs.
- **Record the observed workflow as its own list**, before mapping it, the way
  the John Snow notes do. A gap is only visible if the operations were written
  down before anybody went looking for matches.

## Not established

That this produces better primitives. The claim is plausible and the counter-case
is suggestive — three widgets built without it, none demonstrated — but the
method has one successful instance, and that one had an independent source to
read. Whether it works when the source is your own is exactly what the sea-level
notebook will test.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Name the notebook-first method, and define a tide gauge |
| 2026-10-10 | Map the three cholera case studies notebook by notebook against the palette |
| 2026-10-10 | Record the teaching tension D1 cannot express |
| 2026-10-10 | Record user-composed routine primitives, and the mechanism already specified |
