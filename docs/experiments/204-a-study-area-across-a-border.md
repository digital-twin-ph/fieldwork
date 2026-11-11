# 204 · A study area across a border

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** tried. Built (0.85.0): the list, naming, finding with shares and confirming, the walk upstream, and the
raster dialog offering the area's countries with its one-file limit said. Checked in Chromium. TODO 25.

## The question

The practitioner, 2026-11-10: *"We discussed the cross border study area. In this case we need to be able to either (1)
detect the countries based on geometry overlaps or (2) named explicitly."* Earlier the same day: *"The raster input
should be able to query upstream for the country"*, which is built for one country (0.80.2).

A study area states **one** country today (`country`, or the country of the boundary it was acquired from), and three
steps read it: Raster input's WorldPop download, Find health facilities' registers, and the walk upstream that finds a
step's country. An outbreak at a border, a catchment that crosses one, or a river basin has two or more.

## What exists, 2026-11-10

| Piece | Today |
| --- | --- |
| The study area's country | One: `country` (ISO3), or the boundary's own, read by `countryOfArea` |
| Acquired units | From one country's level at a time: the picker cannot take units of two countries |
| Bundled outlines | Natural Earth 1:110m, **as lines without country codes**: they can draw a border, not say whose side a shape is on |
| National outlines | geoBoundaries ADM0, fetched per country by the same path as every other level |
| Downstream | Raster input reads one WorldPop file; Find health facilities queries one country's registers |

## Design

**The study area holds countries, a list.** `countries` replaces `country`; a workflow saved with `country` reads as a
list of one. Every reader takes the list: the upstream walk returns the union, as it already does across several study
areas.

**Named.** For a drawn shape, Configure… lists the countries, one or more, chosen as the single country is now. An
acquired area states its own and cannot be edited.

**Detected, and confirmed.** *Find the countries* proposes; nothing is applied in silence.

1. **Candidates** from Natural Earth's 1:110m country polygons (public domain, about 10 km generalised), widened by
   10 km for that reason. Bundled, so a shape drawn offline still gets candidates. They suggest; they never decide.
2. **Shares** from geoBoundaries' national outline of each candidate: the share of the study area in each, *"86%
   Botswana, 14% South Africa"*. A candidate holding none of it is said and left unticked.
3. **The person confirms**: each candidate ticked or not, then Apply.

**Downstream.**

- Raster input offers one WorldPop download per country. It reads one file, so a study area across two is a **stated
  limit** until it reads two: the dialog says which country's file covers which share.
- Find health facilities queries each country's register and keeps which register each facility came from.

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A candidate is not a country of the study area until confirmed | Hard stop: detection writes nothing until Apply |
| Natural Earth is not a frame: its outlines suggest and never measure | Hard stop: shares are measured only on geoBoundaries' outlines |
| A share is of the study area as drawn, not of a population | Limitation, said beside the share |
| One WorldPop file covers one country | Limitation, said in the raster dialog |

## Not in this pass

**Find health facilities across a border.** It queries one country's register; with two countries upstream it asks which,
as it did before. Querying each register and keeping which one a facility came from is the next step.

Picking acquired units from two countries' levels in one study area. It needs the picker to hold two levels at once;
the list above is ready for it.

## Validation it commits to

- Unit: `countries` read from a saved `country`; the union upstream; the share on a square split by a straight border.
  **Done**: `tests/area-countries.test.mjs`, 4 tests; Gaborone to the border proposes Botswana and South Africa, a field
  in Botswana's interior Botswana alone.
- Browser: a shape across Botswana and South Africa (Gaborone to Tlokweng and the border at Ramotswa): two candidates,
  shares stated, both confirmed, the raster dialog offering two downloads with the limit said. **Done** in Chromium
  (`tests/area-countries.browser.mjs`), with geoBoundaries answered by two outlines split at 25.95 E: half each.
  Natural Earth 1:110m countries 5.1.2 bundled for the candidates (183 KB, public domain, `NOTICE-natural-earth.txt`).
- **Practitioner observation, before it is known:** whether a person reads *"14% South Africa"* as a share of the
  area or of the people.

## Not established

That a 110m outline finds every country a small shape touches: a study area within 10 km of a third border may get a
candidate that holds none of it, which step 2 says, and a sliver across a border under 10 km of generalisation may be
missed, which only the person can catch.
