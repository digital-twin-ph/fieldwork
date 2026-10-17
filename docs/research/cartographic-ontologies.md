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

## Design pathways and human choice — a second summary, assessed

The practitioner supplied a further ChatGPT summary on 2026-10-17, arguing that **human selection
among viable cartographic pathways should be an architectural feature**, not an exception to rule
execution: rules constrain the design space, several designs remain defensible, the human
chooses, and the choice itself is recorded.

**One correction first.** The summary assumes a Rust/WASM architecture. Fieldwork is TypeScript
compiled by esbuild; the only WASM is EYE-JS, the reasoner. The practitioner flagged this. It
matters because an argument about what a rendering engine can afford to compute rests on what
the engine is.

### Where it is already this project's position

More of it than the summary could know. *"The machine generates a defensible set of alternatives,
explains their assumptions and trade-offs, and the human exercises informed judgment"* is close
to a restatement of how this application already behaves elsewhere: a unit mismatch is **refused
rather than converted**, a site past the snap limit is **marked rather than dropped**, a ruleset
may **decline to classify**, and a data repair is **declared by a practitioner and never
automatic**. The stance is not new here; what is new is applying it to design.

Its three-way split of knowledge maps onto things that already exist, which is the useful part:

| The summary's category | What it already is here |
| --- | --- |
| **Hard constraints** — reject invalid alternatives | `validateWorkflow` refusing a cycle; `authoredUnitProblems` refusing a run; the CSV importer refusing a non-numeric cell by row number |
| **Heuristic rules** — recommend feasible choices | the design rules added 2026-10-17, which report and never restyle |
| **Human preferences** — select among defensible choices | the Inspector's presentation, basemap and layer knobs — **and these are the gap**: a knob records what was chosen and nothing about what else was available or why |

### The one genuinely new idea: decision provenance

A map's receipt states what it drew. It does not state **what else it could have drawn, and why
this was chosen instead**. For a project whose receipts exist so a reader can check a result,
that asymmetry is real: a reader can see a sequential ramp was used and cannot see that a
diverging one was rejected for want of a meaningful midpoint.

That is worth having, and it is a small thing to record once the alternatives are computable —
which they are not yet, for the reason below.

### What blocks it, precisely: measurement scale is not declared

The summary's own example turns on it. A sequential choropleth suits an **ordered** variable; a
diverging one suits an ordered variable **with a meaningful reference value**; a qualitative
palette suits an **unordered** one. Choosing between them requires knowing which.

**This application cannot express the difference.** A field binding declares
`kind: 'number' | 'boolean' | 'term'`, and `term` covers both *clinic / pharmacy / health post*
— unordered — and *NoDeaths / Few / Many* — ordered. The ruleset worked example **produces the
second kind**: its conclusions are `fwa:NoDeaths`, `fwa:Few`, `fwa:Many` and `fwa:Single`,
`fwa:Several`, `fwa:Cluster`, which are bands with an unmistakable order, and nothing anywhere
records that they are ordered.

So a map drawing them today has no way to know a sequential ramp is right and a qualitative
palette is wrong, and a cartographic advisor built on the current declarations would be guessing
— which is the one thing this project's field bindings exist to prevent: *nothing is guessed from
a column name.*

**The enabling step is therefore not a cartographic ontology at all.** It is a declaration on the
authored rule form, where the bands are written and where the practitioner demonstrably knows the
answer: somebody writing `NoDeaths`, `Few`, `Many` knows they are in that order, and the form has
no way for them to say so. Nominal, ordinal, interval and ratio are the standard four; `kind`
already carries the type, and the scale is a second, orthogonal fact.

### What I argued should be resisted, and why that was wrong

This note first said that *"the system can learn which pathways humans select"* should be left
alone — that a learned preference is *"advice no practitioner can audit, from a sample nobody
declared, applied to a case nobody compared."*

The practitioner corrected it, 2026-10-17: *"It's a user preference, and the audit is in the N3
receipts in case anybody else wants it. FW is not multi-user, it only caters to the one user
holding the browser, so N of 1. If a user picks certain pathways as a choice, it is a human
judgment. The user can audit that decision him/herself."*

**Each clause of the objection fails against that.** *Nobody can audit it* — the receipt carries
it and the person who made the choice is the auditor. *A sample nobody declared* — the sample is
that one person's own prior choices, which they made and can read back. *A case nobody compared*
— comparing is the entire point of offering pathways. The objection was written as though the
preference would be generalised across users, and **there are no other users.** This application
is local-first: one browser, one workspace in `localStorage`, no accounts, no server.
**N of 1** is an architectural fact, not a limitation to be worked around, and it changes what a
preference *is*: not a population estimate, but a person's recorded judgement about their own
work.

