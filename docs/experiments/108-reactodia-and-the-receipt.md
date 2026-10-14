# 108 — Reactodia, and the thing we have never drawn

_Created 2026-10-13 · Updated 2026-10-13_

**Status:** asked

Asked by the practitioner on 2026-10-13, after settling that the VOWL notation
they wanted was already a dropdown in our own ontology site (see the OntoInk
finding below). The question was whether [Reactodia](https://github.com/reactodia/reactodia-workspace)
should be explored too.

## What it is, measured rather than described

| | |
| --- | --- |
| Version | 0.35.2, published 2026-08-08; repository pushed 2026-10-07, not archived |
| Licence | **LGPL-2.1-or-later** |
| Shape | A **React library**, not an application. `npm install @reactodia/workspace`; you build the UI |
| Peer dependencies | React 17, 18 or 19 |
| Dependencies | `n3`, `d3-color`, `clsx`, `file-saver`, `@reactodia/worker-proxy` |
| Backend | **None required.** It parses a local Turtle file in the browser with N3.js; SPARQL is one pluggable data provider among others |
| Scope | Both schema and instance graphs. Expand-on-demand diagramming, which is its distinguishing behaviour |
| Not included | No VOWL notation. No SHACL validation. No OWL reasoning |
| Reach | 36 stars, effectively one maintainer |

## Where it does not fit, and why that is now settled

**Not the ontology site.** `fieldwork-ontology` is MkDocs, and OntoInk — already in
`requirements.txt`, MIT, already configured — renders interactive Cytoscape.js
diagrams with **VOWL, Chowlk and Graffoo style presets**, SHACL validation,
OWL-RL reasoning and inline Turtle editing. All sixteen diagram fences across six
pages already carry the style dropdown; the default is `ontoink` because
`fence.py` hardcodes `selected` and reads no `style` key. So for that job
Reactodia would mean adding a React build pipeline to a Python docs site in order
to get **less** than we already ship — no VOWL, no shapes, no reasoning.

A correction worth recording, because it was the whole reason this question came
up: the argument for adopting WebVOWL rested on our not having VOWL. We did have
it. Nobody had opened the dropdown.

## Where it might fit — the receipt

The run receipt is this project's central artefact. It is what the ontology, the
rulesets, the port types and the provenance work all exist to produce. And it is
presented as **a wall of Turtle in a `<pre>`** — `app.ts:206` sets
`$('#n3-preview').textContent=runEvidenceText()`, and `app.ts:831` concatenates
`result.receipts.map(receiptText)`. Nothing draws it.

That is the gap, and it is the one place the fit is good:

- OntoInk draws the **vocabulary** — the classes and properties, the TBox. A
  receipt is **instance** data, the ABox: this run, these activities, these
  entities, these port types. Reactodia is an instance-graph explorer, which is
  the other half.
- **React is already here.** This was my own wrong assumption earlier in the
  session: Fieldwork declares `react@^19.3.0` and `@xyflow/react`, and
  `src/canvas.tsx` is the node canvas, mounted from `app.ts:40` via
  `mountCanvas`. I had grepped `build/app.js` for "react", found nothing, and
  nearly concluded the dependency was inert — code splitting had put React in a
  shared chunk. So the integration cost is a component, not a framework.
- `n3` is already a devDependency and `rdf-validate-shacl` with it, so parsing a
  receipt client-side needs nothing new.

## What this does not establish

That a graph is the right view of a receipt. A receipt is read to answer "what
produced this number and under which rule", which is a path question, and a
force-directed diagram is not obviously better than text at answering it — our
own `#n3-preview` is at least searchable and copyable. This document records a
fit between a tool and a gap; it does not show that the gap hurts anyone. No
practitioner has yet asked to see a receipt drawn.

It also does not establish that the licence is acceptable. **LGPL-2.1 and
Apache-2.0 are incompatible** in the FSF's reading, because of the Apache patent
clause against the GPLv2 family. The `-or-later` matters: it permits taking the
library under LGPL-3.0, which *is* Apache-2.0 compatible, so the combination is
workable — but that is a deliberate licensing decision about an Apache-2.0
project, not a detail. LGPL §6's relinking obligation also wants the library
separable rather than fused into one bundle, which our esbuild code splitting
happens to give us already.

And it does not establish that a 36-star, single-maintainer library belongs in a
studio that vendors its reasoner and pins most dependencies to exact versions.

## What would close it

A spike behind a flag: one run of the Old Naledi example, its receipt loaded into
a Reactodia workspace from the same N3 the `<pre>` shows, put in front of a
practitioner beside the text. Close it `validated` if a question they actually
ask is answered faster on the diagram than in the text; close it `retired` if the
text wins, and record that the receipt view is a text problem — in which case
folding, filtering and search in `#n3-preview` is the cheaper answer and should
be the next experiment instead.

Either way the licence question is answered **before** the spike ships, not
after, because an Apache-2.0 project taking an LGPL dependency is a decision the
practitioner makes and not one a spike makes by accident.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-13 | Record experiment 108: Reactodia, and the thing we have never drawn |
