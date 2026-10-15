# 93 · Architectural spike: gamifying the workflow

_Created 2026-10-11 · Updated 2026-10-14_

**Status:** asked — a spike. Nothing is built, and the purpose is to find out what would
have to be true before anything is.

## The question

Can a practitioner's use of Fieldwork be quantified — points, badges, levels —
in a way that **improves the analysis** rather than the number?

Asked as an architectural spike because the hard parts turn out to be
architecture and measurement, not interface.

## This is not the first attempt, and I did not look

[27](27-workflow-learning-and-gamification.md), written 2026-10-06, already
proposes most of the architecture below. Found only after this spike was
committed, by following a citation in [75](75-compositions-as-nodes.md).

| 27 already proposes | This spike "found" |
| --- | --- |
| **A87** Separate scientific work from learning evidence | "A workflow must not carry a score" |
| **A89** Points follow milestones, not clicks — with a trial rubric awarding 10 points for documenting a source | "Score the evidence, not the activity" |
| **A92** Local storage, one browser user, no account or roster; scientific export omits learner history | "Fieldwork has no notion of a person, and the honest default is not to introduce one" |
| **A90** A GIS learning ontology, with an illustrative RDF mapping | "Derivable from receipts, auditable like everything else" |
| **A93** Pilot and developmental evaluation | "The scoring rule is a rule and stays provisional" |
| **A96** Worked examples packaged as games | — |

So three of the four architectural findings below were already settled, and the
spike re-derived them. The failure is mine and worth recording as a pattern:
the request said to build on what the experiments already discuss, and I
searched for the words I expected — compositions, palette, skill — and not for
the thing itself. Ninety-four experiment records are past the point where
reading titles suffices.

**What is actually new here**, against 27:

- the hazard from [79](79-emergent-palette-slicing.md), which postdates 27: a
  frequency measure cannot tell "specific to a question" from "added last week"
- parsimony as the measure, below, which 27's milestone rubric does not contain
- the refusal of unlocking as distinct from progressive disclosure
- the correction in [94](94-where-explanation-belongs.md) that node count has no
  reliable direction

## What is already here to build on

| Already exists | What it gives a scheme |
| --- | --- |
| **Receipts** on every node, every run | An evidence trail that cannot be faked by clicking. Anything scored from receipts is auditable the way everything else here is |
| `usage:widgets` | Widget-to-example counts, computed from data rather than declared |
| [79](79-emergent-palette-slicing.md) | Emergent structure already measured: four widgets appear in 6–7 examples and 22 in exactly one, decided by nobody. And the **trap**: frequency conflates "specific to a question" with "added last week" |
| [75](75-compositions-as-nodes.md), [76](76-composition-governance.md) | A practitioner composing a micro-workflow is a real milestone with a real artifact, pinned and governed |
| The case studies' own levels | Basic, Advanced 1, Advanced 2 — authored by the people who wrote the material, not invented here |
| The rule-audit discipline | A rule is provisional until it has fired and addressed a gap. A scoring rule is a rule |

## The hazard, stated first

**Points for widget use reward using more widgets.** Good analysis uses fewer,
better-chosen steps, and a counter cannot tell a necessary step from a
redundant one.

This first read "the walking catchment is *better* as four steps than nine
knobs", which was an assertion dressed as a premise and is corrected in
[94](94-where-explanation-belongs.md). Four nodes are not self-evidently
clearer than one: they are four labels, four parameter sets and three
connections to hold in mind. Whatever compositions are for, it is not that more
nodes explain themselves — which makes the counting hazard worse, not better,
because there is no direction in which node count reliably points.

[79](79-emergent-palette-slicing.md) already found the same shape in a different
measure: `voronoi` appears in one example because it is specific; 
`find_health_facilities` appears in one because it is new. **Frequency does not
know why.** A score built on frequency inherits that blindness and adds an
incentive to it.

So the first question is not how to count. It is **what behaviour the project
wants more of**, and whether a number can stand for it.

## The better measure: the fewest widgets that produce the output

The sharper question is not which widgets were used but **how economically the
output was reached**. Not "how many widgets did you touch" but "how few did this
answer need".

That inverts the incentive the hazard above describes. A counter of widget use
rewards adding; a measure of parsimony rewards removing, and removing a step
that was not doing anything is a real skill.

It also makes compositions valuable for a reason that survives
[94](94-where-explanation-belongs.md). A practitioner who places one
`compute_walking_catchment` node has used **one** widget, not four: the members
are an implementation detail of a step they placed once. So building and reusing
a micro-workflow improves the measure directly, which is the skill-building case
for compositions made in a currency that can be counted — and it is an argument
for compositions that has nothing to do with whether four nodes read more
clearly than one.

