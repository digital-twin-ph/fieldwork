# Audit — the release gate

_Created 2026-11-19 · Updated 2026-11-19_

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

## What this does not establish

- That the slow tests rarely catch defects. One window of 37 gates over four days is not a rate.
- The widget dependencies at each commit: each widget's current release was read, not its release at the time.
- That widget releases name all their files. A missing file would make a conditional rule skip silently.
- Savings under other loads. Gate 214 took 45 minutes on a similar suite.
- Whether the NYC and Nigeria published projects came from live runs. That was inferred from their contents.
