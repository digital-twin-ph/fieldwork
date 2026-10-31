# 152 · A reference list is not a list of attributions

_Created 2026-10-31 · Updated 2026-10-31_

**Status:** asked — the distinction is drawn and nothing is built. The renderer this needs already
exists and has never been called; what is missing is a surface that calls it and a rule for which
records are works.

## The task

The practitioner, 2026-10-31, reading the References part of South London's write-up:

> Those derived from FW actually also have their original provenance, example the plate comes from
> the John Snow South London study so that's the citation to attach to that plate. The subdistricts
> were also drawn from an existing map in the original John Snow article so also two provenances.
> #9 does not look like a Citation and so does #6. Citation #5 for OpenStreetMap also has its
> prescribed citation entry, we should use that for any OSM derived reference plus provenance for
> modifications. References should follow prescribed formats, e.g., APA, and should be
> configurable, e.g., a format dropdown should reconfigure the References.

Four complaints about one list. They have one cause.

## The distinction this is really about

**An attribution and a citation are two different claims, and this project has been making the
first where it promised the second.**

| | attribution | citation |
| --- | --- | --- |
| answers | what must this figure say to satisfy the terms | what work is this, so a reader can find it |
| obliged by | a licence | scholarship |
| belongs on | the figure, the export, the notice | the References part |
| rendered by | `attributionFor` | `renderCitation(p, style)` |
| reformats into a style | **no** | **yes** |
| exists where the origin is an authority rather than a work | yes | no |

`references.ts` builds every source entry from `attributionFor`, which is the licence answer. That
one substitution produces three of the four complaints:

- **"Derived in Fieldwork from the sub-district layer"** is not a work. It is a sentence in
  `source` on a record with no licence, which `attributionFor` falls through to.
- **"© OpenStreetMap contributors, ODbL"** is the ODbL's prescribed attribution, correct as an
  attribution and not a citation of anything.
- **Nothing reformats**, because an attribution has no fields to reformat. A style picker over
  these strings would produce the professional-looking-and-wrong output
  [144](144-provenance-as-structured-data.md) refused when it built `Citation`.

**Enforced as a run-time check**, not a limitation: the References part asks for a citation and
renders nothing where a record has none, rather than printing an attribution in its place.

## What the surface shows today, measured

South London's write-up, 2026-10-31: **9 entries, headed "7 works cited by this project's workflows
· 2 methods with no source read."** Of the nine:

| # | entry | what it actually is |
| --- | --- | --- |
| 1 | Snow 1855, On the Mode of Communication of Cholera · CC0-1.0 | a work, printed as an attribution |
| 2 | Derived in Fieldwork from the sub-district layer | **not a reference** |
| 3 | Koch et al. 2006, Rethinking John Snow's South London study · BSD-2-Clause | a work, printed as an attribution |
| 4 | Derived in Fieldwork from the plate's world file | **not a reference** |
| 5 | OpenStreetMap contributors · © OpenStreetMap contributors, ODbL | an attribution, with no citation behind it |
| 6 | log-normal: … No primary source has been read for it | **not a work** |
| 7 | Katz D, Baptista J, Azen SP, Pike MC. … doi:10.2307/2530610 | a work, in Vancouver |
| 8 | Woolf B. … doi:10.1111/j.1469-1809.1955.tb01348.x | a work, in Vancouver |
| 9 | Wald unpooled: … No primary source has been read for it | **not a work** |

**Four of nine entries are not references**, and the two that are correctly rendered are the two
that went through `renderCitation`.

### The records say it themselves

Entries 2 and 4 come from study-area frames, and each declares in its own `what` field that it is
not to be credited:

> The extent enclosing the 32 registration sub-districts of Snow's Table VIII. Derived here from
> their published boundaries by taking their bounding box; **it is a frame rather than a published
> boundary, and nothing is attributed to it.**

