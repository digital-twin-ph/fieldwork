# 75 · A workflow used as a node

_Created 2026-10-10 · Updated 2026-10-15_

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

## Two surfaces, and they are not the same thing

A **worked example** is case-based: a whole analysis of one situation, loaded from
the workspace list — heat outreach, Old Naledi, John Snow, Manila coastal
exposure. You open it instead of what you were doing.

A **composition** is a node: you add it to the canvas you already have. It is not
a workspace, so it does not belong in that list — and it reaches the palette only
by being admitted, with the assets and governance in
[76](76-composition-governance.md). Until then it is private work, usable in your
own workflows and visible nowhere else.

| | Worked example | Composition |
| --- | --- | --- |
| Answers | one case, end to end | one step, reusable |
| Where | workspace list | palette |
| Opening it | replaces the canvas | adds a node |
| Who makes it | the project, so far | the practitioner |

The palette groups today are Sources, Spatial operations, Comparisons and checks,
Semantic reasoning, Summaries and Outputs. A group such as **Micro-workflows**
would hold compositions.

### The tension that grouping creates

Every existing group names **what an operation does**. A composition's defining
feature is **what it is** — a workflow used as a node — and it could do anything.
A composition that retrieves facilities is a source; one that ends in a map is an
output. Grouping by form puts it in neither.

Two ways, and the choice is not obvious:

- **One group for compositions.** Easy to find your own work. Divorced from the
  taxonomy a practitioner has already learned, and a composition that is plainly a
  source sits away from Sources.
- **Grouped by what they do, marked as compositions.** Consistent with the rest of
  the palette, but your work is scattered through six groups.

Whatever is chosen, **a composition must be distinguishable from a shipped
widget.** That is not presentation. The audit's standing complaint about the nine
example nodes is exactly that something demonstration-specific is indistinguishable
from something the project maintains, and compositions would make that possible at
scale and by many authors.

A third distinction will be needed sooner than it looks: your own composition, and
one somebody sent you. A published composition carries its author's claim, not the
project's ([76](76-composition-governance.md)), and a palette that shows both as
"Micro-workflows" has lost that.

## Order becomes something you can test

A widget fixes the order of its steps, and a practitioner cannot tell whether the
order mattered. A composition exposes the steps, so **ordering becomes an
experimental variable**: run it one way, run it the other, compare the outputs.

That is a capability, not only transparency. Some orderings change the answer, and
the project already contains the cases:

| Pair | Why the order matters |
| --- | --- |
| Reproject, then measure — or measure, then reproject | A distance in degrees is not a distance in metres. This is the classic error, and it is why five widgets each demand a UTM zone |
| Clip to the boundary, then aggregate — or aggregate, then clip | Counts at the edge differ. A cell straddling the boundary is counted whole, in part, or not at all |
| Mask points, then aggregate — or aggregate, then perturb | Entirely different disclosure properties. `donut_geomask` and `hex_aggregate` compose both ways and the privacy claim is not the same |
| Buffer, then union — or union, then buffer | For a fixed radius these agree, which is worth knowing too: a pair that **does not** matter is a finding a practitioner can rely on |

The last row is the useful control. Not every order matters, and a composition
that lets someone check costs less than an argument about it.

**This belongs in the documentation as a possibility.** When an order changes the
answer it is one of three things, and a reader cannot tell which by looking:

- **Required.** Projecting before measuring is not a choice. The other order is
  wrong, and a composition that permits it should refuse or warn.
- **A methodological choice.** Masking before aggregating and aggregating before
  perturbing are both defensible and make different disclosure claims. The
  composition should say which it made.
- **Immaterial.** Buffer and union agree for a fixed radius. Worth stating, so
  nobody spends an afternoon on it.

A composition's description should say which of the three each reorderable pair
is. That is the documentation this makes possible, and it is more specific than
saying the order matters.

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

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Three admission reviews for compositions, written before the code |
| 2026-10-10 | Separate the two surfaces: worked examples load, compositions are added |
| 2026-10-10 | The palette is a curated surface: compositions reach it by admission |
| 2026-10-10 | Ordering is a variable a composition can test, and should be documented |
| 2026-10-10 | Say what an order that changes the answer actually is |
