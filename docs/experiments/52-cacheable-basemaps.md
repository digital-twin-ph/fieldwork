# 52 · Cacheable basemaps: PMTiles and Natural Earth

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** design record with measurements, covering two formats for two different
jobs — PMTiles for interactive navigation, Natural Earth for static figures. Nothing
implemented. The PMTiles integration cost is explicitly *not* established; the Natural
Earth path is cheap, public domain and nearly uncoupled.

[Experiment 49](49-catalog-in-the-interface.md) recorded a field-fatal defect: the
service worker caches same-origin requests only, so basemap tiles fetched from
`tile.openstreetmap.org` are never cached and the study-area editor stops working
offline. [Experiment 51](51-dataset-profiles.md) then measured that caching tiles for
a cross-border relevance extent is hopeless — 134,493 tiles through zoom 12 for DRC
and its neighbours, 245 GiB through zoom 15 as raster PNGs — and concluded that
regional layers must therefore be vector only.

That conclusion was too pessimistic, because it assumed the delivery model. A basemap
can be **one file**.

## What was measured, 2026-10-08

[PMTiles](https://docs.protomaps.com/guide/getting-started) is a single-file tile
archive addressed by HTTP range request, and Protomaps publishes
[daily planet basemap builds](https://docs.protomaps.com/basemaps/downloads) in it.
Reading the 127-byte header of the current build directly, rather than relying on
documentation:

| Property | Measured |
| --- | --- |
| File | `build.protomaps.com/20261008.pmtiles`, **138.7 GB** (129.2 GiB) |
| Spec | PMTiles version 3, clustered |
| Tile type | **MVT vector**, gzip-compressed |
| Zoom range | **0–15** |
| Bounds | whole planet, ±85.05° |
| Addressed tiles | 1,431,655,765 |
| Distinct tile contents | 136,266,273 |
| Range requests | `accept-ranges: bytes`, confirmed by a 127-byte range read |

Two of those numbers do the work. **Addressed tiles exceed distinct contents by 10.5
to one**, because empty ocean and repeated terrain deduplicate to the same bytes; and
the implied means are **97 bytes per addressed tile** against **1,018 bytes per
distinct tile**. Compare the 23 kB raster PNG assumed in experiment 51: a vector tile
is roughly 20× smaller, and sparse areas cost almost nothing at all.

### What that implies for a relevance extent

Applying those measured means to the tile counts from experiment 51, through zoom 15:

| Extent | Tile slots, z0–15 | Estimated extract | Raster equivalent |
| --- | --- | --- | --- |
| Old Naledi (20 × 18 km) | 496 | under 1 MB | 149 MB to z17 |
| DRC | 4.0 M | ~370 MB – 3.8 GB | — |
| DRC and nine neighbours | 11.4 M | **~1 – 11 GB** | 245 GiB |

**These are estimates and the range is wide on purpose.** The low figure applies the
planet-wide addressed-tile mean, which is dominated by ocean; the high figure applies
the distinct-content mean, which is dominated by dense cities. A ten-country extract
of low-urban-density interior Africa will fall nearer the low end, but *where* is not
something this calculation can tell you. An extract's real size is obtained by making
one, and a profile that quotes a size must quote a measured one.

The honest summary is still decisive: a cross-border basemap moves from **245 GiB and
8.6 million cross-origin requests** to **a single file of a few gigabytes** — and a
suburban one to **under a megabyte**, which is the difference between an item a
practitioner can complete before departure and one they cannot.

## Static maps want a different basemap, and a much simpler licence

A slippy vector archive answers interactive navigation. It is the wrong instrument for
the application's **static plot** output, which renders at a fixed scale and exports to
SVG: there is no zooming to serve, and a generalised vector context layer is both
smaller and more legible than tiles rendered at one zoom.

[Natural Earth](https://www.naturalearthdata.com/) is the openly available answer, and
it is **public domain** — no attribution obligation and, crucially, **no share-alike**,
unlike the ODbL that follows OpenStreetMap-derived data. That makes it the only
basemap class in this record that may simply be bundled.

Measured by HTTP header, 2026-10-08:

| Layer | Scale | Size |
| --- | --- | --- |
| `admin_0_countries` | 1:110m | **215 kB** |
| `admin_0_countries` | 1:50m | 800 kB |
| `admin_0_countries` | 1:10m | 4.9 MB |
| `admin_1_states_provinces` | 1:10m | 14.9 MB |
| `land` | 1:50m | 457 kB |
| `airports` | 1:10m | 291 kB |
| `ports` | 1:10m | 52 kB |
| `roads` | 1:10m | 9.1 MB |
| `NE1_50M_SR_W` shaded relief raster | 1:50m | 88.4 MB |

A continental static map therefore costs **a few hundred kilobytes**, which is small
enough to be a bundled asset rather than a preparation item at all. The shaded-relief
raster is the one exception and belongs on the provisionable list.

### Match the generalisation to the display scale

The three scales are not quality tiers, they are intended display scales, and using
the wrong one is the "resolution read as precision" error from
[experiment 51](51-dataset-profiles.md) in cartographic form. 1:110m coastlines are
displaced by kilometres and are correct for a world map and wrong for a city. 1:10m on
a continental figure is wasted bytes and false delicacy. A profile that names a static
context layer must name its scale.

### The rule that matters: context is not frame

Natural Earth boundaries must **never** serve as the geographic frame class. They are
cartographic context — deliberately generalised, with disputed boundaries rendered as a
cartographic choice — so joining data to them, computing areas from them, or reporting
results by them produces wrong answers that look professional. The frame class needs
authoritative units with codes: COD-AB or geoBoundaries, at a recorded vintage.

The same split applies to the pathway class. `ne_10m_airports` at 291 kB and
`ne_10m_ports` at 52 kB are an excellent regional *overview* and are a selection of
major facilities; they are not the border-crossing-level detail an outbreak response
needs. Cheap context and operational data are both legitimate, and substituting one for
the other is the failure.

Three roles, then, which should never be collapsed into one "basemap" item:

| Role | Source | Licence | Delivery |
| --- | --- | --- | --- |
| **Static context** | Natural Earth, at a stated scale | public domain | bundled, or one small file |
| **Interactive navigation** | PMTiles vector basemap | ODbL, attribution and share-alike | one archive per extent |
| **Analytical frame** | COD-AB, geoBoundaries, national sources | CC BY or per-country terms | per jurisdiction, with vintage |

## Why this fits what the project already decided

- **It is a provisionable item with a size.** Experiment 50 required exactly that of
  every checklist item, and a single file with a byte count satisfies it precisely,
  including the deferral case: it either finished or it did not.
- **A partial download is detectable.** The earlier worry about a tile set interrupted
  at 60 % reporting as cached becomes a file-length and digest comparison.
- **The licence permits redistribution**, unlike GADM. The basemap is built from
  OpenStreetMap, so it is **ODbL** — attribution required, share-alike on derived
  databases, which is the same obligation experiment 51 already flags for OSM-derived
  pathway data. It may therefore be carried, cached and even pack-distributed, with
  its attribution intact.
- **Integrity is checkable.** Protomaps publishes BLAKE3 hashes for daily builds; this
  project records SHA-256 digests, so a downloaded extract gets digested on arrival
  like every other provenance-bearing input.
- **It has a vintage, and the vintage expires.** Builds are retained for a week, plus
  weekly Monday builds for a month. A URL is therefore **not a durable reference**:
  the date and digest must be recorded, and the file kept, which is exactly the
  vintage discipline experiment 51 requires of every other class.

## What a basemap is for, and what it costs

The records so far treat a basemap as a provenance and storage problem. That is only
half of it. A basemap does cognitive work, and which basemap is right depends on what
the figure is for:

- **Orientation.** Recognising *where* this is, from features a reader already knows —
  a coastline, a main road, a river, a city name. Without it, a polygon with points in
  it is a diagram.
- **Context.** What else is there that the analysis did not include: the settlement
  just outside the study area, the road the facilities sit along, the river a catchment
  stops at.
- **Offloading.** A reader who can see the street layout does not have to hold it in
  working memory while interpreting the data layer. That is a real reduction in
  cognitive load, and it is why a well-chosen basemap makes a figure readable at a
  glance that would otherwise need a caption.

The cost is that **context competes with data for attention**, and the competition is
not symmetric: basemaps are dense, so detail tends to win unless it is deliberately
suppressed. Three specific costs, each of which argues for a different choice:

1. **Figure–ground collapse.** Point symbols lose salience against a busy basemap. The
   cartographic answer is a muted, low-contrast context layer — which is a *rendering
   choice*, available with a vector basemap and not available with somebody else's
   pre-rendered raster tiles.
2. **Borrowed precision.** A crisp basemap at zoom 17 implies the data is locatable to
   the same degree. It is the same error as reading a raster's resolution as precision
   ([experiment 51](51-dataset-profiles.md)), arriving through the background instead of
   the foreground.
3. **Measured contrast does not survive it.** [Experiment 46](46-colour-theme.md)
   established WCAG contrast for every rendered text element against known panel
   colours. A photographic or shaded-relief basemap replaces that known background with
   an arbitrary one, and the guarantee lapses: a symbol legible over pale terrain is
   illegible over dark. Contrast over a variable background cannot be asserted, only
   constrained — by muting the basemap, or by halo and casing on symbols.

So purpose selects the basemap, and the three roles from the table above are not ranked:

| Purpose of the figure | Wants | Tolerates |
| --- | --- | --- |
| Fieldwork navigation | streets, landmarks, labels, high zoom | clutter, since the reader is locating themselves |
| Analytical display | minimal muted context, strong figure–ground | losing recognisable detail |
| Publication or communication | a few recognisable anchors, attribution, fixed scale | less interactivity |

This has a provenance consequence rather than only an aesthetic one: **the purpose a
basemap was chosen for should be recorded with the choice**, because it is what makes
the choice reviewable. "Drawn over muted vector context at 1:50m for analytical
display" is auditable; "basemap: osm" is not.

It also makes the cognitive claim a developmental-evaluation question rather than an
assertion. Whether a basemap reduces load, and which one, is observable and should not
be assumed:

| Observation | Would disconfirm |
| --- | --- |
| Do readers orient faster with a context layer than without one? | That the basemap earns its bytes |
| Do readers attribute features to the analysis that came from the basemap? | That context can be added without borrowing precision |
| Are symbols still legible over the chosen basemap at the sizes used? | That muting is sufficient, rather than needing halos |
| Does anyone choose high-detail navigation context for an analytical figure? | That purpose is legible in the interface |

## Does a basemap need a widget? No, and the reason generalises

The question is worth answering architecturally rather than by taste, because the same
question will arrive for fonts, vocabularies, pack files and anything else large and
shared.

**What exists already.** A basemap is a parameter of the Map output — `basemap` is one
of `none`, `osm` or `topo` — and it is already recorded in provenance: the map
specification receipt asserts `fw:mapBasemap` alongside the title, legend and
presentation mode. The display choice therefore has a home, and adopting PMTiles or
Natural Earth extends an enumeration rather than needing a node.

**Why a widget would be wrong.** Three tests, each of which a basemap fails:

1. **Does anything downstream consume its value?** No. A basemap node would need a new
   `basemap` port type that exactly one node accepts, in a closed union. A node that can
   only ever connect to one other node is a parameter wearing a node costume.
2. **Is it scoped to the workflow or to the device?** To the device. A cached archive is
   shared across every project, persists independently of all of them, and is measured
   in gigabytes. Widgets are workflow-scoped: they appear on the canvas, travel in an
   exported workflow and are replayed from a run receipt. A workflow carrying a
   "basemap" node would imply the archive travels with the export, and it cannot.
3. **Does it change what the result means, or only how it looks?** Only how it looks. A
   basemap is presentation context; nothing in the inference depends on it.

**Why `raster_input` is not a counter-example.** That widget also acquires a file, and
it *is* a widget, correctly: its output is consumed analytically by Clip raster and by
the Map's raster mode. Its values enter the inference, so they need a port, a digest and
a place in the execution order. A basemap's values never do. The distinction is
consumption, not file size.

**Where each part belongs, then:**

| Concern | Scope | Home |
| --- | --- | --- |
| Which basemap this figure displays, at which scale | workflow | a Map output parameter, asserted as `fw:mapBasemap` |
| Which archives are cached on this device, at what size and vintage | device | the preparation surface of [experiment 49](49-catalog-in-the-interface.md) |
| What a given run was displayed against | workflow | the map specification receipt, extended to name the basemap's build date and digest |

That last row is the only genuinely new work, and it is small: a receipt that says *this
figure was drawn over Natural Earth 1:50m*, or *over a PMTiles archive of build
20261008, digest abc…*, lets a reader reconstruct the figure without the workflow
pretending to contain 3 GB.

> That row turns out to be the point rather than a detail, and
> [experiment 53](53-reproducible-maps.md) audits it: a figure drawn over a live tile
> service cannot be redrawn even in principle, because unversioned tiles change
> upstream. **Reproducibility, not offline convenience, is the strongest argument for a
> digest-pinned archive.**

**The case that would change the answer.** If a coastline or boundary is used
*analytically* — clipped against, measured, joined to — then it is not a basemap at all.
It is a frame input, it needs a source with authoritative codes and a recorded vintage,
and it goes through the existing input widgets. Keeping basemaps out of the canvas is
what makes that distinction structural rather than advisory: there is no basemap node to
mistakenly connect to an analysis, which is the context-is-not-frame rule enforced by
the architecture instead of by a warning.

## What is not established, and must be measured before any of this is built

1. **Bundle cost.** The application renders basemaps with Leaflet raster tiles today.
   MVT needs either MapLibre GL JS, which is WebGL and substantially larger, or
   `protomaps-leaflet`, which draws vector tiles to Canvas inside the existing map.
   The budget is about 3.8 MB and is already committed; neither option's real cost is
   known here, and the cheaper-looking one may not render what the current tests
   assert.
2. **Browser storage for a multi-gigabyte file.** A regional extract is not an asset
   the service worker can precache from the manifest — it is user-acquired data, so it
   belongs in the Origin Private File System or IndexedDB, under a quota that varies by
   browser and device and may require `navigator.storage.persist()`. Whether a 3 GB
   file survives on the devices practitioners actually carry is an empirical question
   and the single biggest risk in this record.
3. **Who makes the extract.** `pmtiles extract` reads a bbox subset from a remote
   archive over range requests without re-tiling, which means the practitioner can cut
   their own region during the preparation phase and the project never hosts 138 GB.
   That is the right division, but it puts a command-line step in a browser-first
   workflow — and the alternative, a hosted extract service, is infrastructure this
   project does not have.

Also unaddressed: OpenTopoMap, the application's terrain option, has no PMTiles
equivalent here, so adopting this would make the two basemap choices unequal in
offline capability. That must be stated in the interface rather than discovered.

Natural Earth, by contrast, has no unresolved question of this kind: it is public
domain, measured in hundreds of kilobytes for the scales a static figure needs, and
needs no new renderer, since the application already draws polygon geometry to SVG.
It is the cheapest honest improvement in this record and the one least coupled to
anything else.

## Competency questions

Answerable, if this is adopted:

1. Which basemap extent is cached on this device, at which zoom range, from which
   build date and digest?
2. Is the cached archive complete?
3. What attribution and licence obligations does the cached basemap carry?
4. Which context layer and scale does this static figure use?

Must be refused:

5. Is this basemap current? — a build has a date; currency is a judgment about the
   activity, not a property of the file.
7. May I report results by these boundaries? — not for a context layer, whatever it
   looks like on screen.
6. Does this basemap cover my study area adequately? — coverage of an extent is not
   fitness for a purpose, and zoom 15 is not the same as surveyed detail.

## Correction to experiment 51

The prescription there — vector layers at regional scale, raster tiles only for
operational sub-areas — should be read as **a single PMTiles archive for the relevance
extent, plus the project's own vector overlays**, with the archive's size measured per
region rather than estimated from these means. The conclusion that *rendering*
regional raster tiles from a public tile server is infeasible stands; the conclusion
that a cached basemap is therefore impossible does not.
