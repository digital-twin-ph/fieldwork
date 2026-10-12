# 102 · Widget names and worked examples

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** retired — this re-derived an audit that already existed, less accurately, and is
kept only to record that and to carry the two things in it that were new. The live record is
[the widget design audit](../audits/widget_audit.md).

## What this document got wrong

The practitioner observed that no widget should be name-attached to a worked example, raising it
about the sea-level widgets. This document audited all 51 against that principle and reported
eleven example-attached widgets as a finding.

**That audit already existed and was run on 2026-10-09.**
[`docs/audits/widget_audit.md`](../audits/widget_audit.md) classifies every widget into four
quadrants, one of which is *"**Example node** — bakes in one demonstration's specifics. Belongs
in a template"*, with nine members: `places`, `centers`, `alert`, `facilities`, `samples`,
`xpert`, `policy`, `access_policy`, `comparison_map`.

The existing audit is better in three ways.

**Its list is right and this one was not.** It puts `nearest`, `access` and `facility_audit` in
**Composite** — "nothing residual, but asked for by name" — which is a different and more
accurate judgement than example-attachment, and it catches `comparison_map`, which this document
missed.

**It had already answered the sea-level question, for this practitioner, two days earlier.** A
section added 2026-10-10 — *"after a practitioner asked what the essence of this widget is and
whether it is a one-off"* — concludes that `slr_site_assignment` **is** a one-off of
nearest-neighbour-with-distance, that nothing about the operation is sea-level-specific, that the
distance is computed exactly as `nearest` and `access` compute it, and that the residue is a
single validity rule which the Manila example already satisfies by restricting its site layer —
so the third input does nothing. That is a sharper answer than this document's "fully generic".

**And it already counts the duplication.** *"Nearest-neighbour with distance | `nearest`,
`access`, `slr_site_assignment` | Three. One is labelled a domain widget, two are standard."*

This document also offered a defence the record does not support: that the `slr_*` names are
protected because they belong to a pack. **Pack work is postponed** —
[67](67-sample-raster-at-points.md) says the missing raster-sampling primitive *"is the gap that
postpones the pack work rather than the other way round"* — so a pack namespace is not an active
programme those names can shelter behind.

## The two things here that were new

**The rename mechanism is already in use.** `places` and `centers` both carry `migrationFrom`
adapters into `observations`, as do `output` → the three output widgets, `facilities`, and
`healthsites_discovery` → `find_health_facilities`. A worked-example name has already been
replaced by a general one, with a migration, in this codebase. The audit records the problem;
this records that the path out of it is paved.

**The three sea-level widgets are not equally generic**, where the audit examined only
`slr_site_assignment`:

| Widget | Generic? |
| --- | --- |
| `slr_site_assignment` | Fully — and the audit says so at more length |
| `slr_extract_import` | Mostly. The shape is general; the required keys (`scenario`, `basis`, `family`, `year`, `quantile`) and the three obligatory citations are AR6's |
| `slr_threshold_comparison` | **No.** Refusing an elevation not measured from the baseline sea surface is real domain knowledge, and saying so is part of why the widget exists |

So the principle lands hard on one of the three, partly on the second, and barely on the third.
"Rename the sea-level widgets" is not one decision.

## Why this happened, which is the useful part

The audit lives in `docs/audits/`, the experiments in `docs/experiments/`, and this project's
habit is to reach for an experiment. Nothing checked whether the question had been asked before,
and `docs/audits/widget_audit.md` is referenced from the TODO's sibling `rule-audit.md` entry but
not from anything about naming.

**It is the second time this has happened.** [93](93-gamification-spike.md) re-derived
[27](27-workflow-learning-and-gamification.md) and found out through a citation. The status
vocabulary in [the experiment standard](README.md) was added in direct response to that, and it
would not have prevented this one: 27 was mis-read as an answer when it was a question, whereas
here the prior work was in a different directory and was never looked for.

What would have prevented it is one grep of `docs/` for the widget names before writing. That is
cheaper than the document it would have replaced.
