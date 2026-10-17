# Cartographic ontologies and the output widgets — what exists, and what it would buy here

_Created 2026-10-17 · Updated 2026-10-17_

The practitioner supplied a research summary from ChatGPT on 2026-10-17, covering cartographic and
portrayal ontologies for the output widgets. This note assesses it. **The summary is treated as a
set of claims to check, not as findings** — which is also how it asks to be read, since it hedges
its own ground ("should not all be assumed to be ratified standards").

Two claims were checked at source here. The rest are carried forward unverified and marked.

## What was checked

| Claim | Status |
| --- | --- |
| **OGC SymCore is a standard** | **Confirmed.** *Symbology Conceptual Model: Core Part*, approved by OGC membership **October 2020**, document **18-067r3**, version 3.0, type **IS** — an International Standard. Described as a minimal set of abstract classes representing explicit extension points, building on Symbology Encoding 1.1 |
| **OGC Testbed-13 produced semantic portrayal ontologies** | **Not confirmed by search.** And the document type matters more than its existence: a Testbed **Engineering Report** is a prototype write-up in OGC's process, not a ratified standard, and is not maintained as one |

That distinction is the whole assessment. The summary's recommendation — *"reuse OGC's semantic
portrayal work as the baseline rather than inventing another symbol ontology"* — points at two
different kinds of thing:

- **SymCore**, which is real and ratified, and which the summary itself concedes is *"a conceptual
  standard, not itself a complete OWL ontology"*. Adopting it means adopting **vocabulary and a
  conceptual contract**, exactly as
  [the OGC assessment](ogc-standards-assessment-2026-10-12.md) already concluded for geometry:
  *"Treat OGC Simple Features and GeoSPARQL as the vocabulary and contract."* That precedent
  applies unchanged and is the cheap, defensible move.
- **The Testbed-13 ontologies**, which would mean adopting a prototype nobody maintains. This
  project has a term for the risk already — a vocabulary declared and enforced nowhere is a
  limitation presented as a term with teeth.

## What this project actually has, and where the gap is

`map_output` since 0.10.0 declares every layer port it can draw, reads the renderer from what is
connected, and carries a basemap, a presentation and a title. What it does **not** have is any
representation of *why* a map looks the way it does. A reader of a receipt can learn which layers
were drawn and from what; they cannot learn that a sequential colour scheme was appropriate
because the variable was ordered, or that it was not.

So the gap the summary identifies is real and correctly located: **not symbols, but judgment.**
Its own words — *"The remaining gap is not simply representing map symbols. It is formalizing
expert cartographic judgment into computable, testable, and explainable design rules."*

## Why this project is unusually well placed — and the one reason to be careful

Unusually well placed, because the machinery already exists and was built for exactly this shape
of problem:

- an **N3 reasoner in the browser** (EYE via WASM), already applying rules to records;
- an **authored rule form** with a compiler, an editor and a receipt that carries the rules
  themselves ([106](../experiments/106-rule-builder-ui.md));
- a standing distinction between **a rule that fires** and **a finding**, and between an alert
  and a failure;
- a project-wide preference for **explaining over automating**.

A cartographic advisory ruleset would be an `apply_ruleset` over a map's declared properties.
Bertin's visual variables against a variable's measurement scale is a rule. Brewer's scheme
selection is a rule. Both would produce an explanation a practitioner can read, disagree with and
override — which is the thing this project wants and a styling engine does not give.

**The caution is today's own lesson.** On 2026-10-17 every toast tone in this application was
found to fail WCAG AA contrast — light warning 3.81, light failure 3.72, dark warning **2.08**,
dark failure 2.41 — because a foreground was chosen by eye and nothing measured it. That is a
perceptual design failure of exactly the kind a cartographic advisor is meant to catch, **and no
rule would have caught it.** Only arithmetic did: relative luminance, computed, compared against
4.5.

So the boundary is clear before anything is built. **Rules for what is categorical** — this
variable is ordered, therefore a sequential scheme; these two layers both carry points, therefore
distinguish by shape and not by hue alone. **Measurement for what is numerical** — contrast
ratios, colour-vision-deficiency simulation, label collision, minimum legible size. A system that
expresses the second as rules will state confident advice it cannot support, which is worse than
silence.

## What is not established

- **That any of this should be built.** No practitioner has asked for cartographic advice; the
  summary was offered as research and is recorded as research.
- **That the Testbed-13 ontologies exist in a reusable form.** Not confirmed, and an Engineering
  Report's artefacts are prototypes.
- **That SymCore maps onto this project's model.** It builds on Symbology Encoding, which assumes
  a styling pipeline this application does not have — our maps are drawn by a renderer reading
  ports, not by applying symbolizers to features.
- **Anything about the three research papers cited** (Iosifescu Enescu & Hurni 2007, Peňáz et al.
  2014, Carral et al. 2013). None was read here. The summary's own caveat stands: their
  publications do not establish that maintained, reusable OWL packages exist today.
- **That a rule can decide a map is good.** It can decide a map violates a stated principle, which
  is a different and smaller claim, and the only one worth making.
