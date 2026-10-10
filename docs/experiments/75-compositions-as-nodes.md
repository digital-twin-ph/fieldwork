# 75 · A workflow used as a node

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Proposes a mechanism, not a
primitive, so it says which design checks apply and which cannot.

## The claim to be proved

A practitioner can select part of a working workflow, save it as a **composition**,
and use it in another workflow as a single node — a micro-workflow inside a macro
one. Opening it shows the steps it stands for.

Two things follow if it holds. A practitioner keeps the sequences they repeat,
without the project guessing which composites to ship. And breaking a problem into
parts becomes something you do on the canvas, which is how the problem-solving is
taught rather than described.

## The competency question

**Which steps does this node stand for, and what did each of them do?**

A composition that cannot answer it is a black box with a friendly name, and the
project already has nine of those — the example nodes that bake one
demonstration's specifics into a palette entry. This mechanism exists so those
stop being widgets.

## What is already true

| | |
| --- | --- |
| A workflow is already a saved, validated artifact | `fieldwork/workflow/1`, exported and reopened today |
| Only registry widgets can appear in one | `core.ts` rejects any type not in `TYPES` |
| Ports already type-check between nodes | `validateWorkflow` |
| Every node already emits a receipt | the execution contract |
| The mechanism was specified twice and never built | [31](31-facility-access-primitives.md), [prior art](../research/prior-art.md) on the QGIS Model Designer |

## Design checks

D1 and D7 are about primitives. A composition is not one, and saying so matters:
its contents are already-admitted primitives, so there is no residual knowledge to
argue about. What remains is the wiring and the claim.

| Check | Answer |
| --- | --- |
| **D2** · exists under another name? | No. Packs ship vocabulary and examples, not composed nodes. Templates load a whole workflow; they cannot be used as a step inside one |
| **D4** · port and graph conditions in the right place? | A composition's ports are the unconnected ports of its members. Derived, not declared, so they cannot disagree with the contents |
| **D4a** · a block, or a pre-glued assembly? | Deliberately an assembly — and one whose glue is visible. The distinction from a widget is that the assembly can be opened |
| **D5** · qualifiers on the input? | The public parameter set is the open question. Too few and it is rigid; too many and it is the internal graph with extra steps |
| **D6** · workflow traced end to end? | Required before building. The trace is the Basic cholera study: read points, map them, compute a centre. If that cannot be saved and reused, nothing can |
| **D8** · evidence tests the distinction? | The distinction is *a composition is not a widget*. The test is that running one produces its members' receipts, not one receipt claiming the work |
| **D9** · lowers effort, measured? | Unmeasured. The claim is that a repeated three-node sequence becomes one node, and the measure is node count in a workflow that uses it twice |
| **D10** · an example instantiates it? | Required. Three widgets were built this week with no example, and all three were still unused when the question was asked |

## Distinctions it must carry

| Distinction | How enforced |
| --- | --- |
| A composition is not a widget | **Hard stop.** It is not in the registry, carries no release file, and cannot be referenced by a pack |
| A composition contains only registry widgets | **Hard stop.** Already enforced by `core.ts` for every workflow |
| A composition's receipts are its members' | **Validation rule.** A run that produces one receipt for the whole composition is refused |
| Opening a composition shows its steps | **Limitation if absent.** A composition that cannot be opened is a black box, and the audit already names nine of those |

## What this does not establish

That practitioners will make them. The argument for compositions is partly that the
nine example nodes should have been somebody's saved work, but nobody has been
offered the chance to save any. Whether a practitioner reaches for this, or keeps
rebuilding the same three nodes, is the thing to watch and cannot be argued here.

Nor does it establish the teaching claim. That breaking a problem into parts on a
canvas teaches problem-solving is plausible, and [27](27-workflow-learning-and-gamification.md)
has the vocabulary to observe it. It has not been observed.
