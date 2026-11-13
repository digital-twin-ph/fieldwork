# Sample a raster at points or over areas

_Created 2026-11-09 · Updated 2026-11-13_

**A grid's value at each point, or its total over each area.** The ground's height at each clinic; the people a
population grid places in each district; the satellite's NO₂ over each monitor, day by day.

## What it does

What it gives back follows what you connect, and the step says which it is doing.

| Connect | It gives back | Each place carries |
| --- | --- | --- |
| A **Raster input** (or **Clip raster**) to **raster**, and points to **points** | the points | the cell's value, as a new attribute |
| A **Raster input** to **raster**, and a **Polygon layer** to **areas** or a **Study area** to **area** | the areas, as polygons | the total of the cells inside, how many cells that was, how many had no data, and how many lay beyond the raster |
| **Search a satellite catalog** to **files**, and points or areas | a table | one row per place and file period, with its quality |

Points and areas are not mixed in one step.

**Over a study area, each named part is one area**, all of its pieces together: a district drawn as a main outline and
a sliver beside it is totalled once. With **Also give each area's zonal statistics** in Configure…, each area also
carries its cells' mean, median, standard deviation, smallest and largest (of the cells with a value), how many cells
are above zero and their share, its size in km² and the total per km². The cells' statistics are per cell: a
latitude-longitude grid's cells are not all the same size.

The areas, with their totals, can go on to a table step, such as Total within groups or Append rows, as a table: one row
per area, its name and its numbers.

**Configure… says what arrived first:** the raster's name, how many cells were kept and how wide each is, its no-data
value, and what its values measure where its source record or the file says so, which then fills *What those values
measure*. It says what the raster is read at, or that nothing is connected yet and what to connect. Where a study area
is on the canvas, **Read it over** *its name* connects it and reads the raster over its named parts, or over the whole
area where it has none, and moves a Map's or Table's input from points to polygons.

## At points, from a raster

For each point, it reads the raster at the point and writes the value onto it as a new attribute: the value of the
cell containing the point, or a value interpolated between the four nearest cells. The points keep everything else
they carried.

| Setting | What it decides |
| --- | --- |
| **Attribute to write** | The new attribute's name, which must not already be on the layer |
| **What those values measure** | Its unit and surface, in your words: "metres above EGM2008" |
| **Read each value as** | **the cell containing the point**, or **between the four nearest cells (bilinear)** |

Bilinear suits a smooth field, such as a geoid or a mean sea surface, and is how PROJ reads EGM2008. Keep a margin of
one cell in the Raster input's window so points near its edge have four cells around them.

## Over areas, from a raster

Each area is given the **total** of the cells whose centre is inside or on it, the rule **Clip raster** uses. For a
population grid, such as WorldPop, GRID3 or GHS-POP, that total is the grid's estimate of the people in the area.

| Column | What it holds |
| --- | --- |
| the attribute you name, `total` by default | the sum of the cells with a value; empty where no cell had one |
| `cells` | how many cells were added |
| `cells_no_data` | cells inside the area the raster marks as no data: they add nothing, and are not zero |
| `cells_outside_raster` | cells of the area beyond the raster's window: the window does not cover that part of the area |
| `cell_mean`, `cell_min`, `cell_max` | only when asked for: the mean, smallest and largest of the cells with a value |

**Also the mean, smallest and largest cell.** Tick *Also give each area's mean, smallest and largest cell value* in
**Configure…** and each area carries three more columns, `cell_mean`, `cell_min` and `cell_max`, of the cells with a
value. They suit a grid of heights or temperatures more than one of people. A mean of cells is per cell, not per
square kilometre: on a latitude-longitude grid, cells shrink towards the poles. An area with no cell holding a value
has none of the three.

**Read the last two columns before the total.** An area with cells outside the raster has a total for only part of
itself; widen the Raster input's window to cover it. Areas come from a **Polygon layer**, or from a **Study area**:
its units, such as districts picked from an administrative boundary, or the whole boundary as one area.

**A cell counts whole, or not at all.** It is not split by the area's edge. A 100 m cell matters little to a
district and more to a ward of a few hectares.

## From satellite files

### What it reads

For each point and each file the search kept, it reads the value of the pixel whose centre is nearest the point. It
fetches only the parts of each file it needs, by HTTP range, in the browser. The result is a long table: one row per
point per overpass, plus one row per point for each day with no overpass.

