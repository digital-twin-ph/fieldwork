# 177 · Where a figure goes in the write-up

_Created 2026-11-05 · Updated 2026-11-05_

**Status:** tried — built in Map 0.20.0, Table 0.7.0 and Chart 0.10.0. The NYC example's fifth workflow files its
study-area map under Introduction, built from its manual in a browser on 2026-11-05 ([178](178-points-from-xy.md)).

## The task

The practitioner, 2026-11-05, on whether the NYC data locates its emergency departments: *"We can certainly add a
study area map that goes to the IMRAD Introduction section of Notes."* Then: *"all output widgets may have default
IMRAD sections but it should be flexible"*, and *"don't forget to update the ontology, esp rules for section mapping of
output widgets."*

## What existed

Every output widget's machined note was filed under **Results**, hard-coded in `src/artifact-notes.ts`. The figure is
drawn beside its note, so no table, chart or map could appear anywhere else in the write-up.

## What was built

| Piece | Where |
| --- | --- |
| The four sections a figure may go in, and each output widget's default (all Results) | `FIGURE_SECTIONS`, `DEFAULT_FIGURE_SECTIONS` in `src/notes.ts` |
| The setting, *In the write-up, under*, on every Map, Table and Chart output | `src/app.ts`; stored as `params.section`, absent when it is the default |
| The note filed in the chosen section | `src/core.ts`, after each output's description note |
| The step's receipt states `fw:figureSection` and `fw:figureSectionDeclared` | `publishedArtifactFacts` in `src/artifact-notes.ts` |
| Each output widget's `fw:defaultFigureSection` | generated into `ontology/widgets.ttl` from the same constant |
| Terms | `fw:figureSection`, `fw:figureSectionDeclared`, `fw:defaultFigureSection` in `ontology/runtime.ttl` |

| Distinction | Enforced as |
| --- | --- |
| A figure goes in Introduction, Methods, Results or Discussion; References holds works | validation rule: `fw:FigureSectionShape`, a closed `sh:in` |
| The note describing a figure is filed where the step says the figure goes | validation rule: `fw:FigureFiledWhereDeclaredShape`, `sh:equals` over the path `fw:machinedNote / fw:noteSection` on the real receipt |
| A section chosen is a different decision from one defaulted | stated on the receipt, `fw:figureSectionDeclared` |
| The ontology's defaults are the application's | generated from one constant, and a unit test reads both |

## Validation

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-05 | `tests/write-up-shapes.test.mjs` | 15 of 15: a figure in each of the four sections conforms; a note filed elsewhere, a figure under References, and a receipt stating no section are refused; the defaults in `widgets.ttl` equal the application's |
| 2026-11-05 | `tests/figure-section.browser.mjs` | South London's ground map moved to the Introduction is filed there in Notes after a run, and nowhere in Results; returning it to Results removes the setting. Chromium |
| 2026-11-05 | `tests/evidence.browser.mjs` | a live South London run's receipts conform to the new shapes. Chromium |
| 2026-11-05 | unit suite | 1,427 passed, 0 failed |

## Found on the way: the NYC map could not be built from the manual

The NYC package carries no emergency-department locations: its outcome is one citywide daily count. It does carry
each air monitor's coordinates, 15 sites across ozone, PM2.5 and NO2, in its site-day files. Nothing in Fieldwork
turns a table's longitude and latitude columns into points. Point data reads a file from the practitioner's machine
or takes pins placed by clicking, and a worked example's manual can do neither: it fetches by URL, and a clicked pin
is not a monitor's position. Resolved by giving Point data a table as a source ([178](178-points-from-xy.md)). The boroughs were reachable, as geoBoundaries USA ADM2 (Census TIGER 2018, public domain,
3,233 units, 10.5 MB), through the study area.

## Practitioner observation, written before the result

Whether a practitioner looks for the section setting on the output, or expects to move the figure in Notes.

## What this does not establish

- That any default but Results is right for any widget. All three default to Results; the per-widget default exists
  so one can differ, and none does.
- That a figure's section is moved when its note is moved by hand in Notes. A machined note is re-filed by every run
  from the output's setting; moving it in Notes is not read back.
- Anything about front matter. A title, an abstract and a study-area figure caption are not machined.
