# 127 · A worked example can live in a repository

_Created 2026-10-20 · Updated 2026-10-20_

**Status:** asked. Nothing is built. The mechanism this proposes is permitted by the rules already
written, the space it would save is measured below, and the example that motivated it fills a gap
[experiment 51](51-dataset-profiles.md) measured the same day.

## What was asked

The practitioner, 2026-10-20, on reading that no worked example instantiates the denominator class:

> *"We also have the potential to set up a downloadable worked example from a repo - the water
> provider study by John Snow in South London."*

and then the architectural half:

> *"So worked examples do not have to occupy space in the downloaded app, we can set them up as
> repos read from a curated manifest."*

## Measured: what the examples cost the download

The offline payload is the service worker's precache list, which is what a practitioner carries
into the field. Measured 2026-10-20 on the built tree:

| | |
| --- | --- |
| Precached assets | 247 files, **11.25 MB** |
| Example files precached by name | **0.89 MB** |
| Largest single one | `examples/john-snow/soho.graphml`, **640 KB** — 72% of that figure |
| Next | `examples/john-snow/network.json`, 225 KB |
| Compiled into the bundle instead | Hagelloch's 63 KB case list is inside `build/app.js`, which is 317 KB in total; Manila's facilities are a 72 KB chunk; Old Naledi's data is a 43 KB module |
| Vendored, digested, and in no build output at all | `examples/snow-gboh/deaths_nd_by_house.csv`, 236 KB |

So of an 11.25 MB download, roughly **1.0 MB is worked-example data**, about 9%, and it grows with
every example. That is not yet painful. What makes the question worth answering now is the shape of
the growth: experiment 51 found the one archetype with no instance is the cross-border outbreak
response, and an example for it carries ten countries' boundaries, population rasters, airports and
route geometry. That is tens of megabytes, and it would be carried by every practitioner who never
opens it.

The last row is its own small finding. A 236 KB dataset was retrieved, digested, licence-analysed
and given a NOTICE on 2026-10-09, and no example key uses it: the repository already pays to hold
example data that the application does not ship. Vendoring and using are separate acts, and the
ledger does not currently notice when only the first has happened.

## The rule permits this, and that was written down before the question was asked

`widgets/packs.json` declares `runtimeFetching: "none"`, and `src/pack-catalog.ts` asserts it
positively in every receipt, so the first reading is that an example fetched from a repository is
forbidden. It is not, and the distinction is already recorded twice.

[Experiment 49](49-catalog-in-the-interface.md), stating the constraint it had to design around:

> *preparation may download resources, never widget definitions. Caching a pack's documents and
> admitting its widgets are different acts, and conflating them is the one mistake a preparation
> view could make that governance could not recover from.*

And [experiment 43](43-widget-packs.md), correcting itself on 2026-10-09, records that the same rule
was once misread as *no pack is ever installed* — a conflation [experiment 59](59-pattern-for-engineered-knowledge.md)
lists among what the exercise cost.

A worked example is a **resource**: a workflow document, data files, and a provenance record. It
declares no node type, so it adds no execution surface and the compiled-in `TYPES` table is
untouched. The rule that forbids fetching a definition does not reach it. No admission rule has to
change for this, which is the opposite of what the first reading suggests and is worth saying
plainly before anyone proposes amending one.

Three things do change, and each has an existing answer in this repository:

1. **Integrity.** `widgets/packs.json` already pins per-file SHA-256 digests and the catalog is the
   trust root. An example manifest is the same structure; the verification moves into the browser,
   where SubtleCrypto computes the digest and a mismatch is a refusal, not a warning.
2. **Offline readiness.** An example that is not downloaded is not available in the field, which is
   the subject experiment 49 already opened: *"a governance or readiness fact that exists and is not
   legible"*. The interface has to distinguish **available now** from **fetchable**, per example,
   and an example opened once has to stay available after that — cached on first open, like the
   OSM responses already are.
3. **Disclosure.** Opening an example would tell a server that it was opened. This application
   already has exactly one pattern for that, used by basemaps and by Overpass: an explicit
   practitioner action, named in the interface, with a note in the receipt. A manifest fetched on
   load, before anybody asked for an example, would not meet it.

And the workflow document must go through `validateWorkflow` on arrival, which is the path the
import button and the encrypted package already take. A fetched example is an imported workflow with
a different provenance, not a new kind of thing.

## The example that motivated it: Snow's South London water supply study

