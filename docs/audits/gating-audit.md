# Audit — the release gate

_Created 2026-11-19 · Updated 2026-11-23_

Asked by the practitioner on 2026-11-19, while gate 219 ran: *"Why does gate 219 take that long?"*, then *"Maybe
conditional gates, where things will likely fail given the updates?"*, and, on the proposal to write it up as an
experiment: *"Not an experiment. This is an audit of gating."*

The evidence is the logs of gates 182 to 218 (37 gates, 2026-11-15 to 2026-11-19) and the commits between them. Each
failure was traced to the change that ended it. Nothing was run to produce it.

## How long a gate takes, and where

A gate builds, runs the validators and unit tests (about 7 minutes), then every browser test on Chromium, one at a
time. Gate 218: 557 tests in 223 files, 38.1 minutes of browser time.

| What | Time | Share |
| --- | --- | --- |
| The nine from-scratch tests, each building an example by following its manual | 15.8 min (Brazil alone 7.5) | 41% |
| The accessibility scan | 5.1 min | 13% |
| The other 213 files | 17.2 min | 45% |

The files run in name order, so the slowest come first and a gate looks stalled for its first quarter hour: about 30
tests in 15 minutes, then 200 in the next 10.

## What the gate caught

Of 37 gates, 16 failed.

| Kind | Gates | What |
| --- | --- | --- |
| **Real defects in the code** | 189, 196, 213, 215 (one of its three) | A CHANGELOG paragraph where a bullet belonged; the georeferencing pane not reachable by keyboard; a vendored licence file with no date stamp; a map's PNG export broken by an invalid XML attribute |
| A test made wrong by an intended change | 183, 187 | Fixed in the test |
| A test catching a passing moment | 199 | A toast measured mid-fade; fixed in the test |
| **A live service** | 193, 198, 208, 209, 210, 215, 216, 217 | Sentinel-5P files (5) and geoBoundaries downloads (3), slow or refused |
| The machine | 186, 212 | A new dependency not yet in the shared `node_modules` |

**No from-scratch test caught a code defect in this window.** Every time one failed, it was a live boundary
download. The accessibility scan caught one (196).

## Conditional gating, replayed over 32 releases

**The proposal:** run build, validators, unit tests and the quick browser tests always. Run a from-scratch test only
when the change touches its example, its manual or the code of a widget its manual adds. Run the accessibility scan
only when styles or dialog markup change. Shared files force the full gate, and there is a full gate at least once a
day.

| Rule | Full gates, of 32 | Saved per gate |
| --- | --- | --- |
| As proposed | 27 | 2.3 min |
| A `package.json` change that is only the version bump does not count | 22 | 3.9 min |
| … and a `build.mjs` change that only adds a module does not count | 20 | 5.0 min |
| … and `src/app.ts` is not a shared file | 5 full, but the same tests still run | 5.0 min |

**Why it saves so little.** `src/app.ts` (11,024 lines) changed in 18 of the 32 releases. Each widget's release names
its code files, and 34 of 72 widgets name `app.ts` and 66 name `core.ts`. Every from-scratch test uses some of those
widgets. So a rule that reads which files changed cannot tell the tests apart.

**What it would have missed.** As proposed, nothing. With the two refinements, gate 196's defect would have been
missed. That release made the accessibility scan stricter, which exposed a fault in a file that had not changed. So a
test must always run when its own file or its helpers change.

## A gap the gate cannot see

**The Brazil example was published on 2026-11-07 holding the satellite search its from-scratch test makes up**
(`MOD11A2.p0.fixture` and on). An export had been saved from a run whose Planetary Computer answers were stubbed.
Every gate passed for twelve days: the test that would have shown it reads only the stub. The practitioner found it
on 2026-11-19, running the published example.

| Test | Stubs | Can export | Guarded |
| --- | --- | --- | --- |
| Brazil from scratch | Planetary Computer MODIS, unless `BRAZIL_SATELLITE_LIVE` | `BRAZIL_EXPORT` | From 0.151.1 |
| NYC from scratch | Sentinel-5P, unless `SATELLITE_LIVE`; Zenodo from a local copy | `NYC_EXPORT` | From 0.151.1. Its published project is clean |
| Nigeria from scratch | the PMTiles archive, unless `NIGERIA_REAL_TILES` | `NIGERIA_EXPORT` | From 0.151.1 |
| Sea level from scratch | the geoid grid, only when not exporting | `SEA_LEVEL_EXPORT` | Already |
| Sierra Leone from scratch | GRID3 facilities, from a recorded copy | `SIERRA_LEONE_EXPORT` | A recorded copy, not made up; it can go stale |
| Every browser test | OpenStreetMap tiles, answered blank | the exports above | Not checked whether a blank tile can reach an export |

