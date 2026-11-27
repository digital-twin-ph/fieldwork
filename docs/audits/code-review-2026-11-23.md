# Audit — code and framework quality

_Created 2026-11-23 · Updated 2026-11-27_

Asked by the practitioner on 2026-11-23: a high-level review of the repository for code and framework quality, with
an eye to reducing technical debt and finding hotspots and high-risk areas. Read at 0.168.0 (commit 36baa48e).

The evidence is the tree as it stands: file and line counts, import graphs, grep counts and sampled reads. Nothing was
run to produce it, and no gate was started.

## The shape of the repository

| Measure | Value |
| --- | --- |
| Source (`src/`) | 293 files, 66,160 lines |
| Tests | 261 unit files, 250 browser files, 51,403 lines |
| Validator scripts | 72 scripts, 8,821 lines; 36 steps in `npm run check` |
| Rust kernel | 7 files, 5,320 lines, 56 unit tests |
| Node type union | 73 widgets in `widgets/registry.json` |
| Git history | 1,437 commits; `.git` is 543 MB, of which the committed `build/` directory is most |

Strict TypeScript, no `@ts-ignore` or `@ts-expect-error`, no `eval`, no `new Function`, `npm audit` clean, 19
dependencies behind and none vulnerable. No linter or formatter is configured.

## Hotspots

**1. `src/app.ts`, 9,333 lines.** 197 imports, 258 top-level functions, 31 top-level `let` bindings holding the
application's state, 194 DOM lookups, 132 `innerHTML` writes. `renderInspector` alone is 1,198 lines. It is the
most-changed source file in the last 400 commits (130 of them). The Inspector move has already taken it from 11,024
lines to 9,333; batches C to E are queued in [TODO.md](../../TODO.md). Nothing else in the tree comes close, and the
gating audit's finding that conditional gating cannot pay off follows from this file alone.

**2. `src/core.ts`, 3,061 lines.** `executeWorkflow` is one function of 1,688 lines: a single `switch` with 52
`case` arms, one per node type, each doing the computation, the receipt and the edge lookup inline. `validateWorkflow`
is 450 lines and carries the migrations. The file holds 124 of the codebase's 275 `as unknown as` casts, nearly half.
That cast is where the type system is told to stand aside, so a port-contract mismatch here passes the compiler and
surfaces at run time.

**3. The release gate.** 38 minutes of browser time at one worker, 13 at four, a 75-minute CI bound raised twice after
cancellations ([gating audit](gating-audit.md)). The gate cannot get shorter until app.ts stops being the file every
widget edits; hotspots 1 and 3 are one fact seen from two sides.

## High-risk areas

| Area | Finding | Evidence |
| --- | --- | --- |
| Worker typechecking | `netcdf-worker.ts`, `sha256-worker.ts` and `space-time-scan-worker.ts` are in neither tsconfig's worker list, so they are checked under the DOM lib. A window-only call would compile and fail in the browser | `tsconfig.json`, `tsconfig.workers.json` |
| Untested modules | 67 of 293 source modules are named by no test. Largest: `study-area-map.ts` (875 lines), `map-ui.ts` (566), `georeference-ui.ts` (551), `relate-ui.ts` (537). The browser suite reaches them through the page; nothing asserts on them by name | grep of `tests/` for each module's basename |
| Non-null assertions | 680 uses of `!.`; 83 in app.ts, 49 in core.ts. In `executeWorkflow` edges are looked up with `.find(...)!` | grep |
| HTML rendering | 265 `innerHTML` writes against 449 `textContent`. Escaping is used where user text appears, but the helper is defined five times (`input-data-ui.ts`, `lab-evaluation-ui.ts`, `map-inset.ts`, `ruleset-json.ts`, `kit.esc`). No unescaped user-controlled interpolation was found by grep | grep |
| Rust kernel | 264 `unsafe` blocks, most at the FFI surface; `scan.rs` has no Rust unit test. Its correctness rests on the lab's parity entries, which are after release, not in the gate | `kernel/src/scan.rs`, `widgets/parity.json` (48 entries) |
| Storage | Five modules each open their own IndexedDB database at version 1; 21 modules read localStorage directly. No shared layer, so no shared migration path | `evidence-storage.ts`, `file-handles.ts`, `payload-store.ts`, `satellite-reading-store.ts`, `session-keep.ts` |

