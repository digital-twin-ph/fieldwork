# Fieldwork semantic development checkpoints

_Created 2026-10-07 · Updated 2026-10-15_

## Developmental evaluation

This project is a developmental evaluation, not a build against a specification. The
framework is being watched as it emerges, and `docs/experiments/` is the instrument of
that evaluation rather than a byproduct of it: numbered records of what was designed,
what was tried, what the trying revealed, and what remains unestablished. Treat the
experiment as the unit of work. Before adding a new primitive, write the design
and its admission review as an experiment record — as experiments 47, 48 and 58 did —
so that the decisions are reviewable separately from the diff that implements them.

Preserve the dated record. When a later finding supersedes an earlier analysis, add a
dated supersession note and leave the original standing: experiment 47 keeps its
blocked-on-the-host analysis "because it is how the gap was found", and rewriting it to
match the present state would destroy the evidence of how the framework moved. This is
the one place in the repository where retrospective consistency is the wrong goal. It is
not licence for stale navigation. A document's status line, counts, digests and
cross-references are what a reader meets first and must be true of today, so correct
those and date the correction. A record that preserves its reasoning while misstating
its own status is not a record; it misleads.

A finding that invalidates a design is a result. Report it as one, with its date and
what it took to find, rather than quietly correcting the design and leaving no trace.
Negative results, refused connections, and capabilities deliberately not built are
first-class content, as are the failures met along the way — a wrong locator, a name
collision between two contracts — because those are what the next author needs. Do not
treat a `proposed`, `blocked` or `not-admitted` status as a defect to fix on sight; it
may be an accurate record of where the framework currently stands.

An experiment carries creation and update dates, a status, the validation it commits to,
a dated validation record with exact counts and the platforms covered, and an explicit
statement of what it does not establish. Keep the practitioner observation that can come
out badly — whether red is read as an error, whether someone can distinguish 250
locations from 489 deaths — and write it before the result is known. Automated runtime
evidence is distinct from evidence that a practitioner understands a result or finds it
useful. When work
lands, its competency questions go to
[experiment 44](docs/experiments/44-ontology-competency-questions.md), including the ones
the design refuses to answer.

Do not declare the framework, or an experiment series, finished. Emergence is the object
of study here.

### The five directions

The practitioner's formulation of the method, and part of the stance rather than a technique
to adopt or drop: *"In a DE project, we look back, we look forward, we look sideways, above
and below."* Stated here, where the method is, because a method recorded only inside the
experiment that derived it looks like a proposal that could be retired. It cannot be: it is
what this project means by developmental evaluation.

| Direction | What it asks |
| --- | --- |
| **Backward** | Does what was already admitted still pass what we now know? |
| **Sideways** | The present inventory: duplicates, connections, gaps, value in what we have *now* |
| **Above** | The forest: what does the emerging framework look like? |
| **Below** | A tree: what does this one thing uniquely contribute to the forest? |
| **Forward** | The synthesis: given the other four, what does that mean for the direction of emergence? |

Forward is the only one that is **derived rather than observed**, so it cannot be answered
from a single document and is not a per-document field. The other four are things to go and
look at.

Point them at the project periodically, with the previous pass's findings in hand, and write
what each one finds. A sweep that finds nothing is a result and gets written down too. What a
sweep produces is not a document on its own: a finding becomes a work item in
[docs/todo.md](docs/todo.md), a blocker in `widgets/blockers.json` if something is waiting on
it, or a direction in [docs/directions.json](docs/directions.json) if it settles a model —
because a finding nobody scheduled is the failure the directions register exists to catch.

[105](docs/experiments/105-five-directions.md) is the dated record of deriving them and of the
first two sweeps, including the three of the five this project first got wrong.

## Semantic admission and audit checkpoints

To create a widget, follow [the adding-a-widget procedure](widgets/README.md), which
lists every file the change touches, in order, and the gates to run before claiming it
works. Pass the **primitive design audit** (D1–D9) in
[the audit procedure](docs/audits/ontology-audit.md) first. D1 places the candidate on two
axes — whether a distinction survives decomposition, and whether a practitioner would
ask for the operation by name — because the unit of reuse is not the unit of use:
factor a composite underneath while keeping its palette entry, and never make a
practitioner wire three nodes to ask one question. D10 requires that some example instantiate the
widget — `npm run usage:widgets` reports which are at zero. D5, D6, D8 and D9 have
never been applied and are proposals, not gates ([the rule audit](docs/audits/rule-audit.md)). Keep the three counted
terms distinct in prose as well as in code: a **widget** is the versioned contract, a
**node** is one instance of it in a workflow, a **workflow step** is one execution. Record the audit answers in
the experiment record that proposes the primitive, and write that record before the
implementation.

Before adding a primitive, perform the semantic admission review in
[the ontology audit procedure](docs/audits/ontology-audit.md): define the term and its
limits, distinguish the widget/plan/activity/data roles, compare existing
primitives and reusable vocabularies, and specify typed ports, units/CRS,
provenance, missing-data policies and validation evidence. Prefer reuse when
the operation has the same meaning. Do not equate similar labels with identical
semantics or treat a declaration as an implemented capability.