| Column | What it holds |
| --- | --- |
| `point_id`, `point` | The point, as the point layer names it. Where Point data read its ids from a table column, the id column takes that column's name, `site` for the NYC monitors, so the result relates back to the source on it |
| `date`, `overpass_time` | The day, and the time the pixel was scanned |
| `stream`, `orbit` | The processing stream (`OFFL` offline, `NRTI` near real time) and the orbit |
| `scanline`, `ground_pixel` | Which pixel of the swath was read |
| the variable, e.g. `nitrogendioxide_tropospheric_column` | The value, **only where it passed the quality rule**, in the unit the file states (`mol m-2`) |
| `value_as_read` | The value read, whether or not it passed |
| `qa_value` | The pixel's quality value, 0 to 1 |
| `passes_quality` | `yes` or `no` |
| `gap` | Where there is no usable value: `no overpass`, `no retrieval` or `below quality threshold` |

### Over areas

Connect a polygon layer to **areas** instead of points: municipalities from **Join a table to the study area**, or a
**Polygon layer**. Or connect a **Study area** to **area**: its units, such as municipalities picked from an
administrative boundary, are read as they are. One kind of place per node. This works for gridded products, which today means **MODIS land surface temperature** (8-day,
1 km). Sentinel-5P is still read at points only.

Each area is read by the cells whose centre is inside it, the rule **Clip raster** uses. A municipality made of
several parts, such as one with islands, is one area. Where an area spans two of MODIS's tiles, both are read and
added before the mean is taken.

| Column | What it holds |
| --- | --- |
| the place column | the area's name; call it as the table you will relate it to does, such as `municipio` |
| `period_start`, `period_end` | the 8-day period the file covers |
| `platform` | `terra` (mid-morning pass) or `aqua` (early afternoon), never pooled |
| `layer` | daytime or night-time |
| `cells`, `cells_with_value`, `cells_passing` | how many cells the area holds, how many had a value, and how many passed the quality rule: **the mean rests on the last** |
| `value_min`, `value_max` | the range of the passing cells, in the unit chosen |
| `clear_days` | how many of the 8 days were clear, on average, behind the passing cells |
| `LST_Day_1km` or `LST_Night_1km` | the mean of the passing cells, in the unit chosen |
| `gap` | `no cell in the area`, `no retrieval` or `below quality threshold` |

**The unit.** The files state kelvin. **Report temperature in** offers degrees Celsius (K − 273.15), the default,
degrees Fahrenheit (K × 9/5 − 459.67) or kelvin. The conversions are exact, and the result says which was applied.
How the unit is known: each file states it, with its scale factor, in its own tags, and every file opened is checked.
A file that states another unit stops the run and is named.

**The quality rule for MODIS.** Its documents explain its quality bits and recommend no rule. The default keeps
cells the product made, of good or other quality, whose average temperature error is 2 K or less. *Good quality only* and *everything produced* are the alternatives.

**Read the counts.** Over Rio de Janeiro in February 2024 each 8-day value rested on about two clear days, and one
week's value for Rio de Janeiro city came from 26 of its 1,400 cells. A mean is reported wherever any cell passed;
whether that is enough is the analyst's call, and the numbers to make it are on the row.

### How to use it

1. Build the search first: **Find satellite products** (choose the Sentinel-5P NO₂ product on Planetary Computer), then
   **Search a satellite catalog** over your area and dates, and press **Search**.
2. Add **Sample a raster at points or over areas**. Connect your point layer, for example the monitors from **Point data**,
   to **points**, and the search to **files**.
3. Select the step and press **Configure…**. Check the **Quality rule**: for Sentinel-5P it is set to the product
   manual's, `qa_value` at or above 0.75; for MODIS, choose the **Layer**, the **Quality rule**, **Report temperature
   in** and the **Name of the place column**. Press **Apply**.
4. Connect a **Table output**, and run the workflow. The files are read during the run. A year of files takes minutes: while they are read, a panel at the foot of the page names the step and
   counts the files read so far, *Reading satellite files: 40 of 92*, and the run's state beside the canvas says the
   same.

**Several files are read at once**: six MODIS files, three Sentinel-5P. Three months of MODIS over Rio de Janeiro's
92 municipalities took 70 s one file at a time in Chromium and 23 s this way. A browser opens at most six connections
to the MODIS server, so more would not help. A file that fails is tried three times; if it still fails, the run stops
and names it.

