# 225 · WebGPU as an accelerator, never a requirement

_Created 2026-11-19 · Updated 2026-11-20_

**Status:** tried, 2026-11-22: the spike ran on four browsers. WebGPU is offered on every one tried, including the gate's
Chromium with one flag; the density surface agrees with the kernel to 3 in a million at 100,000 points and is about 40
times faster on the Mac's GPU at 1,000,000; at 1,000,000 points Apple's GPU misses the agreement set beforehand by 1.5%.
Not used by any widget.

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

## The spike, run 2026-11-22

**Built.** `kernel/src/density.rs`, the reference: each point adds 3 / (π h²) · (1 − (d/h)²)² to every cell centre
within the bandwidth, in 64-bit. `src/density.ts`: the kernel's surface, and the WebGPU path, in WGSL, which bins the
points on the CPU into squares one bandwidth wide and gives each grid cell a GPU thread summing the nine bins around it,
in 32-bit, with no atomics. `tests/density.test.mjs` (Node): one point sums to its weight; a point just outside the grid
reaches its edge; an unreadable point adds nothing. The spike's own runner is not in the repository.

**1. Where WebGPU is.** On the development Mac:

| Browser | WebGPU adapter |
| --- | --- |
| Playwright's Chromium, headless, as the gate runs it | none |
| The same, with `--enable-unsafe-webgpu` | SwiftShader, a software adapter on the CPU |
| Chromium's newer headless mode, with that flag | the Mac's GPU (Apple, Metal 3) |
| Playwright's WebKit, headless | the Mac's GPU |
| The practitioner's Chrome 157 | the Mac's GPU, storage buffers of 128 MB |

So the WebGPU path can be checked in the gate and in CI on the software adapter, by one flag, and on a GPU only on a
device. Edge on Windows and a field laptop were not tried.

**2. One computation, both ways.** 1,000 × 1,000 grid, bandwidth 20 cells, points seeded, half around ten centres. Times
are the second WebGPU run; the first, which compiles the shader, took 80 to 470 ms.

| Points | Largest difference, of the peak | Kernel | Mac GPU (Chromium / WebKit / Chrome) | SwiftShader |
| --- | --- | --- | --- | --- |
| 10,000 | 8.2 × 10⁻⁷ | 31–170 ms | 8 / 12 / 15 ms | 73 ms |
| 100,000 | 3.1 × 10⁻⁶ | 216–232 ms | 16 / 18 / 21 ms | 238 ms |
| 1,000,000 | 1.01 × 10⁻⁵ | 2.1–2.3 s | 47 / 49 / 89 ms | 1.8 s |

**Against what was written before the result.** Agreement within 1 × 10⁻⁵ of the largest cell: met at 10,000 and
100,000; **not met at 1,000,000 on Apple's GPU, by 1.5%**. With compensated (Kahan) summation in the shader, SwiftShader
came to 6.7 × 10⁻⁸ at 1,000,000; Apple's Metal compiler, free to reorder floating-point arithmetic, removed the
compensation, and a second attempt to shield it (through the sum's bits) was removed as well. Time: reported above; no
threshold had been set.

**Found by the spike.** The first WebGPU surface was 6% off at 100,000 points on every adapter alike: its bins started
at the grid's edge, so points just outside it, which the kernel lets reach the edge cells, were dropped. The bins now
start one bandwidth before the grid. A disagreement identical on hardware and software is the algorithm's, not
precision's.

**3. What decides which runs.** `densityGpu` returns nothing where WebGPU is not offered, an adapter or device is
refused, or the work fails; the kernel's surface is then the answer. Checked with WebGPU absent (Chromium without the
flag): the kernel ran at every size. No widget uses either yet, so no receipt says which ran.

**What this does not establish.** That the 1,000,000-point surface on Apple's GPU is close enough: 1.01 × 10⁻⁵ of the
peak is far below what a map shows, but it is past the line drawn beforehand, and the line is kept. A WebGPU path to
use at that size needs summation the compiler cannot reorder (two-float arithmetic, or partial sums per bin), or the
line moved by a decision, not by this result. Nothing on Windows, Android or a field laptop. The practitioner observation
(whether a receipt naming the GPU reads as equally trustworthy) is not reached until a widget uses it.

## What it does not establish

That a density surface is the first place WebGPU will be needed is a guess; streaming rasters and the agent-based model
may need it first. Which laptops in the field have WebGPU is not known. The spike's results are above, with their own
limits.
