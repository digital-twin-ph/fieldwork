# 59 · What the sea-level exercise taught about packaging engineered knowledge

_Created 2026-10-09 · Updated 2026-10-09_

**Status:** lesson record. No mechanism is added here, and one is proposed for removal.

Widgets in this project are not interface components. They are **workflow components in a domain**
— engineered knowledge about what a computation means, what it requires, and what it must refuse.
The sea-level exercise was the first attempt to package that knowledge as a separately maintained
unit so the pattern could carry to other domains and other public health problems.

It worked, and it cost more than it should have. Both halves are worth recording precisely, because
the point of the exercise was the pattern, not the pack.

## What actually transferred

The pack was absorbed into the host in an afternoon of coding. What survived the absorption, and
what did not, is the finding:

| Carried over | Cost to produce | Cost to rebuild elsewhere |
| --- | --- | --- |
| The **key contract** — a projected value is meaningless without site, scenario, workflow, family, year and quantile | Days of reading the published archive | Days again, per domain |
| The **refusals** — families that include and exclude vertical land motion are not comparable; a scenario carries no likelihood; a comparison is not an inundation model | The same reading, plus judgment | The same, and easy to get wrong silently |
| The **vocabulary and shapes** that make those refusals checkable rather than advisory | A day | A day |
| The **worked example** and its data provenance | A day | A day |
| The **three widgets' code** | An afternoon | An afternoon |

The code was the cheap part. **The expensive, durable part is the knowledge: the key, the refusals,
and the shapes that enforce them.** A packaging format that optimises for shipping code is
optimising for the wrong artifact.

## The pattern, stated so another domain can use it

1. **Name the unit of meaning before the widget.** What makes one value interpretable? For
   projections it was a six-part key. For a coverage rate it will be a denominator with its vintage.
   Until that is written down, a widget is a function with a label.
2. **Write the refusals first.** They are the most valuable and least reproducible content, and they
   belong in the vocabulary where a reasoner can act on them, not only in prose. Every domain has
   its own: *a route is not a flow*; *a table has no geometry*; *context is not frame*; *equality
   counts as reaching*.
3. **Expect the domain to reveal a missing general primitive.** This is the engine. The sea-level
   exercise's real contribution to the application was **Tabular data** — long-format tables with a
   declared key — which no sea-level concept appears in and which every domain with published model
   output needs. The domain-specific parts that followed were thin.
4. **Keep the domain layer thin on purpose.** Site assignment and threshold comparison are a join
   and a comparison. If a domain layer is thick, a primitive is missing underneath it.
5. **Make the knowledge findable, or it is not delivered.** The catalog existed, was correct, and
   was invisible; the owner twice could not find it and reasonably expected it to let them add a
   widget. Packaging that a practitioner cannot act on has failed regardless of its RDF.

## What created problems rather than solving them

Three things I built that the goal did not ask for, recorded so they are not repeated:

- **Symmetric triple review for every pack.** Semantic, security and regression review, required
  equally, whatever the pack contains. A declarations pack has almost no execution risk and
  considerable interpretation risk; a code pack inverts that. Uniform cost with non-uniform benefit
  is why admission never happened for the only pack that exists.
- **Governance ahead of the operation it governs.** Admission states, review states, catalog
  versions, agreement rules and two validators were written before anyone had defined what
  installing a pack *is*. The result was an elaborate apparatus around an undefined act, and the
  undefined act then became "impossible" by assumption rather than by argument.
- **A conflation I defended instead of noticing.** `runtimeFetching: none` means a pack must not
  fetch while running. I treated it as *no pack is ever installed*, which does not follow, and the
  project then spent an exchange explaining why the thing it was built for could not be done.

## The proportionality rule this implies

Review should match what an artifact can do, not what a category is called:

| A pack that carries | Needs | Does not need |
| --- | --- | --- |
| Vocabulary, shapes, examples | Semantic review; a licence check | A security review of code that does not exist |
| Widget source, installed at build time | Semantic **and** security review, in a pull request where source review belongs | A runtime sandbox, since nothing loads at runtime |
| Data | Licence and redistribution review; vintage recorded | Either of the above |

This is a reduction, not an addition: the catalog keeps its rules, and two of its three required
reviews become conditional on what the pack contains.

## Next, to test the pattern rather than assert it

One instance is not a pattern. The claim in this record — that a domain exercise reveals a missing
general primitive, and that the knowledge rather than the code is the durable artifact — is testable
by running the same loop in a second, unrelated domain and seeing whether both hold.

Service-coverage rates are the obvious candidate: ubiquitous in public health, and they force the
primitive [experiment 51](51-dataset-profiles.md) already identified as the common serious error —
a **rate whose denominator carries its vintage**, which refuses to compute when the denominator
year, the frame vintage and the numerator period disagree. A small widget with a large refusal, and
one that several domains would immediately use.

If the pattern holds there, it is a pattern. If the second domain reveals no missing primitive and
produces a thick domain layer, this record is wrong and should say so.
