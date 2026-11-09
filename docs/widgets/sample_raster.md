# Sample raster at points

_Created 2026-11-09 · Updated 2026-11-09_

**A raster's value written onto each point.** The ground's height at each clinic, the geoid's height at a tide gauge.

## What it does

For each point, it reads the raster at the point and writes the value onto it as a new attribute: the value of the
cell containing the point, or a value interpolated between the four nearest cells. The points keep everything else
they carried.

## What you connect

- **Points to read at**: any point layer.
- **Raster to read**: a Raster input, or Clip raster.

It gives back the points, each with one more attribute.

## How to use it

The step's panel holds its **Name**, its two inputs, one sentence saying what it writes, and **Configure…**:

| Setting | What it decides |
| --- | --- |
| **Attribute to write** | The new attribute's name, which must not already be on the layer |
| **What those values measure** | Its unit and surface, in your words: "metres above EGM2008" |
| **Read each value as** | **the cell containing the point**, or **between the four nearest cells (bilinear)** |

Bilinear suits a smooth field, such as a geoid or a mean sea surface, and is how PROJ reads EGM2008. Keep a margin of
one cell in the Raster input's window so points near its edge have four cells around them.

## What it will not do

- **It will not set a missing value to zero.** A point on no data, outside the raster, or without a location keeps no
  value and is counted, under **Result**.
- **It will not overwrite an attribute** the layer already has.
- **It will not call a cell value a measurement at the point.** It is the raster's value there, at its resolution.

## Where it is used

The sea-level example: the ground's height at each facility, and the geoid and the sea surface at the gauge.