This is the natural experiment rather than the Soho map: mortality in the sub-districts of south
London supplied by the Southwark & Vauxhall company, whose intake was below the sewage outfalls,
against those supplied by the Lambeth company, which had moved its intake upstream in 1852.

It would be the first worked example in this project to carry a **denominator**. Measured against
`widgets/evidence.json` the same day: `rate` has **zero** example uses, as do `coverage_check` and
`sample_raster`. The `rate` widget was nevertheless built for this data — `src/rate.ts` declares
`DENOMINATOR_UNITS` of people, houses, households and person-time, separates a proportion from a
ratio, and **refuses to compute at all** unless `numeratorPeriod` and `denominatorVintage` are
stated, reporting whether they agree. Its own comment says *"Both appear in John Snow's data and
conflating them is easy."* So the widget, the refusals and the vintage triple exist, and the data
that would exercise them does not.

What the archetype table in experiment 51 would gain: an **exposure or hazard assessment** instance
whose hazard is a water supply, with a 1851 census denominator, an 1854 numerator, and a registration
sub-district frame — the first instance of the triple this project requires to be stated.

### What it must refuse, which is the teaching value

- **The ecological fallacy.** A sub-district rate is not a person's risk, and the two companies'
  pipes were intermixed house by house along the same streets — which is Snow's own argument for
  why the sub-district aggregate understates the contrast. An example that computes the aggregate
  and does not say this teaches the wrong lesson well.
- **Confounding by what the sub-districts also differ in.** Elevation, poor rate and house valuation
  vary with water company, and Snow's contemporaries used exactly those to argue for miasma.
- **A rate per house is not a rate per person.** The same refusal `examples/snow-gboh/provenance.json`
  already records for the Soho house data, in the same words the `rate` widget's units enforce.

### What has to be checked before any of it is built

Not yet verified, and not verifiable from here — this environment has no network, which is also why
`validate:packs` reports `fetch failed`:

- **The tabular data and its terms.** The study's table is published in the R package `HistData` as
  `Cholera` (recalled, unverified): London registration sub-districts with water supply company,
  1851 population, houses, 1849 and 1854 cholera deaths, elevation and poor rate. `HistData` is
  GPL-licensed, which is the same situation as the GeoDa Soho data this repository already
  redistributes verbatim under a NOTICE — so the licence pattern is settled, but the file, its
  columns and its digest have to be read rather than assumed.
- **Whether the already-pinned download holds it.** `examples/snow-gboh/provenance.json` pins
  `snow.zip` at a known digest and its documentation describes **8 datasets**, of which this
  repository extracted 2. If the sub-district table is among them, the licence analysis and the
  NOTICE are already done. This is the cheapest thing to check first and it has not been checked.
- **The geographic frame.** 1851 registration sub-district boundaries are the piece most likely to
  be unavailable under redistributable terms; historical-GIS sources for Victorian London are
  frequently non-commercial, which is the GADM problem experiment 51 already records. If no open
  frame exists, the example is a table-and-rate workflow with no map, which is a decision for the
  practitioner rather than a defect — and it would still be the only example that divides by a
  population.

## What would close it

Two things, independently:

1. A curated example manifest with per-file digests, browser-side verification, a per-example
   readiness state in the interface, an explicit fetch action, and a receipt that names the manifest
   version and the digest the files matched — demonstrated by moving **one** existing example out of
   the bundle and measuring the download before and after.
2. The South London example built from sources whose terms have been read, with its vintage triple
   stated, its ecological refusal in the receipt rather than only in prose, and `rate` exercised on
   a real denominator for the first time.

Either one closes half of this. The first without the second leaves the mechanism unexercised by
the case that motivated it; the second without the first adds to the download the record argues
against.

## What this does not establish

- **That 1.0 MB of 11.25 MB is worth an architecture.** It is 9%, measured once, on one build. The
  argument rests on the growth curve of examples not yet written, which is a prediction.
- **That fetching is cheaper in the field than carrying.** A practitioner who cannot reach a network
  is better served by an example already on the device. This record moves a cost; it does not remove
  one, and which direction that trade runs depends on field conditions nobody here has observed.
- **That the South London data is open.** Nothing above was fetched. The licence of every candidate
  is recalled or inferred, and experiment 51's own table shows how often that assumption has been
  wrong — Hagelloch's chain states no terms at all.
- **That the archetype would then be earned.** Experiment 51 requires two independent worked
  examples. One South London example makes the hazard archetype's second instance alongside Manila,
  and leaves coverage assessment, facility audit and the cross-border response with none.
