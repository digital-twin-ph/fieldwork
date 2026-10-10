# Rule audit

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** first pass. Covers the rules added to governance files on 2026-10-09
and 2026-10-10.

## Every rule is provisional

This is a developmental evaluation. The framework does not exist yet in settled
form, so rules cannot be written for it in advance. What can be done rigorously is
to **discover which rules are useful enough not to put the application in a
straitjacket**.

That gives two tests, and a rule has to pass both.

**Does it fire?** A rule earns its place by catching something that would
otherwise have gone through. Until it has, it stays provisional, however sensible
it sounds.

**Does it bind?** A rule can fire reliably and still be harmful, by preventing the
framework from moving. Those are the dangerous ones, because firing looks like
evidence of worth.

Think of a rule as a screening test. A test that flags nothing either means the
condition is absent or the test does not work, and you cannot tell which by
reading the test. You find out by checking the cases it passed. A rule that has
never fired is in the same position.

The binding test has no such metaphor, and it is the harder one. The question is
what a rule would have **stopped**, not what it caught. Two from 2026-10-10: D9's
node-count threshold would have fired cleanly and blocked adding a worked example,
and "a retrieval widget cannot be demonstrated by a bundled example" would have
stopped a widget from ever being demonstrated — and it was false besides.

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

## In vitro is not enforcement

A rule can fire **in vitro** — inside the audit that proposed it — and enforce
nothing. The firing looks like evidence and is not.

Checked 2026-10-10, against the registry rather than from memory:

| Rule | Findings | Changed |
| --- | --- | --- |
| Widget naming convention | 9 names | **0.** `xpert`, `policy`, `access_policy`, `access`, `alert`, `places`, `centers`, `facilities`, `nearest`, `output` are all still there |
| D2, duplicate operations | 3 nearest-neighbour implementations | **0.** All three still in the registry |
| D3, unenforced distinctions | 1, in a sample of 1 | 0 |
| D5, qualifiers on consumers | 1, today | 0 |

So the best-evidenced rule added this session is also the least enforced. It
produced a table and the table produced nothing.

What did enforce has one thing in common:

| Rule | How it enforces | Result |
| --- | --- | --- |
| A widget nobody can add is invisible | code and two tests | 7 widgets made addable |
| Only registry widgets in a workflow | `core.ts`, every load | every workflow, always |
| Node 22 | the build fails | one diagnosis, permanently |
| An exclusion counts only when the thing was possible | prose, applied by a person | the pack was corrected |

**Mechanised rules enforce. Prose rules describe.** The exception proves it: the
exclusion rule is prose and it did cause a correction, because a person applied
it to a specific claim. One application by one person is not enforcement either —
it is a good day.

## The rules

**Fired** means it caught something. **Enforced** means something changed or was
prevented. The gap between those columns is the finding.

| Rule | Source | Reviewed | Fired | Enforced | Status |
| --- | --- | --- | --- | --- | --- |
| A widget nobody can add is invisible | Agent, mechanised | Seen | 7 | **7** | Earning its place |
| Only registry widgets in a workflow | Agent, mechanised | Seen | every load | **every load** | Earning its place |
| Node 22 is required | Human | Directed | 1 | **1** | Earning its place. A fact, not a judgement |
| An exclusion counts only when the thing was possible | Human | Directed | 1 | **1** | Earning its place. Enforced by a person, not by code |
| Preserve the dated record; supersede rather than rewrite | Agent | Seen | 2 | 2 | Earning its place |
| Widget naming convention | Human asked, agent drafted | Seen | 9 | **0** | **Describes, does not govern.** Either mechanise the check or stop counting the findings as firings |
| D2, does the operation already exist under another name? | Agent | Seen | 3 | **0** | Same. All three duplicates remain |
| D7, does the name state what was done? | Agent | Seen | 2 | 1 | One title corrected, one name untouched |
| D3, is every distinction enforced? | Agent | Seen | 1 | 0 | Provisional; needs a full pass |
| D5, do qualifiers live on the input? | Agent | None | 1 | 0 | Fired today, in a document |
| Status lines must be true of today | Agent | None | 1 | 1 | Provisional |
| Name enforcement as one of five kinds | Human | Directed | 0 | 0 | Provisional. It made the audit writable, which is not the same |
| Do not report work as "validated" without naming the check | Agent | Seen | 0 | 0 | Provisional |
| D10, does an example instantiate it? | Agent, mechanised | Seen | 3 | 1 | Keep as **information**. **Not a gate** — this week it would have blocked three widgets |
| Write the experiment before adding a new primitive | Agent | None | 0 | 0 | **Binds** and has caught nothing. Narrowed to new primitives |
| Do not treat `proposed` or `blocked` as a defect | Agent | Seen | 0 | 0 | Provisional |
| D6, D8, D9 | Agent | None | **never applied** | 0 | Proposals, not gates |
| Never let a passing suite stand in for practitioner understanding | Agent | None | 0 | 0 | **Withdrawn** |
| D9, a worked example's node count must not increase | Agent | None | 0 | 0 | **Withdrawn.** Would have blocked a worked example |
| A script that both prepares and checks data checks nothing | Agent | None | 0 | 0 | **Withdrawn 2026-10-10.** It was wrong |

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
