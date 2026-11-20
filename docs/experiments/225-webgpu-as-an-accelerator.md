# 225 · WebGPU as an accelerator, never a requirement

_Created 2026-11-19 · Updated 2026-11-20_

**Status:** asked. No spike run. Placed after raster streaming (TODO), 2026-11-19.

## The question

The practitioner, 2026-11-19, told that the interactive map's large point layers are drawn with WebGL, not WebGPU:
*"I think we should push WebGPU so when the need arrives, which is foreseeable, we are prepared."*

So: can Fieldwork compute on the graphics card where one is there, give the same numbers as without it, and lose
nothing on a laptop that has none?

## Looking back

- [158](158-a-study-design-is-a-set-of-facets-and-the-literature-shows-it.md), 2026-11-01: a local AI model on WebGPU
  was set aside, partly because *"WebGPU would also exclude the low-resource settings this is for."*
- [182](182-brazil-across-years.md), 2026-11-06, asked *"if WebGPU and Web Worker can speed up the computation"*: not
  proposed, because that arithmetic was small; *measure first*.
- [221](221-large-rasters-with-terrio.md): rasters are decoded by terrio in WebAssembly; the Rust kernel holds the
  regression, the scan and the agent-based model. These are the paths WebGPU would sit beside.

- 2026-11-20, GHS-POP over DR Congo read from the JRC's address was slow, and the practitioner asked: *"If this can be
  sped up by WebGPU we should explore its use."* Measured first: from the 12.3 GB file on the development Mac, the
  reduced copy of the window (517,885,446 cells, decoded and summed in blocks) took under 30 s of a 91 s Apply, the
  rest being the file's SHA-256; by address the same window is 2,070 tiles, **162 MB compressed**, and the strips it is
  read in (340 rows, tiles 512 tall) fetch most tiles twice and wait on each strip before the next. **That read is the
  network's, not arithmetic's, so WebGPU would not shorten it.** What would: strips aligned to the tiles, the next
  strip fetched while one is summed, and the fetched tiles kept on the device so a run does not fetch them again.

What differs now: maps of 250,000 points (Map 0.37.0), country rasters at 100 m streamed in strips (TODO, GHS-POP over
DR Congo), and agent-based models at scale (199, 220) are the foreseeable work where arithmetic is large.

## The rule, proposed

**WebGPU accelerates; it never decides what can be done.** Every computation runs in the Rust kernel or TypeScript
first, and that path is the reference. A WebGPU path is added only beside one, and is used only where the device
offers WebGPU and the two have been shown to agree. A laptop without WebGPU gets the same result, slower.

## The spike, proposed

1. **Where it is.** Whether WebGPU is offered: Chromium and Safari on the development Mac; Edge on Windows on a
   tester's laptop; Chromium headless in the gate and in CI (with and without its software adapter). The answer
   decides whether a WebGPU path can be tested at all.
2. **One computation, both ways.** A density surface: points to a grid, each point spread by a kernel of a stated
   bandwidth. Written in the Rust kernel and in WGSL, and compared cell by cell at 10,000, 100,000 and 1,000,000
   points on a 1,000 × 1,000 grid.
3. **What decides which runs.** A device without WebGPU, a request refused, or a lost device falls back to the kernel,
   and says which ran in the receipt.

## What it commits to, written before the result

- Agreement: every cell within 1e-5 of the kernel's value relative to the largest cell (WGSL computes in 32 bits).
- Time: reported for both, by size, on each device tried. No threshold chosen in advance.
- If headless Chromium in the gate cannot run WebGPU, that is a result: the WebGPU path would then be checked only
  on a device, and the experiment says so.

**Practitioner observation, which can come out badly:** told which path ran in a receipt, does the practitioner read
the result as equally trustworthy either way?

## What it does not establish

Anything yet. That a density surface is the first place WebGPU will be needed is a guess; streaming rasters and the
agent-based model may need it first. Which laptops in the field have WebGPU is not known.
