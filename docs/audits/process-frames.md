# The palette, classified by process frame

_Created 2026-10-17 · Updated 2026-10-17_

_Created 2026-10-17_

**Status:** a classification, not a disposition. Every widget is placed; nothing is
retired, merged or renamed by this document.

## Why this exists, and the term it uses

The practitioner, 2026-10-17, after the five-directions reading of
`slr_site_assignment` found that nineteen of thirty-six palette entries sat in one
group: *"input, and output are somewhat stable widgets because we know what kinds of
data are available for ingestion into a spatial epidemiology pipeline, and we also
know what kinds of outputs are needed. What's not so clear are between inputs and
outputs, considering the use case, what needs to be process widgets to bring the
outputs to fruition?"*

Reading the cholera notebook families as traversals rather than as code gives one
answer, and the same answer each time. **The frame differs; the path doesn't.**
Basic walks ingest → centrography → view. Advanced-1 walks ingest → isochrone →
assign → summarise → view. Advanced-2 walks ingest → Voronoi → assign → summarise →
view. Geoprivacy walks ingest → H3 or donut → view. Voronoi, isochrone and H3 are not
three unrelated operations; they are three answers to one question — *what regions am
I reasoning about* — and each dragged its own assignment and summary machinery into
the palette alongside it because nothing named the question.

**On the word "frame".** The practitioner has assigned it to process steps: *"we use
frames for process steps. Essentially the frames become the widgets."* This document
writes **process frame** in full, because the glossary currently spends "frame" twice
more — `"A stated frame"` for the coordinate reference system, and `"boundary frame"`
inside **Vintage** — and [119](../experiments/119-can-this-tell-a-story.md) used
"frames" for narrative structure until the practitioner moved that to chapters or
sections the same day. Three live senses is the shape of the D collision, which cost a
correction after the fact. The glossary migration is not done, so this document does
not assume it.

## Method

Each active widget is placed by its **declared port signature**, not by its palette
group or its name. `widgets/port-contracts.json` is the source; a widget that takes
points and emits polygons is constructing regions whatever it is called.

Retired widgets are excluded. 46 of the 53 are active.

## The counts

| Process frame | Widgets | What the practitioner decides here |
| --- | --- | --- |
| **Bound** | **1** | how much ground am I willing to pull |
| Ingest | 7 | what data do I have |
| **Regions** | **14** | what regions am I reasoning about |
| Assign | 7 | which region does each record belong to |
| Summarise | 5 | how much, where |
| Classify | 3 | what does this record count as |
| View | 4 | what does the reader see |
| Underlying operation | 3 | nothing — a mechanical consequence |
| Protect | 1 | what may be disclosed |
| Composition | 1 | — |

The practitioner's hypothesis holds on the numbers. The ends are small and settled —
**1 bound, 7 ingest, 4 view, 12 together**. The middle is **29**, and **half of it is
region construction**.

## The classification

### Bound · 1

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `study_area` | `— → area` | Sources |

### Ingest · 7

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `alert` | `— → alert` | Sources |
| `find_health_facilities` | `area → points` | Sources |
| `network_input` | `— → network` | Sources |
| `point_input` | `— → points` | Sources |
| `raster_input` | `area → raster` | Sources |
| `slr_extract_import` *(domain)* | `table → table` | Sources |
| `table_input` | `— → table` | Sources |

### Regions · 14

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `buffer_area` | `area → area` | Spatial operations |
| `buffer_point` | `points → area` | Spatial operations |
| `clip_polygons` | `area+polygons → polygons` | Spatial operations |
| `fill_interior_gaps` | `polygons → polygons` | Spatial operations |
| `hex_aggregate` | `points → polygons` | Spatial operations |
| `isochrone` | `network+points → polygons` | Spatial operations |
| `point_grid` | `area → points` | Spatial operations |
| `reachable_corridor` | `network+points → polygons` | Spatial operations |
| `reachable_nodes` | `network+points → points` | Spatial operations |
| `stack_polygons` | `polygons → polygons` | Spatial operations |
| `summarize_combined_area` | `polygons → polygons` | Summaries **·group disagrees** |
| `summarize_hull` | `points → polygons` | Summaries **·group disagrees** |
| `travel_time_band` | `points → points` | Spatial operations |
| `voronoi` | `area+points → polygons` | Spatial operations |

