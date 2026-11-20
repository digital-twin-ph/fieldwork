# 226 · Table operations as challenges

_Created 2026-11-20 · Updated 2026-11-20_

**Status:** asked. A design, written before the code.

## The question

On 2026-11-20 the practitioner built a DR Congo workflow by copying the Botswana population workflow, and met, in one
afternoon: a census read with "level" as its value because of the column's name; Append rows refusing it and blaming
the wrong table; a one-column wide read that could not be applied; a fetched table that reopened empty; and two
connections removed by clicks meant to pan. Each was a table operation meeting a real file in a combination no test had
tried. The practitioner: *"We need to stress test all the table operations"*; *"A worked example just for table
operations with gotchas and manual repair walkthroughs would be helpful for new users"*; then *"perhaps we can add some
excitement to table operations worked example. We can gamify it. Option for user to use the manual walkthrough but also
another option to do it without walkthrough, in which case each correct step is scored with each run workflow, tries are
counted as well as incremental successes"*; and *"We can build as many challenge scenarios as workflows. We can treat
this as an experiment."*

So: does solving a broken table workflow, scored against its goals at each run, teach a new user the table operations
better than following the manual's steps?

## Looking back

- [223](223-a-table-step-shown-on-a-small-example.md): table steps shown on a made-up example, step by step. A
  walkthrough shows; it does not ask the person to do.
- [180](180-brazil-dengue-and-area-exposures.md) and the worked examples' manuals: steps a test performs, so a
  manual cannot drift from the application. The same steps serve here as the walkthrough and as hints.

## The design, proposed

- **A worked example of its own**, `example-table-operations`: made-up district tables (CC0), one workflow per gotcha,
  each arriving broken as a new user would meet it. As many challenges as workflows.
- **Two ways into each:** *Walk me through*, the manual's steps; *Solve it*, the broken workflow and its goals, no steps.
- **Goals, checked at each run against what the run made:** columns, value names and units, row counts, totals, values
  present or absent, steps and connections present -- what the receipts already state. Written as data, in each
  workflow's `challenge.json`, read by one checker in Fieldwork: a new challenge, or a trainer's own, needs no code.
- **Scored:** each goal met or not yet after each run; the runs taken (tries); the goals met so far (partial success).
  A hint reveals the manual's next step and is counted. Kept on the device; nothing is sent.
- **Kept true:** for each challenge a test plays the manual and reaches every goal, and a test runs it unfixed and
  meets none, so a broken challenge cannot ship.
- **Seen and read:** text at 15 px, ✓ and ✗ beside words, never colour alone, read to a screen reader after each run.

## Decisions open

1. Hints: cost something, or only counted.
2. Tries: every run, or only a run after a change.
3. Time: not proposed; speed is not the skill.

## What it commits to, written before the result

- The gotchas come from the stress tests of every table operation (planned after 0.154.0) and from what practitioners
  meet, recorded as they are found.
- A challenge is shipped only when both of its tests pass.
- **Practitioner observation, which can come out badly:** given a challenge in *Solve it*, does a new user reach the
  goals, and say afterwards what each refusal meant? Or do they turn to *Walk me through* at once?

## What it does not establish

Anything yet. That scoring motivates rather than distracts is not known; that the gotchas found by testing are the ones
new users meet is not known.