State each distinction the primitive carries — the knowledge, as a non-identity: *a
table has no geometry*, *detection is not infection* — and name how each one is
enforced: as a **hard stop**, a **validation rule**, a **run-time check**, a
**limitation** or an **out-of-scope decision**. Do not use "refusal" as a category for these; the five are
not interchangeable, and two of them prevent nothing. See
[the audit procedure](docs/audits/ontology-audit.md). A distinction described as enforced
while implemented as a limitation is a defect; one is recorded, `fw:AcquisitionBoundary`
in [the widget audit](docs/audits/widget_audit.md).

After adding or changing a worked example, audit the connected workflow and its
actual N3/evidence outputs against those contracts. Include positive and negative
semantic regression checks, inspect the N3 & evidence UI, and update the registry,
terminology, audit record and README where needed. Keep proposed learning/game
concepts separate from implemented scientific operations. Report unclosed gaps
explicitly; passing syntax or SHACL structure alone is not scientific validation.

Preserve existing user work and unrelated working-tree changes. These local audit
checkpoints do not authorize publication or sending messages to other people.

Do not report work as "validated" without naming which check passed.
[Kinds of validation](docs/audits/validation.md) lists the seven and what each leaves
open; a passing unit suite is not parity, and parity is not scientific suitability. Report
unclosed gaps explicitly.

## Writing

Markdown here is read by public health practitioners, not only by the people who
wrote the code. Clarity and accessibility come first.

- Write plainly. Prefer the word a practitioner already uses.
- Be concise. Cut a sentence that adds no fact, and a clause that only adds
  emphasis.
- Say the thing, then stop. Do not restate a point in three ways.
- Write a sentence because it is worth saying, not because a passage needs an
  ending. **Closing lines are where this fails here**: the analysis is sound, and
  then a final sentence generalises past the evidence to round it off. Four
  instances on 2026-10-10 alone, each caught by a reader rather than by the
  author. If a closing sentence states no fact and names no consequence, delete
  it and end on the last thing that did.
- Define a term where it is first used, or link [the glossary](docs/glossary.md).
- State what is not established as plainly as what is.
- Prefer a table or a short list to a paragraph, where the content is a set of
  items.

Length is not rigour. A long document is harder to check and easier to leave
wrong, and an unreadable document is not governance — nobody follows what they
cannot get through.

## Rules

This is a developmental evaluation. The framework does not exist yet in settled
form, so rules cannot be written for it in advance. What can be done rigorously
is to discover which rules are useful enough **not to put the application in a
straitjacket**.

Every rule here is provisional, and has to pass two tests.

**Has it been tried?** A rule can be proposed, then **observed** by applying it
to what exists, then **tried** in a worked example or a real case, and only then
enforced. The middle stage is usually skipped here: a rule gets written and then
either forgotten or enforced. Try it in a scenario first, where its behaviour can
be watched without committing the codebase to it.

Enforcing early is its own straitjacket. The naming convention has nine findings
and no renames, and acting on them today would mean nine migrations and every
saved workflow holding those types rewritten, for names that have obstructed
nobody.

**Does it bind?** A rule can fire reliably and still be harmful, by stopping the
framework from moving. Ask what it would have prevented, not only what it caught.
These are the dangerous ones, because firing looks like evidence of worth.

When a rule fires, record it: what it caught, and whether the gap was in design,
development, implementation or evaluation. Put that in the experiment that
reports the catch, and update [the rule audit](docs/audits/rule-audit.md).

Prefer to mechanise. **Mechanised rules enforce; prose rules describe.** "A
widget nobody can add is invisible" lives in `src/palette.ts` with two tests and
made seven widgets addable. The naming convention lives in a document, found nine
names, and changed none of them.

Before adding a rule, read [the rule audit](docs/audits/rule-audit.md). Avoid
rules a reader can only agree with, rules whose only evidence is the argument
that produced them, and rules nobody can act on. If it is not a rule yet, it is a
finding, and findings go in `docs/experiments/` with their date and measurement.

## Toolchain

This project requires **Node.js 22 or newer** (`engines: node >=22`; `.nvmrc` records 22).
Run `nvm use` first. On Node 20 every script that typechecks fails with
`ERR_UNKNOWN_FILE_EXTENSION` naming `node_modules/typescript/bin/tsc` — TypeScript 7 is
ESM-only and its bin is extensionless. The error names typescript and reads like a broken
dependency; it is the wrong Node version, and the project is not at fault. Do not
diagnose it as a code or dependency problem, and do not report gates as failing until
they have been run on Node 22.

## Versioning and release notes

The application version has one source of truth: the root `package.json` version,
with the matching root entry in `package-lock.json`. The header displays this
value. Use `npm version <major.minor.patch> --no-git-tag-version` to change both
files together; do not maintain a second hard-coded version in HTML or CSS.

During this prototype's `0.x` series, increase MINOR for a new user-visible
capability or a meaningful change to workflow behavior, and PATCH for fixes and
small interface improvements. Reserve MAJOR for an intentionally incompatible
workflow, package, or public semantic contract, with a documented migration.
Internal work may accumulate under the current version; decide the next version
when preparing a release. Never imply that changing the number publishes the app.

Update `CHANGELOG.md` for each version with the date or "In development", the
user-visible changes, migration effects, and validation limits. Set the release
date in the release commit after local checks pass; if publication fails, correct
the notes before retrying. Claim publication only after both deployment and live
assets are verified. Keep the README's usage and release links consistent. The app
version is distinct from independent widget release versions, ontology versions,
workflow/package schema identifiers, and saved project revision counters; changing
one does not automatically change the others. Validate the header version on
desktop and a narrow screen before releasing.
