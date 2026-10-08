# 51 · What the problem predicts: dataset profiles

**Status:** design record, nothing implemented. Proposes a declaration, not a
download: a profile names the **class** of dataset a problem requires and the
sources that may legally be offered, and refuses to pretend it knows which file is
right for a given place.

[Experiment 50](50-preparation-checklist.md) left two unknowns: the checklist's form
and its content. This record closes most of the second one, from two predictors that
are both available at project creation — the **problem type** and the **study area**.

The claim it rests on is that **data requirements are predictable**. The datasets a
public health field activity needs are not open-ended: census or survey denominators,
population rasters, jurisdiction boundaries and health facility registries recur across
almost every activity, and the problem being addressed predicts which of them matter,
how far relevance extends, and what the result must refuse to claim. Predictability is
what makes a profile worth publishing at all — an unpredictable requirement list could
only ever be a blank page with a prompt.

Where the record was wrong, it was wrong about *extent* rather than about
predictability: an Ebola response needs its neighbours' boundaries, populations and
mobility networks, which the study area does not contain but the archetype does
predict. That correction is below, and it strengthens the claim rather than weakening
it.

## Two predictors, and neither works alone

The problem type is one predictor. The study area is the other, and they predict
different things — which is why experiment 50's finding and this one are not rivals:

| Predictor | Known at | Predicts |
| --- | --- | --- |
| **Problem type** | project creation, from the question being asked | which *classes* of dataset are required, which refusals apply, and which vintages must agree |
| **Study area** | project creation, as step 1 already | the *jurisdiction*, and therefore which sources exist and under what licence; the *extent*, and therefore how much there is to download; the administrative level results can be reported at |

Composed, they produce something a practitioner can act on: a list that is sized,
sourced, jurisdiction-correct and carrying its own refusals. Separately, each is
unusable in a characteristic way.

- **Problem type alone** gives classes with no sources and no sizes: "you need a
  denominator" is true everywhere and actionable nowhere.
- **Study area alone** gives bytes with no relevance: 6,630 tiles for Old Naledi,
  without any idea whether this activity needs a facility registry or a hazard
  surface.

The jurisdictional half is the part that is easy to miss. The study area does not only
set the size of a download; it determines **which sources are admissible at all**,
because licence and authority are national. A Philippine activity meets PSGC codes and
PSA terms; a Botswana one does not. So the useful unit is the pair:

> *class* (from the problem) × *jurisdiction* (from the area) → candidate sources, with
> their licences and the vintage that must be recorded.

That pairing is also what makes a profile publishable. A class alone cannot carry a
licence, and a jurisdiction alone cannot carry a refusal.

## Correction: the relevance extent is not the study area

The section above says the study area predicts the extent. For some problems it does
not, and the counter-example is decisive. An Ebola response in DRC needs boundaries and
populations for the **neighbouring countries**, and it needs the means by which people
move: airports and air routes, ferry and river routes, land routes, and official and
informal border crossings. None of that is inside the study area, and all of it is
predictable from the problem type.

So the composition is one step longer than first recorded:

> *problem type* → the classes required, **and the rule for how far relevance extends**
> *study area* → the origin that rule is applied from
> together → a bounded, sized, jurisdiction-aware list

The extent rule is itself a property of the archetype. A coverage assessment's
relevance stops at the frame it reports on. An outbreak response with cross-border risk
extends to every adjacent jurisdiction and to the mobility network that connects them,
because importation and exportation are the questions being asked. A profile that
cannot express "and the neighbours" cannot express this archetype at all.

### A fifth class: pathway

Four classes were not enough. Mobility is a distinct role in the inference — not a
denominator, a frame, a service or a hazard, but the **pathway** along which exposure
travels:

| Class | Role | Typical form | What goes wrong |
| --- | --- | --- | --- |
| **Pathway** | How people, and therefore exposure, move between places | airports and air routes, ferry and river routes, roads, border crossings and points of entry | A mapped route is read as an actual flow; informal crossings are absent precisely where they matter; capacity data is proprietary, so openly available networks understate movement |

The characteristic error here is worth stating plainly because it is seductive: **a
route is not a flow, and connectivity is not importation risk**. A map of roads and
airports shows what is possible, not what happens, and volume data — the thing that
would turn possibility into estimate — is largely commercial.

