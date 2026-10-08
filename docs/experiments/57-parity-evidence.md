# 57 · Parity evidence: what an external process can establish

**Status:** implemented for the two widgets that have it, with the gap measured and visible.

[Experiment 56](56-basis-behind-identity.md) found that all 66 widget release files carry a
self-assessment and no sources, and specified a `methodBasis` vocabulary whose values nobody
could honestly supply from memory. The achievable evidence is different and better:
**independent recomputation**. The [Validation Lab](41-validation-lab.md) already recomputes
Fieldwork's results in Python, from the declared parameters and inputs only, importing no
Fieldwork code. A parity result is a measured claim rather than a citation, and this project can
produce it.

## Where it had to live, which was not where I first put it

The obvious home is the widget release file, beside the `evidence` block. That is wrong, and the
registry said so immediately: release files are **immutable once committed** and their digests
are pinned, so writing parity results into `widgets/releases/reproject/0.1.0.json` produced
`Release digest mismatch`.

The reason is not a technicality. Parity evidence is produced **after** a release, by a different
process, and it accrues: a release describes what a widget does, and evidence records what was
independently checked about it later. Those have different lifetimes, so they need different
files. `widgets/parity.json` is the mutable record, pinned to a Lab commit — the same separation
the pack catalog already uses, where a mutable catalog points at immutable pinned contents.

## What is recorded, and what the two results actually say

| Widget | Release | External | Outcome | Measured |
| --- | --- | --- | --- | --- |
| `reproject` | 0.1.0 | pyproj 3.8.0, PROJ 9.8.1 | **agrees** | maximum separation 6.70 × 10⁻⁵ m over 9 points, against a stated tolerance of 1 mm |
| `clip_raster` | 1.0.0 | rasterio 1.5.2, GDAL 3.12.2, shapely 2.2.0, GEOS 3.14.1 | **partial** | cell-centre agrees, 0 of 132 cells differing and retained values identical; all-touched differs by **2 cells** at a pixel-aligned cutline; the one-pixel margin case differs by 61 cells, where the reference models the margin as a 3 × 3 binary dilation |

Two things in that table matter more than the numbers.

**Parity is per case, not a verdict.** The Lab's own top-level flag for check 02 is
`agrees: false`, which if copied into the registry would have been true and useless: it would
hide that the widget's main mode agrees exactly, that the all-touched remainder is two cells
beside an alignment, and that the third case is an **unresolved comparison rather than an
established defect** — the reference and the widget define the margin differently. An outcome
vocabulary of `agrees`, `partial`, `diverges` and `unresolved` forces that distinction, and the
measurement carries the detail.

**The two residual cells are the tail of a real finding.** They are what remains after adopting
GDAL's positive-area rule, down from 35 ([experiment 29](29-raster-edge-inclusion.md)). Parity
evidence is how that improvement became visible, and recording it keeps the remaining divergence
from quietly becoming invisible again.

## The checks, and which gate each belongs to

- `npm run validate:widgets`, in the offline gate: the parity record's shape, that every entry
  names a widget and a release the registry lists, that outcomes come from the declared set, that
  each entry names an external implementation, a criterion, a measurement and a result digest, and
  that no check is recorded twice for the same release.
- `npm run validate:parity`, outside the gate because it needs a Lab checkout: it digests the
  result file each claim names and reads what the Lab actually reports, refusing a recorded
  `agrees` that sits on a failing result and vice versa. The claim and the evidence live in
  different repositories, so one of them will drift; this is what notices.

Two consequences are reported as notes rather than failures, because they are true states rather
than errors. A `partial` or `diverges` outcome is printed on every run, so a known divergence
cannot be forgotten. And parity recorded for an older release prints **"not re-established"** —
evidence is about the release it was measured on, and a new release inherits nothing, which is
[experiment 54](54-degrees-of-reproducibility.md)'s decay principle applied to validation.

## The gap, stated numerically

**Parity is recorded for 2 of 34 widgets.** `validate:parity` prints the other 32 by name, so the
absence is a visible list rather than an impression. That list is the honest answer to "which of
these has been independently checked", and it is the most useful thing in this record.

Roughly where the remaining 32 sit, as a guide to what is worth building next rather than as a
plan:

| Category | Widgets | External reference available? |
| --- | --- | --- |
| Geometry and projection | `buffer_area`, `measure_area`, `clip_polygons`, `summarize_polygons`, `voronoi`, `mean_center` | Yes — shapely, pyproj's geodesic routines, scipy, geopandas |
| Network | `isochrone`, `network_input` | Yes — networkx shortest paths over the same graph |
| Indexing | `hex_aggregate` | Yes — `h3-py` for identical cell assignment |
| Tabular | `table_input` | Yes — pandas, for the long-format contract |
| Privacy transforms | `donut_geomask`, `compare_point_sets` | Only by independent reimplementation from the documented rule; there is no canonical external implementation, and a seeded displacement reproduced is not a privacy result |
| Reasoning and presentation | `policy`, `access`, `xpert`, `map_output`, `table_output`, `chart_output`, and the rest | No, and parity is the wrong instrument: a rule conclusion is checked by the N3 and SHACL gates, and a presentation by pixel and contrast checks |

That last row is the limit worth naming. Parity establishes numerical agreement for computations
that an external library also performs. It cannot establish anything about widgets whose output is
an inference or a figure, and claiming otherwise would be the same category error as pairing
vocabulary with shapes in the ontology viewer.

## Competency questions

Answerable now:

1. Which widget releases have been independently recomputed, by what, under which criterion, and
   with what measured result?
2. Where a result is partial, which cases agree and which do not?
3. Has parity been re-established for the release that currently runs?
4. Which widgets have no parity evidence at all?

Must be refused:

5. Does parity mean this widget is correct? — it means two implementations agree under a stated
   criterion. They can agree and both be unsuitable for a question.
6. Does parity mean the method is appropriate, or certified? — no. Every release still says
   `not-individually-certified`, and that remains true.
7. Does a privacy transform reproduced from its seed establish anything about privacy? — no, and
   [experiment 54](54-degrees-of-reproducibility.md) notes the inverse is closer to true.

## Practitioner exercise

Run `npm run validate:parity` and read the list of widgets without parity. Pick the one whose
output you would most want to put in a report, and write down what external implementation would
have to agree with it, and under what criterion, before you would. That is the next check, and it
is a better choice than anything a backlog would suggest.
