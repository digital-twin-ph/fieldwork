# Rule audit

_Created 2026-10-10 · Updated 2026-10-15_

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

## A gate is a fossil record of the paths already travelled

Added 2026-10-11, and it is the reason this is a developmental evaluation
rather than a project with a specification.

Nearly every mechanised rule here was written **after** the defect it now
prevents, and the record says so in each case:

| Rule in CI | The defect that produced it |
| --- | --- |
| `palette-add.browser.mjs` | Three widgets added on 2026-10-09 repeated a defect experiment 48 had already recorded |
| `validate:ontology-coupling` | Four properties lost an `rdfs:domain` by hand in one afternoon, and 53 terms turned out to be asserted with nothing defining them |
| The provenance-size ratchet | Added because ontology growth has a cost nobody was watching |
| The composition manifest fix | A run stopped with a manifest error that no hand-built test workflow could produce |
| Dynamic `outputOf` | A node reached the canvas with no output port |

So a gate protects against the class of mistake somebody has already made. It
cannot protect against the class nobody has met yet, and the gaps in it are
mostly **unexplored map** rather than negligence. That is precisely why the
criteria could not have been written at the start: we know what we know from
the paths travelled, and the shape of the whole journey has not emerged yet.

**Two things follow, and the second is the one that keeps this honest.**

**Every mechanised rule should name the defect that produced it.** Most already
do, in a comment beside the assertion. That turns the gate from a list of
constraints into a legible history, and a reader who disagrees with a rule can
read what it cost to learn before arguing with it.

**"The picture is emergent" is not a defence for not looking.** Two kinds of gap
look identical in a commit and are not the same thing:

- **Unexplored.** `executionPlan` validating a second time, so an expanded
  composition met the authored project's manifest, was discoverable only by
  running a composition in a real workspace. Nobody could have written that
  rule in advance.
- **Unread.** Experiment 27 proposed most of the gamification architecture on
  2026-10-06 and a spike re-derived it on 2026-10-11 without citing it. That
  path had been written down and indexed; it simply was not read.

The first is what developmental evaluation is for. The second is a failure that
DE language can be used to excuse, and the distinction has to be stated every
time, or "we could not have known" becomes available for things that were
already known.

## Known and validated are different, and the corpus does not say which is which

Corrected 2026-10-11. The section above called experiment 27 a path "already
travelled". It was not. **27 asked a question; it did not answer one.** Its
A87 to A96 are proposals, and nothing in them has been built, fired or
measured.

That distinction runs through everything here. An experiment document exists to
**ask** — to write a question down precisely enough that code can answer it, and
then to record what the code and the use of it taught. Writing something down
makes it asked, not known; building it makes it tried; and only a measurement
against something independent makes it validated. The rule lifecycle below
already says this for rules, and it is equally true of the documents.

Two consequences for the failure recorded above. Not citing 27 was still a
failure of reading, and it still wasted a morning. But the overlap is not two
answers to a settled question: it is two independent attempts at an open one,
which is weak evidence for the architecture they agree on and worth saying so.

**And the corpus cannot currently be read this way.** Measured 2026-10-11:

| | |
| --- | --- |
| Experiment documents | 94 |
| With an explicit `**Status:**` line | 46 |
| Status values that repeat | 2, out of 46 |

So half say nothing about whether they are a question or an answer, and the
half that do say it in free prose, each one different. A reader — including a
later contributor, including me five days on — cannot tell a proposal from a
finding without reading the whole document, and confident prose reads the same
either way. That is the shape D5 warns about: a declaration that is free text is
a limitation wearing a declaration's costume.

**A closed vocabulary would fix it**, mapped to the lifecycle below:

| Status | Means |
| --- | --- |
| `asked` | A question, with nothing built. Most of 27 |
| `tried` | Built, with a measurement of its own |
| `validated` | Measured against something independent, or fired in real use |
| `retired` | Answered no, or superseded, with the successor named |

Not applied here. Ninety-four documents is a migration, and the honest increment
is the one used for `ontology.emits`: require it of new documents, add it to
existing ones as they are touched, and let the count be visible. Recorded in
[TODO.md](../../TODO.md) rather than done in passing.

## A rule has stages, and enforcement is the last one

A rule can be thought through, written down and **tried** long before it enforces
anything. That is not a failed rule; it is a rule being evaluated, which is what
this project does with everything else.

| Stage | What happens | What you learn |
| --- | --- | --- |
| **Proposed** | written down | nothing yet |
| **Observed** | applied in an audit, against what exists | what it would catch, and how often |
| **Tried** | used in a worked example or a real scenario | how it behaves when somebody is doing the work |
| **Enforced** | mechanised; changes or prevents things | whether it holds under load |

**The missing stage is "tried".** This project jumps from writing a rule to
either forgetting it or enforcing it. The place to try one is a worked example or
a real case, where the behaviour can be watched without committing the whole
codebase to it.

The first instance is [78](../experiments/78-trying-compositions-on-isochrone.md):
the composition rules tried on the isochrone case, which has a control — the same
analysis exists as one shipped widget and as a sequence in the PHI Advanced-1
notebooks.

### Observed, and not yet tried

Checked 2026-10-10 against the registry rather than from memory:

| Rule | Findings | Changed |
| --- | --- | --- |
| Widget naming convention | 9 names | 0 |
| D2, duplicate operations | 3 nearest-neighbour implementations | 0 |
| D3, unenforced distinctions | 1, in a sample of 1 | 0 |
| D5, qualifiers on consumers | 1, today | 0 |

The zero column is not a verdict against them. **Enforcing the naming convention
today would mean nine renames, nine migrations and every saved workflow holding
one of those types rewritten** — for names that are confusing on paper and have
obstructed nobody. That is the straitjacket, arriving as diligence.

What those four need is the stage they skipped. The naming convention can be tried
on the *next* widget rather than retroactively on forty-two: if it helps name one
new thing well, that is evidence, and it costs nothing. D2 can be tried by
building the shared nearest-neighbour join behind one of the three, leaving the
other two alone, and seeing whether anything is worse.

### What enforcement looks like when it comes

| Rule | How it enforces | Result |
| --- | --- | --- |
| A widget nobody can add is invisible | code and two tests | 7 widgets made addable |
| Only registry widgets in a workflow | `core.ts`, every load | every workflow, always |
| Node 22 | the build fails | one diagnosis, permanently |
| An exclusion counts only when the thing was possible | prose, applied by a person | the pack was corrected |

All but the last are mechanised, and the last enforced once because a person
applied it to a specific claim. **Mechanised rules enforce; prose rules describe**
— and a prose rule that has only been observed is still at stage two, not failing.

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
| Widget naming convention | Human asked, agent drafted | Seen | 9 | 0 | **Observed.** Try it on the next new widget, not retroactively on 42 |
| D2, does the operation already exist under another name? | Agent | Seen | 3 | 0 | **Observed.** Try it by factoring one of the three, leaving the others |
| D7, does the name state what was done? | Agent | Seen | 2 | 1 | One title corrected, one name untouched |
| D3, is every distinction enforced? | Agent | Seen | 1 | 0 | **Observed** in a sample of one; needs a full pass |
| D5, do qualifiers live on the input? | Agent | None | 1 | 0 | **Observed** today. The scenario that would try it is reprojection ([40](../experiments/40-reprojection-primitives.md)) |
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
