# 135 · Linux WebKit in a container, and the two failures it found in an hour

_Created 2026-10-24 · Updated 2026-10-24_

**Status:** tried — the container runs the suite on Linux WebKit, reproduced both standing CI
failures on the first attempt, found one of them to be a defect in the application rather than in
the test, and both are fixed and verified in it.

## What was asked

The practitioner, 2026-10-24: *"Why not set up a docker workflow for Linux Webkit CI?"*

Four WebKit failures across two runs had stood unexplained since 2026-10-20 because they could not
be reproduced on the machine the work is done on. Playwright's `webkit` on macOS is WKWebView; on
Linux it is a different build. Re-running meant pushing again and reading a log.

## The reading that was wrong

The durations argued for a slow runner. The two tests in the most recent failure take 2.0s and
1.1s locally; in CI one died on a 15-second `actionTimeout` and the other took 16.5s. An older
failure, on **chromium**, spent 4.4 minutes against a 240-second budget. An 8–15x spread against
fixed timeouts, in both engines, reads as resource starvation — and it was recorded here as such
before the container was run, so the record shows what the evidence looked like from the wrong
side.

It was wrong. This machine has 14 cores and the container is native arm64, so it is faster than a
shared runner, and both tests failed in it unconstrained on the first attempt — one in 16.8s
against CI's 16.5s. **A fixed wait being reached deterministically produces the same shape in the
log as a slow machine.** Duration alone does not distinguish them; only running it somewhere else
does.

## What the container found

**`workflow-housekeeping.browser.mjs:84` is an application defect.** `openProjectDialog` opens with
`if(busy)return;`. `busy` is true only while a workflow runs, and this test is the only one in the
file that loads `?example=snow-isochrone` — eighteen widgets, which auto-runs on load — rather than
`?example=blank`. On Linux WebKit that run is still going when the test clicks **New project**, so
the click is swallowed, the dialog never opens, and the next step spends fifteen seconds retrying
`fill` on an input that is in the DOM but not visible.

Confirmed by a probe, in the container, on Linux WebKit:

| Probe | Result |
| --- | ---: |
| Click New project while the example is still running | dialog never opens |
| Wait for `Run complete`, then click | dialog opens |

The test's race is the smaller half. **A practitioner who clicks New project while a workflow is
running gets nothing** — no dialog, no message, no disabled control. The run that swallowed it is
not visibly related to the button that stopped working.

**`evidence.browser.mjs:80` is a test asserting more than it means.** In a fresh browser context
the baseline read returns `null`, because nothing has been persisted yet; the comparison after the
refused import sees the blank workflow the application has saved in the meantime. The import is not
shown to have written anything. The assertion says "unchanged" and means "still `null`", and those
are the same only while the write is slow enough. This is the class named on 2026-10-21 in *Assert
what survived the reload, not what the runner happened to see*.

## The instrument

`scripts/linux-webkit.sh`, `npm run test:browser:linux`. It runs the suite in Playwright's own
image, pinned by digest on the same terms as `widgets/examples.json`, because a browser build
verified against a moving tag is verified against nothing. The repository is bind-mounted
**read-only** and copied in, so `npm ci` builds Linux binaries inside the container and the macOS
ones outside it are untouched; the copy includes uncommitted work, so a fix can be tested before it
is pushed. Artifacts — screenshots, traces, error context — are written to a host directory,
because the container is `--rm` and reading them is the whole reason for running it here.

`FIELDWORK_DOCKER_CPUS` constrains the container. It is there because the first reading above was
the resource one, and the two causes have to be separable by something other than argument.

## What was fixed, and what the fixing found

**The control is disabled while a run is in flight**, at the practitioner's decision on
2026-10-24: a control that greys out says the application is busy, where one that remembers the
click would act on an intention formed before the run finished. Four controls needed it —
`#new-project`, `#project-new` and `#blank-project`, which all open the project dialog, and
`#backup-button` — plus the Back up button on each project row, which is rebuilt on every render.

The line they were missing from already existed. `#run-button`, `#new-workflow`, `#add-workflow`,
`#reset-example` and `#tidy-button` have been disabled on `busy` all along, and `#delete-workflow`
is covered separately by `remove.disabled=busy||published`. **The defect was an omission from an
established pattern, not a missing idea**, which is why it survived: nothing about the code looks
wrong, and the control only misbehaves while a run happens to be in flight.

Surveyed, since one omission suggests others: of the handlers opening with the busy guard, the five
controls above were uncovered and the rest were already disabled. `deleteProject` carries no guard
at all and is left alone — whether deleting a project during a run should be refused is a different
question, recorded in TODO.md rather than decided here.

**The second failure was not fixed by the first, and the run that appeared to fix it was luck.**
After the control was disabled, `evidence.browser.mjs` passed 12 of 12 — including the test that
had nothing to do with the control. Repeating that one test five times failed once. It is a
separate race, in the test: a fresh context has not necessarily written its initial state when the
page is ready, so the baseline read returns `null` and compares unequal to the state the
application saves a moment later. The test now waits for that write before taking its baseline.

## Validation record, 2026-10-24

Run in the container on Linux WebKit, arm64, Playwright 1.64.0, Node 24.21.0:

| | Before | After |
| --- | --- | --- |
| `workflow-housekeeping.browser.mjs` (7 tests × 5) | 1 test failed every run | 35 passed |
| `evidence.browser.mjs:80` (× 5) | 1 of 5 failed | 5 passed |

A single green run of the second test would not have established anything, and did not: it took
the repeat to show the first pass was luck.

## The cost

About 1.3 GB of image and roughly a minute of `npm ci` and build before any test runs. A full
browser suite in the container is slower than the host's.

## What this does not establish

- **It is not the CI environment.** The container is arm64; the runner is x86_64. It ships Node
  24.21.0 while CI pins Node 22 and this project requires ≥22. Both failures reproduced across both
  differences, which says those differences did not matter *here*, not that they never will.
- Not that the remaining two of the four failures have the same cause. They were not re-run.
- Not that no failure is resource-related. The 4.4-minute chromium one is still unexplained and was
  not reproduced here; the reading above is retracted for these two tests, not for that one.
- Not that `busy` swallowing a click is confined to New project. Other handlers open with the same
  guard and were not surveyed.
- Nothing about x86_64 WebKit specifically. A failure that needs that architecture would not appear
  in this container, and would look exactly like a flake.
