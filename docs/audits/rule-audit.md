# Rule audit

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** first pass. Covers the rules added to governance files on 2026-10-09
and 2026-10-10.

## Every rule is provisional

A rule earns its place by **firing** — by catching something that would otherwise
have gone through. Until it has fired enough times to show it addresses a real
gap, it stays provisional, however sensible it sounds.

Think of a rule as a screening test. A test that flags nothing either means the
condition is absent or the test does not work, and you cannot tell which by
reading the test. You find out by checking the cases it passed. A rule that has
never fired is in the same position.

A gap can be in **design**, **development**, **implementation** or
**evaluation**. Record which one, because a rule that keeps firing in design and
never in evaluation is telling you where the weakness actually is.

Three things to avoid when writing one:

- **Rules that cannot be wrong.** If a reader can only agree, there is nothing to
  apply and nothing to count.
- **Rules that justify themselves.** A rule whose only evidence is the argument
  that produced it has not been tested, it has been restated.
- **Rules nobody can act on.** Say what to do, in words a practitioner uses.

## Why this audit exists

In one session, 1,211 lines went into `AGENTS.md`, the glossary and
`docs/audits/`, against 2,469 lines of experiments. Most of those rules were
written in the same session as the one incident that prompted them, by the agent
that wrote the code, and were committed without anyone else reading them.

The costs are not symmetric. A wrong finding costs one correction. A wrong rule
costs every later decision it shapes, quietly, because people follow rules rather
than re-deriving them.

## Mechanised rules report themselves

A rule written into code and a test fires where everyone can see it. A rule
written only in prose fires silently, and you learn it fired when someone
remembers to run an audit.

The clearest case is the palette. "A widget nobody can add is invisible" lives in
`src/palette.ts` with two tests, and it **caught seven unaddable widgets**. The
design checks D1 to D10 live in prose, and we know they fired only because a
human sat down once and worked through 42 widgets.

Prefer to mechanise. If a rule cannot be mechanised, say so and say why.

## The rules

| Rule | Source | Reviewed | Has it fired? | Status |
| --- | --- | --- | --- | --- |
| Widget naming convention | Human asked, agent drafted | Seen | **Yes, 9 times.** Across 39 widgets: one defect (`xpert`), eight names that would not be chosen today. *Design* | Earning its place |
| An exclusion counts only when the thing was possible | Human | Directed | **Yes, once.** Caught the sea-level pack calling a decision an impossibility, 2026-10-10. *Evaluation* | Earning its place |
| A widget nobody can add is invisible | Agent, mechanised | Seen | **Yes, 7 times.** Mechanised, so it keeps reporting. *Implementation* | Earning its place |
| D2: does the operation already exist under another name? | Agent | Seen | **Yes.** Found two superseded duplicates and a near-duplicate. *Design* | Earning its place |
| D3: is every distinction enforced? | Agent | Seen | **Yes, once**, in a sample of one. *Design* | Provisional; needs a full pass |
| D7: does the name state what was done? | Agent | Seen | **Yes, twice.** `xpert`, and `raster_input` titled "Acquire". *Design* | Earning its place |
| Node 22 is required | Human | Directed | **Yes, once.** A build failure read as a broken dependency. *Development* | Earning its place. A fact, not a judgement |
| Status lines and counts must be true of today | Agent | None | **Yes, once.** Experiment 47's stale header. *Evaluation* | Provisional |
| Preserve the dated record; supersede rather than rewrite | Agent | Seen | **Yes, twice.** Experiment 47, then its 2026-10-10 correction. *Evaluation* | Earning its place |
| Name enforcement as one of five kinds; do not say "refusal" | Human | Directed | Not yet, as a check. It did make the widget audit possible to write. *Design* | Provisional |
| Do not report work as "validated" without naming the check | Agent | Seen | Not recorded | Provisional |
| Write the experiment before adding a new primitive | Agent | None | Not as a catch. Followed 5 times, missed twice, in the session it was written | Provisional; narrowed to new primitives |
| Do not treat `proposed` or `blocked` as a defect to fix | Agent | Seen | Not yet. The episode that prompted it came first | Provisional; no way yet to tell a real blocker from a recorded state |
| **D5** | Agent | None | **Yes, once, 2026-10-10.** The coordinate system is a property of a layer and is carried as a parameter on five consumers instead, because `SpatialReference` admits only CRS84 ([40](../experiments/40-reprojection-primitives.md)) | Provisional, but it has now caught something |
| D6, D8, D9 | Agent | None | **Never applied.** Written after all 42 widgets existed | Proposals, not gates |
| Never let a passing suite stand in for practitioner understanding | Agent | None | Never | **Withdrawn.** Nothing to apply |
| D9: a worked example's node count must not increase | Agent | None | Never | **Withdrawn.** The threshold was asserted, not measured |
| "This project's *characteristic* defect" | Agent | None | Never counted | **Rewritten** to name the one instance on record |
| A script that both prepares and checks data checks nothing | Agent | None | Never. It was wrong | **Withdrawn 2026-10-10** |

## The withdrawn one worth reading

"A script that both prepares data and checks it checks nothing" had no incidents
behind it. It came from a worry that sounded right.

It was wrong. Independence is required by **parity** — one of the seven kinds of
validation, "an independent external implementation" — and the agent generalised
it to all checking. The lab's own AR6 extraction reads units, `scale_factor`,
`_FillValue` and `Conventions` from the file instead of assuming them, and
refuses when a requested quantile, year or site is absent. That self-checking is
what found the millimetre error that changed the pack's key vocabulary.

A producer can check its own work against facts it did not produce. It cannot
stand in for an independent recomputation. That statement has one case behind it
and has never fired, so it stays a finding and does not become a rule.

## Next

- Run a full D3 pass. One sample found one unenforced distinction; either the
  rest are clean, which is worth knowing, or they are not, which is worth more.
- Record firings as they happen, in the experiment that reports the catch, so
  this table can be updated from evidence rather than memory.
- Audit the rules written before 2026-10-09. This pass does not cover them.
- **Where lessons land is itself unreliable.** Ten commits rewrote the workflow
  vocabulary with no experiment record until one was asked for; the reasoning sat
  in commit messages, which nobody greps. Recorded in
  [73](../experiments/73-workflow-stage-vocabulary.md). Whether this needs a
  mechanised check — a commit touching the glossary or an audit should name an
  experiment — is one incident old, so it stays a finding.