## Technical debt, in order of return

1. Finish the Inspector move (batches C to E). Everything below gets cheaper after it.
2. Break `executeWorkflow` into a dispatch table keyed by node type, one module per arm, the way `buffer_point`
   already delegates to `bufferPoint`. The 124 casts move with the arms into files where each can be tightened.
3. Add the three missing workers to `tsconfig.workers.json` and exclude them from `tsconfig.json`. Three lines.
4. One `esc` helper, in `inspector-kit.ts`; the other five replaced.
5. A Rust unit test in `scan.rs`, one fixture, so the gate catches a kernel regression before the lab does.
6. A thin storage module wrapping the five `indexedDB.open` calls.
7. Dependencies: `@xyflow/react` 12 to 13 and `proj4` 2.19 to 2.23 are the two with breaking-change potential. No
   urgency; none is vulnerable.

Items 3 and 4 are small enough for any chat. Item 2 needs a fresh chat with room to run a gate.

## What is healthy and should stay

The validator chain and the `widgets/*.json` ratchets are the strongest part of the framework: slow, and what makes
retirement, naming and admission mechanical rather than argued. Error handling is deliberate: 660 `catch` clauses, 66
of them returning a default, none empty. Only 8 `console.*` calls in `src/`. The committed `build/` directory is the
reason clones are heavy and is a deployment choice, not a defect.

## Acted on, 2026-11-23

Items 3 and 4 were taken the same day, at 0.184.0.

- **Item 3 is closed.** `netcdf-worker.ts`, `sha256-worker.ts` and `space-time-scan-worker.ts` are in
  `tsconfig.workers.json`, so they are checked without the DOM lib. Checking them found no window-only call: the
  hole was open, and nothing had fallen into it. Six other workers sit in both configs, which is stricter than
  either alone, so the three were added rather than moved.
- **Item 4 is half closed, and the other half is a finding of its own.** One `escapeHtml` now lives in
  `inspector-kit.ts` and the four identical definitions import it. But the duplication was not one rule copied: it
  is **three** rules. Ten modules escape `[&<>"']`, seven places escape `[&<>"]` without the apostrophe
  (`avatars.ts`, `prose.ts`, and `data-table-ui.ts` five times), and two escape only `&`, `<` and `>`
  (`map-inset.ts`, `ruleset-json.ts`). A value escaped by a weaker rule and placed in a single-quoted attribute
  can leave it. The weaker variants are **not** changed here: altering what they escape changes their output, and
  each needs its own check first. That is the remaining work, and it is larger than the item implied.
- `inspector-kit.ts` was added to `build.mjs`'s entry list so it has a standalone output. It had none, which is why
  nothing could unit-test it -- an instance of this review's own "67 modules named by no test", and the reason the
  count is a floor rather than a measure.

## Re-read 2026-11-25, at 0.199.0

Asked by the practitioner on 2026-11-25. The same counts were taken again on 0.199.0 (commit 20d36049), 50 commits
and 31 releases after the first reading, with the same greps. The sections above stand as the record of 0.168.0.

