# Audit — verification on CI

_Created 2026-11-24 · Updated 2026-11-24_

Written after four releases went out in one afternoon and the run for each was reported to the practitioner. The
third report noted that `verify` had been cancelled rather than failed, which prompted counting how often it reaches
a verdict at all. The practitioner, on the three remedies offered: *"Agree with 3 and 2. Yes write to audit."*

The evidence is the last fifteen runs of **Publish GitHub Pages** on `main` (2026-11-23 20:39 to 2026-11-24 21:54),
their job conclusions, and `.github/workflows/pages.yml` as it stood. Nothing was run to produce it: the runs had
already happened.

## What CI is for here, and it is not publishing

Publishing does not wait for verification, and that was decided deliberately — `pages.yml` records the measurement
of 2026-10-18, where a push took 25 to 41 minutes to reach the site and 30.1 of those were the gate re-run on the
runner, against 0.1 minutes to publish. So `build` and `deploy` answer "is the site current", and they have been
reliable: of the fifteen runs, **every single `deploy` succeeded**.

`verify` answers a different question, and it is the only thing here that answers it. The release gate run before
every push is **Chromium only** on this machine; WebKit is exercised nowhere else. Whatever `verify` is worth, that
is where its worth lies.

## Verify reaches a verdict four times in fourteen

| outcome | runs |
|---|---|
| cancelled | 10 |
| failure | 3 |
| success | 1 |

(The fifteenth, for 0.191.1, was still running when this was written.) The last complete clean verification was
0.177.0 at 2026-11-23 20:39 — one in the twenty-five hours that followed.

## Why: a cancellation rule that outlived its premise

`pages.yml` carried, on the `verify` job:

    concurrency:
      group: pages-verify-${{ matrix.browser }}
      cancel-in-progress: true

with the reasoning beside it: *"A superseded verify is verifying a commit nobody is looking at any more, and two
30-minute gates queued behind each other is how the old lag was built."* That is sound when a release is further
apart than a verification. It no longer is. A complete `verify` takes 60 to 75 minutes — the timeout was raised to
75 on 2026-10-29 for exactly that reason — and the releases of 2026-11-24 landed 24 to 48 minutes apart:

    0.179.0  00:20     0.183.0  02:42     0.188.0  17:12
    0.180.0  01:08     0.185.0  03:30     0.190.0  19:49
    0.181.0  01:32     0.186.0  04:07     0.191.0  21:30
    0.182.0  01:57     0.187.0  11:17     0.191.1  21:54

So each release cancelled the verification of the one before it. The rule did what it says; the cadence changed
under it. Nobody chose to stop verifying.

## What it cost, and what it did not

The cost is specific: the one check that the local gate cannot perform is the one that mostly did not run. There is
evidence it is worth running — 0.188.0's WebKit job did complete, and failed on `tidy-and-reset.browser.mjs`, a node
added from the library not arriving within a 10-second poll (13 expected, 12 seen). No Chromium run would have found
it, and the local gate could not have.

**This audit does not establish that WebKit is broken.** Ten cancellations are ten absent verdicts, not ten hidden
failures, and a cancelled run is recorded as cancelled rather than as green, which is honest. What it establishes is
that the net was absent on most days of this stretch, so the project did not know either way.

Nor does it establish that the three observed failures were real defects. Two of the three — 0.187.0's
`nigeria-from-scratch` at 10.2 minutes and `seven-one-seven` at 18.2 seconds — are timeouts of the kind that pass on
re-run and are recorded elsewhere as runner starvation. The third, 0.190.0's `shared-sealed`, was traced the same day
to a race in the test rather than in the application, and fixed in 0.191.1.

## What was decided

Two changes, chosen by the practitioner from three offered:

**The Chromium leg of the matrix goes.** The release gate covers Chromium on this machine before every push, so that
leg verified what had just been verified. Removing it halves the runner MINUTES and leaves the engine nothing else
exercises.

> **Corrected 2026-11-24, the same day.** This first said that removing the Chromium leg "halves verify's wall-clock,
> which would let it finish inside your release cadence". That was wrong, and the correction matters because it was
> offered as a reason for the choice. The matrix ran the two engines as PARALLEL jobs -- the job's own comment, moved
> into `verify.yml`, says *"ONE JOB PER BROWSER, side by side ... neither waits on the other"* -- so the wall-clock was
> already one engine's duration, not two. Dropping Chromium halves what the runner spends, not how long a verdict
> takes.
>
> Measured immediately afterwards: the first nightly-shaped run, dispatched by hand on `568ab175`, took **59 minutes**
> for WebKit alone, 55.1 of them browser tests. So option 3 by itself would never have fitted a 24-to-48-minute
> release cadence. What makes verification reach a verdict is option 2, the schedule. Option 3 earns its place by not
> paying twice for Chromium, which is a smaller and different claim.

**Verification moves off the push and onto a nightly schedule**, against whatever `main` holds at the time, with
`workflow_dispatch` for when someone wants it sooner. Per-commit verification was never achieved in practice; one
complete WebKit verdict a day is more than the four-in-fourteen it replaces.

Taken together these make the cancellation rule almost inert — nightly runs do not overlap — so it stays as a guard
rather than as the mechanism it had become.

**It moves to its own workflow file.** Put a `schedule:` trigger on `pages.yml` and `build` and `deploy` fire nightly
too, republishing a site that has not changed, unless each job is gated on the event name — which means editing the
publishing path in order to change the verification path. A separate file leaves `build` and `deploy` exactly as they
are.

## What this gives up, stated plainly

A WebKit regression can now live on `main` for up to a day before anything reports it, where previously it *could*
have been caught within the hour. Against that: within this stretch it would have been caught within the hour once in
fourteen releases. The trade is a worse bound in theory for a better one in practice, and `workflow_dispatch` is
there for the day a WebKit-shaped change makes waiting for the night the wrong call.

## The first run under the new arrangement (2026-11-24, dispatched by hand)

Dispatched rather than waited for, because a `verify.yml` that did not work would have meant no verification at all --
strictly worse than four-in-fourteen, and not discoverable until the morning.

It ran: 59 minutes on `568ab175`, **3 failed, 617 passed**, well inside the 75-minute bound, with one `verify` job
rather than two. All three failures are WebKit and all three are UI timing -- `buffer-point-inspector`,
`relate-proposed-keys` and `sample-satellite-areas-offline`, failing on "element(s) not found", `toBeVisible` and
`toHaveValue`.

**A fourth failure from the run before it did not recur.** `large-study-area-map` failed on WebKit in the run for
`a3458e79` with *"Fetch API cannot load ... /build/asset-manifest.json due to access control checks"*, and reproduced
on this machine under WebKit; `568ab175` changed no `src` file, and it passed here. So that one is intermittent, not
deterministic, and the earlier report of it as reproducible was true of two attempts rather than of the test.

What this says about the engine, stated carefully: WebKit has several real disagreements with Chromium in this suite,
and they were not visible while verification was being cancelled. It does not say they are new, or that they are
defects in the application rather than in the tests' assumptions about timing -- three of the four are waits, and the
fourth is a fetch the application already catches.
