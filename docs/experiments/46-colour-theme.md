# Developmental evaluation: colour theme

_Created 2026-10-08 · Updated 2026-10-08_

Date: October 8, 2026. Status: implemented locally; validation record below. The
interface now offers light, dark, or following the device, defaulting to the
device. Nothing about workflows, computation or evidence changes.

## Evaluation question

Can the interface be read in a dark environment without changing what the
released light theme looks like, and without making the canvas harder to
interpret? Colour carries meaning here: sources, processing and outputs are told
apart by hue, and raster and map output use colour to show values. A theme that
only inverted brightness would damage that.

## A113: two token layers, so the light theme is untouched

The stylesheets held 279 colour literals in 231 distinct values, including 54
different muted greys — variety that is accidental rather than designed.
Collapsing them into one semantic palette was the first attempt and was wrong:
the browser suite pins exact colours, `map-output` asserts a node background of
`rgb(237, 240, 242)`, and the released light design is not ours to change while
adding a feature.

So each distinct literal keeps **its own token with its exact released value**,
and the dark block redefines every token from a deliberate palette of 21
clustered colours. A small public alias layer, `--surface`, `--text`, `--accent`
and the rest, is what new rules should use; the numbered layer exists only to
hold the light theme steady.

Measured by screenshot: with a rebuild in each state, light differs by 2,162
pixels of 1,760,000, of which 2,091 are the new header control and 71 are at the
run-to-run noise floor of 32. The tokenisation is colour-neutral.

An earlier comparison reported 5.4% and was wrong: `flow.css` is bundled into
`build/canvas.css` by `canvas.tsx`, so swapping stylesheets without rebuilding
left the page using tokenised CSS with no token definitions. A measurement
method needs checking before its result is believed.

## A114: the attribute states the choice, not the outcome

`data-theme` carries `light`, `dark` or `device`. The stylesheet resolves
`device` itself through `prefers-color-scheme`, scoped as
`:root:not([data-theme="light"]):not([data-theme="dark"])`, so an explicit light
choice beats a dark device and a device change needs no JavaScript. `color-scheme`
is set alongside, so native controls and scrollbars follow.

The resolution lives in a pure function in [theme.ts](../../src/theme.ts), which
is why it can be unit-tested without a browser and cannot drift from the CSS
selectors it mirrors. Preference reads and writes are each wrapped against
unavailable storage: an unreadable value falls back to the device, and a failed
write still applies the theme for the session and says so.

## A115: node colours are authored per theme

The five canvas hues are stated separately for light and dark rather than derived,
because they encode widget roles. A browser check asserts that all five stay
distinct in dark and that none reuses a light tone.

**SVG and GeoTIFF exports are deliberately unaffected.** Their colours are
generated in TypeScript, not CSS, so an exported artifact stays light-on-white
whichever theme produced it. An artifact for sharing should not carry the
viewer's display preference.

## A116: contrast measured, and what it found

Contrast was measured rather than judged, on what the browser actually renders:
for every visible element with its own text, the effective foreground after alpha
compositing against the nearest opaque ancestor background, with the WCAG 2.1
threshold of 4.5:1 for normal text and 3:1 for large text. The Old Naledi
workspace at 1600 x 1100 presents 263 such elements.

| Theme | Elements below AA, before | After | Distinct failing pairs |
| --- | --- | --- | --- |
| Dark | 62 | **0** | 9 → 0 |
| Light | 144 | 144 | 46 |

**Dark had a real defect this found.** 38 colours were written as the keyword
`white`, which the hex-based tokenisation never saw, so those panels stayed white
in dark while text turned light: a ratio of 1.20, on buttons, labels and section
titles. They are now tokens. Separately, text sitting on a filled accent or
danger surface was `color:white`, which fails once the accent itself is light in
dark, so `--accent-contrast` and `--danger-contrast` flip with the theme. Two
decorative separators drew text with a border colour and fell to 1.58; they are
raised in dark only.

**Light's 144 failures are pre-existing and were deliberately not changed.** They
are overwhelmingly 8 to 10 pixel labels in pale green on white, between 2.3:1 and
2.8:1 — the node identifier, library group headings, field hints and the palette
"+" affordance. Adding a theme is not a mandate to redesign the released light
interface, and the browser suite pins several of those colours. They are recorded
here so the next person does not have to rediscover them, and improving them is a
separate, deliberate change.

A browser check now asserts that dark has **no** failures, and ratchets light at
46 distinct failing pairs: it may improve, it must not regress.

What this does not establish: contrast for non-text elements such as icons, port
handles, edges and map symbols; legibility of the raster value ramp in dark;
colour-vision deficiency, which contrast ratio does not model; and anything
outside Chromium at this viewport. The dark palette was still chosen by eye, and
now has a floor.

## Validation

TypeScript, build, **115 unit tests** and **69 Chromium scenarios with 1 skipped**
passed. Three new unit checks cover the resolution table, the accepted
preferences and the versioned storage key. Four browser checks cover a first
visit in both device schemes, an explicit choice beating the device and surviving
an offline reload, node-colour distinctness in dark, and a storage failure.

The suite also caught two defects during the work: the first palette changed
released light colours, and the header control broke the no-horizontal-scroll
assertion at 390 pixels, now fixed by hiding the label below 850 pixels.

Not established: readability for colour-vision deficiency, dark-theme legibility
of raster value ramps, non-text contrast, and Firefox or WebKit rendering.
