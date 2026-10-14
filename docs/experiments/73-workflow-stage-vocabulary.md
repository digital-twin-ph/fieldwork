# 73 · What the workflow stages are, and how the old ones were wrong

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** vocabulary rewritten. Recorded because the glossary now reads as
though it was always right, and the corrections are the useful part.

## What was there

Six stages: discovery, acquisition, extraction, import, application,
presentation. They came from `check-pack.py`, which asks what a **pack** supplies.

## The test that broke them

From the practitioner: a workflow has three stages — input, process, output — and
anything that does not map to one of them is not a stage.

| | Input | Process | Output |
| --- | --- | --- | --- |
| Six old stages | 4 | 1 | 1 |

**Four of six were input.** The six were an input taxonomy with one process stage
and one output stage attached, which is correct for a pack — a pack supplies data
and vocabulary and little else — and wrong as a description of work.

Everything else found that day follows from it. **Application was vague because
it was the only process stage**, so it absorbed thirteen of twenty-four widgets
and distinguished nothing. Presentation was thin for the same reason.

## What it is now

**Input** — discovery, acquisition, extraction, import.
**Process** — check, compute, relate, summarise, classify.
**Output** — view, composition.

## The corrections, and what each cost

| Was | Now | Why it was wrong |
| --- | --- | --- |
| "A request naming a resolved location — never data" | Discovery is learning enough to decide whether to fetch, and **must be able to fail** | The removed `healthsites_discovery` made no network call at all. It could only agree with itself |
| "A bounded artifact from something too large to read here" | Taking the part a workflow needs, and recording which part | "Too large" was measured false the same morning: 71.7 MB by Range out of 9.24 GB |
| Application | Not a stage. A claim about whose science a result rests on | It answered "whose work is this?" while the others answered "what did you do?" |
| Judgement | Classify | Fieldwork does not judge. It applies a criterion the practitioner stated |
| Presentation | View, Composition | The elaboration already existed in [17](17-workflow-publication-products.md) and [36](36-communication-layer.md) and had never reached the glossary |
| Release | Removed | Publishing is outside Fieldwork. Output ends at the export |
| Scoping | Removed | The study area is a source node with an output port. It is input |

## Three things worth keeping

**Group by what an operation does to the data, not what it is for.** Every
mistake above grouped by purpose. `mean_center` was moved to compute because
"spatial statistics is analytic computation", then moved back when the test
became row count: 250 points become one, so it is a summary. Purpose cannot be
tested; row count can.

**The row-count test matched an existing split.** One result per record is
computing; many records becoming fewer is summarising. That turns out to separate
**local** spatial statistics (Getis-Ord, LISA — one value per feature) from
**global** ones (mean centre, Moran's I — one value per layer). A test invented
for one purpose landing on a distinction statisticians already draw is weak
evidence it cuts at a real joint.

**A definition pinned to a capability limit goes stale.** "Too large to read in a
browser" was written when that seemed obvious and was false within a day. Define
by what the stage does.

## What this cost

Ten commits, no experiment record until this one. The reasoning lived in commit
messages, which nobody greps, and the glossary showed the result without the
error. Three reversals happened in the same afternoon, each after the
practitioner asked a question rather than asserting an answer.

## Not established

The five process verbs have never been applied to a new widget. They were derived
from 24 existing ones and describe them; whether they help somebody design a
widget that does not exist yet is untested. By the standard in
[the rule audit](../audits/rule-audit.md), they have not fired.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Record the stage vocabulary rewrite as a finding, not only as a result |
