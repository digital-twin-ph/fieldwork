# 50 · The preparation checklist, and what its format would decide

**Status:** developmental-evaluation item. Open by intent. This record does not
choose a format, and choosing one on present evidence would be the error it exists
to prevent.

[Experiment 49](49-catalog-in-the-interface.md) established that the practitioner
makes one consequential decision while still online — am I ready to go offline? —
and that the application currently tells them almost nothing true about it. The
obvious response is a checklist at project creation. The obvious response is also
where the difficulty starts, because **nobody involved knows what form it should
take**, and the form is not cosmetic.

## Why the format is the question

A checklist is a theory of failure wearing a user interface. Each plausible format
asserts a different reason practitioners arrive in the field unprepared, and the
formats are not interchangeable:

| Format | Asserts the failure is | Fails when |
| --- | --- | --- |
| A written list in the documentation | Not knowing what is required | Nobody reads it at the moment of departure |
| Items the practitioner ticks | Forgetting | Ticking becomes ritual, and a tick is a claim, not evidence |
| Items the application derives and verifies | Not knowing the current state | It can only see machine-checkable things, and goes silent on the rest |
| A gate that must pass before departure | Insufficient consequence | It cannot be satisfied in a bad network, so people route around it |
| An exported readiness record | Nobody can reconstruct what was ready | It documents the problem instead of preventing it |

If the dominant failure is forgetting, ticks help. If it is not knowing the state,
ticks are worse than nothing, because they teach the practitioner to assert things
the application could have checked. We do not currently know which dominates. That
is the finding, and it is why this is a DE item rather than a task.

## The one rule that holds whatever the format

**A checklist item must be falsifiable, or it is decoration.** "Did you download
the data? ☐" is a self-report and will be ticked by someone who believes it. "3 of
4 required files cached; `soho.graphml` missing" is a fact that can be wrong in a
way the practitioner can see.

A corollary, and the sharpest design constraint found so far: **an item the
application could verify must never be offered as a tick.** Mixing the two in one
visual list trains the reader to treat verified facts and personal assertions as
the same kind of thing, which is precisely the confusion that put them in the field
without a basemap.

This cuts the space in half before any format is chosen. Whatever the layout,
derived items and declared items must be visibly different kinds, and a format that
cannot show that difference is excluded.

## Creation is the wrong moment, and also the only moment that can choose

The request was a checklist "when creating a project", which is worth examining
rather than implementing, because creation is when the practitioner knows **least**:

- At creation there is no workflow, so nothing can be derived. What data the
  activity needs, which widgets will want a network, what the study area covers —
  none of it exists yet.
- At creation the practitioner can still **change the plan** cheaply. By departure
  they cannot.

So the moment carries the choice but not the information, and the moment with the
information carries no choice. This suggests two surfaces rather than one, which is
a hypothesis and not a decision:

1. **At creation: a declaration of intent.** Is this a field activity or a desk
   activity? Will there be a network? What is being taken in? This is short, it is
   all declared rather than derived, and its value is that it makes later derivation
   possible and later contradiction visible.
2. **Before departure: a derived readiness report.** Everything checkable, checked,
   against the intent declared at creation.

An intent declared at creation also gives the application grounds to say something
it currently cannot: *you said this was an offline field activity, and you have just
added a widget that needs a network.* That sentence is worth more than a page of
ticks, and it is only available if intent was captured early.

## Learners are a second audience with different needs

The flow described includes a learner, and for a learner the checklist is
**pedagogy**, not a reminder: it teaches what field work requires, which they do
not yet know. That pulls toward explanation attached to each item, and against
terseness. A format optimised for an experienced practitioner who needs to confirm
four things quickly is the wrong format for someone learning what the four things
are — and the reverse.

Whether one format can serve both is unknown. It is the second open question in
this record, and it may be the one that decides the first.

## What a cheap comparison would look like

This can be evaluated before any of it is built, which is the point of running it
as a DE item:

- Write two or three candidate formats as **paper or Markdown**, with no code.
- Use each in one real preparation for one real activity.
- Record, for each: which items were ticked without being true; which items the
  person added by hand; what was missing in the field anyway; and whether they
  consulted it at departure or only at creation.

The hand-added items are the most informative signal, because they are the content
the design did not know it needed, supplied by the person who needed it.

## Observations, written so they can come out badly

| Observation | Would disconfirm |
| --- | --- |
| Items are ticked that were not true | That ticks are an acceptable mechanism at all |
| The list is consulted at creation and never again | That creation is the right moment |
| A derived report is read but produces no action | That reporting is sufficient, rather than blocking |
| Nothing is added by hand across several uses | That the checklist content is incomplete — or that people have stopped engaging |
| Learners and practitioners want the same items in the same order | That two formats are needed |
| Someone goes to the field unprepared anyway, with the checklist present and correct | That the problem was ever one of information |

The last row is the one that would retire this whole line of work, and it should be
easier to observe than it currently is.

## Competency questions

Answerable, if a derived report exists:

1. Which resources this activity needs are cached, and which are missing?
2. Which widgets in this workflow stop working without a network?
3. Does the current workflow contradict the intent declared when the project was
   created?

Must be refused, whatever the format:

4. Is this activity ready? — the application can report what it checked, and must
   not certify readiness it cannot see. Consent forms, batteries, a paper fallback
   and permission to be present are all outside it.
5. Did the practitioner actually do what they ticked? — a tick is a claim. It can
   be recorded and attributed; it cannot be verified.

## Dependency, and the sequence this implies

Nothing here can be derived until the readiness facts exist. Experiment 49 recorded
two defects that block it: cross-origin resources are never cached, and "Available
offline" is inferred from a single asset. **Those are prerequisites, not companions**
— a checklist built on an unenumerated cache would report confidently and be wrong,
which is worse than reporting nothing.

Sequence: fix the readiness facts; then capture intent at creation, which is cheap
and purely declarative; then run the paper comparison before building any derived
report.

## Practitioner exercise

Before your next field activity, write by hand everything you had to do to be
ready. Then mark each item: could the application have checked this, or only you?
Bring the list back. The split between those two columns is the format question
stated as data, and it is currently the only evidence anyone has about it.
