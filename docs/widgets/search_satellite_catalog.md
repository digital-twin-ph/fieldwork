# Search a satellite catalog

_Created 2026-11-05 · Updated 2026-11-05_

**Where the files are**, for the satellite product you chose, over your study area and dates. It reads catalog
records only. No data file is downloaded.

## What it does

It takes the product chosen in **Find satellite products** and the workflow's **Study area**, and searches that
product's STAC collection for the items covering the area's extent between two dates. Each item is a satellite
overpass with one or more files.

| Column | What it shows |
| --- | --- |
| **01 · Connect & discover** | The catalog, collection and product, from the chosen product; the study area's extent; the dates; **Search** |
| **02 · Coverage, in context** | The study area and each item's footprint, and the list of items, each kept or dropped |
| **03 · Inspect & reuse** | The selected item's files, with sign-in, the licence as read, whether a browser can read it, and the attribution sentence to use |

## How to use it

1. Add **Find satellite products** and choose a product. Add a **Study area**.
2. Add **Search a satellite catalog**, and connect the product to **product** and the study area to **area**.
3. In the Inspector, press **Search the catalog…**, choose **From** and **Until**, and press **Search**.
4. Select an item, on the map or in the list, to inspect its files. Untick any item you do not want to keep.
5. Press **Done**, then run the workflow. The run records the search and how many items were returned, matched and
   kept.

## What a search can and cannot tell you

A search tells you **whether there was an overpass**: which dates have an item over your area. It cannot tell you
whether that overpass holds a usable value over your area. Clouds remove retrievals, and a product's quality flags
mark others as unreliable. On 7 June 2023, the two Sentinel-5P NO₂ overpasses covered New York City and the one
measured had no pixel passing the usual quality threshold. So every item says its completeness is not known until a
reader opens the file, and the run records that it was not read.

## What it will not do

- **It will not download a file.** Reading the pixels at your points is a separate step, not yet built.
- **It will not search more than 500 items at once.** It says when it stopped there; narrow the dates for the rest.
- **It will not search all time.** It needs dates.
- **It will not search across the antimeridian or by the outline of the area**: the area's extent is searched, so
  items over nearby water or another country can appear.
- **It will not cite the product yet.** Dataset citations have not been read for any product.

## Where it comes from

The search, its messages and its 500-item bound are adapted from JLT's [STAC
Browser](https://github.com/jltobias/JupyterLite-STAC-Browser) (MIT, commit `945d8b3`), in Fieldwork's dialog style.
[Experiment 179](../experiments/179-eo-and-stac-for-the-nyc-monitors.md) records why each file says what it says.

## Where it is used

Not yet in a worked example. The NYC asthma and ozone example is the first intended use.
