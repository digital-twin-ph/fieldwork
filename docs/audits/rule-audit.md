# Rule audit

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** first pass. Audits the rules added to governance files on 2026-10-09
and 2026-10-10, not the whole repository.

## Why

Governance files tell future authors what to do. In one session, 1,211 lines went
into `AGENTS.md`, `docs/glossary.md` and `docs/audits/`, against 2,469 lines of
experiments. Most of the rules were written in the same session as the single
incident that prompted them, by the agent that wrote the code, and were never
read by anyone else before being committed.

That matters because the costs differ. A wrong finding costs one correction. A
wrong rule costs every later decision it shapes, quietly, because people comply
with rules rather than re-deriving them.

## How each rule is graded

| Column | Meaning |
| --- | --- |
| **Source** | **Human** — the practitioner asked for it. **Agent** — the agent proposed it. |
| **Evidence** | How many separate incidents support it, and of what kind. |
| **Reviewed** | **Directed** — the practitioner asked for this rule. **Seen** — it appeared in conversation and drew no objection. **None** — written straight into a file. |
| **Test** | Can you tell whether the rule applies in a given case? A rule you can only agree with is an aphorism. |

A rule is sound when a reader can apply it and be wrong. "An exclusion counts
only when the thing was possible, and the test is whether a reasonable project
could have decided otherwise" is sound: it caught the sea-level pack's false
impossibility on 2026-10-10. "A script that both prepares and checks data checks
nothing" is not: there is nothing to apply, and it was wrong.

## AGENTS.md

| Rule | Source | Evidence | Reviewed | Test | Verdict |
| --- | --- | --- | --- | --- | --- |
| This project is a developmental evaluation; experiments are the instrument | Human | The practitioner stated it | Directed | n/a — a statement of intent, not a rule | **Keep** |
| Write the experiment record before changing a primitive | Agent | Followed 5 times (63, 64, 65, 67, 68), not followed twice (69, 71), in the session it was written | None | Yes — did a record exist first? | **Keep, narrow.** Both lapses were the same piece of work. Say it applies to a new primitive, not to a correction or an example |
| Preserve the dated record; supersede rather than rewrite | Agent | Used twice: experiment 47's retained analysis, and the 2026-10-10 correction to it | Seen | Yes — does the original still stand with a dated note? | **Keep** |
| Status lines, counts and cross-references must be true of today | Agent | One case: experiment 47's stale header and digest count | None | Yes — check the numbers | **Keep.** Cheap and checkable |
| Do not treat `proposed` or `blocked` as a defect to fix on sight | Agent | One episode, the practitioner's own: "we are hallucinating blockers left and right" | Seen | Weak — no way to tell a real blocker from a recorded state | **Keep, add a test** |
| Never let a passing suite stand in for practitioner understanding | Agent | None. No instance where this was confused | None | No | **Demote.** True-sounding and unearned |
| Name enforcement as hard stop, validation rule, run-time check, limitation or out of scope; do not say "refusal" | Human | The practitioner rejected five meanings for one word | Directed | Yes — the five are named | **Keep** |
| A distinction described as enforced while implemented as a limitation is this project's **characteristic** defect | Agent | One instance found (`fw:AcquisitionBoundary`, D3). "Characteristic" is a frequency claim, counted nowhere | None | Yes for the distinction, no for the frequency | **Rewrite.** Drop "characteristic" or count it |
| Do not report work as "validated" without naming which check passed | Agent | The seven kinds are real and the conflation recurs | Seen | Yes — was a check named? | **Keep** |
| The unit of reuse is not the unit of use; never make a practitioner wire three nodes to ask one question | Human seed, agent phrasing | The practitioner's Lego-block framing, plus the `rate` and `case_series` analysis | Seen | Partly — "three" is rhetorical | **Keep, soften.** The principle holds; the number is decoration |
| Node 22 is required; do not diagnose `ERR_UNKNOWN_FILE_EXTENSION` as a code fault | Human | One incident, reproducible on demand | Directed | Yes — check the Node version | **Keep.** A fact, not a judgement |

## docs/audits/ontology-audit.md

| Rule | Source | Evidence | Reviewed | Test | Verdict |
| --- | --- | --- | --- | --- | --- |
| Widget naming convention, eight rules | Human asked, agent drafted | Applied to all 39 widgets: one clear defect (`xpert`), eight names that would not be chosen today | Seen | Yes — each rule names what it rejects | **Keep.** Best-evidenced rule added |
| D1, D2, D3, D7 design checks | Agent | Applied to 42 widgets; each found something | Seen | Yes | **Keep** |
| D5, D6, D8, D9 design checks | Agent | **Never applied.** The audit states they are "not applicable retroactively" | None | Untested | **Hold.** A gate that has never run is a proposal |
| D9: the node count of an affected worked example must not increase | Agent | None. The threshold is asserted, not derived | None | Yes, mechanically — but why "not increase"? | **Demote.** Measure effort before setting a number against it |
| A run-time check requires a stated reason why a port type cannot express the condition | Agent | One case | None | Yes — is a reason stated? | **Keep, mark as one case** |

## docs/audits/validation.md

The seven kinds describe commands that exist and what each leaves open. They are
descriptions, not rules, and each is checkable by running the command. **Keep.**

One correction belongs here and is **not** being added as a rule. On 2026-10-10
the agent claimed "a script that both prepares data and checks it checks
nothing". That is wrong. Independence is required by parity — kind 7, "an
independent external implementation" — and was generalised to all checking.
`validation-lab/scripts/extract_ar6_philippines.py` reads units, `scale_factor`,
`_FillValue` and `Conventions` from the file rather than assuming them, and
refuses when a requested quantile, year or site is absent. That self-checking is
what found the millimetre error that changed the pack's key vocabulary.

The sounder statement — *a producer may check its own work against facts it did
not produce, but cannot stand in for an independent recomputation* — has one
supporting case and no history of being needed. It is recorded here as a finding
and stays out of the rules until something goes wrong that it would have caught.

## docs/glossary.md

Most of what was added is definitions: *a quantile is not a worst case*, *a
projected change is not an absolute level*. These are domain facts, checkable
against the published science, and are not audited here.

One rule was already in the glossary, written by the practitioner, and it is the
model: *an exclusion counts only when the thing was possible; the test is whether
a reasonable project could have decided the other way.* It has an applicability
test, and on 2026-10-10 it caught a real error — the sea-level pack calling a
decision an impossibility. Its own worked example was wrong on the same day and
is corrected in place.

## What changes

- **Demote to findings:** the passing-suite rule, and D9's node-count threshold.
- **Rewrite:** "characteristic defect" — count it or drop the word.
- **Narrow:** experiment-before-primitive, to new primitives.
- **Hold:** D5, D6, D8, D9 — proposals until applied once.
- **Add nothing new** from the producer-and-checker argument.

## The rule for rules

A statement enters a governance file when it has **either** more than one
independent incident behind it, **or** a test for when it applies. Everything
else is a finding, and findings go in `docs/experiments/` with their date and
measurement.

This rule has one incident behind it — this audit — and a test: can a reader tell
whether it applies? By its own standard it is provisional. Review it the next
time a rule is proposed.
