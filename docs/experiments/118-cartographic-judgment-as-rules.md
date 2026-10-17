# 118 — Cartographic judgment as rules a map can be held to

_Created 2026-10-17 · Updated 2026-10-17_

**Status:** tried — four rules are applied while a map is assembled and stated in its receipt,
three external vocabularies carry almost all of it, and the rules that would matter most cannot
be written yet for want of one declaration.

## The question

The practitioner supplied three research summaries on cartographic design over 2026-10-16 and
2026-10-17, and the question they raised is not *does a cartographic ontology exist* — one
largely does — but:

**Can expert cartographic judgment be expressed as rules that actually run, in a way a reader can
check, without the application claiming more than it knows?**

Every part of that sentence is load-bearing. *Actually run* rules out a vocabulary nobody
evaluates. *A reader can check* rules out advice with no number and no source. *Without claiming
more than it knows* is the hard part, and it is where most of this record's findings are.

## What was found before anything was built

**The vocabulary mostly exists, and WCAG needs no translating at all.** Set out in
[research/wcag-as-ontology.md](../research/wcag-as-ontology.md) and
[research/cartographic-ontologies.md](../research/cartographic-ontologies.md). Four layers, and
three belong to somebody else:

| Layer | Example | Whose |
| --- | --- | --- |
| the criterion | SC 1.4.3, level AA | **W3C's own IRI** — nothing to mint |
| the outcome | this failed that | **EARL** |
| the measurement | the ratio was 2.08 | **DQV**, adopted the same day for data quality |
| the threshold | 4.5 | **ours**, and only because EARL states it carries none |

**OGC's portrayal work splits in two, and the document type decides it.** SymCore is a ratified
Standard (18-067r3, October 2020) and is a *conceptual model*, not an OWL ontology; the
Testbed-13 portrayal ontologies come from an **Engineering Report**, which is a prototype
write-up nobody maintains. Adopting the first is adopting vocabulary, which this project already
does for geometry. Adopting the second is adopting an orphan.

## What was built

Four rules, applied in `mapSpecificationFacts` while the visualisation is assembled, each stated
in the receipt whether it passed, failed or **did not apply**:

| Rule | Kind | Stands on |
| --- | --- | --- |
| `MapTextContrast` | **measured** | WCAG SC 1.4.3, 4.5:1 |
| `MapMarkContrast` | **measured** | WCAG SC 1.4.11, 3:1 |
| `CategoricalPaletteIsColourBlindSafe` | categorical | Brewer; palette is Okabe and Ito's |
| `UnknownIsNotAHue` | categorical | Bertin — hue is selective but **not ordered** |

And `fw:DesignChoice`, recording what the practitioner chose, from what alternatives, with
`fw:decisionBasis "selected"`.

## The four things this record exists to carry

**1. Rules for the categorical, arithmetic for the numerical.** The boundary was not reasoned out
in advance; it was handed over by a failure. On the morning of 2026-10-17 every toast tone in
this application failed WCAG contrast — the worst at **2.08** against a 4.5 floor — because a
colour had been chosen by eye and nothing measured it. **No categorical rule would have caught
it.** Relative luminance did. So `fw:ruleKind` exists on every rule, and says which kind it is,
because a measured rule produces a number a reader can re-derive and a categorical one produces a
judgement somebody coded in.

**2. A rule with no source is taste wearing a rule's clothes.** Three of the four rules were
exactly that until the practitioner supplied the canon they belong to. They cite now, and a test
requires every rule to cite either a published criterion or a named principle. `UnknownIsNotAHue`
turned out to have been written already — as a **code comment** in `presentation.ts`: *"Not a
hue. Absence of data is not a category and must not compete with one."* Expert judgement with no
way to reach a reader.

**3. A single click is `selected`, never `preferred`.** The first version recorded a map's knobs
as `fw:decisionBasis "preferred"`. The practitioner: *"We can not even infer preference from a
single mouse click, we can only say 'selected'. If 'selected' so happens to map to a particular
pattern choice, then we have stronger evidence to say 'preference'."* A preference is a
**disposition**; one act cannot evidence one. And the correction protects the very inference it
refuses: selections recorded honestly are the only evidence a preference could ever be drawn
from, and receipts that had already called them preferences would have destroyed the distinction
they needed.

**4. The rules that matter most cannot be written yet.** Sequential, diverging and qualitative
schemes are chosen by **measurement scale** — ordered, ordered-with-a-reference-value, unordered.
A field binding here declares `kind: number | boolean | term`, and `term` covers both
*clinic / pharmacy / health post* and *NoDeaths / Few / Many*. The ruleset worked example
**produces the second kind** and nothing records the order, so a map drawing those bands cannot
know a sequential ramp is right.

Bertin names what that declaration is for — position, size and value are ordered, hue is not —
and the gap was found independently from the example before the canon arrived. Two routes to the
same missing declaration is the best evidence available that it is really missing.

## Where this stops, and what takes over