| Measure | 0.168.0 | 0.199.0 |
| --- | --- | --- |
| Source (`src/`) | 293 files, 66,160 lines | 307 files, 70,881 lines |
| Tests | 261 unit, 250 browser, 51,403 lines | 274 unit, 272 browser, 54,839 lines |
| Steps in `npm run check` | 36 | 33 |
| Widgets in the registry | 73 | 76 |
| `src/app.ts` | 9,333 lines, 197 imports, 31 top-level `let` | 8,893 lines, 179 imports, 27 top-level `let` |
| `renderInspector` | 1,198 lines | 764 lines, 44 node types still rendered inline |
| `src/core.ts` | 3,061 lines | 3,280 lines |
| `executeWorkflow` | 1,688 lines, 52 `case` arms | 1,827 lines, 54 `case` arms |
| `as unknown as` | 275, of which 124 in core.ts | 294, of which 139 in core.ts |
| Non-null `!.` | 680; app.ts 83, core.ts 49 | 739; app.ts 79, core.ts 50; 31 `find(...)!` inside `executeWorkflow` |
| `innerHTML` / `textContent` | 265 / 449 | 273 / 458 |
| Modules named by no test | 67 of 293 | 74 of 307 |
| Kernel | 264 `unsafe`, 56 tests, `scan.rs` 0 | 294 `unsafe`, 60 tests, `scan.rs` 0 |
| Dependencies behind | 19, none vulnerable | 23, none vulnerable |

**What closed.** Item 1: the Inspector move finished in 0.172.0, batches A to D done and E dropped with the sea-level
steps' retirement. app.ts lost 440 lines and `renderInspector` 434, so hotspot 1 is smaller but not gone: 44 node
types are still drawn inside it. Item 3 closed at 0.185.0. Item 4 is as the 2026-11-23 entry left it: one
`escapeHtml` with five importers, and the weaker rules still in place, nine modules on five characters, seven places
on four, two on three (`map-inset.ts`, `ruleset-json.ts`).

**What grew.** core.ts took the weight app.ts lost. `executeWorkflow` is 139 lines and two arms longer, and the
casts moved with it: 139 of 294 are now in that file, up from 124 of 275. The direction of the Inspector move was
right, and it moved rendering, not execution. Item 2 is now the largest single piece of debt in the tree.

**The gate changed shape.** `verify` moved off every push and onto a nightly run in its own workflow at 0.192.0
([CI verification audit](ci-verification-audit.md)): it had reached a verdict four times in fourteen under the
cancellation rule, and the first nightly run took 59 minutes with 3 failed of 620. The local gate stays Chromium only,
so WebKit is exercised once a day and nowhere else; 0.199.0 found two new test files red on WebKit for that reason.
Conditional gating was replayed on 2026-11-22 over 24 releases and declined again: at most 2.1 minutes saved in a
gate, because app.ts was in every release ([gating audit](gating-audit.md)).

**Revised order of return.**

1. Break `executeWorkflow` into a dispatch table, one module per arm. Takes the 139 casts and the 31 `find(...)!`
   with it. Needs a fresh chat with room to run a gate.
2. The 44 node types still drawn inside `renderInspector`, onto the standard Inspector, as the move's last batch.
3. The two three-character escapes, then the seven four-character ones, each with a check first.
4. A Rust unit test in `scan.rs`. Unchanged since 0.168.0.
5. A storage module over the five `indexedDB.open` calls. Unchanged.
6. The nightly WebKit run's margin: 59 minutes against a 75-minute bound, with the suite growing by 22 browser files
   in two days. The CI audit records it; nothing here adds to that.

## Acted on, 2026-11-25, at 0.200.0

Asked by the practitioner on 2026-11-25: *"Let's address the remaining issues."* All six items of the revised order
were taken in one release. Four of the earlier readings were wrong, and each is corrected here rather than above.

