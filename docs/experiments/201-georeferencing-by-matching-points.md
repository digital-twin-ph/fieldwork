# 201 · Georeferencing a map image by matching points

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** tried. The fit, the dialog and turned drawing are built (0.81.0); South London's four points refitted.
The guidance ring for a worked example's manual, the lab check against GDAL and Hagelloch's 1824 sheet are next.

## The question

The practitioner, 2026-11-10: *"If we can get hold of an old map of Hagelloch in 1861 we can also exercise
georeferencing in the georeferenced image input widget. You did it before for South London so I think it could be done
this time in the widget itself."* Then: *"We can have an interface that pairs control points between the image and a
map of the place"*, and *"we can then exercise the same step for South London if it works. We can make this experiment
201."*

## More of the question, the same day

- *"Let's pull up georeferencing to the top"*
- *"Remember we should be able to do the georeferencing by hand so this will be the challenge if we show this in a
  manual."*
- *"How do we point the user to the right pairs of points is the question."*
- *"For the worked example we can give them cues like a blinking point to click on"*

## What exists

Georeferenced map image reads a scan and a **north-up world file**, and refuses a rotated one
([143](143-a-georeferenced-plate-as-ground.md)). South London's 1855 plate was placed outside the application, from four
control points in `map2-georeference.json`, written into a world file. Nothing in Fieldwork fits a placement.

Hagelloch's 188 houses are placed from **one anchor**: right to the village, not to the building
(`examples/hagelloch-1861/provenance.json`). A georeferenced plan of 1861 would place them properly.

## The design

- **Two panes, side by side**: the scan on the left and a map of the place on the right, each panned and zoomed.
- **A pair is two clicks**: a feature on the scan, then the same feature on the map. It is numbered in both panes and
  listed beneath.
- **Three pairs fix an affine placement**; each pair after that measures it. Every pair's residual is shown in metres,
  so a misplaced click stands out, and can be moved or removed.
- **The pairs are kept on the step**, so how the plan was placed can be read, repeated or corrected. The fit and the
  residuals go into the receipt.
- **Rotation and shear allowed.** An old plan is rarely north-up. The result is still a scan and a world file, now
  carrying its two rotation terms, so QGIS and GDAL open it as it is.
- **Residuals are reported, never hidden.** An affine fit straightens a plan; it does not correct a surveyor's error in
  one corner.
- **The map pane needs tiles**, which send the area viewed to the tile service. Said in the pane, as the manual says it
  for basemaps.

## What it needs

Already in Fieldwork: geotiff.js, proj4 (the fit is made in metres), Leaflet and MapLibre for the map pane. To write:

- **the fit**: six numbers by least squares from three or more pairs, a 3 × 3 system solved twice, with the residuals;
- **drawing the scan turned**: on the static figure an SVG transform; on the interactive map a small Leaflet layer,
  since Leaflet draws images north-up only. An affine placement is drawn through a matrix and needs no resampling.

**Not GDAL, in the application, for now.** It would be needed for a bending warp (polynomial or thin-plate spline),
for writing a resampled GeoTIFF, or for formats geotiff.js cannot read. In the browser that is gdal3.js: a large
download, loaded only on demand, and its licence to check. It is added if the residuals show an affine fit is not
enough.

**GDAL in the lab** is the independent check: the same pairs given to GDAL's own fit (through rasterio, which the lab
already runs in CPython and the browser kernel), comparing the six numbers and every residual.

## A house-level plan of Hagelloch, found 2026-11-10

The first Württemberg survey, at 1:2500, scanned by the Landesarchiv Baden-Württemberg: sheet **NW III 3**, surveyed
1824 by Jakob Rieth (Staatsarchiv Ludwigsburg EL 68 VI Nr 7243), shows the village house by house along its lower
edge; **NW II 3**, 1819 (Nr 7189), south of it, shows fields and forest. Each online scan is 2,200 × 2,489 pixels,
about 0.5 m on the ground per pixel, and carries the archive's own notice: Public Domain Mark 1.0. Downloaded with the
practitioner's yes to `~/Downloads/hagelloch-flurkarten/`, outside every repository. Later corrected editions closer to
1861 (NW II 3 corrected in 1888, for one) are in the Stadtarchiv Tübingen, not scanned.

