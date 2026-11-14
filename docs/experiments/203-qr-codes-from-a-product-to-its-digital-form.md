# 203 · QR codes from a product to its digital form

_Created 2026-11-10 · Updated 2026-11-14_

**Status:** tried. The first use is built (0.80.0): two QR codes at the foot of a worked example's References, and
`?example=` opening a catalog example. Checked by lab check 47 in CPython.

## The question

The practitioner, 2026-11-10, in order:

- *"Once we render on GitHub those products can come with a QR code so viewers can access the digital product"*
- *"In fact we can try out the QR code to point to worked example repos already."*
- *"So there should be QR codes in a note for worked example just to point to 2 things, to FieldWork itself on Git
  Pages and to the worked example in question"*
- *"Fieldwork QR code can already point to the worked example automatically loaded? This way we still have 2 QR
  codes"*
- *"We have to remember a collaborative project will not be in a manifest so we will have trust challenge."*
- *"So QR code itself can be an experiment we can add to TODO"*, and *"It's related to 150 but 150 is not QR code
  related."*

## The first use: a note with two codes, for a worked example

A note in the write-up's back matter, under Appendix (the files that reproduce the study), for a workflow opened from
a worked example:

1. **Fieldwork with this example opened**: `https://digital-twin-ph.github.io/fieldwork/?example=<id>`.
2. **The example's repository at the commit it is pinned to** in `widgets/examples.json`: its data, workflows, manual
   and licence, as the write-up was made from them.

Each code has its address printed beneath it, at 14 px or more, labelled: *Fieldwork, with this example opened* and
*This worked example: data, workflows and manual*. A machined note, made from the pinned record. In a product where
space is short it can be formatted down to the two codes ([202](202-one-record-several-products.md)).

## What it needs first

- **Opening a repository example from a link.** `?example=` opens only built-in examples today (`hasExampleTemplate`);
  a repository example (Sierra Leone, NYC, Brazil, Nigeria and the rest) is opened from the catalog, which downloads
  the project and checks its pinned digests. The link must do the same.
- **A home for a built-in example's files**, for code 2: Hagelloch's, served by Fieldwork's own site, as TODO 19 needs
  for its manual.

## Rules

- **Fieldwork does not publish.** Releasing is outside it (the glossary). A code points to an address the catalog pins
  or the practitioner gives; Fieldwork never guesses one.
- **The address is printed beside the code**, and the code holds the address and nothing else: nothing about the
  reader, no tracking.
- **The address must answer before printing**; the export says when it does not.
- **Pinned to a commit**, so what a printed code opens cannot change after the fact.

## Trust

A worked example is vouched for: the catalog pins its repository, commit and file digests. A collaborative project's
repository is not in the catalog ([150](150-can-several-authors-collaborate-in-a-project-repository.md) has the
collaboration; this has the code that opens one). A code to one opens behind a step that says so: *not vouched for by
Fieldwork*, the repository, the commit, its author, and whether GitHub shows the commit as signed. What it opens is read
as data, checked on import as any import is, and labelled in the application.

## The encoder

`qrcode-generator` 2.0.4 (Kazuhiko Arase, MIT, no dependencies), installed with the practitioner's yes on 2026-11-10,
in `src/qr.ts`: error correction M, byte mode, the smallest version; one https address in plain ASCII, or refused.
Black on white whatever the theme, with the four-module quiet zone.

## Built, 2026-11-10 (the practitioner: *"QR code first then manual"*)

- **Where**: at the foot of References, under *This worked example, online*, assembled from the catalog and the project
  on every render like the references above it, never stored. References, not an Appendix, because the write-up's
  parts end there today; the glossary's Appendix is still to come.
- **A catalog example**: Fieldwork with it opened (`…/fieldwork/?example=oswego-1940`), and its repository at the
  pinned commit. **A built-in example**: Fieldwork with it opened, and its files on `main` in Fieldwork's repository,
  labelled *the latest version, not pinned*, because Fieldwork's releases name no commit.
- **`?example=<slug>`** now opens a catalog example: downloaded and checked against its pinned digests, as its button
  does. Tried by hand in Chromium on Oswego; not in the gate, which does not reach GitHub.

**Lab check 47**: OpenCV (Apache 2.0) reads every one of the 24 codes back to its address exactly; segno (BSD) makes a
code of the same version for each, and its own reads back too. segno chooses a different mask for all 24, which is
reported and not required: both are valid codes. CPython only.

**Not yet**: the address checked before printing (the export's rule above; the write-up on screen does not print);
codes on exported figures and products ([202](202-one-record-several-products.md)).

## What this does not establish

That a reader will scan a code: the printed address is for those who cannot. That an address stays up: a repository
can be deleted; the commit pin guards against change, not against loss.

## Fieldwork's mark in the middle, 2026-11-14

The practitioner: *"Can we add the FW logo to the QR code?"* A worked example's codes are drawn at error correction H,
the middle modules cleared for the mark (an odd number of modules near a fifth of the side, with one module around it).
Lab check 52 (Validation Lab 2a13bf1): OpenCV's ArUco detector reads all 26 addresses with the mark's patch light and
with it dark; the classic detector reads 25, and reads segno's unmarked code at the same version for only 24, so no
miss is the mark's. Not established: that a phone camera reads a printed code with the mark.
