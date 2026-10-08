# 53 · Reproducible maps and mapping workflows

**Status:** audit with findings, and a proposed gate. The audit is of shipped code; the
additions are specified and unbuilt.

This is the purpose the last four records were circling. A mapping workflow is
reproducible when someone else, given what the application exported, can redraw the
same figure and reach the same conclusions — and can tell, when they cannot, exactly
which input differed. Everything about basemap caching, dataset profiles and vintages
is downstream of that.

So this record audits what a Fieldwork figure actually carries, against what redrawing
it would require.

## Three claims, which are not the same claim

| Level | Claim | Status |
| --- | --- | --- |
| **Semantic** | The same inputs yield the same facts, rules and conclusions | Substantially held: per-node widget identity, catalog version and release digest, the configuration JSON, source file digests, the reasoner and its version |
| **Cartographic** | The same inputs yield the same figure | **Partially held, and broken by one choice** |
| **Bit-identical** | The same inputs yield the same bytes | Not claimed anywhere, and currently untested |

The project's semantic provenance is strong because it was built deliberately. The
cartographic layer was not built as provenance at all, and the gap shows.

## Audit: what a figure records, and what it does not

Recorded today. The map specification receipt
([`src/map-communication.ts`](../../src/map-communication.ts)) asserts
`fw:MapSpecification` with the title, description, legend flag, presentation mode,
source note, basemap and the outputs it was derived from. Each node additionally
carries `fw:widget`, `fw:catalogVersion`, `fw:catalogDigest` and its configuration.

Not recorded, in descending order of how much it matters:

| Missing | Consequence | Where it belongs |
| --- | --- | --- |
| **The application version or commit** | Every digest in a receipt is of an *input*. Nothing identifies the *producer*. A figure cannot be attributed to a renderer, and a difference cannot be localised to a code change | the run receipt, beside `engine` |
| **Basemap identity beyond an enum** | `basemap: "osm"` names a live tile service whose tiles are unversioned and change daily. See below | the map specification |
| **The display projection** | A static plot writes longitude and latitude into a viewBox. Deterministic, but a reader cannot know whether to treat the axes as plate carrée | the map specification |
| **That the figure is theme-independent** | [Experiment 46](46-colour-theme.md) guarantees exported artifacts stay light whatever theme is shown, but the receipt does not say so, so a reader must take it on faith | the map specification |
| **The rendered extent** | Fitted deterministically to the polygon and located points, so it is reproducible — but stating it would let a reader *verify* the fit instead of trusting it | the map specification |
| **The font** | The SVG names `Arial, sans-serif` and embeds nothing, so text metrics vary by device and labels may shift or collide | stated as a known limit; embedding is a separate decision |

## The finding: a live tile basemap is irreproducible by construction

This is the one that changes a decision rather than adding a field. A figure drawn over
`tile.openstreetmap.org` cannot be redrawn, even in principle, even by the same person
on the same machine an hour later: the tiles are not versioned, carry no digest, and are
replaced continuously upstream. The receipt records the string `osm`, which identifies a
service, not a map.

So **reproducibility, not offline convenience, is the strongest argument for the
approach measured in [experiment 52](52-cacheable-basemaps.md)**. A PMTiles archive has
a build date and a digest; Natural Earth has a release version and is public domain. Both
can be named in a receipt such that a reader can obtain the same basemap. A live tile
server cannot be, and no amount of caching fixes that — caching makes it *available*
again, not *identified*.

This reverses the framing of experiment 52's own correction. The measurements there
answer "can we work offline"; the reason to adopt the format is that it is the only way a
map figure becomes citable.

## The minimal additions

1. **Producer identity in the run receipt**: application version and, where available,
   the build commit. One assertion, and the highest value per byte in this record.
2. **Basemap identity in the map specification**: source, scale or zoom range, build
   date or release, digest, and licence — replacing a three-value enum with a
   description of an artifact.
3. **Display projection, extent and theme-independence**, asserted rather than implied.
   Alongside these, **the purpose the basemap was chosen for** — navigation, analytical
   display or publication — because a basemap does cognitive work and the choice is only
   reviewable if its intent is recorded ([experiment 52](52-cacheable-basemaps.md)).
4. **A stated limit on fonts**, since the SVG is not self-contained and pretending
   otherwise would be worse than naming it.

All four need vocabulary terms, which means they go through
[the semantic audit](../ontology-audit.md) before being declared — the same discipline
`fw:DataTable` went through in [experiment 48](48-tabular-input.md), including a
disjointness question worth asking early: a basemap is not a dataset the workflow used
as evidence, and the vocabulary should make that hard to confuse.

## The gate this makes possible

Reproducibility claimed in prose is an aspiration. This project's habit is to make such
claims executable, and here that is unusually cheap:

- **Re-render determinism**: run the same workflow twice in one session and compare the
  exported SVG byte for byte. Any difference is a nondeterminism bug — a timestamp, a
  map iteration order, a floating-point path.
- **Receipt round-trip**: export a run receipt, re-import it, re-render, and compare to
  the original artifact. This is the real claim, because it exercises the path an
  outside reader would take.

What such a gate would establish: that the figure is a deterministic function of the
recorded inputs and this application version. What it would **not** establish: that it
renders identically on another device, since font metrics differ; that the basemap is
obtainable, which is a licence and hosting question; or that the map is a good map.

A pixel comparison would be the weaker form of the same check, and the theme work
already showed how to run one and how easy it is to run it wrongly — the method there
produced 5.35 % spurious difference until the stylesheet build was fixed.

## Competency questions

Answerable, if the additions are made:

1. Which application version produced this figure?
2. Which basemap, at which scale or zoom range, build date and digest?
3. What projection and extent were drawn, and were any theme colours involved?
4. Given this receipt, can the figure be redrawn and does it match?

Must be refused:

5. Will this figure look identical on any device? — no: fonts are named, not embedded.
6. Is this map correct? — reproducibility is not validity. A faithfully reproduced
   figure can be wrong in every substantive way, and nothing here speaks to projection
   choice, classification, or whether the data should have been mapped at all.
7. Is the basemap still available? — a digest identifies; it does not host.
8. Does more context make a better map? — no. Context competes with data for attention,
   and the measured contrast guarantees of experiment 46 lapse over an arbitrary
   background.

## Practitioner exercise

Take an exported SVG and its run receipt from any worked example, and try to redraw the
figure from those two artifacts alone. Write down everything you had to guess. That list
is this record's audit, independently derived, and it should get shorter each time the
exercise is repeated.
