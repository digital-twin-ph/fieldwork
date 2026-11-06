# Find satellite products

_Created 2026-11-05 · Updated 2026-11-05_

**Which satellites and products measure a variable, and what each one measures.** It chooses where satellite data
will come from. It downloads nothing.

## What it does

Type a research topic or a measurement, such as *NO2 air pollution in New York City*, or pick a topic. The dialog
shows the chain from the question to a provider's collection, a caution about what a satellite measures, and one
card per product:

| On each card | Why it is there |
| --- | --- |
| **Sign-in** | No sign-in, no account (an anonymous token), or needs an account. Products needing none come first |
| **Measures** | A column through the atmosphere, an optical depth, an index, or a near-surface value |
| **Unit** | As read from the product's own file, or "read from the file when it is opened" |
| **Licence** | As read from the licence itself, with the date it was read; or "not yet read" |
| **In a browser** | Whether a browser has been shown to read it, and how that was checked |
| **Quality** | The product's own quality rule, where it has been read |

Choose a product and the Inspector summarises it. Its output is a satellite product, which only a catalog search
can take.

## How to use it

1. Add **Find satellite products** from Sources. It needs no input.
2. In the Inspector, press **Find satellite products…**.
3. Type a topic or a measurement, or press a topic. Read the caution, then the cards: open products are first.
4. Press **Choose this product** on the one you want, then **Done**. The Inspector shows your choice.
5. Run the workflow: the run records which product was chosen and what was and was not read about it, in the N3 &
   evidence view.

## Why it matters which quantity a product measures

A ground monitor measures air at the surface. A satellite NO₂ product measures the NO₂ in a column of air from the
ground to the top of the troposphere; an aerosol optical depth measures how much the whole column dims light; most
ozone products measure the whole atmosphere, mostly the stratosphere. They can move together with the monitors over
time. They do not agree in value, and a card never lets them look as if they should.

## Why the licence is read, not taken from the catalog

Planetary Computer gives Sentinel-5P's licence as *proprietary* and links an address that no longer exists. The
licence itself, read at its new address, grants free, full and open access with attribution. So a card states the
licence as read, where and when, and says when nobody has read it.

## Where the products come from

The topics and most routes are JLT's, from the [EO Satellite
Guide](https://github.com/jltobias/JupyterLite-EO-Satellite-Guide) (MIT), vendored unchanged at commit `684833c`.
Fieldwork adds the routes that need no sign-in, an ozone topic, and the facts on each card, read in [experiment
179](../experiments/179-eo-and-stac-for-the-nyc-monitors.md).

## What it will not do

- **It will not download anything**, or say that a product has data for your place and dates. That is the catalog
  search's question.
- **It will not cite a product yet.** Dataset citations have not been read for any route, and every card says so.
- **It will not choose for you.** The order puts open products first; which one suits a study is yours to decide.
- **It covers what has been curated.** A topic with no curated product says so rather than guessing one.

## Where it is used

The NYC example, *Did the satellite see the city's NO₂?* (1 to 14 June 2023).
