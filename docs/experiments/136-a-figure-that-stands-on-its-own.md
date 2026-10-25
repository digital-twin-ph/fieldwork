# 136 — A figure that stands on its own

_Created 2026-10-25 · Updated 2026-10-25_

**Status:** asked — the rules are designed here and reported, not enforced. Nothing gates
on them. Moving to `tried` needs them applied to the three John Snow maps.

Proposed by the practitioner on 2026-10-25, looking at a Gaborone map:

> Probably the best opportunity to enforce the principle a static map should stand on its
> own (communicate its intent) and to do so it has to have the right level of detail
> (title, labels, legend, north, scale, etc,)

and, asked what the principle is anchored to:

> The self standing is more for charts and maps for publications and presentations, you
> can look it up.

Looking it up changed the design, which is why the sources are named below rather than
summarised. The first draft of this would have added a north arrow and a scale bar to
every map. The canon says that would be wrong.

## What the canon actually says

| Source | What it establishes |
| --- | --- |
| APA Publication Manual 7th ed. | A figure has up to five parts: **number, title, image, legend, note**. The *note* carries what the title, image and legend cannot — abbreviations, and copyright attribution. |
| Esri, Buckley, *Does every map need a north arrow and scale bar?* | The need for a north arrow **diminishes with scale**. A large-scale map where north is not up must carry an orientation indicator. A north arrow on a small-scale conic or equal-area map is a **common mistake**, because north is true only along the central meridian — show the graticule instead. A north arrow and scale bar **are not necessary on all maps, and some should not have them**. |
| Ordnance Survey, *Guide to cartography: north arrows* | Readers assume the top is north unless told otherwise, so the arrow can often be omitted. North arrows are often omitted from thematic maps. Include one when direction is critical to the map's function. |
| Editing guidance on figure legends (LetPub, Enago) | The test is that a reader who skipped Methods can still read the figure correctly. Journals disagree on the detail: Nature under 300 words with no methods, eLife exact sample numbers in the legend, PLOS ONE a label and a title of 15 words or fewer. |

**Not established:** the ICMJE Recommendations' own wording. Every source found for the
"interpretable without the text" phrasing was secondary. If this project wants to cite
ICMJE it must read icmje.org first; this record does not cite it.

So the principle is **not** "add the standard furniture to every map". It is:

1. The unit is the **figure**, not the image. Four of APA's five parts already exist in
   this application's Inspector — Map title, Subtitle/context, Show map key, Source/method
   note — so the model is closer than the request implies.
2. Almost every element is **conditional**. The only one Buckley holds unconditional is a
   title.
3. The conditions are **computable from what the map already knows**: its CRS, whether
   north is up, whether it drew a basemap, whether every mark it drew has a key entry.

## Why this fits the existing mechanism

`src/map-conformance.ts` already applies rules during assembly and states them in the
receipt, which was the practitioner's decision of 2026-10-17. It carries four rules, and
all four are about colour. The categorical half it never got is exactly this.

Two properties of it decide the design:

- Its outcome set is EARL's, which is closed and includes **`inapplicable`**. A
  conditional rule needs precisely that: "orientation is stated where north is not up"
  must report `inapplicable` on a north-up CRS84 map, not `passed` and not `failed`.
- `applyDesignRules` already reports every rule including the ones that did not apply,
  and says why in its own comment: a reader who sees four rules in one receipt and two in
  another cannot tell whether the others passed, were skipped, or do not exist.

So no new mechanism. Six rules, and a `MapDesign` that carries the figure's parts as well
as its colours.

## The six rules

| id | kind | condition | traces to |
| --- | --- | --- | --- |
| `FigureHasTitle` | categorical | none — unconditional | Buckley: all maps should have an appropriate title |
| `EveryMarkIsInTheKey` | categorical | `inapplicable` when the map drew no marks | APA: the legend explains any symbols used in the image |
| `FigureStatesItsSource` | categorical | `inapplicable` when nothing was drawn from a named source | APA: the note carries attribution |
| `OrientationIsStatedWhereItIsNotObvious` | categorical | `inapplicable` when north is up | Ordnance Survey; Buckley |
| `ScaleStatementSurvivesItsProjection` | categorical | `inapplicable` when no scale is claimed | Buckley, on scale varying across a projection |
| `BasemapIsCredited` | categorical | `inapplicable` when no basemap was drawn | ODbL, for OpenStreetMap-derived tiles |

Three of these would have been wrong as written in the request:

- **North.** This project's static maps are CRS84, where meridians are parallel and north
  is up everywhere. A north arrow is redundant, and the rule reports `inapplicable`
  rather than demanding one. It becomes applicable the moment a projected map is drawn.
- **Scale.** A scale bar on an unprojected map is only locally valid, because scale varies
  with latitude. The rule asks that a scale *claim*, if made, says what it holds for — it
  does not ask for a bar.
- **Labels.** Not a rule. Whether a mark should carry a label is a judgement about
  density and purpose, and a rule that demanded labels would make a cluttered map
  conformant and a clean one a failure.

`BasemapIsCredited` is the one with teeth today, and it is a licence obligation rather
than a matter of taste: OpenStreetMap-derived tiles are ODbL. It reports `inapplicable`
until a basemap is drawn, which is separate work and not designed here.

## What this does not establish

- That a figure passing these six rules is publishable. The rules check that the parts
  are present and that conditional elements are not misapplied. They cannot check whether
  the title is honest, whether the legend names the right thing, or whether the map
  answers the question it was made for. A score routes a human review; it does not
  replace one — the same limit `validate:inspector-prose` already states.
- That these are the right six. They are the computable subset of a canon that is mostly
  about judgement.
- Anything about presentations. The sources are about publications. A slide has no caption
  block and no reader who can re-read, so the note moves to the speaker and the title and
  key must be inside the image. That is a different assembly of the same parts, and this
  record does not design it.

## What would move this to `tried`

The three John Snow maps, which the practitioner asked for on 2026-10-25: the Soho map of
pumps and death locations, the isochrone map, and the South London map. They are a fair
test because they differ in exactly the ways the conditions key on — two are large-scale
CRS84 point maps, and the South London map is the one that needs an attribute-driven fill
and so cannot be drawn faithfully yet.

A rule that fires on all three equally has learned nothing. The interesting outcome is a
rule reporting `inapplicable` on one and `failed` on another.
