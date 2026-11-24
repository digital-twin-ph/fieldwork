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
leg verified what had just been verified. Removing it halves the browser work and leaves the engine that nothing else
exercises.

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
