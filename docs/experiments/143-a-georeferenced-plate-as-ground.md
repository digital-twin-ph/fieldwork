# 143 — A georeferenced plate as ground

_Created 2026-10-27 · Updated 2026-10-27_

**Status:** tried — built, instantiated by the South London example on 2026-10-27, and drawn as a
figure of its own there on 2026-10-31.

The practitioner, 2026-10-27, on Snow's Map 2: *"We still need the original and since it's
georeferenced, it could be overlaid as a layer. It helps learners appreciate something from the
past."*

The example has carried the apparatus for this since 2026-10-24 and not the thing itself:
`geo/map2-georeference.json` records the plate's URL, both digests, both pixel sizes, a north-up
affine model and four control points, and `geo/map2.jgw` and `geo/map2-large.jgw` are world files
for images that are not in the repository. The plate was georeferenced and never downloaded.

Downloaded on 2026-10-27 and verified against those digests. **The pinning earned its keep on
first use**: two successive downloads of the large plate were silently truncated — 972 kB and then
495 kB of a 5,341,773-byte file — and `sips` read the truncated file as a perfectly good
5000 × 3934 JPEG. Only the digest said otherwise. Nine resumed attempts produced the whole file
and `c5dd7255…`, exactly as recorded three days earlier.

| file | bytes | pixels | digest |
| --- | --- | --- | --- |
| `i_map2.jpg` | 260,535 | 1002 × 788 | `a3131c5f…` as recorded |
| `i_map2_large.jpg` | 5,341,773 | 5000 × 3934 | `c5dd7255…` as recorded |

## What this is for, and what it is not

A scanned or published map drawn **under** a workflow, in the workflow's own projection, so a
reader sees the modern result over the historical ground. For Snow's Map 2 that is the point of
the example: the blue, red and purple washes are the supply territories, and the intermingled
purple zone is the whole of his design.

**It is ink, not measurement.** That distinction is the reason this is not `raster_input`.
`raster_input` decodes a GeoTIFF into values, and `clip_raster` and `sample_raster` exist to
measure them. A plate's pixels are a printer's ink: sampling them returns the colour of a line,
which is a number with no referent. The same error experiment 52 guards against for Natural Earth
— *context is not frame* — in a second form, and the port type is what enforces it here rather
than a note nobody reads at the moment of the mistake.

## Admission review

| | Question | Answer |
| --- | --- | --- |
| **D1** | Does the distinction survive decomposition, and would a practitioner ask for it by name? | Yes to both. "Put the old map underneath" is a request, not a composition of other steps. Decomposing it into raster input plus a display setting would require the raster path to carry something it must not measure. |
| **D2** | Does it already exist? | No, and the test that settles it is not the one this record first used. See **What decides it is the unit, not the bands** below. |
| **D3** | Is the operation well defined over its inputs? | Yes, for a **north-up affine** georeference: six world-file coefficients with no rotation, which is what `map2.jgw` carries and what a scanned plate georeferenced by control points normally produces. Rotation is refused rather than ignored (see limits). |
| **D4** | Does a wrong producer need a hard stop? | **Yes, and this is the one that justifies a base-contract change.** A new `ground` port type keeps a plate out of `clip_raster` and `sample_raster` by construction. Reusing the `raster` port would make a plate connectable to every raster operation, which is exactly the confusion the widget exists to prevent. The port union is closed and compiled in, so this is recorded as a deliberate change to it. |
| **D5** | Readable off built code | Not swept; recorded as contestable, as for every widget. |
| **D7** | Is the name the practitioner's word? | `map_image_input` — a source, no transform verb, and it names the subject rather than a category. "Georeferenced map image" is the title. Goes to name review like every other. |
| **D8** | Positive and negative cases | Both: a plate placed at its recorded bounds, and a rotated world file refused by name. |
| **D9** | Does an example instantiate it? | **Now yes, and it did not when this was written.** South London was named here on 2026-10-27 and wired on 2026-10-27, three commits later: the repository shipped the plate, both world files and the georeference with nothing reading them, and this row claimed an instantiation that did not exist. The plate now sits under the sub-district choropleth on the `ground` port. |
| **D10** | Is it reachable from the palette? | Added to `ALWAYS_ADDABLE`; `tests/palette.test.mjs` fails otherwise. |
| **D11** | Does a residual function remain that nothing else performs? | Yes: no widget draws a supplied georeferenced image, and the example has carried the georeference for three days with nothing able to read it. |

## What decides it is the unit, not the bands

This record first argued the distinction from format: `raster_input` refuses anything but a
single band, a plate is three, so a plate is not a raster. The practitioner put the obvious
question to it on 2026-10-27 — *"multi-band for satellite imagery?"* — and the argument does not
survive it. Multi-band IS anticipated: experiment 39 names Sentinel and Landsat, and records them
as blocked on **CRS**, because their COGs ship in UTM, not on band count. So the refusal in
`inspectRaster` reads "not implemented **yet**", and an argument resting on it would expire.

The test that does not expire is the one `sample_raster` already enforces. Experiment 67 declares
`valueUnit`: *"What the sampled numbers measure, author-stated. Blank is recorded as unstated,
never as dimensionless."*

- A satellite's bands are each a measurement at a wavelength. Band 4 has a unit — reflectance,
  radiance, a derived index — so `valueUnit` can be stated honestly and sampling answers a
  question. Multi-band support would give `raster_input` **more measurements**.
- A scan's three channels are not three measurements. They are one picture, encoded. No honest
  `valueUnit` exists for "the red channel of a printed 1855 map", and none would appear if the
  decoder gained bands.