### What does survive, and it is worth keeping

One thing, and it is small and sharp: **a default that came from a preference must be
distinguishable in the receipt from one that came from a rule.**

Otherwise a reader — including the same practitioner six months later — cannot tell *"this map is
sequential because the variable is ordered"* from *"this map is sequential because I usually
choose that."* Both are legitimate; they are not the same claim, and only one of them is a
statement about the data.

That is the same distinction `fw:ruleKind` already draws between **measured** and
**categorical**, added on 2026-10-17 because a contrast failure no categorical rule would have
caught was found by arithmetic.

### And the basis is `selected`, not `preferred`

The first version of this recorded a map's knobs as `fw:decisionBasis "preferred"`. The
practitioner caught it the same day: *"We can not even infer preference from a single mouse
click, we can only say 'selected'. If 'selected' so happens to map to a particular pattern
choice, then we have stronger evidence to say 'preference'."*

**A preference is a disposition** — a claim that this person *tends* to choose this. One click
cannot evidence one; it evidences one click. Writing `preferred` on a single observation is the
same overclaim this project caught twice today in prose — "address" for a building, "degenerate"
where a count belonged — and here it had got into a vocabulary, where it would have been asserted
by every map ever drawn.

*(A third example belonged in that list and cannot be written: the withdrawn term for a port
type. Naming it as an example still counts as using it, and the vocabulary gate refused this
file until it came out — which is the ratchet working on the very paragraph describing it.)*

So the receipts hold the **observations**. A preference is an inference across many of them, it
would need its own statement of what it rests on, and nothing asserts it. That is also precisely
what makes the inference possible later: selections recorded honestly are the only evidence a
preference could ever be drawn from, and a receipt that had already called them preferences
would have destroyed the distinction it needed.

## The canon, and which of it this application can actually use

A third summary from the practitioner, 2026-10-17, naming the cartographic equivalents of Tufte
and Cairo: **Imhof** on terrain, **Brewer** on colour, **Robinson** on projection and perception,
**Bertin** on visual variables, **Field** on modern practice, **Nelson** and **Huffman** on
digital design, **Monmonier** on how maps mislead.

**None of these works has been read here.** What follows attributes principles as they are
commonly stated, and says *traces to* rather than naming a page.

The useful question is not which to read. It is **which of them this application can act on**,
given that it draws points, polygons, rasters and a basemap, and draws no terrain.

| | Actionable here | Why |
| --- | --- | --- |
| **Bertin** | **directly, and already overdue** | see below — his visual variables are the missing declaration this project found by another route |
| **Monmonier** | **directly, and already present** | every ruleset in this application must declare what it **must not be read as**. That requirement is Monmonier's subject, arrived at here without the attribution |
| **Brewer** | **partly, already** | the figure palette is CVD-safe and the rule checking it now cites her; ColorBrewer's sequential/diverging/qualitative split is blocked on the same gap as Bertin |
| Robinson | marginally | projection choice is real here — widgets take a UTM zone and `zone-at-study-area` already advises on candidates with their costs — but that advice is metric, not perceptual |
| Field, Nelson, Huffman | not yet | practice and craft for maps this application does not make |
| Imhof | **no** | terrain shading, relief, hypsometric tints. Nothing here renders terrain. Recorded so the absence is a measurement rather than an oversight |

### Bertin converges on a gap this project already found

Bertin's point is that the visual variables have **properties**: position, size and value are
*ordered*; hue is *selective* but **not ordered**. So an ordered variable must be encoded in an
ordered visual variable, and encoding it in hue tells a reader the categories are unordered when
they are not.

That is precisely the gap recorded in TODO an hour earlier, found from the other end: a field
binding declares `kind: number | boolean | term`, `term` covers both unordered and ordered
categories, and the ruleset example **produces ordered ones** — `NoDeaths`, `Few`, `Many`. The
application cannot tell them from `clinic`, `pharmacy`, `health post`.

Arriving at the same missing declaration from a theory and from an example is the best evidence
available that it is really missing. **Bertin names what the declaration is for**; the TODO entry
says where it goes.

### What changed in the code because of this

The four design rules now cite where they come from. `UnknownIsNotAHue` traces to Bertin — hue is
selective but not ordered, so spending it on an absence makes that absence compete as a category.
`CategoricalPaletteIsColourBlindSafe` traces to Brewer, with the palette itself credited to Okabe
and Ito. The two measured rules cite WCAG and need nothing further: a published criterion is its
own source.

A test now requires **every** rule to cite either a criterion or a principle. Three of the four
were my own judgement with nothing behind them until this summary arrived, and a rule citing
nothing is taste wearing a rule's clothes.

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