**Parsimony alone is not enough, and would be dangerous alone.** The cheapest
canvas is one that skips the study area, attaches no reference, keeps every
inherited default and uses a monolith that hides its assumptions. That is fewer
nodes and worse work. So the measure has to be a pair:

> **the fewest widgets that produce the output _with its provenance complete_.**

Neither half works without the other. Provenance completeness alone rewards
ceremony; parsimony alone rewards hiding. Together they describe the workflow
this project has been arguing for all day: few steps, each one stating what it
assumed.

### There is no baseline, until there is

The obvious objection is that "fewest" needs a reference, and none exists:
**every GIS problem is unique — until it isn't.**

Both halves matter. For a problem nobody has solved before there is no minimum
to compare against, no canonical decomposition, and no way to know whether four
steps was economical or wasteful. A score there would be invented. The right
behaviour is for the measure to be **silent**, and silence on a novel problem is
not a gap in the design; it is the design being honest about a case it cannot
judge.

What changes is recurrence. A problem stops being unique when it has been solved
enough times for a shape to show, and at that point a baseline **emerges from
the corpus** rather than being set by anyone — which is exactly what
[79](79-emergent-palette-slicing.md) measured for widgets, where four turned out
to be core because every case needed them and nobody decided it.

**And this project already has the artifact that marks the transition.** A
micro-workflow is what somebody makes when a sub-problem has recurred often
enough to be worth naming, pinning and reusing. So a composition is not merely
a thing that improves the parsimony count by collapsing four steps into one: it
is the **evidence that a baseline can exist at all** for that part of the
problem. Before anyone composed `compute_walking_catchment`, "snap, traverse,
band, draw" was four steps somebody worked out; afterwards it is one step with a
name, and the next person's workflow can be compared against it.

Which gives the measure its shape without a leaderboard:

| Situation | What the measure says |
| --- | --- |
| A problem solved once | Nothing. There is no minimum and inventing one would be a fiction |
| A recurring problem with no composition yet | Compare a workflow against the practitioner's own earlier solutions to the same output. Self-comparative, which [27](27-workflow-learning-and-gamification.md) A92's single local user supports and a leaderboard is not |
| A recurring problem with a composition | The composed form is the baseline, and it is a real artifact with a version and a digest rather than a score somebody holds |

Two questions this does not answer: how many recurrences make a shape, and who
notices. Both are the admission question from
[76](76-composition-governance.md) in different clothing, which suggests they
should not be answered twice.

### Why this measure and not a faster one

In problem solving the time that pays is spent understanding the problem, not
building the answer. A practitioner who reads the question for twenty minutes
and then places four nodes has done better work than one who places twenty nodes
in twenty minutes, and the elegant workflow is the product of the thinking, not
a substitute for it.

That is an argument about **what must not be measured**. Planning is invisible
to instrumentation: a canvas with nothing happening on it looks identical
whether someone is thinking or has walked away. Any measure taken over a
*session* therefore rewards construction over comprehension, and rewards it
precisely in the moments where comprehension is what is wanted.

Parsimony survives this because it is a property of the **finished artifact**.
It cannot be improved by working faster, only by understanding the problem
better before building — which is the behaviour in question, measured by its
result rather than by watching for it.

[27](27-workflow-learning-and-gamification.md) is already aligned with this in
two ways, and it is worth noticing because they were arrived at separately. Its
exercise loop begins with **predict** — planning before connecting anything —
and it states that mistakes incur "no negative points, time penalties or broken
streaks".

**One guard it does not state.** A `LearningEvent` carries a local timestamp and
a sequence number, so even with time penalties refused, elapsed time and
construction rate remain *derivable* from the journal. A design that records
timestamps should say what may never be computed from them, because the data
being present is an invitation. The honest form is a stated non-goal: no measure
of speed, duration, session count or construction rate, derived or direct.

Open questions a spike would have to answer, none of them cosmetic:

- **What counts as the same output?** Two workflows agreeing to 3.8 parts per
  million are the same answer; two differing by a filled gap are not. The
  project has receipts precise enough to tell, which is unusual and useful.
- **Does it penalise exploration?** A practitioner who explodes a composition to
  see what it did has four nodes where they had one. Inspection must not cost
  points, which means the measure is over a *finished* workflow, not a session.

## The earlier idea, which the pair above subsumes: score the evidence