So the question is not *how many bands* but **can you state what a sampled value measures**. A
plate fails that permanently rather than until somebody implements something, and `raster_input`
gaining multi-band does not bring the two together.

It also sorts the awkward case correctly, which the band argument could not. A drone
**orthophoto** is RGB like a plate and belongs here. A drone **multispectral** survey has units
per band and belongs in `raster_input`. Same aircraft, same flight, different widget — because
the format does not decide it and the unit does.

**What this costs, stated rather than omitted.** Separating them means `clip_raster` cannot crop a
plate to the study area, which is a reasonable thing to want. A plate is cropped before it is
imported, or that operation is added here later.

## What it refuses, and why

- **A rotated world file.** The B and D coefficients must be zero. A rotated placement needs a
  transform on the image, and drawing it as an axis-aligned box would put the map in the wrong
  place while looking correct — the failure mode this project calls professional-looking and
  wrong. Stated as a **hard stop**, not a limitation.
- **Measurement.** Enforced by the port type (D4), which is a **hard stop** rather than a
  validation rule: a wrong connection cannot be made rather than being reported after it is.
- **Reprojection.** The image is placed by its corners through the figure's own `project`, so a
  plate in CRS84 lands correctly on a CRS84 figure. A plate georeferenced in another CRS is not
  converted; it is refused, because silently treating one datum's coordinates as another's is the
  error that moves a map by hundreds of metres. A **validation rule**.
- **Any claim that the ground is current.** A plate carries its source and date, and the receipt
  says what was drawn and from where. Whether 1855 boundaries are the right ground for a 2026
  analysis is the practitioner's judgement and no check can make it.

## What this does not establish

- **That the georeference is correct.** The four control points in `map2-georeference.json` were
  placed by someone reading the plate, and this draws what they recorded. An alignment error would
  look exactly like a correct placement to this widget. Measuring the residual at the control
  points against a modern boundary is what would close that, and it is not done here.
- **That a reader understands what the washes mean.** The purple zone is the intermingled supply
  and is the point of Snow's design; nothing in the drawing says so. The example's prose does.
- **That the small plate is enough.** 1002 × 788 over South London is **15.8 m per pixel**, measured from the world file when the example first wired one on 2026-10-27. This record said “roughly 40”, which was an estimate nobody had checked and is wrong by two and a half times.
  Legible as ground, and not a basis for reading a street.

## A plate is also a figure, and the write-up was not carrying it

The practitioner, 2026-10-31: *"let's include the georeferenced plate as a map as a separate
workflow so it will render by itself in Notes and we can add it to Introduction."* Which is a
use this record did not anticipate. Ground is drawn **under** something by definition, and the
thing a reader of this example meets before any number is quoted is the plate itself — the
washes are what Snow's design looks like. South London now carries a seventh workflow that is a
plate, a frame read off its own world file, and a map: nothing computed and nothing joined.

**And building it found that the write-up had never carried any plate at all.** The live map
composites ground into its SVG element asynchronously and the SVG download copies the element
after that; the write-up's figure is composed as a string and called neither. So the same map
carried Snow's plate on the screen and not in Notes, which `write-up-figures.ts` had recorded in
a comment as a known gap and nothing had asserted either way.

The gap was one thing and is two. A basemap tile has to be fetched, and a figure that renders
and then changes under a reader is worse in a write-up than one that renders once — that half
stands. A plate is a data URI the node already holds, placed by its corners through the figure's
own projection, which is a pure function: `withGroundUnder` composes it synchronously and the
tile half stays open. Measured in the application on 2026-10-31: three maps in the South London
write-up, **two of them now drawn on their plate**, where the count was zero.

Two things the plate figure also found, both in renderers rather than in the plate:

- **A figure named marks it does not carry.** `oldMap` headed every spatial map
  `STUDY AREA · SPATIAL COVERAGE` and captioned it *"Select a point to review its relation to
  the study boundary"*. On a map of an area and a plate there is no point, no coverage under
  review, and — in a write-up — nobody to select anything. Said now only where there is a
  located record to say it about. The same rule `polygonSvg`'s key already keeps.
- **The static frame does not fit a near-square plate.** The figure is 850 × 295 and the content
  is fitted inside 720 × 225, so a plate whose extent is nearly square is drawn about 285 px
  wide in an 850 px figure with white on both sides. Not touched here: the frame is shared by
  every static map in the application and changing it is its own piece of work.

## What would close it

1. ~~The plate drawn under the South London choropleth~~ — done 2026-10-27, and as a figure of
   its own 2026-10-31. **A reader has still not been asked whether the plate and the modern
   boundaries agree**, which was the half of this item that mattered.
2. The residual at the four control points measured against the modern boundaries, so the
   georeference carries a number rather than a provenance note.
3. A second plate from a different source, to show the widget is not shaped around this one.
4. A figure frame that follows its content's aspect, so a square plate is not two thirds white.

## What changed our minds

**That the band count decided it.** This record was written arguing that a plate is not a raster
because `inspectRaster` takes one band and a plate has three. The practitioner asked whether
multi-band was for satellite imagery, and the argument collapsed on the spot: it is, experiment 39
names Sentinel and Landsat, and the refusal says "not implemented **yet**". An admission answer
resting on a deferred feature expires when somebody implements it, and would have left this widget
looking like the duplicate D2 exists to catch.

The replacement was already in the framework and had not been reached for: `sample_raster`
requires an author-stated `valueUnit`. That turns the question from *how many bands* into *can you
state what a sampled value measures*, which a printed map fails permanently. The better argument
was one experiment away and this record did not look for it — the same failure
[137](137-a-static-figure-can-carry-its-ground.md) recorded about itself three days ago, where
four prior records had covered the ground and were found afterwards.
