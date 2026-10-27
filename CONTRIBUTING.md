# Contributing

_Created 2026-10-25 · Updated 2026-10-26_

This is a developmental evaluation, not a build against a specification. Read
[AGENTS.md](AGENTS.md) first: it holds the method, the admission checkpoints a new widget
passes, and the writing rules. This file is the mechanics — what runs, where it runs, and
how work lands.

## The pipeline

One command gates everything:

    npm run check

It takes about **25 minutes** and runs, in order:

1. **`build`** — `tsc --noEmit` over the application and the workers, then the esbuild bundle
   and the offline asset manifest. A type error stops everything here.
2. **Twenty-three validators**, each printing a count and failing on drift. They are not
   lint: most enforce a **ratchet**, a number that may fall and may never rise. Among them —
   documentation date stamps; experiment records and their closed status vocabulary; lab
   check coverage; widget evidence; rulesets; blockers and directions and their revisit
   windows; naming; the widget budget; the admission sweep; ontology coupling; the manual;
   Inspector prose scores; caps; port contracts; release notes; withdrawn vocabulary; packs.
3. **`node scripts/test-unit.mjs`** — the Node test suite, about 20 seconds.
4. **`npm run test:browser`** — Playwright, **Chromium and WebKit**, about 20 minutes.

Both browsers are the default and the configuration says why: Tauri on macOS runs WKWebView,
so a Chromium-only run would report green on work that cannot render there. **A number
reported to anybody must come from the default projects**, or must name the browser it came
from in the same sentence.

`FIELDWORK_BROWSERS` and `FIELDWORK_TEST_PORT` make a targeted run cheap while you work:

    FIELDWORK_BROWSERS=chromium npx playwright test tests/map-output.browser.mjs -g "layer identity"

That is for the loop. It is not a result.

## Where a gate runs

**Gate a commit in a worktree, not your working tree:**

    scripts/gate.sh            # gates HEAD in ../fieldwork-gate, on port 4184
    scripts/gate.sh <ref>      # gates any commit

The worktree is detached at a commit and symlinks this checkout's `node_modules`, so setup
costs nothing and the gate uses exactly the dependencies you develop against.

Why it is worth the indirection:

- **Your tree stays usable for the 25 minutes.** Gating the working tree means freezing it,
  because a gate whose tree moved under it describes nothing.
- **What is validated is what you would push.** The order is commit, gate, then fix and
  amend if it fails — rather than gate, then commit something slightly different.

Each tree has its own `build/`, so building while a gate runs is fine. `npm ci` and
`npm install` are not: `node_modules` is shared and the gate would lose its dependencies
mid-run. Keep other heavy work off the machine too — `micro-workflow.browser.mjs` takes 4
seconds idle and 22 to 26 under load, and has failed a gate for no reason but contention.

**Before you start a gate**, have the typecheck clean, the unit suite clean, and every
browser test you touched passing on both engines. A gate is a landing check, not a
development loop.

## Generated files

Several files are written by a script and checked by a validator. Editing them by hand is
pointless; the next run overwrites them. [AGENTS.md](AGENTS.md) lists them with their
generators, and records the one ordering trap: **run `stamp:docs` before `names:widgets`**,
because `docs/widget-names.md` is both generated and stamped.

If a validator reports drift in a file you have just regenerated, check whether something
else wrote to it afterwards before looking for a defect in the generator.

## How work lands

**Branch.** Work on a branch named for the work. Rename it when it outgrows its name rather
than letting the name lie — `rate-reads-a-table` currently carries a worked example, a
catalog, a lab check and a basemap, which is a fair warning about how fast that happens.

**Commit by concern.** One commit per thing changed, where the files allow it. Where two
changes share a file and cannot be split by hunk, say so in the first line of the message
rather than pretending they are one change.

**Write the message for the next reader, not the diff.** The diff already says what changed.
A message here says what was wrong, what the evidence was, what it does not establish, and
the gate result. Dated practitioner reports and measurements belong in it. This is the same
standard the code comments are held to, and for the same reason: the finding is the thing
worth keeping.

**Merge policy.**

- A branch merges when **the gate is green on the commit being merged**, not on an earlier
  commit of the same branch. Re-gate after a rebase or a squash: the tree changed.
- **Fast-forward where the history allows it.** A merge commit that records nothing is noise;
  one that records a genuine convergence is not.
- **Never rewrite published history.** Amend freely before pushing, never after.
- **A red gate does not merge.** A known-flaky test does not make it green: record the flake,
  with its measured rate, and say so in the message.
- **Ratchets may fall and may never rise.** A change that raises a ceiling is a change to the
  project's standards and wants its own argument, not a line in an unrelated commit.
- Do not report work as "validated" without naming which check passed.
  [docs/audits/validation.md](docs/audits/validation.md) lists the seven kinds and what each
  leaves open: a passing unit suite is not parity, and parity is not scientific suitability.

## What to write down

A finding that nobody scheduled is the failure the registers exist to catch. A finding
becomes a work item in [TODO.md](TODO.md), a blocker in `widgets/blockers.json` if
something waits on it, or a direction in [docs/directions.json](docs/directions.json) if it
settles a model — and a direction names what it requires **in code**, because a settled
direction that only reaches the documentation has not been acted on.

Negative results, refused connections and capabilities deliberately not built are
first-class content here. So are the failures met along the way.
