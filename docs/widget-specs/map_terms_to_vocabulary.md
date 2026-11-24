# Map a column’s terms to a vocabulary — specification

_Created 2026-11-24 · Updated 2026-11-24_

**The name is provisional.** [Experiment 232](../experiments/232-terms-looked-up-and-appraised.md) holds three open
questions, one of which is what this widget is called and whether it is one widget or two. The release is cut and
immutable; answering question 3 differently means a new release and a migration, which is cheap only while nobody
outside this project has built on it.

## What it assumes

That a person, not a ranking, decides which entity a term names. The step keeps decisions and applies them; it has
no notion of a best match and no fallback to one.

That a decision stays true until someone changes it. Wikidata is edited by anyone, and this does not re-check, so a
run reproduces rather than refreshes. The date of each decision is kept so a reader can weigh its age.

## What was measured

Wikidata's `wbsearchentities`, 2026-11-24, four terms from work in hand, top four candidates each:

| Term | Wikidata's first | What a Nigerian LGA table means |
| --- | --- | --- |
| Kano | Q182984, *city in Nigeria* | Q682571, *state of Nigeria* — **fourth** |
| Ungogo | Q3510251, *local government council* | the same — with a constituency and two wards of that name below it |
| Kunchi | Q6444225, *LGA in Kano State* | the same — with a ward of that name fourth |
| measles | Q79793, *viral disease* | the same — with Q573943, the **pathogen**, below it |

**One first-ranked candidate in four was wrong, and three of four carried a competing entity of a different kind
inside the top four.** The two confusions that appeared — a ward against the area containing it, a pathogen against
the disease it causes — are both distinctions this project refuses to let pass elsewhere.

This is four terms, not a sample. It is enough to rule out taking the top hit; it states no match rate, and nothing
is known about what share of any country's administrative units resolve at all.

## What it works around

Wikimedia's User-Agent policy asks an automated client to identify itself and give a contact. The person running
Fieldwork is not who the client is, and their details are theirs, so the client identifies itself generically.
Whether that satisfies the policy for a tool many people may run is **not established**.

The run touches no network at all. That is not a performance choice: it removes the rate limit, the outage and the
key from the run, and makes a saved workflow reproducible years later. The cost is that a run cannot notice that
Wikidata has changed its mind.

## What it does not do

No parity check is owed, and `widgets/check-coverage.json` records the reason rather than leaving a gap: a parity
check asks whether another implementation gets the same number from the same input, and here the input *is* the
answer. What would be worth measuring is coverage — what share of a country's units resolve, and how often the
first candidate is wrong — and that is a finding about Wikidata, not a check of this widget.

## History

### 2026-11-24 · First release (0.1.0)

Added so a term in a workflow can carry an identifier the rest of the world shares. Until now every term meant
something only inside the workflow that held it.

The design was settled by the practitioner, 2026-11-24:

> The Wikidata widget configure dialog can help filter in the right link. That is for a human to decide.

Two consequences followed from that sentence and are both deliberate. The dialog's filter **reorders** candidates
and removes none, because for "Kano" the right entity is fourth and a filter that dropped candidates could hide it.
And *"none of these name it"* is kept as a decision, held apart from a term nobody has looked up: the first is a
finding about the term, the second is unfinished work.
