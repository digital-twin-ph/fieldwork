# Resolving a DOI, tested on the sea-level example's own citations

_Created 2026-10-17 · Updated 2026-10-17_

The practitioner, 2026-10-17: *"Yes if the citation has a DOI it should resolve, and that's a
validation step."* And on what makes it acceptable: *"As long as there is no data sent it should
be OK."*

This tested the three citations the Manila sea-level worked example already declares, plus the
dataset IRI, against the public DOI system. No key, no registration, nothing from the workflow
sent.

## Why a citation check is worth friction at all

From the practitioner, the same day: *"What the workflow may not demand of the user, the
presentation venue may and it will be awkward for the user if he or she did not become
accountable for those pieces of information."*

The asymmetry is in time. The information is cheapest at acquisition and can be irrecoverable
later — and the three citations here are a **licence obligation**, not a preference:
`sea-level.ts` says so, naming them "the chapter, the FACTS paper and the dataset version".

## What goes into a call

```
GET https://doi.org/api/handles/{DOI}
→ {"responseCode":1,"values":[{"type":"URL","value":"<publisher landing page>",
    "ttl":86400,"timestamp":"2023-12-21T09:17:00Z"}, …]}
```

Resolution only: does this DOI exist and where does it point. The handle record carries **its own
timestamp and TTL**.

```
GET https://doi.org/{DOI}   Accept: application/vnd.citationstyles.csl+json
→ CSL-JSON: DOI, type, title, container-title, publisher, issued, author, and
  for data DOIs a version
```

**Nothing of the practitioner's leaves.** The DOI is already public and already written in the
workflow file. No coordinates, no records, no study area. The metadata comes from the DOI system
rather than requiring the publisher's landing page to be fetched.

## The example's own citations, resolved

| Declared slot | Resolves to | `type` |
| --- | --- | --- |
| The chapter | Ocean, Cryosphere and Sea Level Change · Cambridge University Press | `book-chapter` |
| The FACTS paper | FACTS v1.0 · Copernicus GmbH, *Geoscientific Model Development* | `journal-article` |
| The dataset version | IPCC AR6 Sea Level Projections · Zenodo | `dataset`, **`version: 20210809`** |

All three resolved. `10.5281/zenodo.5914709` is also the example's `datasetIRI`.

## What only testing showed

**1. The three slots are three different types, and resolution is what proves it.** A DOI-shaped
regex would have passed all three and told you nothing. A rule saying "must be a paper" would
have **failed the chapter**, which is a `book-chapter`. Only the resolved `type` distinguishes
them, which is what makes a per-slot contract possible rather than a count of non-empty strings.

**2. The dataset version can be checked rather than trusted.** The example declares
`datasetVersion: "20210809"` as a typed parameter; Zenodo returns `version: 20210809` for the same
DOI. So that field does not have to be taken on the practitioner's word — a typo in it is
invisible today and would propagate into every receipt. Checking a declaration against its source
is stronger than requiring it, and this is the only field here where that is possible.

**3. `issued` is machine-readable, and disagrees with the text.** The chapter's citation text
reads "Fox-Kemper, B., et al. 2021"; its DOI registers `issued [[2023, 7, 6]]`. That is a
publication-versus-registration difference and not an error — but it is exactly the kind of
discrepancy a practitioner should not have to explain from memory at a venue.

## What this means for the design

**A resolution is a dated observation, not a property.** A DOI that resolved today may not in
2030, and publisher metadata changes. The receipt should record what it resolved to and when it
asked — the shape `prov:generatedAtTime` already gives a study-area geometry — not a verdict of
"valid".

**Offline must degrade, not block.** A practitioner in the field has no connection and still has
to run. The precedent exists twice: `network_input` downloads once and works offline afterwards,
and `find_health_facilities` stores what it retrieved. A resolution should be fetched once,
recorded with its date, and carried in the file. Never a run-time dependency on doi.org being
reachable.