**Two placements to compare.** Each sheet's frame is a square whose north-west corner is given in the old Gauß-Krüger
grid (NW III 3: 3500389, 5379222), about 1,146 m a side; proj4 turns those into today's coordinates. So the sheet can be
placed from its four corners, exact by construction, and again from features matched by hand against today's map. The
difference measures matching by hand on a sheet where the answer is known.

**And the houses.** With the sheet placed, Hagelloch's 188 cases can be laid over the 1824 buildings: whether the
table's houses fall on buildings would say something about where Oesterle's coordinates came from, which no source read
states. Pfeilsticker's 1863 thesis has no plan: its five fold-outs are tables (Wellcome Collection copy, complete).

A railway map of Germany, 1861 (Wikimedia Commons, public domain, 4,878 × 3,792), also downloaded, to
`~/Downloads/bahnkarte-1861/`: about 200 m a pixel, too coarse for houses, a country-scale case for the same widget.

## The plan

1. **South London**, against its known placement: the four pairs of `map2-georeference.json` entered in the widget
   should give the same world file, and the residuals can be compared with those found by hand.
2. **Hagelloch**, once an 1861 plan is found. Open evidence only, asking before any download: whether Pfeilsticker's
   1863 scan on archive.org carries the village plan, and the Württemberg cadastral maps of the 1820s to 1840s
   (Landesarchiv Baden-Württemberg), with their licence.
3. Then the houses: `x_loc` and `y_loc` placed through the fitted plan rather than from one anchor, with what that
   changes recorded.

## What this does not establish

- That a plan is accurate. The residuals measure how well the pairs agree with one placement, not whether the surveyor
  drew the village correctly.
- That today's features are where 1861's were. A church or a junction chosen as a pair is assumed not to have moved.
- That the houses in Hagelloch's table are the houses on a plan. The table's `x_loc` and `y_loc` come from Oesterle's
  1992 reanalysis; which plan they were read from is not recorded.

## Built, 2026-11-10

**The fit** (`src/georeference.ts`): least squares from matched points, **north up** (a scale and an offset per axis,
two points at least) or **affine** (turned and sheared as the points need, three at least), into a world file in CRS84
with the origin at the top-left pixel's centre. Residuals on the ground, metres east and north: where the fit puts the
point minus where it is. Points on one line, or too few, are refused with what to do.

**The dialog**: Georeferenced map image moves to the standard Inspector (Name, Inputs, one sentence and Configure…,
what is placed). Configure… holds the image, *How to place it* (a world file, or matched points) and the opacity. By
matched points: what makes a good pair, said before the first; the image pane, zoomed, with the pixel under the cursor
shown large; today's map, with OpenStreetMap's tiles and a sentence saying the area viewed is sent to them; and a row of
fields per point -- a name, its x and y on the image, its longitude and latitude -- that a click fills and a person can
type. Each row shows its error and, with more points than the fit needs, its error with that point left out; a pair
whose left-out error is more than twice the root mean square is marked *check this pair*. Once a fit exists, a point
clicked on the image is shown on the map as a ring where the fit expects it: the person still finds and clicks it.
Apply waits for a placement and says what it waits for.

**Turned images drawn turned**: a world file with rotation is placed by its four corners, no longer refused. The static
figure draws it through an SVG matrix from three of them; the interactive map through a layer of its own, a CSS matrix
recomputed as the view changes. North-up images are drawn as before.

**South London, refitted** (`tests/georeference.test.mjs`): its four recorded points, north up, give the hand fit's
north-south scale to 0.002% and its top edge to about a metre; east-west the scale differs by 0.1% and the left edge by
about 10 m, with the same residuals (Kennington Oval 144 m). The difference is the direction of the fit: the hand fit
predicted pixels from coordinates, this one coordinates from pixels, as GDAL's fit from control points does. Where the
residuals are small the two agree; where they are large, they part.

**For a manual** (not built yet): the points typed, so a learner gets the manual's fit and errors exactly and the test
can check them; each point with the reason it was chosen; and, in a worked example, a slow pulse -- not a blink, which
WCAG 2.3.1 limits to three a second -- on the feature to find, still for anyone who has asked their system for reduced
motion, sized to the feature so the exact click is the learner's, and a setting to turn it off.

**Not yet**: the cue; the lab check against GDAL's fit from the same points; Hagelloch's 1824 sheet, placed from its
frame's known corners and again by hand, the two compared.
