# Georeferenced map image

_Created 2026-10-27 · Updated 2026-10-27_

## What it does

Draws a scanned or published map **underneath** your workflow, in your workflow's own projection,
so a modern result sits over historical ground.

It was built for John Snow's 1855 Map 2, whose blue, red and purple washes show which company
supplied which part of south London — and whose purple intermingled zone is the whole point of his
design. Put the sub-district boundaries over it and a reader can see for themselves whether the
two agree.

## What you connect

Nothing goes in. It is a source: you give it an image and a georeference.

Its output goes to a **Map**, on the `ground` port.

## How to use it

1. Add it and choose the image — a JPEG or PNG of a map.
2. Give it the georeference, either as a world file (`.jgw`, `.pgw`, `.wld`) or as four corners
   in degrees: west, south, east, north.
3. Connect it to a Map, and set the opacity so you can read what is drawn on top.

## Reading what you get

The figure says which plate it drew, where it came from, and **about how many metres one of its
pixels covers**. Snow's small plate over south London is about 40 metres per pixel: enough to
recognise the river and the parish outlines, not enough to read a street.

The receipt records the image's digest, its pixel size, the four bounds, that ground resolution,
and `layerRole "context"`.

## What it will not do

- **It will not let you measure it.** The output carries its own port type, so it cannot be
  connected to Clip raster or Sample raster at all. A plate's pixels are a printer's ink: sampling
  them returns the colour of a line, which is a number with no referent. This is the one thing the
  widget refuses by construction rather than by warning.
- **It will not join anything to what the map shows.** A boundary drawn on an 1855 plate is a
  picture of a boundary. Use a study area for the frame.
- **It will not draw a rotated plate.** If the world file carries rotation terms, it stops and says
  so. Drawing a rotated image as an upright rectangle would put the map in the wrong place while
  looking entirely correct.
- **It will not reproject.** The corners are read as CRS84 degrees. Corners outside the world
  usually mean a projected georeference, and it refuses rather than reading one datum's
  coordinates as another's — an error that moves a map by hundreds of metres and still looks like
  a map.
- **It will not tell you the georeference is right.** It draws where you said. An alignment error
  looks exactly like a correct placement.

## Where it is used

The South London example: Snow's Map 2 under the sub-district choropleth.

## How it was checked

Unit tests over the world-file reader, the bounds it derives from it, the ground resolution, and
each refusal — a rotated world file, a flipped image, crossed corners and corners outside the
world. A browser test places a plate under a figure and confirms it is drawn beneath the workflow's
own layers rather than over them.

What no test establishes is whether the georeference is **correct**. See
[experiment 143](../experiments/143-a-georeferenced-plate-as-ground.md), which records that
measuring the residual at the plate's four control points against modern boundaries is what would
close it, and that it has not been done.