**Whether unresolved is fatal belongs to the plan, not the widget.** A journal submission can
require every citation resolved; a field briefing cannot demand connectivity, and refusing to run
because a DOI could not be checked from a clinic with no signal would punish the practitioner for
the network.

**And the vocabulary for the outcome already exists.** `fw:unresolvedCitation` is "a bibliography
entry held only as text, with no URL and no digested file… emitted as unresolved rather than as an
`fw:EvidenceReference`, because an entry nobody can open" is not a reference. Resolving a DOI is
precisely the promotion from the first to the second. The receipt distinction was settled before
the check existed.

## What this does not establish

**That a resolved DOI is the right one.** Resolution proves the identifier exists and names a
work. It does not establish that the work supports the claim, that it is the edition used, or
that the practitioner read it. `fw:EvidenceReference`'s own comment already says attaching a
citation "does not establish independent verification".

**That these three will keep resolving.** Three successes on one day. The handle TTL is 86400
seconds and the records carry their own timestamps; nothing here observed a change.

**That the publisher is never contacted.** Redirects were followed in this test and the hop chain
was not inspected. The claim that content negotiation answers from the DOI system is from its
documented behaviour, not from observation here.

**That `version` is available for every data DOI.** One Zenodo record returned it. DataCite does
not oblige it, and a dataset DOI without a version would make check 2 unavailable rather than
failed.

## Where this sits among the records

The practitioner, 2026-10-17: *"It's related to a bunch of other experiments including 64
streamlining, rulesets 106."* It is, and the connections run in both directions.

**[115](../experiments/115-decomposing-the-projection-extract.md) — P1.** This probe is about
the part of `slr_extract_import` that P1 explicitly leaves OUT. P1 is "a declared table contract
— required key columns, admissible units, a closed domain per column — applied the way a ruleset
is applied", and `sea-level.ts` draws the line on one question: *does the field say where the
data came from, or how to interpret the numbers?* The interpretive six go into the contract. The
three citations are the other kind, reported rather than refused. So resolution is the check for
the half P1 does not cover, and P1's "net widget count: −1" does not depend on it.

**[106](../experiments/106-rule-builder-ui.md) — the authored form.** 106 already records three
extensions it needs, all "found by examining rule applications or vocabulary nobody had counted
rather than by designing": set-level conclusions, field-to-field comparison, and a condition
whose right-hand side is another feature. **A citation slot is a fourth, and a different kind.**
The three are about CONDITIONS; this is about PARAMETERS. A7 notes a parameter "stays a
placeholder and binds through `bindParameters`", and every parameter declared across the four
bundled rulesets is `type: "number"` — so a ruleset can ask for a threshold and cannot ask for a
DOI. Text parameters are the smallest thing standing between the mechanism and the use.

**[64](../experiments/64-widget-streamlining.md) — Phase 2.** Shrinking the palette is where a
retirement into a ruleset lands. 64 already names `slr_site_assignment` for the keyed-join
factoring at Phase 3 and `slr_threshold_comparison` among the comparisons; `slr_extract_import`
retiring into P1 is the third of the sea-level three, by a different route.

**[47](../experiments/47-sea-level-pack.md) and [14](../experiments/14-gadm-jurisdiction-assets.md).**
47 is where the three citations are recorded as a licence obligation, and where the parallel
geoBoundaries licence claim needs correcting
([probe](geoboundaries-probe-2026-10-17.md)). 14's **A52 — separate dataset distribution and
acquired bytes** — is the slot a table would need in order to carry its own citations rather than
have them typed into a downstream step's parameters.

**[119](../experiments/119-can-this-tell-a-story.md).** The reason any of this is obligatory. The
venue decides what must be declared, the venue is known at the start, and so whether an
unresolved citation is fatal is a property of the declared plan rather than of the widget that
happens to check it.

## What would close it

Inspecting the hop chain to confirm which hosts a content-negotiated request reaches, and trying
a DOI that does not exist to see what the failure looks like — the unresolved path matters more
than the resolved one, because it is the one a practitioner will meet.
