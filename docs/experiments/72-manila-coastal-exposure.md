# 72 · Manila coastal exposure, built in increments

_Created 2026-10-10 · Updated 2026-10-15_

**Status:** increment 1 built and in the workspace list as `sea-level`. Two
increments remain, and the example deliberately stops where the evidence stops.

## What increment 1 answers

Which Manila health facilities are near which published sea-level projection
gauge, and how far away. That is the whole claim. It needs no elevation, no
network, and no new widget: every piece already existed and had never been put
together.

| Node | What it carries |
| --- | --- |
| Study area | a Manila bounding box |
| 60 health facilities | OpenStreetMap, ODbL, the same data Find health facilities retrieves live |
| 8 projection sites | the published AR6 tide gauges — Manila, Jolo, Cebu, Legaspi, Davao, Tacloban, Surigao, San Jose |
| AR6 projections | 288 values: 8 sites × 3 scenarios × 2 families × 2 years × 3 quantiles |
| Declare the extract | dataset IRI, version 20210809, 1995–2014 baseline, three required citations, `basisKind: confidence-pbox` |
| Assign projection site | each facility to its nearest gauge, with the distance |

It runs offline and reaches no source: every byte is bundled, and a browser test
asserts that by going offline and watching for requests.

## What it deliberately does not do

**No threshold comparison.** `slr_threshold_comparison` needs an elevation on a
stated vertical datum, and none has been supplied. The honest thing is to stop,
not to reach for a plausible number: a comparison against an invented elevation
would look exactly like a real result. A unit test asserts the node is absent,
and another asserts no raster output mode is used, because a painted surface is
the one thing a reader would mistake for a flood extent.

**It is a sample, not a register.** Sixty facilities, evenly spaced through the
name-sorted list inside the box. OpenStreetMap states no completeness, so an
absence is not evidence of absence on the ground, and the bundled notice says so.

## Two defects the example found

Neither would have been found by building another widget, which is the argument
for worked examples as an instrument rather than a demonstration.

**Facility identifiers were unusable as point input.** `find_health_facilities`
minted OpenStreetMap identity as `node/3090641351`, matching how OSM writes it.
The application's own point rule allows letters, digits, hyphen and underscore —
no slash. The widget stores points in its own parameters and never meets that
validator, so the slash passed everywhere until the same points were put into an
Input data node and the example refused to load. Identifiers are now `node-…`.
The information is identical; the spelling is one the whole application accepts.

**Any workflow with a study area was labelled Old Naledi.** `exampleKey` listed
the named workspaces and then fell through to `old-naledi` for anything holding
an `area` node. The new example took that path and was silently given Old
Naledi's title, description and note — including its licence note, which is wrong
for this data. This is the "examples are the default world" finding already in
TODO.md, in the one place it is least visible: not in the palette or the map, but
in the text that tells a reader what they are looking at. The named workspaces are
now a list, with a comment saying why a new example must join it.

## Increments 2 and 3

2. **Elevation.** No DEM is reachable from a browser — Copernicus 30 m in two
   regions, AWS terrain tiles and the GeoTIFF tiles all answer 200 with no CORS
   header. So elevation is a prepared input like the AR6 extract: a script clips a
   window, and the practitioner loads it through Prepare GeoTIFF input, Clip raster
   and Sample raster at points. This also matches the pack's own position that it
   derives no elevation and reads no terrain model.
3. **Threshold comparison**, with the vertical datum stated, and the limitation
   carried in the result: a comparison of two numbers accounts for no drainage,
   defences, waves or hydrodynamics, and is not an inundation model.

## Where the data came from

`validation-lab/scripts/build_sea_level_example.py`, which is data preparation and
not validation. It reads the AR6 extract the lab already produced, the published
site list the pack redistributes, and a HOT OpenStreetMap country export, and
writes the three JSON files the example imports plus a provenance record. The
example can be rebuilt from source rather than edited by hand, which is the point.

The two licences differ and both travel: AR6 is CC BY 4.0 and obliges three
citations, which the extract widget independently requires; the facilities are
ODbL and share-alike. `examples/manila-sea-level/NOTICE.txt` carries both.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add the Manila coastal exposure example, and fix what building it exposed |
