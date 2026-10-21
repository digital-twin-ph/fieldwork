# Deduplicate point records

_Created 2026-10-21 · Updated 2026-10-21_

**A comparison.** It takes two or more point layers from different sources, finds the records that
are the same place, and merges the pairs that agree. The pairs it is unsure about it gives to you.

## What it does

Two sources over one study area draw the same hospital twice. A count of facilities is then wrong
by however many of those there are, and no amount of care downstream fixes it, because nothing
downstream knows which records were the same place.

This compares records **across** sources and asks two questions of every pair it considers:

- **Do the names agree?** Either exactly, after normalising, or by similarity.
- **Are they in the same place?** Within a distance you set.

Each question that answers yes is worth one point. A pair scoring two merges on its own. A pair
scoring one **waits for you**, because the two questions disagree and that is a judgement rather
than a calculation. A pair scoring none was never a candidate.

## What you connect

Two or more **point** layers, each from a different source. One layer has nothing to compare with,
so two is the floor rather than the shape; use **Add point input** for a third and a fourth.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Name attribute** | Which attribute carries the name. `name` for most sources. |
| **Name comparison** | *Exact* after normalising, or *Jaro–Winkler similarity*. |
| **Similarity at or above** | The similarity at which two names count as agreeing. |
| **Compare pairs within** | Pairs further apart than this are never compared at all. |
| **Count as the same place within** | The distance at which two records are in one place. |
| **Merge automatically at a score of** | Two means both questions must agree. |
| **Ask me at a score of** | One means a single agreement brings the pair to you. |

### Choosing the distances

These are the two numbers worth measuring rather than accepting. Sources digitise a facility
differently — one marks the building, another the compound gate, a third the signpost on the road
— so how far apart two records of one facility sit is a property of **your** sources. Run it once
with a generous *compare pairs within*, read the distances on the pairs it offers you, and set
*count as the same place within* from what you see.

### Deciding a pair

Select the widget and choose **Review pairs**. The dialog shows one pair at a time, with:

- **Both records side by side**, each under the name of the source it came from.
- **Every attribute either record carries**, lined up in one table, with the fields that agree
  marked apart from the fields that differ. This is usually what settles it: a second field
  agreeing, or a second field flatly disagreeing. A field missing on one side shows as a gap,
  because a missing value is not agreement.
- **How far apart** the records are, **how closely the names matched**, and which of the two tests
  agreed.

Answer **The same place** or **Different places**, and say why. The reason is required: a judgement
nobody can read six months later is not a record of one. It is kept with the decision, and the
decision is pinned to the records as they were — **edit either record and the judgement lapses**,
rather than a stale answer riding on changed data. A decision can be taken back from the same
dialog.

## Reading what you get

A point layer with one record per place. A merged record keeps the first source's values and
carries a `mergedFrom` attribute naming every record that went into it. Records with no usable
location pass through untouched — they were never candidates, and nothing has been said about them.

The receipt records the whole rule: the name method and its threshold, both distances, both score
thresholds, how many pairs were compared, how many the blocking rule withheld, how many matched,
how many are still waiting, and for every candidate its score, its distance and its name
similarity. A figure that reports a deduplicated count can therefore say what produced it.

## What it will not do

- **It will not look inside one source.** Comparison is across sources, so a layer's duplicates of
  itself are not found.
- **It will not read abbreviations.** `HGR Goma` and `Hôpital Général de Référence de Goma` are one
  facility and this will not say so: there is no nickname dictionary, no transliteration, no
  phonetic key and no learned model. That pair reaches you in the review band, which is where the
  judgement belongs.
- **It will not merge on a name alone**, at the settings it ships with. Two clinics in one town can
  share a name; two unrelated facilities can stand twenty metres apart.
- **It will not decide for you.** A pair in the review band stays two records until somebody
  answers. The gate is on the merge, not on the run.
- **It cannot tell you the thresholds are right.** They are declarations about your data, and the
  only way to know is to look at the pairs it offers.

## Where the method comes from

The contracts are those of `EPIAI RECORDLINK` — blocking before comparison, binary contributions
rather than a blended score, three classes rather than merge-or-not, and a missing value that never
agrees with another missing value. This widget adds the spatial comparison and the merge the
thresholds licence.
