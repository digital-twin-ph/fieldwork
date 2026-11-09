# 196 · A picture in a note

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** tried. An authored note can carry one picture: PNG, JPEG, WebP or SVG, kept on the device by its digest,
with alt text and a caption both required, shown above the note's words on the Notes board and in the write-up, and
carried in an exported project. Its first use is the vertical-datum diagram in the sea-level example.

## The question

The practitioner, 2026-11-08: an authored note can carry an image, kept by its digest, with required alt text and a
caption, shown on the Notes board and in the write-up; an SVG is shown as an image, never inlined. Its first use is
the datum diagram, `docs/images/vertical-datums.svg`, as a note of the sea-level example
([195](195-the-sea-level-example-reports-a-sea-level.md)). On 2026-11-09: *"Images in notes"*.

## What was built

| Part | How |
| --- | --- |
| The note | `image` on an authored note: digest, type, size, file name, alt text, caption (`src/note-image.ts`) |
| The bytes | Kept once in the payload store under `note-image:<sha256>`, as a data URL of the declared type, **when the file is chosen**, so a note never points at bytes this device does not hold |
| The dialog | An **Image** tab beside Write and Citations: the file, a preview, alt text, caption, and Remove. Save is refused, and says why, while either text is missing |
| The board | The picture above the words, through the slot a machined note's figure uses, as `<img>` with its alt text and a `<figcaption>` |
| A missing picture | A note whose bytes are not on this device says so, with the file name, the digest's start and the caption |
| The project file | `images`, by digest. On import each is kept only if its bytes have the digest it is filed under |

**Alt text and a caption are different things, so both are required.** Alt text says what the picture shows to
someone who cannot see it; a caption says what a reader is to take from it. A note read back with an image lacking
either keeps its words and drops the picture.

**An SVG is never put into the page.** An SVG is a document that can carry script; drawn through `<img>` it is
pixels. The unit test feeds one holding `<script>` and checks the markup holds no `<svg>` or `<script>`.

## Validation

- Unit (`tests/note-image.test.mjs`, 5): a picture is read back only with a digest, a type offered, alt text and a
  caption; a payload is only a data URL of its declared type; the gaps are said in the dialog's words; an SVG goes
  through `<img>`; a digest is checked against the bytes.
- Browser, Chromium (`tests/note-image.browser.mjs`): on South London's published bundle, a note gets the datum
  diagram; Save is refused without alt text; the board shows it as an image with its caption; it survives a reload;
  and the exported project carries the bytes under the digest the note names.
- The sea-level example's manual adds the diagram as a note of its Introduction, and its bundle was exported from that
  run.

## What this does not establish

- That alt text describes the picture, or that the author may publish it. The picture's source and terms belong in
  the note or its citations.
- How large a picture the board carries well. No limit is set; none has been measured.
- One picture per note. Several were not asked for.
- The repository export (`exportProjectRepository`) does not write pictures yet: it is one-way and writes notes as
  JSON, so a repository export of a project with a picture holds the note and its digest without the bytes.
