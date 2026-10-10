# 77 · Composition versioning and drift detection

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Third of three with
[75](75-compositions-as-nodes.md) and [76](76-composition-governance.md).

## The claim to be proved

A composition can **detect** that the widgets it was built from have changed, and
say what changed, in terms a practitioner can act on. Not prevent — detect.

## Drift is not hypothetical. It is the current behaviour

Measured 2026-10-10, in `tests/composition-drift.test.mjs`. A saved workflow names
widget **types** and never versions: every node is `id, params, type, x, y`, and
all 76 release files declare `versionPersistence: "not-yet-persisted"`. There is
no field in which a version could be recorded.

A workflow saved on 2026-10-08 using `healthsites_discovery`, removed on the 9th,
opens today like this:

| | |
| --- | --- |
| Opens? | Yes |
| Node rewritten? | Yes, to `find_health_facilities` |
| Practitioner told? | **No.** No warning, no note, nothing in a receipt |
| Trace of the old type? | None |
| Its stored facilities? | Dropped — correctly — and silently |
| `country: "Philippines"` | Became `"PHL"`, a value nobody typed |

The drop is right: that data's provenance was a hand-back of a file the
application never saw, and relabelling it would be a false record. **The finding
is that none of it is reported.**

## What detection needs

The registry already pins every release with a `sha256` of its release file. A
composition records, per member, the node type, the version and that digest at
save time. Detection is then a comparison, not an inference.

| Verdict | Test | What a practitioner is told |
| --- | --- | --- |
| **Unchanged** | digest matches | nothing |
| **Moved** | type present, version differs | which member, from which version to which, and what the release notes say changed |
| **Gone** | type absent from the registry | which member, and what it was migrated to, if anything |

The third is today's silent case, and the one worth getting right first.

## The question this is actually for

Not "how do we stop drift" but **what should somebody be told when it happens.**
That can now be argued from a case rather than a hypothesis, which is why this
experiment follows the measurement rather than preceding it.

Candidate answers, none chosen:

- **Refuse to open.** Safest, and wrong: a practitioner with a year-old workflow
  would be locked out of their own work by a patch release.
- **Open and annotate.** The composition opens, and each drifted member carries a
  note saying what moved. Nothing is blocked; something is said.
- **Open and refuse to run.** Opens for inspection, refuses execution until the
  practitioner acknowledges the change.

The second is the weakest and the third is the most honest; which is right
probably depends on what moved, and that is the thing to find out.

## Distinctions it must carry

| Distinction | How enforced |
| --- | --- |
| A detected change is not a broken composition | **Limitation.** A moved member may be a bug fix |
| A silent rewrite is not a migration a practitioner consented to | **Run-time check.** Today's adapters rewrite without reporting; this is what the experiment exists to change |
| A digest match is not a guarantee of meaning | **Limitation.** The same widget at the same version can be fed different data |

## What this does not establish

That a practitioner can act on what they are told. Being shown "member
`find_health_facilities` moved from 0.1.0 to 0.2.0" is only useful if the release
notes say something legible, and that is a claim about 76 release files nobody has
read as a practitioner would.

Nor does it establish a severity scheme. Calling a change major or minor is a
judgement about meaning, and the project has no evidence yet that its version
numbers carry one.

## First test

Extend `tests/composition-drift.test.mjs`, which records today's silence. When
detection exists those tests will fail, and that is the point: the change becomes
visible instead of silent, which is the property drift itself lacks.