### Assign · 7

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `clip_raster` | `area+raster → raster` | Spatial operations |
| `coverage_check` | `area+points → coverage-check` | Comparisons and checks **·group disagrees** |
| `facilities` | `area+points → facilities` | Spatial operations |
| `measure_distance` | `points → distances` | Spatial operations |
| `sample_raster` | `points+raster → points` | Spatial operations |
| `slr_site_assignment` *(domain)* | `points+table → table` | Spatial operations |
| `snap_to_network` | `network+points → points` | Spatial operations |

### Summarise · 5

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `case_series` | `points+table → table` | Summaries |
| `compare_point_sets` | `mean-center+points → point-comparison` | Spatial operations **·group disagrees** |
| `mean_center` | `points → mean-center` | Spatial operations **·group disagrees** |
| `rate` | `points → table` | Summaries |
| `summarize_polygons` | `points+polygons → polygons` | Summaries |

### Classify · 3

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `apply_ruleset` | `— → (pinned)` | Semantic reasoning |
| `facility_audit` | `points → decisions` | Summaries **·group disagrees** |
| `slr_threshold_comparison` *(domain)* | `table → decisions` | Comparisons and checks **·group disagrees** |

### View · 4

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `chart_output` | `decisions+polygons+table → —` | Outputs |
| `comparison_map` | `point-comparison → —` | Outputs |
| `map_output` | `— → —` | Outputs |
| `table_output` | `decisions+points+polygons+table → —` | Outputs |

### Underlying operation · 3

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `measure_area` | `area → area` | Spatial operations |
| `reproject` | `points → points` | Spatial operations |
| `travel_time` | `distances → distances` | Spatial operations |

### Protect · 1

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `donut_geomask` | `points → points` | Spatial operations |

### Composition · 1

| Widget | Port signature | Palette group |
| --- | --- | --- |
| `micro_workflow` | `— → (pinned)` | Micro-workflows |

## What the classification found

**0. `study_area` is a bound, not a region — and that position was missing from the
path.** Filed under regions in the first draft of this document. The practitioner,
2026-10-17: *"It serves to constrain large downloads like rasters, netcdf files, street
networks, zarr files."* That is an **acquisition constraint**, and it is what makes
ingesting large data tractable at all — `raster_input`, `network_input` and
`find_health_facilities` all take an `area` before they fetch anything. Its palette
group says Sources, which was right about this and disagreed with the first draft.

The widget is genuinely dual: the same boundary is also the analytical extent that
`voronoi`, `clip_polygons`, `coverage_check` and `measure_area` reason within. But the
constraining job comes first and nothing else does it, so the path gains a position
ahead of ingest:

```
plan → bound → ingest → regions → assign → summarise → classify → view → communicate
```

`buffer_area` is arguable here for the same reason — its Inspector tells the
practitioner to connect the expanded boundary to Street network, which is a download
margin, not an analytical region. It is left under regions pending the question being
asked properly.

**1. Regions is where specialisation leaks in — 14 of 46.** Voronoi, isochrone, H3,
buffers, hulls, grids, corridors and the four polygon-modifying steps are all answers
to one question. The palette has no place to say that, so each new way of defining
regions arrives as a new entry rather than as a rule inside one.

**2. Three frame properties are computed everywhere and declared nowhere.**
`src/catchments.ts:464` counts `matched`, `unmatched`, `missingLocation` and
`multiple` for every record against a set of polygons. That four-way accounting is the
*consequence* of three properties none of the 15 declares:

