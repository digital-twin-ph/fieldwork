# Audit — Old Naledi, the heat example, and bespoke ruleset code

_Created 2026-11-11 · Updated 2026-11-11_

Asked by the practitioner on 2026-11-11, of **Select nearby facilities** (`facilities`): *"Is select nearby facilities
widget used in any worked example?"* Only Old Naledi uses it. The practitioner's decision on what this audit found:
*"What we will do instead is retire old Naledi as an example along with its bespoke widgets."* "Instead" replaces TODO
6, which would have rebuilt Old Naledi on standard widgets and moved it to a repository. Then, chosen from two each:
**both workflows retire**, and **now, before the stale-text sweep**.

## Summary

| Finding | Evidence | Outcome |
| --- | --- | --- |
| Old Naledi was never finished | TODO, 2026-10-12: *"Old Naledi is an incomplete example that was never revisited"*; TODO 6 open since 2026-11-08 | The example retires: both workflows, diagnostic access and raster clipping |
| `facilities` and `facility_audit` exist for it alone | `widgets/evidence.json`: Old Naledi is the only example use of each; `facilities` owes a lab check, `facility_audit` has none | Both retire outright |
| Three standard widgets lose their only example | `widgets/evidence.json`: Clip raster (raster clipping only), Point grid and Travel time (Old Naledi only) | Clip raster and Point grid stay, recorded as used by no workflow; Travel time is partly duplicated (below) |
| Its captions and Inspector text are design commentary | `src/app.ts`, `src/old-naledi-ui.ts` | Removed with it |

Regime (AGENTS.md, retiring a widget): outright, no deprecation period. Nobody outside this project has built on Old
Naledi or its widgets.

## Duplication: what exists because of Old Naledi, against the rest of the palette

The practitioner, 2026-11-11: *"As part of that audit, we will look at the widgets that only exist because of Old
Naledi and check for duplication of function of other widgets."* Read 2026-11-11 from each definition's ports and
description (`src/core.ts`, `src/old-naledi.ts`), first releases, and `widgets/evidence.json`.

| Component | Why it exists | Duplicated by | Finding |
| --- | --- | --- | --- |
| `facilities`, Select nearby facilities (area + points → facilities) | Old Naledi's candidate set: facilities within a radius of the study area's bounding-box centre | **Keep points inside the area** (area + points → points), which bounds by the area itself; **Area around a point** then Keep points, where a radius is wanted | Duplicated. A radius from a box's centre is a point nobody names; its output type `facilities` is a custom stud only Old Naledi's chain reads |
| `facility_audit`, Evidence register (points → decisions) | Old Naledi's per-facility evidence listing | **Table** (points), and **Apply ruleset** for the classification | Duplicated |
| Study area's dataset source (`source` unset, `dataset`) | Study area was born in Old Naledi: its first release (2026-10-06) names `src/old-naledi.ts#OLD_TYPES` as its definition. Drawing, administrative units and countries were added on top and this branch stayed: a second settings form only Old Naledi's saved workflow uses, and the run sends any area not drawn to `executeOldNode`, which returns Old Naledi's boundary | Study area's own drawn or acquired boundary; **Polygon layer** | Duplicated, and a defect beside it: one example's data compiled into a general widget, kept alive by a settings form its dialog cannot reach (the practitioner, 2026-11-11: *"for Study Area, why do we have widget code interlinked with an example's?"*). Goes with the example; Study area keeps one form |
| Rulesets `nb06-evidence` and `access-review`, and four bespoke Apply ruleset projections (`facility-grading`, `facility-grading-points`, `access-review`, `access-review-distances`) | Old Naledi's diagnostic evidence and access review; what the retired `xpert`, `access` and `access_policy` migrate to | **Apply ruleset's authored rules** (the `declared` projection), which classify any table without a code path per ruleset | The projections are code that only these two rulesets reach. `nb06-evidence` cites NB06 and three papers, so its knowledge is not nothing; no example uses either ruleset once Old Naledi goes |
| `travel_time`, Travel time from distance (distances → distances) | Old Naledi's walking-minutes proxy | **Apply ruleset**, which computes a value for every record (Derive a value retired into it, 2026-11-08), once a distance is read as a column; **Network isochrone** and **Reachable junctions** for routed time | Partly duplicated: the arithmetic is Apply ruleset's; what it adds is reading the `distances` value directly and stating "a proxy, not a routed time" |
| `point_grid`, Point grid (area → points) | Old Naledi's sample locations; generalised 2026-10-12 | Point data's synthetic records are random and for testing, not a stated spacing | Not duplicated; stays, with no example |
| `clip_raster`, Clip raster (area + raster → raster) | Old Naledi's raster clipping | Sample a raster totals a raster over areas; it does not mask one | Not duplicated; stays, with no example |

## Decided on the duplication findings

The practitioner, 2026-11-11, choosing from two each:

| Finding | Decision |
| --- | --- |
| Rulesets `nb06-evidence` and `access-review`, and their four bespoke projections | **Retire with the example.** Apply ruleset keeps its general authored rules |
| `travel_time` | **Retire it too.** Apply ruleset's computed column is the arithmetic, once a distance can be read as a column |
| `point_grid`, `clip_raster` | Not duplicated; they stay, with no worked example |

## Beyond Old Naledi: no bespoke ruleset code

The practitioner, 2026-11-11: *"There should be no bespoke ruleset widgets."* Apply ruleset's projection switch in
`src/core.ts` held six code paths written for one ruleset each. Old Naledi's four go with it. Two remain, found by the
same reading:

| Code path | Ruleset | Used by | To do |
| --- | --- | --- | --- |
| `outreach` | `outreach-criteria` 1.0.0, 1.1.0 | the heat example (itself listed for retirement in TODO's deferred items) | Convert to the `declared` projection, or retire with the heat example |
| `polygon-extent` | `extent-review` 1.0.0, 1.1.0 | Snow's outbreak extent workflow | Convert to the `declared` projection with the workflow's results held identical, then delete the path |

**Decided** (the practitioner, 2026-11-11, from two each): **retire the heat example in this pass**, with
`outreach-criteria` and its `outreach` path; **convert `extent-review` in this same pass**, so Apply ruleset ends it with
no bespoke code.

Also found: Hagelloch's authored rules carry `outreach-criteria`'s identifier as the pinned ruleset, titled "Rules
written in this workflow" (`src/hagelloch-example.ts`). Rules written in a workflow should not borrow another
ruleset's identity; it goes when `outreach-criteria` does.

## What a saved workflow meets

A workflow saved with `facilities`, `facility_audit` or `travel_time` is refused by name, with what replaces each: Keep
points inside the area for the selection; Apply ruleset and Table output for the record check; Apply ruleset's computed
column for travel time from distance. The already-retired `xpert`, `access` and `access_policy` migrated to Apply
ruleset with `nb06-evidence` or `access-review` pinned; with those rulesets retired, they are refused by name too.

## Also affected

- Experiment [199](../experiments/199-an-agent-based-model-in-the-browser.md)'s spike placed its agents in Old
  Naledi's homes; it needs another population.
- TODO's deferred "Revisit the Gaborone ABM notebooks for smaller worked examples" was framed as raising Old Naledi.

## What this audit does not establish

Whether a later Gaborone example, built from the ABM notebooks, should bring any of this back. Whether the rulesets
Old Naledi pinned (diagnostic evidence, access review) remain worth keeping without it is read during the removal and
recorded here.