From 0.151.1 a unit test reads every example checked out beside Fieldwork and fails on any address or name a stub
writes.

## What the evidence supports

1. **Conditional gating by changed files is not worth adopting now.** It saves about 5 minutes in 38, and only by
   rules that would have missed one of the four real defects unless patched.
2. **Most failures were live services, not code.** Seven of the ten environmental failures were Sentinel-5P or
   geoBoundaries. Answering them from recorded copies in the gate, as Sierra Leone's facilities already are, and
   checking the live services separately would remove most red gates that mean nothing.
3. **A published example needs a check the gate does not give.** Each example's own services, read live once a day,
   would have found the Brazil example on 2026-11-08 instead of 2026-11-19.
4. **Saving real time needs finer coverage than files.** Either record which functions each slow test runs, from a
   coverage run, or move the code they share (the Notes, the publication and the static figures, which most often
   changed) out of `app.ts` into modules a widget can name.

## Decided

- **`app.ts` is split opportunistically** (the practitioner, 2026-11-19: *"We can be opportunistic again with app.ts like
  we did with widgets."*). When a widget is touched, its Inspector branch, its Configure… opener and their helpers move
  to the widget's own module in the same pass, as its move to the standard Inspector already does, and its release
  stops listing `app.ts`. No refactoring campaign of its own. Measured from 2026-11-19: `app.ts` 11,024 lines, of which
  `renderInspector` 2,172; 34 of 72 widgets list `app.ts`.

## Measured: browser tests in parallel, 2026-11-19

The practitioner: speeding up the gate is a priority. Nothing recorded why the browser tests ran one at a time on a
14-core machine with 36 GB, so the number of files run at once was measured on the full Chromium suite (557 tests),
outside any gate, at 0.151.2 in development:

| Workers | Time | Passed | Failed | Load |
| --- | --- | --- | --- | --- |
| 1 (gate 220) | 46.6 min | 551 | 0 | |
| **4** | **13.1 min** | 551 | 1, a release note not yet regenerated, fails alone too | about 13 on 14 cores |
| 8 | 14.4 min | 551 | 1, `recovery-urls`, which passes at 1 and 4 | |

**Decided: the gate runs 4 at a time** (`scripts/gate.sh`, `FIELDWORK_WORKERS`, default 4; `playwright.config.mjs`
keeps 1 for a run by hand unless set). The limit was found, not chosen: past 4 the cores are saturated, it is slower,
and a test starts to fail beside the others. **Not established:** whether 5 or 6 is faster still.

**The first gate at 4 (gate 221) failed on `recovery-urls`**, the test that had failed at 8: its browser tests took
13.2 minutes, 551 passed. The cause was a race in the test, not load on the application: after the cleanup address,
the page goes to "/", and the application then opens its default example and rewrites the address; the test waited
to catch "/", which a busier machine passes by. It now checks that the cleanup address is gone and the application has
started again: 16 of 16 at 4 workers, Chromium and WebKit. Running in parallel did not cause the fault; it exposed one.

## Decided 2026-11-19, after gates 223 and 224

Both gates failed only on live downloads (Brazil's 65.7 MB of boundaries from geoBoundaries, at about 33 KB/s; the
South London example from GitHub), and `validate:sentence-numbers` spent about 25 minutes reading satellite files from
Planetary Computer: it says *"Nothing else is fetched"*, but it held 27 connections to Azure. Not counted above.

- **Recorded copies in the gate** (the practitioner: *"Agree with 1 and 2"*): Sentinel-5P, Planetary Computer,
  geoBoundaries and the examples' files answered from recorded copies, as Sierra Leone's facilities already are.
- **The from-scratch tests on several workers**, measured as the browser tests were.
- **The live services checked in the cloud, not in the gate.** First proposed nightly on the Mac, at midnight and
  after any running gate (*"Live check should be done at mignight"*; *"if there's no gate running at midnight,
  otherwise it waits"*); then only on changes that touch them (*"only when we touch satellite or raster facing
  updates"*); then on GitHub (*"Can we do those checks instead on the cloud on GitHub?"*). Settled: a workflow of its
  own, run on a push that touches code reading an outside service and weekly on Sunday at midnight in New York, since
  services change with no change of ours; a failure opens an issue and never blocks a release. The rule against
  editing `.github/workflows` is lifted for this one file (*"Let's override #1. I will update token permissions."*).
- **Conditional gating by coverage is not pursued.** Moving widgets out of `app.ts` makes rules by file finer at no
  cost; it is measured again after the three changes above.

## Built 2026-11-20: the live services checked weekly on GitHub

Found first: the verify job in `.github/workflows/pages.yml` has no recorded copies, since they are kept beside this
repository and not in it. Every push has therefore been checked against the live services all along; only the local
gate is answered from copies. What was missing was a check when nothing is pushed, and a record when one fails.

`.github/workflows/live-check.yml` runs the browser tests in Chromium against the live services (`FIELDWORK_LIVE=1`),
weekly on Sunday at 05:00 UTC and on demand, with the pinned repositories placed beside this one as verify places them.
A failure opens an issue titled *Live services check failed*, or adds to the open one, listing the failed tests and
linking the run; it never blocks a release. It does not run on a push, which verify already covers.

**Not established:** that the weekly run passes; it has not run yet. Whether two workers fit a shared runner's time.

## Measured 2026-11-20: what a gate asks of the outside world

Every request leaving this computer during the Chromium browser suite (572 tests, four at a time) and
`validate:sentence-numbers` was logged, with `FIELDWORK_NETLOG` naming a file (`tests/fixtures.mjs`,
`scripts/sentence-numbers.mjs`).

| Where | Requests | From |
| --- | --- | --- |
| Planetary Computer's storage (MODIS land surface temperature) | 27,728 | `validate:sentence-numbers` |
| Planetary Computer's catalogue | 9 | `validate:sentence-numbers` |
| OpenFreeMap tiles | 17 | 3 basemap tests |
| Overpass, three servers | 6 | 1 accessibility scan |
| GitHub, raw files | 3 | 2 accessibility scans |

The browser suite is nearly self-contained already; the sentence check was the gate's outside dependency, and 5 min
38 s of its time.

**Decided by the practitioner, the same day:** the gate leaves the workflows that search a satellite catalog to the
weekly live check, which runs the sentence check with `FIELDWORK_LIVE=1`. Four are left: NYC's NO₂ and Brazil's three
temperature workflows. The gate's sentence check then took 21 s and made no outside request. Recording Planetary
Computer's answers was the alternative, not taken: hundreds of MB, unmeasured.

**Not established:** that the four pass in the weekly check before it has run; whether the 26 remaining outside
requests in the browser suite ever fail a gate.

## Replayed 2026-11-22, after the Inspector move

Asked by the practitioner on 2026-11-22: replay the rules over every release since 2026-11-19, once batches C to E of
the Inspector move were done. The replay covers 24 releases, 0.151.0 to 0.170.0. Each release's changed files were
compared with the release before it. A widget's files were read from **its release record at that commit**, not from
today's, which closes one of the gaps listed below. A from-scratch test was taken to use a widget when the widget's
type appears in the test file or in its example repository's JSON. Times are from the last gate (0.170.0, 620 tests).
At that gate the twelve from-scratch tests took 19.8 minutes of browser time, Brazil 8.8 of it. The accessibility scan
took 6.0 minutes.

The proposal was refined first, as the audit had suggested. A version-only change to `package.json` or
`package-lock.json` does not count. Neither does a change to `build.mjs` that only adds a module to its list.

| Rule | Full gates, of 24 | Saved per gate, browser time | At 4 workers, wall time |
| --- | --- | --- | --- |
| `src/app.ts` a shared file | 24 | 0 | 0 |
| `src/app.ts` not shared: each test runs when its widgets' files change | 23 | 1.7 min | about 25 s |
| … and `src/core.ts` not counted | 23 | 1.9 min | about 30 s |
| … and `src/types.ts` and `styles.css` not counted | 23 | 2.1 min | about 30 s |

**Why it still saves so little.** The Inspector move cut the widgets naming `app.ts` from 34 of 72 to 29 of 73. In
the same window, 67 widgets name `core.ts`. Two other things outweigh both:

- **Releases are batched.** One release, one gate: a release changed from 63 to 400 files, about 200 on average.
- **The shared modules now carry the load.** The standard Inspector moved code into a few modules that many widgets
  name. After `styles.css` and `core.ts`, the files that most often decided a test should run were
  `src/data-table-ui.ts`, the census tables' catalogue, `src/types.ts`, `src/config-dialog.ts` and
  `src/catchment-map.ts`.

Only one release, 0.165.0, would have skipped most from-scratch tests (11 of 12).

**What it would have missed: nothing.** Four gates in the window failed because a from-scratch test found a fault:

- **228:** five manuals quoted a label that had changed.
- **242:** the rulesets example ran into the new arriving-columns check.
- **251:** the rulesets and sea-level manuals still said Save Edits.
- **254:** Brazil's manual kept a key that Relate had proposed; this one was a defect in the code.

In every case the rules would still have run the test that found it. The accessibility scan would have run at 23 of
the 24 releases.

**Item 5, checked.**

- **Recorded copies are in the gate.** geoBoundaries is answered from `../fieldwork-recorded` (`tests/recorded-copies.mjs`).
- **The from-scratch tests share the gate's four workers.** The browser part of the last gate took 14.1 minutes,
  against 38 at gate 218. Its floor is Brazil's 8.8 minutes, one test on one worker.

**What the evidence supports.** Conditional gating by changed files is still not worth adopting. With releases batched
and the standard Inspector's shared modules, a rule by file saves under a minute of a 14-minute gate. The next saving
is in Brazil's test: at 8.8 minutes it sets the floor of a 14-minute gate.

## CI's verify, 2026-11-18 to 2026-11-23

CI's verify runs each browser on its own shared runner, one test file at a time (`FIELDWORK_WORKERS` is not set in
`.github/workflows/pages.yml`), with a limit of 75 minutes.

| Browser | Successful runs | Median by day | Longest | Stopped at the limit |
| --- | --- | --- | --- | --- |
| Chromium | 27 | 46 to 61 min | 70 min | 1 |
| WebKit | 14 | 52 to 62 min | 74 min | 2 |

No steady rise shows in five days. The margin is the problem: a successful WebKit run comes within 1 to 27 minutes of
the limit, and three runs reached it.

**0.170.0's WebKit verify failed** on `hagelloch-who-infected-whom` (run 45090224607). Locally it failed 1 time in 4.
The test reloaded and opened Configure… before the page was ready. Once it waited, WebKit's service worker refused the
reasoning worker "due to access control checks", as in `relate-proposed-keys`. The fix is the same as there: wait for
`html[data-ready]` and block service workers. After the fix it passed 20 of 20 on WebKit and 20 of 20 on Chromium.

**Measured 2026-11-23, the first run at two workers (0.170.1, run 45103751148):** Chromium's verify took 34 minutes and
passed. WebKit's took 68 and failed 17 tests: 9 were WebKit's service worker refusing `reasoning-worker.js` "due to
access control checks", the error seen in single tests before, and the rest page errors and timeouts of the same run.
WebKit is set back to one worker; Chromium stays at two.

**0.171.0 (run 45113294353):** Chromium at two workers 36 minutes, WebKit at one 58. Both failed only on tests of their
own making, fixed in 0.171.1: the line layer's tests wrote pictures to a local folder, and a quick drag counted as a hold
on a loaded runner. No WebKit test failed on the service worker at one worker.

**Not established:**

- Why WebKit's service worker refuses the reasoning worker, and whether Safari users meet it outside tests.
- Whether the workflow edit that two workers need is wanted: `pages.yml` is not the one workflow that may be edited.
- That a file-to-widget map read from release records is complete: a widget whose record leaves out a file would be
  skipped silently, as before.

## What this does not establish

- That the slow tests rarely catch defects. One window of 37 gates over four days is not a rate.
- The widget dependencies at each commit: each widget's current release was read, not its release at the time. The
  2026-11-22 replay read the release at the time.
- That widget releases name all their files. A missing file would make a conditional rule skip silently.
- Savings under other loads. Gate 214 took 45 minutes on a similar suite.
- Whether the NYC and Nigeria published projects came from live runs. That was inferred from their contents.