| Item | What was done | Evidence |
| --- | --- | --- |
| 1. `executeWorkflow` | Each arm moved into a function in one of seven `src/run-*.ts` modules, given a `StepContext`; `src/step-runners.ts` maps type to function. Moved by a script reading the TypeScript parse tree, so a `break` inside a loop kept its meaning and only one that left the switch became `return value`. Six arms, for seven retired types, removed | `tests/step-runners.test.mjs`; 2,038 unit tests pass |
| 2. `renderInspector` | Branches for seven retired types removed, with their wiring, subtitles and palette defaults in `app.ts`. The four live widgets still drawn inline were **not** moved | see below |
| 3. Weaker escapes | All eighteen copies point at `src/html-escape.ts`, which names no DOM type so workers can import it | `tests/escape-html.test.mjs` fails on a copy put back |
| 4. Kernel tests | `npm run test:kernel` in `check` and `check:fast`, on one thread; six tests added in `scan.rs` | 66 Rust tests pass; a loosened window bound fails one |
| 5. Storage | `src/local-database.ts`: one open, bounded at five seconds, rejecting with its reason; each store keeps its own way of failing | five unit tests; the timeout test does not pass with the timer disabled |
| 6. Nightly margin | Not acted on. The CI audit holds it | [CI verification audit](ci-verification-audit.md) |

| Measure | 0.199.0 | 0.200.0 |
| --- | --- | --- |
| `src/core.ts` | 3,280 lines | 1,826 lines |
| `executeWorkflow` | 1,827 lines, 54 `case` arms | 416 lines, a lookup |
| `as unknown as` | 294, of which 139 in core.ts | 288: 17 in core.ts, 119 in the run modules |
| `find(...)!` in the executor | 31 | 1 in core.ts, 28 in the run modules |
| `src/app.ts` | 8,893 lines | 8,832 lines |
| `renderInspector` | 764 lines | 714 lines |
| Rust tests run by the gate | 0 | 66 |
| Modules named by no test | 74 of 307 | 81 of 317 |

The casts and non-null assertions moved; they were not removed. Each is now in a function of one step, where it can
be tightened alone. The untested count rose because the seven run modules are named by no test, although every run
of a workflow goes through them: the measure is by name, as stated below.

**Corrections to the earlier readings.**

- **The kernel scan was checked in the gate all along.** `tests/space-time-scan.test.mjs` runs each scan through the
  kernel and the script and requires the same exceedances and p-values. What was missing was the Rust tests running
  at all. Run for the first time, two failed in parallel on every run: `abm.rs` and `declared.rs` share statics. The
  product was never affected, since the compiled module runs one call at a time.
- **"44 node types still drawn inline" counted routes, not Inspectors.** Most branches call a module's own Inspector.
  Drawn inline are four live widgets, Chart, Point data, Apply ruleset and Measure distance, and the seven retired
  types now removed. Moving the four means standardising their Inspectors, manual pages and walkthroughs, which is widget
  work for the practitioner to order. **Since:** Apply ruleset moved to `src/ruleset-ui.ts` in 0.201.0; Chart
  (`src/chart-ui.ts`), Measure distance (`src/distance-ui.ts`) and Point data (`src/point-data-ui.ts`) in 0.202.0, with
  nothing a practitioner sees changed.
- **The weaker escapes were not defects where they stood.** No template places a value in a single-quoted attribute.
  The one real fault found among them was elsewhere: the wide reader looked a column up by its escaped name. It was
  masked by the pass that follows, and a browser test written for it passed on the old code too, so it was not kept.
- **The storage risk was not migration.** Five databases each have their own version, which keeps one store's upgrade
  from waiting on another's. The defect was an open that could wait for ever in four of the five.

**What this does not establish.** The browser suite was run on Chromium only, locally; WebKit runs in the nightly
workflow. Widget release records still name `src/core.ts` among their implementation files and not the run modules,
because release files are not edited after release; a rule that reads changed files against those lists will not see
a change to a run module as a change to its widget. `drawn`, the executor's paint clock, is now set through
`markDrawn` by the one step that yields to the page, and no test observes it.

## What this does not establish

Structure, counts and samples were read. The gate was not run, no widget's data flow was traced, and the kernel's
numerics were not reviewed. The `innerHTML` finding is a grep, not a proof of absence. The untested-module list is by
name match, so a module exercised only through the page appears as untested. The 2026-11-25 re-read repeated the
same greps and inherits the same limits; the two readings are comparable with each other and with nothing else.
