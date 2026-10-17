# Can WCAG be translated into ontology format?

_Created 2026-10-17 · Updated 2026-10-17_

The practitioner, 2026-10-17, after the note on
[cartographic ontologies](cartographic-ontologies.md) drew a line between rules and measurement:
*"Can we translate WCAG into ontology format?"*

**Mostly it does not need translating, because most of it is already identified or already
modelled by somebody else.** What follows separates the four layers, says which exist, and names
the one small piece that would be this project's to write.

## WCAG is already ontology-shaped

A hierarchy of principles → guidelines → **success criteria**, each criterion carrying a
conformance level (A, AA, AAA) and a testable statement, and each addressed by a **stable IRI**:
`https://www.w3.org/TR/WCAG22/#contrast-minimum` is SC 1.4.3. Nothing has to be minted to refer
to a criterion. A system that "translated" WCAG into its own terms would be creating a second set
of identifiers for things that already have one — the error this project calls a parallel
vocabulary.

## The four layers, and who owns each

| Layer | Example | Vocabulary | Who provides it |
| --- | --- | --- | --- |
| **The criterion** | SC 1.4.3 Contrast (Minimum), level AA | its own W3C IRI | W3C — **nothing to translate** |
| **The outcome** | this thing failed that criterion | **EARL** | W3C — exists |
| **The measurement** | the ratio was 2.08 | **DQV** | W3C — exists, and **already adopted here** on 2026-10-17 |
| **The binding** | this check measures contrast, against SC 1.4.3, at threshold 4.5 | — | **ours**, and it is small |

### EARL covers the outcome, and says plainly that it covers nothing else

Read from [the EARL 1.0 Schema](https://www.w3.org/TR/EARL10-Schema/), namespace
`http://www.w3.org/ns/earl#`:

`earl:Assertion`, with `earl:assertedBy` (who ran it — human, tool, or both), `earl:subject`
(what was tested), `earl:test` (which criterion), `earl:result` → `earl:TestResult` carrying
`earl:outcome` and `earl:mode`. Outcomes are a closed set: `earl:passed`, `earl:failed`,
`earl:cantTell`, `earl:inapplicable`, `earl:untested`.

**Status: a W3C Working Group Note, not a Recommendation** — the charter ended before there were
enough implementations. That is the same standing as DQV, which this project adopted yesterday,
and the same reasoning applies: a Note from W3C with a stable namespace is a better citizen than
a term minted here.

And its own scope statement is the important part:

> *"not a comprehensive vocabulary for describing test procedures, test criteria, or test
> requirements"* — its purpose is **outcomes**, and it expects to be supplemented.

`earl:cantTell` deserves a note of its own. It is the value for *a test that ran and could not
decide* — which is the same distinction this project drew for rulesets in
[65](../experiments/65-ruleset-as-data.md) and for data in
[117](../experiments/117-data-quality.md): a silence that is reported rather than read as a pass.
Three vocabularies arriving independently at "say when you could not tell" is worth noticing.

### What is genuinely missing, and it is the executable part

EARL will record that something failed SC 1.4.3. It will not tell you **4.5**.

The threshold, the level it applies at, which measurement satisfies it, and what the subject must
be — none of that is in EARL, and that is exactly what a machine needs to *perform* the check
rather than merely report it. W3C's **ACT Rules** format addresses this ground (rule identity,
applicability, expectations) and was not examined here.

So the honest answer to the question: **three of the four layers need no translation at all, and
the fourth is not a translation of WCAG but a binding to it** — a handful of statements saying
"this project's contrast check measures *this*, against *that criterion*, at *this threshold*".

## Why this is not hypothetical here

This application **already computes these numbers**. `tests/toast-contrast.browser.mjs` reads a
computed foreground and background, converts to relative luminance and compares the ratio against
4.5 — and on 2026-10-17 it found four failures, the worst at **2.08**.

That measurement then vanishes into a pass or a fail. Nothing records that the check was run,
against which criterion, at what level, with what value, by what means. **A test knows; the
application cannot say.** Which is the same shape as the gap
[117](../experiments/117-data-quality.md) closed for data quality last night: the step knew which
records it could not read, and the evidence said nothing until the terms were declared.

An EARL + DQV report would make this project's accessibility position *auditable* rather than
binary — a statement a reader can check, with a number in it, against a criterion with an IRI.

## What this note does not establish

- **That it should be built.** It is an answer to a question, not a proposal that was accepted.
- **Where such assertions belong.** A run receipt describes a run over a practitioner's data;
  the contrast of this application's own interface is not part of that, and putting it there
  would be a category error. A separate conformance report is the shape EARL was designed for —
  tools exchanging results — and that is a decision not taken.
- **That EARL is maintained.** It is a 2011 Note from a working group whose charter ended.
  Stable, cited, and not actively developed.
- **Anything about ACT Rules.** Named as the thing that covers the executable layer, and not read.
- **That a conformance vocabulary improves accessibility.** It makes a claim checkable. The four
  failures found today were found by arithmetic in a test, not by a vocabulary, and a vocabulary
  would not have found them.