The practitioner, 2026-10-17: *"Eventually, 118 blends into the communication stage question —
can FW be used to make data tell great stories through maps and visualizations?"* — and then,
**"Or 119"**. It is a different question and it has its own record:
[119](119-can-this-tell-a-story.md).

**119 was reframed on the day it opened**, and the reframing matters here too: it is not about
judging a story but about **creating the conditions** for one, three of which are measurable —
provenance, rigorous processing, and these rules. What 118 contributes is the third condition,
not an opinion about the result.

What belongs here is the limit that makes them different. **Everything built in 118 is
negative.** A rule catches a violation: this text is too faint, that absence is wearing a hue.
Pass all four and a map is *not wrong in four specific ways*. It may still be dull, answer no
question anybody asked, or mislead by what it leaves out — and none of those is a contrast
failure.

Monmonier's subject is the sharpest case: omission shapes what a reader concludes, and a map that
leaves out the inconvenient district breaks no rule in this file. **Nothing computable reaches
that**, because the fault is in what is absent from the page, and a rule can only read what is
there.

A fear recorded now so it can be checked later: **a conformance report is exactly the kind of
thing that gets mistaken for quality.** Four green outcomes read like an endorsement; they are
four specific absences of four specific faults. If anything is built on top of these rules, that
sentence belongs in the receipt beside the outcomes and not only in this document.

## What this does not establish

- **That these are the right four rules.** They are the four that could be written honestly
  against what a map here declares. Nobody has checked them against what a cartographer would
  look at first.
- **That anybody wants cartographic advice.** No practitioner asked for it; three research
  summaries prompted it, and a summary is not a request.
- **That a rule can tell a good map from a bad one.** It can report that a map violates a stated
  principle, which is smaller and is the only claim made.
- **That the citations are faithful.** None of Bertin, Brewer, Imhof, Robinson, Field or
  Monmonier has been read here. The rules say *traces to*, and a principle attributed from its
  common statement is not a principle checked against its source.
- ~~**That the receipt is validated.**~~ Shapes added 2026-10-17 in
  `ontology/shapes/quality-and-design.ttl`, with a positive example and three negative tests.
  The first graph they were pointed at was **this project's own ontology**, and they refused it:
  the four rules were declared as bare `a fw:DesignRule` lines carrying neither kind nor
  statement, so a rule's words existed only in TypeScript. They are declared in full now, and a
  test holds the two copies to each other.
- **That any of this makes a map tell a story.** The rules are negative and say so above. The
  communication-stage question is a different one, and 118 is its beginning rather than its
  answer.
- **Anything about maps this application does not draw.** Imhof on terrain is the clearest case:
  nothing here renders relief, and a rule about hypsometric tints would be a rule about nothing.

## What would close it

1. **Measurement scale is declared** on a field binding — nominal, ordinal, interval, ratio —
   and a rule uses it to say something about a colour scheme that is true for one scale and false
   for another. Until then every interesting rule is unwritable.
2. ~~**SHACL shapes exist**~~ — done 2026-10-17. What they do not yet cover is the *map
   specification* those applications hang from: a receipt could carry well-formed rule outcomes
   attached to nothing.
3. **One rule changes what a practitioner does** — fires on a real map, is read, and leads to a
   different choice or a recorded disagreement. A rule nobody acts on is a rule nobody needed.

## What changed our minds

**Twice, and both times toward claiming less.**

The first was the boundary between rule and measurement, which this project did not reason its
way to. It was handed over by four contrast failures in its own interface on the morning the
work began, none of which any rule would have found.

The second was `preferred` → `selected`. That one had already got into a vocabulary, where it
would have been asserted by every map ever drawn — a stronger version of the same error this
project caught twice that week in prose, and the reason a word in an ontology deserves more
scrutiny than a word in a paragraph.

## What changed our minds

**A contrast rule that runs at visualisation assembly does not see the application's own chrome.**
On 2026-10-17 the practitioner reported that *"some worked examples lost the Run Workflow button"*.
Nothing had removed it: `.button.primary:disabled{opacity:.45}` rendered its label at **1.22:1**
against its own fill, in both colour schemes. Four design rules were applied to every map this
application assembles, two of them measured contrast against WCAG SC 1.4.3 and 1.4.11, and the
primary control in the header was unreadable the whole time.

The rules are not wrong and their scope is not an oversight — a map is what the receipt is about,
and chrome is not in a receipt. But it marks the limit precisely: **this is conformance of the
artefact, not of the tool that makes it.** Whatever guards the application's own surfaces has to
be a different mechanism, and so far that mechanism is a contrast test per defect, written after
a practitioner could not see something — the toast buttons on 2026-10-15, the toast tones the same
day, this button two days later. Three of the same shape, each caught by a person rather than by
a rule.

This does not establish that the design rules should be extended to chrome. It establishes that
nothing currently checks chrome, and that the three times it mattered, the report came from the
practitioner.