### Crossing a border multiplies everything the profile tracks

A multi-country relevance extent is not the same work at larger scale. Three things
change in kind:

1. **There is no shared administrative key.** The PSGC lesson from
   [experiment 47](47-sea-level-pack.md) was that a name-keyed join matches the wrong
   polygon silently. Across borders there is no equivalent code at all: each country
   numbers its own units. Harmonisation becomes an explicit step with its own error
   mode, and a cross-border aggregate built without one is not approximate but wrong.
2. **Vintages and licences multiply per country.** Ten countries means ten boundary
   vintages, ten census years and potentially ten sets of terms. The vintage triple
   this record requires becomes a triple *per jurisdiction*, and a single stated
   "2020" across a region is almost certainly false.
3. **Openly licensed sources thin out exactly here.** Global sources carry the frame
   and the denominator — geoBoundaries and WorldPop are both CC BY 4.0 and global.
   Pathway data does not follow: airport locations are published as public domain by
   OurAirports, roads, ferries and crossings come from OpenStreetMap under
   share-alike ODbL, and **scheduled air traffic volumes are commercial** (OAG, IATA).
   Points-of-entry and displacement-flow datasets from WHO and IOM vary in terms per
   release. So a profile for this archetype must say, in the open, which of its
   requirements cannot be met with redistributable data.

### Measured: at this extent, tiles stop being an option

Experiment 50 established that a preparation item must carry a size, and measured a
suburb. The same calculation at a cross-border extent, at roughly 23 kB per tile:

| Extent | Through zoom 10 | Through zoom 12 | Zoom 15 alone |
| --- | --- | --- | --- |
| Old Naledi (20 × 18 km) | 1 tile | 9 tiles, 0.2 MB | 342 tiles, 7.7 MB |
| DRC | 3,080 tiles, 69 MB | 47,523 tiles, 1.0 GB | 3.0 M tiles, 66 GB |
| DRC and nine neighbours | 8,544 tiles, 192 MB | 134,493 tiles, 3.0 GB | 8.6 M tiles, 188 GB |

Cumulatively, the regional extent is about 0.3 GB through zoom 10 and 4.0 GB through
zoom 12. That settles a design question rather than merely illustrating one: **raster
basemap caching does not scale to a relevance extent of this kind**, and a checklist
that offers it as an item is offering something nobody can complete in the field.

What follows is a change to what the profile prescribes, not just to the numbers it
displays. At regional scale the cached layers must be **vector** — boundaries,
settlement points, facilities, airports, crossings, route geometry — which are
kilobytes to a few megabytes per country, with raster tiles cached only for the
*operational* sub-areas where work actually happens, at the depth those areas need.
The practitioner's deferral decision therefore changes shape too: not "how deep" but
"which jurisdictions as vector, and which operational areas as tiles".

> **Revised by [experiment 52](52-cacheable-basemaps.md).** The numbers above assume
> raster PNG tiles fetched per request. A vector basemap delivered as a single PMTiles
> archive measures roughly 20× smaller per tile and deduplicates empty area, which puts
> the same ten-country extent in the range of a few gigabytes as **one file** rather
> than 245 GiB as 8.6 million requests. The prescription stands with the delivery
> changed: one archive for the relevance extent, plus this project's vector overlays.

## Four recurring classes, named by the role they play

The useful unit is not the file but the **role it plays in an inference**, because the
role is what licenses a claim. The same population raster is a denominator in one
workflow and an exposure count in another, and the two are not interchangeable.

| Class | Role in the inference | Typical form | What goes wrong |
| --- | --- | --- | --- |
| **Denominator** | The population a rate is divided by | census or survey table, projected estimates | Vintage mismatch; projected figures used as enumerated; the denominator's geography differs from the numerator's |
| **Geographic frame** | The units results are reported and joined by | jurisdiction boundaries, admin levels | Renumbered or reclassified units; name-keyed joins; a frame that does not match the denominator's vintage |
| **Service supply** | What exists to deliver care | facility registry, service availability | Listed but non-functional; stale closures; coordinates at the district office rather than the facility |
| **Hazard or exposure** | The thing populations are exposed to | population raster, flood or heat surface, projections | Resolution read as precision; a modelled surface treated as an observation |

