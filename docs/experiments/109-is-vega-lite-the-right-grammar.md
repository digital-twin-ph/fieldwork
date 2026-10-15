# 109 — Is Vega-Lite the right grammar?

_Created 2026-10-13 · Updated 2026-10-14_

**Status:** validated

Asked by the practitioner on 2026-10-13: *we were testing Vega-Lite for its
declarative language, but is it the most versatile, ontology friendly, and does it
produce more visualizations?*

Three questions, and they do not have the same answer.

## Versatility: no, and that is the point

Measured against the installed copy, `vega-lite@6.4.3`:

| | |
| --- | --- |
| Marks | **14** — arc, area, bar, image, line, point, rect, rule, text, tick, trail, circle, square, geoshape |
| Transform kinds | 20 |
| Schema | 1.9 MB of JSON Schema |

For comparison, Apache ECharts ships on the order of twenty series types including
3D and GL, and Plotly around forty trace types. On breadth of chart kinds,
**Vega-Lite loses to both**, and anyone shopping for "the most visualizations"
should not pick it.

It is the most **declarative** of the serious options rather than the most
capable: Vega-Lite and Observable Plot implement a grammar of graphics, where a
specification says which field maps to which channel, while Plotly's API is
trace-based and D3 is imperative.

## Ontology friendliness: yes, and for a reason that is not "it is JSON"

ECharts and Plotly take JSON configuration too, so JSON is not the distinction.
Three things are:

**A grammar names the data, not the picture.** A Vega-Lite specification says
`{field: 'count', type: 'quantitative'}` — it states which column carries which
role. A trace-based configuration says "this is a bar chart" and leaves the
mapping implicit. The first can be read against an ontology's terms; the second
cannot, because there is nothing in it that corresponds to a term.

