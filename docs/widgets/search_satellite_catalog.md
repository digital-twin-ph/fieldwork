# Search a satellite catalog

_Created 2026-11-05 · Updated 2026-11-05_

_Created 2026-11-05 · Updated 2026-11-05 (0.2.0)_

**Where the files are**, for the satellite product you chose, over an area and dates. It reads catalog
records only. No data file is downloaded.

## What it does

It takes the product chosen in **Find satellite products** and an area, and searches that product's STAC collection
for the items covering the area's extent between two dates. The area is a connected **Study area**'s extent or, with
none connected, four edges you type in the dialog: west, south, east and north, in decimal degrees. Each item is a satellite
overpass with one or more files.

| Column | What it shows |
| --- | --- |
| **01 · Connect & discover** | The catalog, collection and product, from the chosen product; the study area's extent, or the four edges to type; the dates; **Search** |
| **02 · Coverage, in context** | The area searched and each item's footprint, and the list of items, each kept or dropped |
| **03 · Inspect & reuse** | The selected item's files, with sign-in, the licence as read, whether a browser can read it, and the attribution sentence to use, and the dataset citation with its DOI where it has been read |

## How to use it

1. Add **Find satellite products** and choose a product.
2. Add **Search a satellite catalog**, and connect the product to **product**. If the workflow has a **Study area**,
   connect it to **area** and its extent is searched.
3. In the Inspector, press **Search the catalog…**. With no Study area connected, type **West**, **South**, **East**
   and **North**; the dialog says what is wrong with an edge until all four make an extent. Choose **From** and
   **Until**, and press **Search**.
4. Select an item, on the map or in the list, to inspect its files. Untick any item you do not want to keep.
5. Press **Done**, then run the workflow. The run records the search and how many items were returned, matched and
   kept.

## What a search can and cannot tell you

A search tells you **whether there was an overpass**: which dates have an item over your area. It cannot tell you
whether that overpass holds a usable value over your area. Clouds remove retrievals, and a product's quality flags
mark others as unreliable. On 7 June 2023, the one Sentinel-5P NO₂ overpass of New York City came as two items, and
the near-real-time one measured had no pixel passing the usual quality threshold. So every item says its completeness
is not known until a reader opens the file, and the run records that it was not read. **Sample satellite files at
points** is the reader.

## One overpass can be two items

A Sentinel-5P orbit is published in more than one processing stream: **near real time** (`NRTI`, within hours, in
five-minute pieces) and **offline** (`OFFL`, days later, the whole orbit, with better inputs). Each is an item, so
one overpass can appear twice. Each item says its stream and orbit. Where an orbit has an offline item, its
near-real-time items are not kept by default, so a reading is never counted twice; the product recommends the offline
stream for time series. Tick one back if you need it.

## What it will not do

- **It will not download a file.** Reading the pixels at your points is a separate step, not yet built.
- **It will not search more than 500 items at once.** It says when it stopped there; narrow the dates for the rest.
- **It will not search all time.** It needs dates.
- **It will not search across the antimeridian or by the outline of the area**: the area's extent is searched, so
  items over nearby water or another country can appear. West must be less than east; split an area across the
  antimeridian into two searches.
- **It will not cite a product nobody has read a citation for.** It shows the citation Find satellite products
  carries, and says "not yet read" otherwise.

## Where it comes from

The search, its messages, its 500-item bound and the typed W/S/E/N extent are adapted from JLT's [STAC
Browser](https://github.com/jltobias/JupyterLite-STAC-Browser) (MIT, commit `945d8b3`), in Fieldwork's dialog style.
[Experiment 179](../experiments/179-eo-and-stac-for-the-nyc-monitors.md) records why each file says what it says.

## Where it is used

The NYC example, *Did the satellite see the city's NO₂?* (1 to 14 June 2023).