A profile that names classes rather than files survives moving between countries,
which a list of filenames does not. A fifth class, **pathway**, is introduced above,
because the problem that needed it also broke the assumption that the study area bounds
the data.

## Archetypes, and what each one distinctively refuses

Problem types recur too. Each implies a profile, and — more usefully — each has a
characteristic overclaim that the profile should carry as a refusal:

| Archetype | Classes required | Must refuse |
| --- | --- | --- |
| Coverage assessment | denominator, frame, service supply | That an uncovered area is an unserved population; coverage of a frame is not coverage of people |
| Access or catchment analysis | frame, service supply, (network) | That proximity is access; a straight-line or network proxy is not care received |
| Exposure or hazard assessment | hazard, denominator, frame | That exposure is impact; an exposed count is not a case count |
| Outbreak or cluster investigation | denominator, frame, case data | That a cluster is a cause, and that absence of reports is absence of cases |
| Outbreak response with cross-border risk | denominator, frame, pathway, service supply — **for the affected area and every adjacent jurisdiction** | That a route is a flow, and that connectivity is importation risk; open network data also understates informal movement |
| Facility audit | service supply, (frame) | That a registry entry is a functioning service |

The refusal column is the part worth building. It is already how this project's
vocabulary works — [experiment 44](44-ontology-competency-questions.md) records the
questions the ontology must decline, and the sea-level pack carries its inundation
refusal in the vocabulary rather than only in prose. An archetype profile is the same
instrument applied one level earlier, before any data is loaded.

## The agreement a profile must force

The most common serious error in this family is not a missing dataset; it is three
present datasets that do not agree about time or geography. A rate is wrong — not
approximate, wrong — when the denominator's year, the boundary vintage and the
numerator's period are not aligned, and nothing in the output looks unusual.

So a profile should require the **triple to be stated**, not inferred: denominator
year, frame vintage, numerator period. This is the same lesson as the PSGC key in
[experiment 47](47-sea-level-pack.md), generalised: an identifier or a vintage that is
not recorded will be assumed, and the assumption produces a plausible answer.

## Sources may be named only with their licence

The profile may list candidate sources, and the licence column is not optional — the
GADM finding in experiment 47 generalises to every class. What may be *bundled or
redistributed* by a pack is a much narrower set than what a practitioner may *use
locally*:

| Class | Redistributable candidates | Licence | Not redistributable |
| --- | --- | --- | --- |
| Geographic frame | geoBoundaries; OCHA COD-AB via HDX | CC BY 4.0; open, NSO-derived | GADM (non-commercial, redistribution prohibited) |
| Hazard / denominator raster | WorldPop | CC BY 4.0 | — |
| Service supply | OpenStreetMap | **ODbL 1.0 — share-alike**, which propagates obligations a CC BY pipeline does not have | national registries, terms vary |
| Denominator | national statistical office tables | **varies by country and must be checked per source** | — |

Two cautions that belong in the profile rather than in a reviewer's memory. ODbL is
share-alike, so OSM-derived facility data carries obligations onto derived databases
that CC BY sources do not; mixing it into a bundle is a licensing decision, not a
convenience. And national census terms vary enough that "census data" can never be
offered as a ready source — only as a named requirement the practitioner satisfies.

## What a profile cannot know, and must say so

- Whether a listed facility is functioning, which is the thing the analysis usually
  depends on.
- Whether the frame matches local administrative reality, which changes faster than
  published boundaries.
- The sampling frame, consent basis, or whether the activity is permitted at all.
- Which source is *appropriate* here. A profile narrows a search; it does not make a
  choice, and a profile that silently picks a default would be worse than none,
  because the default would travel further than the reasoning behind it.

## How profiles earn their content: worked examples as the corpus

Profiles should not be invented. They should be **extracted**, and the material to
extract them from is the worked examples, which accumulate. Each completed example is
a filled-in profile in retrospect: it used particular classes, at particular
vintages, under particular licences, and it needed particular things cached before it
could run offline. Seven examples exist today; the sea-level pack adds an eighth whose
profile is already written down in [experiment 47](47-sea-level-pack.md).

