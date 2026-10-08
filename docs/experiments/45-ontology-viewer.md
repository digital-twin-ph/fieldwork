# Experiment 45: an ontology viewer built for reading

Date: October 8, 2026. Status: adopted and published. The viewer is live, the
Ontosphere instance is retired, and this record states what the new site
establishes and what it does not.

## Why the first choice was wrong

[Experiment 42](42-ontology-structure-and-meaning.md) adopted
[Ontosphere](https://github.com/ThHanke/ontosphere) as an accompanying inspector,
on the strength of its architecture: React, client-side, Konclude in WebAssembly,
Apache-2.0. The architecture matched this prototype closely, and that was the
wrong criterion.

Ontosphere is a graph **editor**. It authors instances and reasons over them on a
force-directed canvas. Reviewing a vocabulary is a different task: follow a class
to its parents and children, see which properties take it as domain or range, and
find the shapes that constrain it. A canvas of 158 undifferentiated nodes hides
exactly that, and in use it was hard to browse relationships and constraints.
Judging a tool by what it is built to do, rather than by what it is built with,
would have reached that conclusion sooner.

## What replaced it

[OntoInk](https://github.com/ISE-FIZKarlsruhe/ontoink) 0.7.9, MIT, a MkDocs
plugin that renders Turtle as interactive diagrams in formal notation, runs
pySHACL and an optional reasoner at build time, and executes competency questions
as a build gate. Output is a static site with no CDN. Measured on this
vocabulary: a 14-graph site builds in under four seconds, and its
`ontoink-report.json` computes ontology metrics, a SHACL summary, an OntoSniff
quality score and shape drift on every build.

Its structural metrics independently corroborate what the Validation Lab's check
03 measured by other means, including 69 properties with no domain in
`fieldwork.ttl` alone, and a quality score of 2 out of 100. A heuristic score is
not a verdict, but two tools agreeing on the gap is worth more than one.

| | Ontosphere | OntoInk |
| --- | --- | --- |
| Built for | Authoring and reasoning over instances | Reading and publishing a vocabulary |
| Output | An application to open | A static site to browse and link into |
| Reasoning | Konclude in the browser | Optional per fence; proof trees available |
| Gate | None | Competency questions fail the build under `--strict` |
| Licence | Apache-2.0 | MIT |

## How it is wired

A separate repository, `digital-twin-ph/fieldwork-ontology`, published at
[digital-twin-ph.github.io/fieldwork-ontology](https://digital-twin-ph.github.io/fieldwork-ontology/).

The vocabulary is **not vendored**. CI checks out this repository, copies
`ontology/**` into the site's `docs/`, records the commit it rendered, and builds;
`docs/ontology/` is git-ignored because it is build input rather than content. The
site rebuilds on a push, weekly to pick up vocabulary changes here, and on demand.
A stale render is worse than a missing one, because it looks current.

## Competency questions as a gate

The twelve schema-level questions from
[experiment 44](44-ontology-competency-questions.md) are wired in as `ontoink-cq`
fences, and `mkdocs build --strict` fails the build when one stops being true. They
ask whether the **vocabulary can express an answer at all**: that every class
carries a label and a comment, that the audit's distinctions are asserted as
disjointness, that boundary features are PROV entities, and that the raster mask
convention and margin can be recorded.

Two are **tripwires rather than requirements**. One asserts that no term implies a
population count, so a term that appeared to answer a refused question would fail
the build. The other asserts that reprojection provenance is *still* untyped, so
when that gap closes the build fails and the inventory must be updated. A gate that
only protects the present state would let the record rot.

This is a different instrument from the Validation Lab's check 04, and both are
needed. The viewer asks whether the vocabulary **could** answer a question; the lab
asks whether a real exported receipt **does**. A term can exist and never be
emitted, which is how the lab found that the Old Naledi reporting boundary carries
no `fw:StudyArea` type.

## Two findings the adoption produced

**A category error of mine, corrected.** The first version paired each vocabulary
file with a SHACL shape file, and reported four violations. A shape constrains
instance data, not a schema; validating a vocabulary against receipt shapes is
meaningless. Worse, the honest fix is not to pair shapes with the example graphs
either: `validate-ontology.mjs` loads **all** examples as one data graph and
**all** shapes as one shape graph, then binds each processing contract's input
shape with `sh:targetNode` before validating. A viewer pairing one file with one
shape cannot reproduce that, and a partial reimplementation reports violations that
only mean the companion files were missing. The site therefore renders the shapes
and examples without claiming conformance, and says so on the page. Conformance
stays where it can be done correctly.

**An axiom filed in the wrong place.** The gate failed on its first CI run,
against this repository's published `main`, because the disjointness axioms about
canvas plans, workflow plans and widget definitions had been appended to
`fieldwork.ttl` while the classes they constrain are declared in `runtime.ttl`.
Anyone loading `runtime.ttl` alone got the classes without their constraints. The
axioms moved beside their classes; `owl:imports` was not an option because the
`urn:` ontology IRIs do not resolve. The merged graph is unchanged, and the
reasoner still reports consistent with no unsatisfiable classes and the same seven
conflations caught. A gate that queries one file at a time found something no
merged-graph check could.

## Retirement

The Ontosphere instance's Pages site is disabled and
`digital-twin-ph/fieldwork-ontosphere` is archived. Nothing is lost: the overlay
was two generated default values and four small files, and `MODIFICATIONS.md`
there records how to reproduce it. Its reasoning value is already covered
headlessly by the lab's check 03, which uses the same Konclude engine.

## Limits

The published site is online: it is not part of this prototype's offline
guarantee, and no offline claim is made for it. The reasoner is configured per
fence rather than globally, so consistency is reported only where a fence asks for
it. The quality score is a heuristic. And the site establishes nothing about
whether the vocabulary is *right* — a reader can now see the modelling clearly,
which is a precondition for judging it, not a judgement.
