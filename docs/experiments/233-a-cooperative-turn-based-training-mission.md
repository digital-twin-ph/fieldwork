# 233 · A cooperative, turn-based training mission

_Created 2026-11-26 · Updated 2026-11-26_

**Status:** asked. A research proposal, kept for review. Nothing is built: no game, no hosted session, no learner
trial. Every design choice below is the proposal's, and none has been settled by the practitioner.

## The question

Can learners work together against a scenario, using the same analytical tools they would use in Fieldwork, in a
session kept clearly apart from ordinary project work?

The proposal was written in a ChatGPT session and given by the practitioner on 2026-11-26 to be written up as an
experiment and reviewed later. Its recommendations are recorded as it made them.

The [learning-surface comparison](../research/desktop-and-browser-for-learning.md) argued against putting game
mechanics into the browser field tool. This asks something narrower: whether a separate, opt-in **Training Mission**
session can support collaboration and leave field work unchanged. [27](27-workflow-learning-and-gamification.md) and
the [gamification spike](93-gamification-spike.md) asked about scoring one practitioner's work. This is about a team
playing a fictional exercise.

## The proposal

**The team plays against the clock and against incomplete information, not against each other.** Three team turns,
one facilitator, one fictional event. It is a training exercise. It forecasts no real outbreak.

| Part | Holds | Does not hold |
| --- | --- | --- |
| A worked-example repository on GitHub | The pinned scenario, the starter workflow, the first synthetic data, the rules, and a few small licensed graphics | Live moves, rosters, the answer key, the seed, or evidence not yet released |
| Fieldwork, in the learner's browser | The map, tables, charts, receipts, and drafting a move | The official state, advancing the turn, or grading |
| Supabase | Who is signed in, team membership, released snapshots, moves and decisions | The epidemiological model |
| The agent-based model, run by the facilitator | A reproducible simulated course and its hidden state | Scoring, permissions, or what is released |

### A turn

1. The facilitator creates a session and shares a join link. A learner signs in, joins a team they are authorized
   for, and opens the pinned template. The link says which team they belong to. It gives no access to another team's
   data.
2. The dashboard opens at the saved turn. Every learner looks at the same released snapshot. They can build a map,
   check a denominator, or note a gap in reporting. Drafts can stay local. A move counts as submitted only once the
   server acknowledges it.
3. Players propose actions. The team agrees a decision and records three things with it: why, one receipt or
   artifact as evidence, and what would make them reconsider.
4. Only the facilitator can end a turn. One database transaction checks the facilitator's authority, checks the
   session's revision, refuses stale decisions, and commits the accepted moves, the score and the next snapshot
   together. Sending the same request twice must not advance the clock twice.
5. Clients refresh after a release. A client that missed the notice reads the authoritative snapshot when it
   reconnects. Debrief reopens the snapshot the team actually saw, not the latest map.

### The record

Decisions are append-only, and snapshots are versioned. The tables are sessions, memberships, moves, resolutions and
released evidence. Each decision records:
- its turn and snapshot;
- the action and the reason for it;
- a reference to its receipt, with the receipt's digest;
- the server's time.

A run's id helps find its receipt, but an id held only on one device cannot be replayed. The evidence is either a
small, cleaned export kept with the decision, or a durable reference with a digest. The template's revision and the
kernel build are recorded too. Material not yet released stays where only the facilitator can read it: outside what
players download, and outside every view, API and subscription a player can reach.

Supabase Auth says who someone is. Row-level security limits what they can read to the sessions they belong to.
Writes are limited to the right role, through a database function. No privileged key goes to the browser. Supabase's
live updates are only a signal to refresh. They are not the game's record.

**Without a live service**, the proposal falls back to one GitHub issue per turn, and one commit by the facilitator
through the existing [repository save](../../src/repository-save.ts). Comments are proposals, and the accepted reason
belongs in the commit. The [shared-project reader](../../src/shared-project.ts) does not read game-state files, so
this fallback starts with downloading a valid Fieldwork snapshot and importing it by hand.

### Pictures and dashboards

Two kinds of picture, kept apart:
- **Scene-setting:** a briefing card for Country X, a few consistent role portraits, and drawings for messages such as
  "new report available". Optional, light, and kept in the template.
- **Evidence:** drawn by Fieldwork from the released data, with keys, dates, denominators and sources. An illustrated
  map can introduce Country X. It never replaces the map learners decide from.

