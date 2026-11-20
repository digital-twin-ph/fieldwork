# Clip raster

_Created 2026-11-18 · Updated 2026-11-19_

**A raster cut to a boundary, cell by cell.** The population living inside a district rather than in its bounding box.

## What it does

It keeps the cells of a raster that fall inside a boundary, at the raster's own resolution, and sets every other cell
to no data. Nothing is resampled, reprojected or filled. Cells outside are still in the grid, marked as no data, so
the grid keeps its shape and its place on the ground.

## What you connect

| Input | What it takes |
| --- | --- |
| **Raster to clip** | a Raster input, or another Clip raster |
| **Study area** | the area whose boundary is copied as the cutline |

## How to use it

**Configure…** sets three things, and none of them is written until **Apply**:

| Setting | Choices |
| --- | --- |
| **Keep a cell when** | *the boundary covers any part of it* (all touched), or *its centre is inside the boundary* |
| **Margin beyond the boundary** | 0 to 1 cell. A margin needs the raster to reach that far past the boundary; Raster input's one-cell margin gives it that. |
| **Boundary** | the study area's, or this step's own once one has been drawn |

**Draw the boundary on the map…** opens the study area's shape over the raster, to adjust it for this step alone. The
study area is not changed. The map previews how many cells would be kept as the boundary moves. It edits a single
polygon; a boundary with holes or several parts is kept but cannot be edited there.

**Result** says how many cells the last run kept inside the boundary, and how many of them hold a value.
**Download GeoTIFF** gives the clipped grid without a run; **Add raster map** puts a Map after it.

## What it will not do

- **It will not fill no data**, inside the boundary or in the margin.
- **It will not weight a cell by how much of it is inside.** A cell is kept whole or not at all.
- **It will not resample or reproject.** The raster must be in latitude and longitude, as Raster input keeps it.
- **It will not change the study area** when its own boundary is drawn.

## How it was checked

Compared with rasterio 1.5.2 and GDAL 3.12.2 over a synthetic grid and a concave cutline. *Centre inside* agrees
exactly. *All touched* differs by 2 of 146 cells, both kept by GDAL only, where a boundary corner lies exactly on a
cell border. The margin has no GDAL equivalent and is checked only against a model of it, so it is not validated.

## Where it is used

No worked example uses it today. The Old Naledi example did, until it was retired on 2026-11-11
([audit](../audits/old-naledi-audit.md)).

## History

### 2026-11-18 · The standard Inspector (1.2.0)

Moved to the Inspector every touched widget takes (experiment 186): Name, Inputs, Settings with Configure…, Result.
The inclusion rule and the margin had been edited directly in the panel and saved on each change; they are now in
Configure… with the choice of boundary, and saved together on Apply. The panel's description of its processing
parameters was removed, and Result now reports the cells kept.

### 2026-11-19 · A streamed raster is not clipped (1.2.1)

A raster too large to keep is streamed (Raster input, History), and a clip of it would be as large. Clip raster says
so and points to Sample a raster, which reads a streamed raster over areas or at points.

### 2026-11-20 · The boundary named by its digest (1.3.0)

The receipt names the boundary by the SHA-256 of its GeoJSON, which anyone holding the project can recompute, instead of
writing out its coordinates.
