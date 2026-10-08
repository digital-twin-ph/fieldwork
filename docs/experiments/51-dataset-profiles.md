# 51 · What the problem predicts: dataset profiles

**Status:** design record, nothing implemented. Proposes a declaration, not a
download: a profile names the **class** of dataset a problem requires and the
sources that may legally be offered, and refuses to pretend it knows which file is
right for a given place.

[Experiment 50](50-preparation-checklist.md) left two unknowns, the checklist's form
and its content. This record closes most of the second one, using two predictors that
are both available at project creation: the **problem type** and the **study area**. The datasets a public
health field activity needs are not open-ended: census or survey denominators,
population rasters, jurisdiction boundaries, and health facility registries recur
across almost every activity, and **the nature of the problem predicts which of them
matter**. That makes the content derivable from the question being asked, in the same
way experiment 50 found the resource list derivable from the study area.

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
which a list of filenames does not.

## Archetypes, and what each one distinctively refuses

Problem types recur too. Each implies a profile, and — more usefully — each has a
characteristic overclaim that the profile should carry as a refusal:

| Archetype | Classes required | Must refuse |
| --- | --- | --- |
| Coverage assessment | denominator, frame, service supply | That an uncovered area is an unserved population; coverage of a frame is not coverage of people |
| Access or catchment analysis | frame, service supply, (network) | That proximity is access; a straight-line or network proxy is not care received |
| Exposure or hazard assessment | hazard, denominator, frame | That exposure is impact; an exposed count is not a case count |
| Outbreak or cluster investigation | denominator, frame, case data | That a cluster is a cause, and that absence of reports is absence of cases |
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

Must be refused:

6. Which dataset should I use here? — a profile narrows; the practitioner chooses, and
   records why.
7. Is this dataset current for this place? — nothing in the application can know.
8. Are these four classes sufficient for my question? — the profile is a floor, never
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

## Practitioner exercise

Take a completed activity of your own. Write down which of the four classes it used,
the vintage of each, and the licence each source carried. Then ask whether the three
vintages agreed, and whether you could have published the data alongside the result.
Most of the value of this record is in how uncomfortable that exercise is.