**Marks can dereference.** Vega-Lite has `href` and image encoding channels, so a
bar can link to the IRI of the thing it counts. This is the reason given by the
closest published precedent to this project's architecture:
[FAIR and Interactive Data Graphics from a Scientific Knowledge Graph](https://pmc.ncbi.nlm.nih.gov/articles/PMC9142568/)
(Sci Data, 2022), which models a chart as **a SPARQL query for the semantic
context and a Vega-Lite specification for the visual context**, both stored as
literals in the knowledge graph beside Dublin Core and schema.org metadata.

**That is what this project already does.** `chartSpecificationFacts` writes
`fw:rendererSpecification` into the receipt as a literal, beside
`fw:chartMeasureKind` and `fw:chartUnitStatus`. The architecture the paper
proposes is the one already shipped, arrived at independently. It is the strongest
external evidence this choice has.

## More visualisations: no, and the escape hatch is not another library

If a figure needs something outside the fourteen marks, the next step is **Vega**,
which Vega-Lite compiles to and which is already a bundled dependency — not a
second charting library with a second provenance story. Adding ECharts or Plotly
would mean a renderer whose configuration cannot be read against the vocabulary,
which would make `fw:rendererSpecification` a lie for half the charts.

## What this does not establish

That the current chart surface is adequate. It establishes that the grammar is the
right kind of thing, not that fourteen marks are enough — nobody has yet wanted a
chart this cannot draw, and the first time somebody does, the answer is Vega and
the experiment is whether a Vega specification stays as inspectable in a receipt.

It also does not establish that the renderer is in good order. Two real defects
were found on 2026-10-13 while configuring the Snow figures: a series chart had no
presentation controls at all, and the classic bars have no figure export, so a
chart drawn on the default renderer cannot leave the application the way a map can.

**A third was not real, and was reported twice before being checked.** This
document and the commit that preceded it both said the mounted chart is not
disposed when a practitioner switches back to the classic bars, and that this was
why shipping the Snow curve on Vega-Lite was backed out. Reproduced in a browser on
the same day: switching to Vega-Lite and back restores the classic bars exactly --
43 columns, the right caption, and zero leftover SVG -- because `renderResults`
calls `disposeVegaChart()` before it renders anything. The real cause of that
afternoon's failures was a chain of my own edits: a series chart genuinely had no
renderer control yet, and an explicit `orientation: 'vertical'` was refused without
the Vega renderer. Both are fixed, and neither is a disposal problem.

The lesson is the one this repository keeps relearning. "The chart is not disposed"
was an inference from a failing test, and it was written down in the same sentence
as measurements that had actually been taken, which is what made it look like one.

And the paper's three limitations apply here, not only there:

- **Portability.** Their interactive charts travel badly. This project's maps have
  `standaloneMapSvg`; its charts rely on the renderer's own SVG export, and the
  classic renderer has none.
- **Persistence.** They report specifications breaking when ontology terms moved
  namespace. This project renamed four node types the same day, and a stored
  `fw:rendererSpecification` from before that rename names the old field keys. No
  check reads a stored specification back.
- **Performance.** Theirs is query runtime. Ours would be bins: the builder
  already refuses more than 100.

## Observable Plot, which the first pass skipped

_Added 2026-10-13, after the practitioner asked why it had not been looked at._

It had not. The comparison named ECharts, Plotly and D3 and mentioned Observable
Plot only in a quoted line. That was an omission, not a judgement, and it deserves
one:

| | |
| --- | --- |
| Version | 0.6.17, published 2025-02-14 |
| Licence | **ISC** — permissive, no obstacle here |
| Dependencies | `d3`, `isoformat`, `interval-tree-1d` |
| Shape | A grammar of graphics, like Vega-Lite, by D3's own author |
| Server-side rendering | **Yes** — pass a JSDOM `document` and take `outerHTML` |

**Why it still loses on this project's deciding criterion.** A Plot specification is
a JavaScript options object holding marks built by function calls, over in-memory
data, with accessors that are themselves functions. It does not round-trip through
JSON, so it cannot be what `fw:rendererSpecification` stores. Vega-Lite's can,
which is the whole reason a receipt can carry the figure. That is a real
disqualification rather than a preference — but it should have been written down
and checked in the first pass, not left out.

**And it would have won somewhere.** Plot renders to SVG in Node. That is exactly
the job `src/chart-figure.ts` was hand-written for on the same day: axis scaling,
label rotation, overflow geometry, about two hundred lines of drawing code. Had
the question been asked before that was written rather than after, Plot would have
been the obvious candidate.

## The bigger thing that question exposed

The exporter should not have been written at all, and not because of Plot.

`vega` is **already a pinned dependency**, and it renders the exact specification
the receipt stores, headlessly, with no DOM:

```js
const view=new vega.View(vega.parse(compile(spec).spec),{renderer:'none'});
const svg=await view.toSVG();   // 6,412 bytes, carrying the title and the source note
```

Measured 2026-10-13. So the application now has **three** renderings of the same
chart — Vega-Lite on screen, the classic bars on screen, and a third,
hand-written SVG for export — and the exported figure is drawn from the bins
rather than from the specification the receipt carries. The guarantee claimed for
it, "the same file whichever renderer is on screen", is true and is the weaker of
the two available. The stronger one is *the exported file is what the receipt says
was drawn*, and it needs no new code and no new dependency.

**Not yet changed.** Swapping the exporter is a reversal of work committed hours
earlier and loses the figure's hand-set Tufte geometry for Vega's own, so it is
the practitioner's call rather than a tidy-up to perform quietly.

## What changed our minds

Nothing — the choice stands. What changed is the *reason* on record. Before this,
the choice rested on "declarative is more inspectable", which is true and is also
what a Plotly advocate would say about JSON configuration. The reason that
survives comparison is narrower and stronger: a grammar states the mapping from
data to channel, and a mark can carry the IRI of what it represents. Those two are
why a specification can be read against a vocabulary, and neither is a property of
being configured in JSON.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-13 | Record why Vega-Lite, with the three answers separated |
| 2026-10-13 | Make Vega-Lite the default renderer, and withdraw a defect that was not real |
| 2026-10-13 | Assess Observable Plot, and record what asking about it exposed |
