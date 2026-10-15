# Field questions

_Created 2026-10-15 · Updated 2026-10-15_

**What this is.** The questions about Fieldwork that cannot be answered without a practitioner
using it, kept in one place until there is a phase that can answer them. This project has not
reached field testing. Nothing here is scheduled, and nothing here blocks an experiment.

**Why it is separate.** Four experiment documents had named one of these as their closing
condition, which parked them under `tried` while claiming to wait on work nobody could do. The
practitioner's correction, 2026-10-15: *"This cannot be answered without field testing which is a
phase this project has not reached yet. That is not an experiment question."* An experiment closes
on a measurement, a piece of code or a decision; a field question closes on a person. Mixing the
two makes the status vocabulary lie, and the rule is now in
[the experiment README](experiments/README.md#what-would-close-it).

**How to use it.** Each entry says what to ask, what has already been built to ask it with, and
what an answer would change — so that when field testing exists, the protocol is most of the way
written and no one has to reconstruct why the question mattered. An entry that stops mattering is
struck with the reason, not deleted.

---

## Does progressive reveal help, or hide the application?

From [112](experiments/112-progressive-widget-reveal.md).

**Ask:** given a task and an empty canvas, does a practitioner facing a reduced palette find what
they need, or conclude the application cannot do it? Measured both ways round — the full palette
is the control, and it is not obviously worse.

**Built to ask it with:** the playback behind `?playback=1` on any worked example, which steps a
built workflow one widget at a time and dims what the rule would not offer; the per-step
measurements in 112 (on `snow-extent`, two steps of nine do all the revealing); and the three
readings of the rule — stage, port, receipt — each of which reveals a different set, so the
protocol has to say which one is being tried.

**An answer would change:** whether the rule is applied to the ordinary palette at all, and which
reading. A practitioner who hunts for a widget that is hidden is evidence against the whole
approach, not against one reading of it.

## Does the projection section change what a practitioner does about their zone?

From [110](experiments/110-one-projection-per-workflow.md).

**Ask:** after reading the projection explanation, what does the practitioner conclude about their
own zone choice — and do they then change it?

**Built to ask it with:** the derived palette default, the Inspector's disagreeing-zone notice with
its measured cost, and the button that applies the suggestion
([100](experiments/100-choosing-the-metric-crs.md)). The cost is already stated in numbers for the
shipped data, so the question is whether the number is read, not whether it exists.

**An answer would change:** whether an explanation is the right instrument for a projection
mistake at all, or whether the application should refuse a zone it can measure as wrong.

## Would a practitioner reach for a second frame, and reach for this widget?

From [111](experiments/111-splitting-reproject.md).

**Ask:** when a practitioner needs a second coordinate frame, do they reach for `reproject` — or
is the projected table in the Snow example read as an explanation of the analysis rather than as
something they would build themselves?

**Built to ask it with:** both halves implemented, the direction answered, parity evidence in lab
check 24, and a worked example that instantiates it.

**An answer would change:** whether the widget is kept, or retired as a thing that exists because
it was separable rather than because anyone wanted it.

## Does a Dive Deeper section land?

From [94](experiments/94-where-explanation-belongs.md).

**Ask:** what does a practitioner report learning from one, and can they act on it?

**Built to ask it with:** ten notebooks carrying one, counted by the coverage ratchet
([98](experiments/98-the-coverage-ratchet.md)).

**An answer would change:** 94 moves to `validated`, or to `retired` if the notebook turns out to
be the wrong surface for explanation after all — which is a real possibility the document already
names.

---

## What this does not establish

That any of these questions is well posed. A question written by the people who built the thing
is a question shaped by what they expect to hear, and the four above were all written that way.
Whoever runs field testing should expect to rewrite them, and the value of this file is then the
record of what was assumed, not the protocol itself.
