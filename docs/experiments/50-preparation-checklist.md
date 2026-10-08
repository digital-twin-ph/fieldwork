# 50 · The preparation checklist, and what its format would decide

**Status:** developmental-evaluation item. The layout is open by intent; four
constraints on it are not. This record does not choose a format, because choosing one
on present evidence would be the error it exists to prevent — but it records what any
format must satisfy: falsifiable items, verified facts kept visibly distinct from
declared ones, a size on every download, and deferral as a stated state rather than an
empty box.

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

## Creation knows more than this record first claimed

An earlier draft argued that project creation carries the ability to change the plan
but none of the information. That is wrong, and the correction is the most useful
thing in this record: **the study area is known at creation**, and the study area is
the key from which nearly every downloadable resource follows. The blank workspace
already makes drawing it step 1.

Once a boundary exists, the application can derive — not ask — what the activity
will need: basemap tiles for that extent, a street graph for that bounding box, a
raster window, a boundary file. What it cannot derive is the **case data**, because
that is collected on site and does not exist yet.

So the three things on a preparation list are not one kind of item:

| Class | Example | Can the application check it? | What the item is *for* |
| --- | --- | --- | --- |
| **Provisionable** — derived from the study area, fetchable now | basemap tiles for the extent, street graph, raster window | Yes, and it can measure the size | Deciding whether to download it, and when |
| **Capture capacity** — derived, but nothing to fetch | attribute schema present offline, identifier strategy chosen, storage headroom | Yes, but about *capability*, not content | Being able to record what you find |
| **Declared** — outside the software entirely | consent, permission to be present, batteries, a paper fallback | No | Being honest that the list is not the whole job |

Case data is not a missing item on the list. It is the second class, and conflating
the two produces the familiar bad checklist: a line reading "case data ☐" that can
only ever be ticked dishonestly. The right item is *can this device record an
observation offline, with the attributes this study needs* — which is checkable, and
which is a different question.

This also replaces the two-surface hypothesis with something simpler. Intent need
not be declared abstractly at creation if the study area is drawn there: the area
*is* the declaration, and the derived list follows from it.

## Size changes the format, measured

The practitioner knows their connectivity and will defer a large download until the
link is stable. That is correct judgment the application does not have, and it means
a readiness item cannot be a binary tick. It has to carry a size.

How much that matters, computed for the Old Naledi extent
(25.783 E to 25.982 E, −24.708 S to −24.544 S — roughly 20 km by 18 km) at
approximately 23 kB per tile:

| Tiles through zoom | Tiles | Estimated bytes |
| --- | --- | --- |
| 15 | 481 | ~11 MB |
| 16 | 1,739 | ~39 MB |
| 17 (the editor's maximum for this layer) | 6,630 | ~149 MB |

The depth dominates everything else: the last zoom level alone is 4,891 of the 6,630
tiles. A checklist that says "basemap tiles: not cached ☐" hides the only decision
that matters here, which is **how deep**, and it is a decision only the practitioner
can make, because it trades street-level detail against a download they may not be
able to finish.

Three format requirements follow, and they are now constraints rather than
preferences:

1. **Every provisionable item carries an estimated size**, labelled as an estimate,
   because tile bytes vary with terrain and rendering.
2. **Deferral is a first-class state with a reason**, not an unchecked box. An item
   is required, deferred by choice, or unavailable here — and a deferral records why,
   because that is what explains a field failure afterwards.
3. **A partial download reports as partial.** A tile set interrupted at 60 % must
   never present as cached; this is exactly the one-asset-probe failure from
   [experiment 49](49-catalog-in-the-interface.md) repeated at a finer grain.

Nothing here says the application should fetch automatically. It should propose with
sizes and let the person with the knowledge of the link decide.

## Learners are a second audience with different needs

The flow described includes a learner, and for a learner the checklist is
**pedagogy**, not a reminder: it teaches what field work requires, which they do
not yet know. That pulls toward explanation attached to each item, and against
terseness. A format optimised for an experienced practitioner who needs to confirm
four things quickly is the wrong format for someone learning what the four things
are — and the reverse.

Whether one format can serve both is unknown. It is the second open question in
this record, and it may be the one that decides the first.

One capability the derived list would unlock either way: because the study area is
known at creation and widgets declare what they need, the application can say
something it currently cannot — *this workflow now includes a widget that needs a
network, and you prepared for an offline activity.* That sentence is worth more than
a page of ticks.

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
| Does anyone change the zoom depth once they see the byte estimate? | That size belongs on the item at all |
| Is a deferred item revisited before departure, or forgotten because deferring felt like completing? | That deferral is a safe state rather than a disguised omission |
| Someone goes to the field unprepared anyway, with the checklist present and correct | That the problem was ever one of information |

The last row is the one that would retire this whole line of work, and it should be
easier to observe than it currently is.

## Competency questions

Answerable, if a derived report exists:

1. Which resources this activity needs are cached, and which are missing?
2. Which widgets in this workflow stop working without a network?
3. Does the current workflow need a network it will not have, given the study area
   and widgets in it?
4. How large is each outstanding download, and how deep does the basemap go?
5. Which items were deferred, and for what stated reason?

Must be refused, whatever the format:

6. Is this activity ready? — the application can report what it checked, and must
   not certify readiness it cannot see. Consent forms, batteries, a paper fallback
   and permission to be present are all outside it.
7. Did the practitioner actually do what they ticked? — a tick is a claim. It can
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