> The extent of Snow's Map 2 as georeferenced, read off the world file `geo/map2.jgw` and the
> plate's pixel dimensions. It is a frame for drawing the plate whole rather than a published
> boundary, and **nothing is attributed to it.**

Neither carries a `licence` field at all, so `attributionFor` reaches its last fallback and returns
`source`. **The author declared that nothing is attributed, and the surface cited it anyway.** That
is a defect with a one-line tell, and it is the clearest evidence that the list is assembled from
the wrong field.

## What already exists, and has never been called

This is the part that decides the shape of the work. [144](144-provenance-as-structured-data.md)
built the whole renderer on the practitioner's instruction of 2026-10-27 — *"While it is early, let
us make provenance structured data then"* — and its own comment names the style picker as the
reason. None of it is reached from the References part.

| built | where | used by References |
| --- | --- | --- |
| `Citation` — typed, authored, with container, volume, pages, DOI | `input-provenance.ts` | no |
| `CITATION_STYLES` — Vancouver, APA 7, Chicago author-date, each with its authority | `input-provenance.ts:165` | no |
| `renderCitation(provenance, style)` | `input-provenance.ts:273` | no |
| `citationGaps` — what a record still needs before a style can render it | `input-provenance.ts` | no |

And the data is mostly there. **Six of South London's nine provenance records already carry a
structured citation**: Snow's Tables VIII, IX and XII as `book`, the sub-districts as `article`,
the plate as `map`, the intakes as `book`. Three do not — the Koch/Denike modified-boundary record
and the two OpenStreetMap records.

So this is not "build a citation system". It is **use the one that was built, and stop rendering
licence attributions as literature.**

## The design

**D1. References renders citations; figures carry attributions.** Neither function changes its job.
`attributionFor` keeps discharging licence obligations on figures and exports, which is what it was
written for and what it is right about. The References part stops calling it.

**D2. A record that declares nothing is attributed to it is not cited.** A hard stop rather than a
heuristic over the prose: the two frames above contribute no entry.

**D3. A derived record resolves to its origin, and both are kept.** The practitioner's "two
provenances". A frame derived from the sub-district layer is provenance — it says how the extent
was made — and the *reference* is the work the layer came from. Today `source` holds free text a
machine cannot follow, so this needs a pointer rather than a sentence. **The open question of this
experiment**, and the one place it proposes new structure.

Stated as a limit now: if the origin is not separately cited, the derived record loses it. South
London does not expose this, because the sub-districts' origin is already entry 3 and the plate's
is already entry 1 — so dropping 2 and 4 happens to lose nothing here. **That is luck and not
design**, and a record that relied on it would be wrong on the next project.

**D4. An uncited method is not a numbered work.** `ReferenceEntry.uncited` already marks them and
the header already counts them separately — *"2 methods with no source read"* — so only the
rendering is wrong. They move out of the numbered list into their own group, which keeps 149's rule
that an absence is stated rather than omitted while no longer presenting it as literature.

**D5. One style governs the whole WRITE-UP, not the References part, and the control sits at the
top.** The practitioner, 2026-10-31, while this record was being written: *"Perhaps the citation
formatter should be at the top not just reference section since it also formats the citations in
the notes."*

It does. A citation reaches a reader in more than one place — a derived note credits the input it
read, a machined note names the method it used, and the References part lists the works — and all
three come from the same records. A picker that governed only the last of them would produce a
document citing Snow one way in Results and another way in References. So the style is a property
of the **write-up**, like the venue, and the dropdown belongs beside the parts rather than inside
one of them.

`METHOD_CITATION_STYLE` in `equations.ts` is retired for the same reason: a document rendered in
two styles is not rendered in a style.

**A STORED NOTE CANNOT BE REFORMATTED, which is what makes this possible at all.** The write-up
store keeps note PROSE, and prose with a citation baked into it is frozen at the style it was
machined in — no picker can reach back into it. This was true of the Methods notes until
2026-10-31, when the bibliography came out of them on the practitioner's report that citations
belonged in References ([151](151-typesetting-an-equation-a-practitioner-wrote.md) records it).
The note now stores the method's NAME and the citation is rendered from the record at display
time.