**What a file gave is kept on this device.** A file read before, the same way at the same places, is not read again:
not after a change downstream, not after a reload, not the next day. What is kept is the reading, a few numbers per
place, not the file: 180 MODIS files over 92 municipalities come to about a megabyte. The result says how many files
were taken from the device, *Every file was taken from readings saved on this device from an earlier run*, and the
receipt records it as `fw:filesFromDevice`. Change the layer, the quality rule or the places, and those files are read
again. **Configure…** shows how many readings are kept, and offers **Read every file again on the next run** and
**Forget every saved reading on this device**.

### The three gaps

| Gap | What happened |
| --- | --- |
| **no overpass** | No file kept for that day, or the point is outside the file's swath |
| **no retrieval** | The satellite passed over, and no value was retrieved at that pixel: usually cloud |
| **below quality threshold** | A value was retrieved, and the product's own rule says not to use it |

They are kept apart because they mean different things for a study: cloud is not random, and a day the satellite
missed is not a day it saw and rejected.

### The quality rule

The NO₂ product's documents disagree, and only at exactly 0.75: the readme says *above* 0.75, the product user
manual's table *at or above*. The Inspector lets you choose, and the result and its receipt say which was applied.

`qa_value` is stored as an integer from 0 to 100 and a scale factor of 0.01, so the rule compares the integers. The scale
factor is stored as 0.0099999998, so a value stored as 75 multiplies out to 0.74999998, which would wrongly fail "at
or above 0.75".

### What it will not do

- **It will not fill a gap.** Imputation is a separate, declared step (experiment 179, provisional statement 2).
- **It will not interpolate.** The value is the nearest pixel's, on pixels of about 3.5 × 5.5 km at the centre of the
  swath and wider at its edges. A pixel is not the value at the point.
- **It will not turn a column into a concentration.** NO₂ here is a tropospheric column, molecules in the air above the
  pixel, not a surface concentration a monitor measures.
- **It will not read other products yet.** Sentinel-5P NO₂ (at points) and MODIS land surface temperature (at points
  or over areas), both on Planetary Computer, have readers. Ozone and aerosols say so when connected.
- **It will not weight by population or by how much of a cell lies in an area.** A cell counts whole, or not.

### What it costs

The cost is in chunks, not pixels. An offline NO₂ orbit file is about 600 MB and stores each variable in compressed
chunks of 2,086 × 225 pixels, so the first pixel of a chunk costs the whole chunk: about 2 MB each for latitude,
longitude and quality, and 3 MB for the value, measured on 7 June 2023. **Expect roughly 10–15 MB per overpass**,
much the same for 2 points as for 50 when they fall in one chunk. A month of daily overpasses is a few hundred MB.

### How it was checked

The lab's [check 35](https://github.com/digital-twin-ph/validation-lab) reads a Sentinel-5P-shaped file with h5py,
a different HDF5 reader, and recomputes every point's pixel by comparing every centre in the swath, then rebuilds the
table row by row for both quality rules. It agrees. Against 0.2.0 it found a point near the edge of one of the file's
chunks read from the pixel across the edge from the nearest one: fixed in 0.2.1. The file is synthetic, so this says
nothing about a real orbit's content.

### Where it comes from

Admitted, built and measured in [experiment 179](../experiments/179-eo-and-stac-for-the-nyc-monitors.md). The files
are read with [h5wasm](https://github.com/usnistgov/h5wasm) 0.10.3, from the US National Institute of Standards and
Technology, whose notice travels with Fieldwork in `vendor/h5wasm-0.10.3-LICENSE.txt`.

### Where it is used, from satellite files

The NYC example, *Did the satellite see the city's NO₂?*: Sentinel-5P NO₂ at the four NO₂ monitors over 1 to 14 June 2023, related to their daily readings on `site` and `date`.


## What it will not do

- **It will not set a missing value to zero.** A point on no data, outside the raster, or without a location keeps no
  value and is counted, under **Result**; over areas, no data and cells outside are counted apart.
- **It will not overwrite an attribute** the layer already has.
- **It will not call a cell value a measurement at the point.** It is the raster's value there, at its resolution.
- **It will not weight a cell by how much of it lies in an area.**

## Where it is used

The sea-level example: the ground's height at each facility, and the geoid and the sea surface at the gauge. Brazil
dengue and New York ozone read satellite files with it.