Everything this application does well, it does by refusing precisely and
recording assumptions. Today alone: the travel mode is checked against the
speed; the 1854 Soho walking assumption is stated in every result; a licence is
recorded; a corridor says the ground it added was never reached.

A scheme that rewarded **provenance completeness** would reward exactly that:

| Rewarded | Why it is the behaviour wanted | Derivable from |
| --- | --- | --- |
| Choosing a speed for your setting rather than keeping the default | The default is an 1854 Soho assumption and the project says so in every result | `fw:assumedSpeedMetresPerMinute` against the composition's default |
| Declaring the travel mode | Makes a number interpretable | `fw:travelMode` |
| Attaching a reference to a source | Provenance a reader can follow | `node.references` |
| Recording a licence for acquired data | 969 of 2,763 STAC collections say "proprietary" and mean nothing by it | receipt licence assertions |
| Resolving a refusal | "These bands are not nested" is a lesson; getting past it is learning | a refused run followed by a passing one |
| Authoring and admitting a composition | A real artifact with real governance | `compositions/` |

Each is a **fact in a receipt**, not a click. That makes the score auditable,
and it means the scheme cannot be gamed except by doing the thing.

It also inverts the obvious design: a practitioner who builds a four-node
workflow with complete provenance outscores one who builds twenty nodes without
it. Whether practitioners experience that as fair is unknown and is the kind of
thing this spike exists to find out.

## The architectural findings

**Fieldwork has no notion of a person.** No account, no profile, no identity;
`localStorage` holds workspaces, a build marker and a download throttle. A score
belongs to somebody, so the first architectural question is whether to introduce
an identity — and the honest default is not to. Progress stays on the device,
unexported unless the practitioner exports it.

**A workflow must not carry a score.** A workflow is a scientific artifact that
gets shared, reviewed and re-run. Putting points in it would mean a reviewer
receives someone's game state with their analysis, and the project manifest
would inventory it. Progress is a separate store, and the architecture has to
keep it separate or the separation will erode.

**Unlocking is the fork that matters.** Two readings of
[79](79-emergent-palette-slicing.md)'s skill levels:

- **Progressive disclosure** — a learner's palette starts small and grows. Help,
  not gate: everything remains reachable.
- **Unlocking** — widgets are withheld until earned.

The second would make a public-health tool withhold a capability from somebody
doing their job. That should be refused, and the refusal recorded here so it is
not revisited by accident.

**Badges describe what was done, not what somebody knows.** "Ran a network
catchment with a speed you chose for your setting" is a fact in a receipt.
"Isochrone expert" is a competence claim this project cannot back, and the same
discipline that stopped `evidence.status` saying `parity-checked` applies.

## The browser is the wrong place to keep a learning record

A browser is a good place to *compute* a measure and a poor place to *keep* one.

`localStorage` is per-origin and per-device. It is cleared when site data is
cleared, it does not survive a move to another machine, and the application
already treats it as fallible: `save()` returns whether it persisted, and
`change()` takes a `requirePersistence` option precisely because a write can
fail. That handling is right for a workflow and insufficient for a history.

The asymmetry is the argument. **A lost workflow is recoverable** — it can be
re-authored, or it was exported, and in the worst case the analysis is done
again. **A lost learning record is not.** It is an account of what somebody did
over months, and nothing reconstructs it. Keeping an irreplaceable record in the
most erasable store the platform offers is the wrong way round.

A desktop build changes that in two ways that matter here. There is a real file
the practitioner owns, can back up and can move between machines. And there is
an operating-system user, which is the identity this application otherwise
lacks entirely — the gap recorded above, where a score has no owner.

### Three reasons now point the same way, and one constraint

| Reason | Recorded |
| --- | --- |
| Cross-origin acquisition that no browser will permit | [69](69-healthsites-acquisition.md), as an optional upgrade, "not planned" |
| STAC assets behind CORS or authentication | [91](91-stac-browser-integration.md) |
| A durable learning record | here |

The constraint is [70](70-webkit-parity.md): Tauri on macOS runs WKWebView, and
before the WebKit work, every attached PDF and retained raster would have failed
there while a Chromium-only gate reported green. **A desktop packaging decision
follows a WebKit gate rather than preceding it.** That gate now exists in
practice — both suites have run at parity all day — though the documented gate
is still Chromium only, which is a gap worth closing before anyone packages
anything.

### What this does not license

Deferring the whole idea to a version that does not exist is how features are
quietly never built, and saying "that belongs in the desktop app" about work
nobody has scheduled is a way of agreeing with it without doing it.