| View | Holds | Leaves out |
| --- | --- | --- |
| Team | The turn and simulated date, the actions available, incoming reports, the main map, a time series or a comparison of districts, and a drawer for the decision's reason and evidence | Hidden model state, a leaderboard of individuals, many score cards |
| Facilitator | The current revision, what has been submitted, who is ready, a preview of exactly what will be released, and End turn | A second copy of the analysis, or a preview a player can see by accident |
| Debrief | Each turn as evidence available, then decision and reason, then result, each linking back to its map, table or receipt | Hindsight shown as if players had it; claims of cases averted that nothing supports |

On a desktop, the map is the main panel, with a narrow panel for the turn and decision beside it. On a phone, the
order is briefing, then evidence, then decision, with a table in place of the map. Suspected, confirmed, not yet
reported and zero stay distinct by label and symbol as well as colour. Boundaries and keys stay the same across turns,
or the change is said. Accents mark scarce actions and new evidence, not every click. A 3D flyover of Country X could
come later as an optional introduction. Nothing in play depends on it.

## What a pilot would try

One fictional event, two to four learners, three releases of evidence:

1. An apparent hotspot, and a gap in reporting.
2. A choice between checking a denominator and spending a scarce action on outreach.
3. A response to defend, naming the evidence that would change it.

The model runs once. Actions can unlock reports or change the operational record. They do not change the modelled case
counts. Timeliness, reasoning and the quality of evidence are scored against published criteria. If 7-1-7 is used to
frame the exercise, simulated days are kept apart from minutes on the clock, and a simplified score is not presented
as a formal 7-1-7 measurement.

Two things would be evaluated separately.

**Does it hold together?**
- Two learners see the same revision.
- Someone joining late sees the latest snapshot they are allowed to see.
- Two End turn presses at once advance the turn exactly once.
- A second team cannot read the first team's evidence or moves.
- Nothing unreleased reaches a browser response or cache.
- The map and table work on a phone and after a reconnect.

**Does anyone learn?**
- Can learners tell missing reports from zero cases?
- Can they justify a denominator?
- Can they defend a decision with a receipt?
- Can the facilitator reconstruct what was knowable at each turn?
- Is it better than the same worked example discussed without turns?

A small pilot is evidence about usability and reasoning. It is not proof that learning improved.

The proposal's order: build join, inspect, submit, resolve and replay before any animation, leaderboard or richer
multiplayer. A way to step and resume the model, and decisions that change the simulated course, come only if the
pilot shows players' decisions need to.

## What is already in the repository, checked 2026-11-26

- **Pinned examples.** The [worked-example catalog](../../widgets/examples.json) pins each example by commit and
  content digest, so a session can record the template revision it admitted rather than follow a branch.
- **A reproducible model.** [199](199-an-agent-based-model-in-the-browser.md) and the
  [kernel's model](../../kernel/src/abm.rs) run a whole outbreak reproducibly in the browser. 199 reports agreement
  with Starsim for its test model. It does not report a fit to any historical outbreak.
- **Saving to a repository.** [repository-save.ts](../../src/repository-save.ts) exists. So does
  [shared-project.ts](../../src/shared-project.ts), which reads a shared project but not game-state files, as the
  proposal says.

## For review: where it meets what is already decided

Recorded so the review starts from them. None is settled here.

- **Dive Deeper is separate and deferred.** Teaching material lives in its own repository and waits until the widgets
  mature. A training mission is teaching. Whether it belongs with Dive Deeper, and when, is the practitioner's call.
- **A new outside service.** Supabase would hold learners' identities and team data. That is a new outside service,
  with its own terms and its own place where people's data lives. The proposal's fallback, GitHub issues and commits,
  avoids it.
- **A laptop, not a cluster.** The model on the facilitator's side is the existing browser kernel, so a session runs
  on an ordinary laptop, as every simulation here does.
- **Scoring.** [27](27-workflow-learning-and-gamification.md) and [93](93-gamification-spike.md) concluded that
  points must follow evidence and milestones, not clicks, and must never be stored on the workflow. This proposal
  scores a team's decisions, kept in the session record, which is consistent with that. Whether to score at all is
  still open.

## What this does not establish

That learners want this, that a facilitator can run it, that Supabase is the right service, or that turns teach better
than a discussed worked example. Nothing has been built or tried.