That change was made to remove a duplication, and it is also the precondition for this one: a
live style switch requires that no stored text contain a rendered citation. **Anything this
experiment builds must keep that invariant** — citations are rendered where they are shown, never
written into a note.

Default APA 7, the style the practitioner named. Stored **per project rather than per session**,
because a venue belongs to a document, and because 141's amendment already settled that a part can
be ordered and set aside per venue.

**D7. A DOI resolves.** The practitioner, 2026-10-31: *"citations should have the DOI so it can
also resolve to its online source."*

The field and the formatting are already there, and were from the start — 144 stores `doi` bare,
normalises a pasted `https://doi.org/…` or `doi:…` into it, and each style prints it the way that
style prescribes: Vancouver `doi:10.2307/2530610`, APA and Chicago `https://doi.org/10.2307/2530610`.
`citationGaps` already reports a missing DOI where one is expected, and already treats its absence
before 2000 as a fact rather than a gap, which is why Snow's 1855 edition is not nagged for one.

**What is missing is that it is text.** A reader of the References part cannot click it, so the
citation names a resolver without reaching it. The entry should carry a link.

One consequence to settle in the build rather than here: `renderCitation` returns a finished
string, and the three styles place the DOI differently within it, so a surface that wants a link
either parses the string back — which is the mistake 144 refused when it declined to parse
`source` — or the renderer exposes the DOI alongside the text so the surface can link it without
reading the prose. **The second.** A renderer that returns only prose forces every caller that
wants structure to recover it by guessing.

**D6. OpenStreetMap gets its prescribed citation, and the modifications stay provenance.** The two
are separate obligations and the surface conflated them. ODbL requires a statement of what was
modified; `NOTICE.txt` carries that in prose today and nothing structured does. The citation says
what the work is; the modification statement says what this project did to it, and belongs with the
read that did it rather than in a reference list.

## What this does not establish

- **That a style picker makes a citation correct.** It makes it consistently formatted. Whether
  Snow's 1855 second edition is rendered as APA 7 would have it is a reading test against
  `CITATION_STYLES`' recorded authority, and nothing here checks it. A citation that is wrong in
  three styles is wrong three times.
- **That six of nine records carrying a citation means six render.** `citationGaps` decides that,
  and it has not been run over these records. A record with a `citation` block and a missing year
  renders nothing, by 144's rule that a gap refuses the whole citation.
- **That the derived-to-origin pointer of D3 is the right structure.** It is the one piece of new
  structure proposed here and the one with no implementation behind it. It may turn out that a
  derived record should carry no reference at all and the origin should be cited by whatever node
  holds the original — which would need no new field.
- **That APA 7 is the right default.** It is the style the practitioner named in passing while
  asking for the dropdown; the dropdown is the requirement and the default is a guess at the
  common case.
- **Anything about how a reader uses the list.** No ordering, numbering or venue behaviour is
  settled here beyond what 141 already settled, and numbering stays the document's business.

## What would close it

Every citation in the write-up — in a derived note, in a machined note, and in the References part
— renders through `renderCitation` at the one style the reader chose from a control at the top of
the write-up; entries 2, 4, 6 and 9 of the measurement above are gone from the numbered works;
OpenStreetMap appears as a citation with its modifications recorded as provenance; every DOI is a
link a reader can follow, and a record expected to carry one and lacking it says so; and
`METHOD_CITATION_STYLE` no longer exists.

Two tests say whether it worked. One asserts the same write-up at two styles and finds the entries
**reordered and repunctuated** rather than merely relabelled, which is what distinguishes a
rendered style from a string with a style's name on it. The other asserts that switching the style
changes every surface at once — that no stored note kept a citation in the style it was machined
in, which is the invariant D5 depends on and the one a later feature is most likely to break.