The mechanism is cheap because the slot exists. `examples/*/provenance.json` already
records repository, commit, per-file digests and notes. Adding the profile fields —
classes used, the vintage triple, the licence of each source, and what had to be
cached — makes every new worked example contribute to the checklist by construction
rather than by anyone remembering to. A reasonable rule, in the spirit of the
project's other gates: **an archetype earns its place in the taxonomy when two
independent worked examples instantiate it**, and until then it is a proposal.

Two biases in that corpus have to be stated, because a checklist distilled from it
inherits both:

1. **Geographic and topical narrowness.** The examples are Gaborone, 1854 Soho,
   synthetic neighbourhoods, and now the Philippine coast. A profile set distilled
   from them will encode what those activities needed, which is not what field
   public health needs in general. The disconfirming observation for this is already
   recorded below: do practitioners recognise their problem in an archetype, or
   describe it as none of these?
2. **Survivor bias, which is the sharper one.** A worked example is a *successful,
   retrospective* account. It records what the activity required; it does not record
   what was forgotten, what arrived corrupted, or what could not be downloaded in
   time. So the corpus can supply **requirements** and cannot supply **failure
   modes** — and failure modes are precisely what a preparation checklist exists to
   prevent. That content has to come from observed use, which is why experiment 50's
   paper comparison is not optional and cannot be replaced by more examples.

One consequence for sequencing: because the profiles will change as examples
accumulate, a profile set needs a **version**, and a project prepared against one
version must not silently acquire a later one. Improving the checklist must not
retroactively tell someone their completed preparation was wrong.

## Why this is pack-shaped, and a cheap test

A profile is a declaration with no executable code: classes, archetypes, refusals,
candidate sources with licences, and the vintage triple. That is exactly the shape of
a declaration-only widget pack ([experiment 43](43-widget-packs.md)), and it would be
a **useful second pack precisely because it is boring** — no new port, no new
execution surface, so it exercises the catalog, the digests, the namespace rules and
the three reviews without the host needing anything new.

It would also test something the sea-level pack cannot: whether the governance
machinery is usable by someone adding a pack that is purely vocabulary. One pack is a
feature; two is a process.

## Competency questions

Answerable, if profiles exist:

1. Given this problem type, which classes of dataset does the activity require?
2. For this class and this country, which sources may be redistributed, and under
   what licence?
3. Do the denominator year, frame vintage and numerator period agree?
4. What does this archetype characteristically overclaim?
5. Which worked examples instantiate this archetype, and at which profile version?
6. How far does relevance extend for this archetype, and which jurisdictions does that
   include from this study area?
7. Which requirements of this profile cannot be met with redistributable data?

Must be refused:

8. Which dataset should I use here? — a profile narrows; the practitioner chooses, and
   records why.
9. Is this dataset current for this place? — nothing in the application can know.
10. Are these classes sufficient for my question? — the profile is a floor, never
   a ceiling, and treating it as complete is the failure mode it introduces.

## Observations, written so they can come out badly

| Observation | Would disconfirm |
| --- | --- |
| Do practitioners recognise their problem in an archetype, or do they describe it as none of these? | That archetypes generalise rather than encode one team's habits |
| Does anyone fetch a source the profile listed, or do they bring their own? | That naming candidate sources helps at all |
| Is the vintage triple filled in honestly, or back-filled to match? | That requiring it changes anything |
| Does a profile's refusal appear in how a finding is written up? | That refusals carried this early reach the output |
| Does the profile become a checklist people complete rather than a prompt they think with? | That a floor can be published without becoming a ceiling |
| As examples accumulate, do the profiles converge or keep churning? | That extraction from examples is a ratchet rather than a drift |
| Does an archetype distilled from Gaborone and Soho fit an activity in neither? | That the corpus is broad enough to generalise from |
| Does anyone, given a cross-border profile, attempt the regional tile download anyway? | That stating a size is enough without the vector-first prescription |
| Is the per-jurisdiction vintage filled in, or collapsed to one year for the region? | That requiring the triple per jurisdiction is workable |

## Practitioner exercise

Take a completed activity of your own. Write down which of the four classes it used,
the vintage of each, and the licence each source carried. Then ask whether the three
vintages agreed, and whether you could have published the data alongside the result.
Most of the value of this record is in how uncomfortable that exercise is.
