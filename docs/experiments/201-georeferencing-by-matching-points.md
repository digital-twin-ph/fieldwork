# 201 · Georeferencing a map image by matching points

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** asked. A design, made to be built and tried on South London first and Hagelloch second. Nothing is built.

## The question

The practitioner, 2026-11-10: *"If we can get hold of an old map of Hagelloch in 1861 we can also exercise
georeferencing in the georeferenced image input widget. You did it before for South London so I think it could be done
this time in the widget itself."* Then: *"We can have an interface that pairs control points between the image and a
map of the place"*, and *"we can then exercise the same step for South London if it works. We can make this experiment
201."*

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
