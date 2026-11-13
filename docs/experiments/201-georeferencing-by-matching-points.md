# 201 · Georeferencing a map image by matching points

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** tried. The fit, the dialog and turned drawing are built (0.81.0); South London's four points refitted; lab
check 48 agrees with GDAL; the cue for a worked example is built, and Hagelloch's 1824 sheet is placed by hand in Hagelloch's
fourth workflow (0.83.0). A learner using the cue is not yet observed.

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

**Checked by somebody else's code** (lab check 48): GDAL's fit from ground control points (`GDALGCPsToGeoTransform`,
3.12.2, through rasterio) gives the same six numbers as Fieldwork to about 1e-17 and the same errors to 4e-10 m, on
South London's four points and on a turned set with one bad pair. So the east-west difference from the hand placement is
the hand fit's direction, not Fieldwork's: Fieldwork's fit is GDAL's.

**The cue, built 2026-11-10** (map image 0.3.0). An example stores its features to find (`guide`): each a name, why it
was chosen, and where it is on the image and the map, with a radius the size of the feature. Configure… names the next
feature and its reason, pulses a ring on both panes (2.4 s a cycle: 0.4 a second against WCAG 2.3.1's three), and says
under the name whether each half of the learner's click is on the feature. Nothing is filled; the first row and each
added row carry only the feature's name. **Show where to look** turns the pulse off; reduced motion stills it. Checked
in Chromium (`tests/georeference-dialog.browser.mjs`, `tests/georeference.test.mjs`).

**Practitioner observation, written before it is known:** whether a learner given the pulse and the reason finds the
feature, or clicks the centre of the ring without looking at the map. The second would mean the ring is doing the
learning; a smaller radius, or the ring shown only after a first wrong click, are the alternatives.

## Hagelloch's 1824 sheet, placed by hand, 2026-11-10

Hagelloch's fourth workflow, *4 · Hagelloch: the 1824 sheet, placed by hand* (`?example=hagelloch-sheet`), offers Flurkarte NW III 3 (1824) and four junctions to find with the cue.

**Methods**

1. **The reference placement**: the sheet's frame, placed from its Gauss-Krüger corners (residuals 0.06 m, 0.68 m a
   pixel). It agrees with today's buildings to about 3 m (experiment 200).
2. **Features to find**: today's street junctions, read from Geofabrik's Tübingen extract (2026-11-08, ODbL) by
   Fieldwork's street engine, 226 where three or more streets meet. Each was carried onto the sheet through the frame
   placement and kept only where the drawn streets visibly meet there, checked on 4× enlargements: four of the fifteen
   looked at. **Not used**: buildings, because overlap does not establish identity (the best overlap was 0.45, and a
   town hall built in 1956 scored 0.34 on an old plot); the church, whose footprint today only partly covers a building
   drawn in a walled yard.
3. **The cue**: a 14-pixel ring on the sheet and a 10 m ring on the map, centred on the carried junction. It is not
   independent of the frame placement, so a placement that follows it cannot disagree with that placement by more than
   about the ring.
4. **The hand placement**: where the drawn streets meet, read by eye on 4× enlargements to within a few pixels (2–4 m),
   paired with today's junction. Fitted with Fieldwork's own `fitPlacement`, north up and affine, and compared with the
   frame placement at the village centre and at the sheet's corners.

**Results**

| Fit, from 4 junctions | Errors at the points | Off the frame placement: village centre | NW corner | SE corner |
| --- | --- | --- | --- | --- |
| North up | 3.1 m RMS, largest 5.0 m (South lane) | 3.5 m | 11 m | 7 m |
| Affine | 2.7 m RMS, largest 4.6 m | 3.6 m | 58 m | 32 m |

Four points in a village 400 m across place the village to a few metres either way. They do not hold the sheet's far
corners: affine, with six numbers to fix from eight coordinates, turns and stretches to fit the reading errors, and
the corners 1.2 km away move by tens of metres. North up, with four numbers, does not. **The example sets north up.**
The dialog's advice to spread points across the image is the remedy; on this sheet the outer area offers field
boundaries, not features that have lasted. Checked in Chromium (`tests/hagelloch-sheet-example.browser.mjs`).

**Feedback for a person doing it, built the same day** (map image 0.4.0). The practitioner: *"If it's a human doing it
the user would need more feedback"*, then, of the cursor's distance from where the other pairs expect the feature,
*"include that but we instruct the user to look for features so user is not merely relying on the realtime feedback"*,
and *"a preview window … where the sheet is overlaid on the real map for comparison"*. Built: the pair just made against
the others; the scale and turn the fit implies; the error as pairs were added; the cursor's distance, under *Find the
feature on the map by looking first*; and the preview, with a see-through slider and each pair drawn twice. Checked in
Chromium. **Practitioner observation, before it is known:** whether a learner moves the cursor until the distance is
small instead of looking for the feature. If so, the distance should appear only after a click.

**Not established**: whether a learner finds the drawn junctions; a second reader's readings; that the drawn streets
of 1824 lie exactly where the streets of today do.

## Snow's Map 2, placed by hand, 2026-11-13

The practitioner, of South London's plate shown as published: *"I think we can follow the Hagelloch example and allow
the user to georeference it by hand as part of the worked example."*

Built (map image 0.7.0, the example at de92a84): a ninth workflow, *Snow's Map 2, placed by hand*. The plate is
offered in Configure…, and it is not a file shipped with Fieldwork: an offer may now name a file a curated example
repository pins, fetched at the pinned commit and refused unless its digest matches. The four cues are the features
recorded when the plate was first placed (`geo/map2-georeference.json`): Kennington Oval, Battersea Park, Crystal Palace
grounds and Nunhead Cemetery. Their pixels are scaled from the 5,000-pixel scan to this 1,002-pixel plate. The rings
are 12 pixels and 200 m, wider than Hagelloch's, because these are areas rather than street corners, and the recorded
Oval point is 144 m from the published placement. The plate's published extent is drawn as an outline over the
learner's placement.

Checked in Chromium (`tests/snow-map2-by-hand.browser.mjs`): the plate is not fetched until asked; fetched once and
checked; the four recorded points typed in, each inside its ring; the fit's largest error at Kennington Oval; run and
drawn.

**Not established**: whether a learner finds the four features on a plate this coarse, about 16 m a pixel; and
whether the published extent drawn as an outline helps a learner judge their placement or distracts them.