The split that avoids that is already visible in the design above:

- **Measurement is stateless.** Parsimony and provenance completeness are
  computed from the workflow in hand and its receipts. Nothing is accumulated,
  nothing is stored, and the browser can do all of it today.
- **History is stateful.** A record of what somebody did over months needs a
  file, and that is what waits for a desktop build.

So the first cut *could* stay in the browser, honest about being a measurement
rather than a record.

**Superseded 2026-10-11.** It could, and it should not. The browser application
stays focused on field work and learning moves to the desktop build, recorded in
[desktop and browser for learning](../research/desktop-and-browser-for-learning.md).
The argument above was about what is technically separable, and the decision is
about what belongs where: a tool used during an outbreak should not have points
on the screen, which holds whatever the storage can do. The split between
stateless measurement and stateful record remains the right engineering shape;
both halves now live on the same surface.

## What a minimal spike would build

Enough to learn, and no more:

1. A read-only **tally derived from existing receipts** — no new instrumentation,
   no new storage. If the receipts cannot already answer it, that is the finding.
2. One screen showing what a practitioner did and what provenance is missing.
3. **No points, no badges, no levels in the first cut.** Measure what the
   evidence can support before attaching a number to it.

Step 3 is the discipline the rule audit asks for: the scoring rule is a rule,
and it stays provisional until it has fired on real use.

## Predictions, written to be wrong

1. **The receipts already contain enough** to compute every achievement worth
   having, with no new tracking.
2. **A widget-use count will not correlate with workflow quality** on the seven
   worked examples, and may correlate negatively once node count is controlled.
3. **The hard part will be deciding what not to score**, not computing anything.
4. Practitioners will ask for a leaderboard, and a local-first tool with no
   identity cannot provide one without becoming a different product.

## What changed our minds

Four corrections landed on this document the day it was written, all from the
practitioner, and none of them is visible in the proposal above without this
section.

**Decomposition is not automatically clarity.** The spike leaned on "the walking
catchment is better as four steps than nine knobs". Adding nodes to explain a
micro-workflow carries its own cognitive load and does not make the workflow more
efficient; the place to dig deeper is the accompanying notebooks, not the canvas
([94](94-where-explanation-belongs.md)).

**Reusable micro-workflows are still worth having, for a different reason** —
they build skill in problem decomposition, which belongs in a user manual this
project does not have.

**The thing worth measuring is not widget use.** It is whether an output was
reached with as few widgets as possible, because in problem solving the time pays
in planning and understanding before building. And then, immediately:
**there is no baseline for fewest**, because every GIS problem is unique until it
isn't — which removes parsimony as a score while leaving it as a value.

**And the browser is the wrong place for any of it.** A browser-only app cannot
hold a learner record; the desktop version can, and
[the comparison](../research/desktop-and-browser-for-learning.md) settled that
Fieldwork in the browser stays focused on field work, with learning as the
desktop's dimension.

Written down here also because this document **re-derived
[27](27-workflow-learning-and-gamification.md)** without knowing it existed,
five days after it was written, and found it only through a citation in
[75](75-compositions-as-nodes.md).

## What would close it

The four predictions above, run against the receipts of the seven worked examples. Prediction 1
— that the receipts already contain enough — is answerable today with no new code, and
prediction 2 needs the parsimony measure the practitioner later showed has no baseline. If
prediction 1 fails, this is **retired** and nothing further is needed.

## What this does not establish

That gamification helps at all. The case for it is about motivation and learning
([74](74-notebook-first-worked-examples.md) is the method that would judge it),
and motivation is a claim about people that no receipt can settle. There is also
a real possibility the answer is no: that a professional tool used for outbreak
work is the wrong place for points, and that the same effort spent on clearer
refusals would teach more. The spike should be able to end that way.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-11 | Add a gamification spike, and an actual TODO list |
| 2026-10-11 | Retire the claim that more nodes explain themselves |
| 2026-10-11 | Cite the gamification experiment I missed, and measure parsimony instead |
| 2026-10-11 | Record why the measure is over the artifact, not the session |
| 2026-10-11 | Resolve the parsimony baseline: there is none, until a problem recurs |
| 2026-10-11 | Record that a learning record needs a desktop build, and what that does not license |
| 2026-10-11 | Decide: the browser app is for field work, learning is the desktop build's |
| 2026-10-11 | Give the experiment document a form, and a ratchet to hold it |
| 2026-10-12 | Make the total a signed number, and make an open experiment say what closes it |