| Property | What it decides | Why it changes the reading |
| --- | --- | --- |
| Exhaustive? | can a record fall outside | Voronoi partitions the plane, so `unmatched` is impossible; isochrone covers only what is reachable, so `unmatched` is a finding about access |
| Overlapping? | can a record belong to more than one | Voronoi: never. Buffers and isochrones: routinely |
| Data-dependent? | does the frame move when the data moves | Voronoi seeds move with the pumps; H3 cells do not |

The same number means different things under different properties, and nothing
records which applies.

**3. Four widgets implement one assignment.** `nearest`, `access` (retired),
`slr_site_assignment` and `snap_to_network` differ only in whether the regions are
polygons, points or graph nodes. The widget audit had already found three of them; the
fourth is visible only once assignment is named as a frame.

**4. Seven widgets sit in a palette group that disagrees with their process frame.**
Marked in the tables above. `summarize_hull` and `summarize_combined_area` are named
and grouped as summaries and construct regions; `mean_center` and
`compare_point_sets` are grouped as spatial operations and are summaries;
`coverage_check` is grouped as a check and is assignment;
`slr_threshold_comparison` is grouped as a comparison and is classification;
`facility_audit` is grouped as a summary and is classification. The groups were not
built to this structure and do not survive contact with it.

**5. Only three widgets carry no defensible judgment.** `reproject`, `measure_area`
and `travel_time` are mechanical consequences of decisions made elsewhere — the
candidates for subsumption the practitioner named. That is fewer than the discussion
assumed, and it matters: the case for subsumption rests on these three, not on a
long tail.

**6. `donut_geomask` fits no frame on the path.** It is a protection step, and forcing
it into regions or assign would be the same error this document is trying to correct.
It is recorded as its own frame of one rather than filed under a frame it does not
belong to. The geoprivacy notebooks have never been mapped
([`cholera-notebooks-to-primitives.md`](../research/cholera-notebooks-to-primitives.md)
stops at Advanced-2), so whether that frame has one member or several is not known.

## A correction to this document, 2026-10-17

The first version labelled five active widgets `(legacy)` — `study_area`, `alert`,
`facilities`, `facility_audit` and `measure_distance`. **None of them is legacy.** The
label was an artifact of the script that built the table: it read `src/core.ts` and
`src/catchments.ts` and not `src/old-naledi.ts`, where `OLD_TYPES` holds `study_area`
among others and is spread into the shared palette at `src/core.ts:127`; and its
pattern did not allow the space in `alert: {title:` or `measure_distance: {title:`.
Two bugs, one invented label, committed.

It also suppressed findings. The disagreement check skipped any row marked `(legacy)`,
so `study_area` and `facility_audit` were exempted from it — which is why this document
first reported six disagreements where there are seven.

The constant name is worth noting separately: `study_area` lives in something called
`OLD_TYPES`, and it is the most fundamental widget in the application.

## What this does not establish

**That any widget should be retired, merged or renamed.** This places them; it decides
nothing. The six group disagreements are not errors in the widgets — a group is a
palette affordance and a process frame is a pipeline position, and they were never
required to agree.

**That the path is complete.** It runs ingest → regions → assign → summarise →
classify → view. The practitioner places **plan/strategy before all of it** —
*"it will dictate how the user will make his/her choices about study area, data to
collect, process to deploy, and outputs to generate, ending with story to tell"* — and
**communicate after view**, closing a loop back to the plan.
[119](../experiments/119-can-this-tell-a-story.md) holds both and nothing is built for
either. So this classification covers the middle of a path whose two most consequential
positions are empty, and the criterion that would decide which process frames deserve
a widget — *does this step carry a judgment someone must defend?* — has no referent
until the plan stage declares to whom and against what.

**That the frame assignments are right.** They are read from port signatures, which is
evidence but not authority. `clip_raster` is filed under assign because it restricts
data to a region; it could as well be region construction. `reachable_nodes` is filed
under regions because it produces the reachable set, though its internal work is
assignment followed by traversal. Both are arguable and neither is load-bearing for
the counts.

## What would close it

The plan stage existing, so the judgment criterion has a referent; and the geoprivacy
notebooks mapped, so the protect frame is known rather than assumed.
